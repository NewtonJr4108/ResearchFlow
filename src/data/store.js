// All Firestore / Storage access lives here. Data layout (everything is owned by one user):
//
// users/{uid}                                   { darkMode, citationStyle, profileImageUrl }
// users/{uid}/projects/{projectId}               { title, description, dueDate, notes, links, createdAt }
//   …/tasks/{taskId}                             { title, dueDate, done, createdAt }
//   …/sources/{sourceId}                         a saved paper + { origin, note, addedAt }
//   …/papers/{paperId}                           an uploaded PDF + its extracted references
//   …/files/{fileId}                             a linked Google Drive file { driveId, name, mimeType, url }
//   …/drafts/main                                the paper being written { title, byline, contentJson, words }
import { useEffect, useState } from 'react';
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query,
  serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../lib/firebase.js';

/* --------------------------------- Paths ---------------------------------- */

export const userDoc = (uid) => doc(db, 'users', uid);
const projectsCol = (uid) => collection(db, 'users', uid, 'projects');
const projectDoc = (uid, pid) => doc(db, 'users', uid, 'projects', pid);
const sub = (uid, pid, name) => collection(db, 'users', uid, 'projects', pid, name);

/* --------------------------------- Hooks ---------------------------------- */

function useLive(makeRef, deps, { single = false } = {}) {
  const [state, setState] = useState({ data: single ? null : [], loading: true, error: null });
  useEffect(() => {
    const target = makeRef();
    if (!target) return undefined;
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      target,
      (snap) => setState({
        data: single ? (snap.exists() ? { id: snap.id, ...snap.data() } : null) : snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        loading: false,
        error: null,
      }),
      (error) => setState({ data: single ? null : [], loading: false, error }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export const useProjects = (uid) =>
  useLive(() => uid && query(projectsCol(uid), orderBy('createdAt', 'desc')), [uid]);
export const useProject = (uid, pid) => useLive(() => uid && pid && projectDoc(uid, pid), [uid, pid], { single: true });
export const useTasks = (uid, pid) => useLive(() => uid && pid && query(sub(uid, pid, 'tasks'), orderBy('createdAt')), [uid, pid]);
export const useSources = (uid, pid) => useLive(() => uid && pid && query(sub(uid, pid, 'sources'), orderBy('addedAt', 'desc')), [uid, pid]);
export const usePapers = (uid, pid) => useLive(() => uid && pid && query(sub(uid, pid, 'papers'), orderBy('uploadedAt', 'desc')), [uid, pid]);
export const useUserDoc = (uid) => useLive(() => uid && userDoc(uid), [uid], { single: true });

/* ------------------------------- Dates ------------------------------------ */

// Firestore Timestamp | Date | 'YYYY-MM-DD' -> Date (or null)
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(`${value}T00:00:00`);
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  return null;
}

export function toInputDate(value) {
  const d = toDate(value);
  if (!d) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const fromInputDate = (s) => (s ? Timestamp.fromDate(new Date(`${s}T00:00:00`)) : null);

/* -------------------------------- Projects -------------------------------- */

export async function createProject(uid, { title, description = '', dueDate = '', notes = '', links = [] }) {
  const docRef = await addDoc(projectsCol(uid), {
    title: title.trim(),
    description: description.trim(),
    dueDate: fromInputDate(dueDate),
    notes: notes.trim(),
    links,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export function updateProject(uid, pid, changes) {
  const data = { ...changes };
  if ('dueDate' in data) data.dueDate = fromInputDate(data.dueDate);
  return updateDoc(projectDoc(uid, pid), data);
}

// Firestore doesn't delete subcollections with their parent, so clear them first.
export async function deleteProject(uid, pid) {
  const papers = await getDocs(sub(uid, pid, 'papers'));
  await Promise.all(
    papers.docs.map((d) => d.data().storagePath && deleteObject(ref(storage, d.data().storagePath)).catch(() => {})),
  );
  for (const name of ['tasks', 'sources', 'papers', 'files', 'drafts']) {
    const snap = await getDocs(sub(uid, pid, name));
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
  await deleteDoc(projectDoc(uid, pid));
}

// The first version of the app stored tasks at projects/{pid}/tasks. Copy them
// into the user's project once, then remove the old copies.
export async function migrateLegacyTasks(uid, project) {
  if (project.legacyTasksMigrated) return;
  try {
    const old = await getDocs(collection(db, 'projects', project.id, 'tasks'));
    if (!old.empty) {
      const batch = writeBatch(db);
      old.docs.forEach((d) => {
        batch.set(doc(sub(uid, project.id, 'tasks'), d.id), { done: false, createdAt: serverTimestamp(), ...d.data() });
        batch.delete(d.ref);
      });
      await batch.commit();
    }
    await updateDoc(projectDoc(uid, project.id), { legacyTasksMigrated: true });
  } catch (err) {
    console.warn('Could not migrate old tasks for project', project.id, err);
  }
}

/* ---------------------------------- Tasks --------------------------------- */

export const addTask = (uid, pid, { title, dueDate }) =>
  addDoc(sub(uid, pid, 'tasks'), { title: title.trim(), dueDate: fromInputDate(dueDate), done: false, createdAt: serverTimestamp() });
export const setTaskDone = (uid, pid, taskId, done) => updateDoc(doc(sub(uid, pid, 'tasks'), taskId), { done });
export const deleteTask = (uid, pid, taskId) => deleteDoc(doc(sub(uid, pid, 'tasks'), taskId));

/* --------------------------------- Sources -------------------------------- */

// Document id derived from the paper's key, so saving the same paper twice updates it.
export const sourceId = (paper) => encodeURIComponent(paper.key || paper.title).replace(/\./g, '%2E').slice(0, 300);

const PAPER_FIELDS = ['key', 'title', 'authors', 'year', 'venue', 'doi', 'arxivId', 'url', 'pdfUrl', 'abstract', 'citedBy', 'type', 'source'];

export function saveSource(uid, pid, paper, { origin = 'search', note = '', context = '' } = {}) {
  const data = Object.fromEntries(PAPER_FIELDS.map((f) => [f, paper[f] ?? null]));
  data.authors = (paper.authors || []).map((a) => ({ given: a.given || '', family: a.family || '' }));
  return setDoc(doc(sub(uid, pid, 'sources'), sourceId(paper)), {
    ...data, origin, note, context, addedAt: serverTimestamp(),
  }, { merge: true });
}

export const updateSource = (uid, pid, id, changes) => updateDoc(doc(sub(uid, pid, 'sources'), id), changes);
export const removeSource = (uid, pid, id) => deleteDoc(doc(sub(uid, pid, 'sources'), id));

/* ------------------------------ Uploaded PDFs ----------------------------- */

// Store the PDF itself (best effort: Storage may not be enabled) and its extracted references.
export async function savePaperUpload(uid, pid, file, result) {
  let storagePath = null;
  let url = null;
  let storageError = null;
  try {
    storagePath = `users/${uid}/projects/${pid}/papers/${Date.now()}-${file.name.replace(/[^\w.-]+/g, '_')}`;
    const fileRef = ref(storage, storagePath);
    await uploadBytes(fileRef, file, { contentType: 'application/pdf' });
    url = await getDownloadURL(fileRef);
  } catch (err) {
    storagePath = null;
    storageError = err.code || err.message;
  }
  const references = result.references.map((r) => ({
    raw: r.raw,
    confidence: r.confidence,
    paperKey: r.paper?.key || null,
    paper: r.paper ? Object.fromEntries(PAPER_FIELDS.map((f) => [f, r.paper[f] ?? null])) : null,
  }));
  const docRef = await addDoc(sub(uid, pid, 'papers'), {
    name: file.name,
    title: result.title || null,
    pages: result.pages ?? null,
    storagePath,
    url,
    references,
    matched: result.matched,
    uploadedAt: serverTimestamp(),
  });
  return { id: docRef.id, storageError };
}

export async function deletePaperUpload(uid, pid, paper) {
  if (paper.storagePath) await deleteObject(ref(storage, paper.storagePath)).catch(() => {});
  await deleteDoc(doc(sub(uid, pid, 'papers'), paper.id));
}

/* ---------------------------------- Paper ---------------------------------- */

// One paper per project, at …/drafts/main. The editor's JSON is stored as a
// string: it's opaque to queries, and Firestore can't hold nested arrays.
const draftDoc = (uid, pid) => doc(db, 'users', uid, 'projects', pid, 'drafts', 'main');
export const MAX_DRAFT_BYTES = 900_000; // Firestore's limit is 1 MiB per document

export async function loadDraft(uid, pid) {
  const snap = await getDoc(draftDoc(uid, pid));
  if (!snap.exists()) return null;
  const data = snap.data();
  let content = null;
  try {
    content = data.contentJson ? JSON.parse(data.contentJson) : null;
  } catch {
    content = null;
  }
  return { ...data, content };
}

export function saveDraft(uid, pid, { title, byline, content, words }) {
  const contentJson = JSON.stringify(content);
  if (contentJson.length > MAX_DRAFT_BYTES) {
    return Promise.reject(new Error('This paper is too large to save (about 900 KB of text). Split it into sections or remove pasted images.'));
  }
  return setDoc(draftDoc(uid, pid), { title, byline, contentJson, words, updatedAt: serverTimestamp() }, { merge: true });
}

/* ---------------------------- Google Drive files --------------------------- */

// Links to Drive files attached to a project (the files themselves stay in Drive).
export const useDriveFiles = (uid, pid) =>
  useLive(() => uid && pid && query(sub(uid, pid, 'files'), orderBy('addedAt', 'desc')), [uid, pid]);

export async function attachDriveFiles(uid, pid, files) {
  const batch = writeBatch(db);
  files.forEach((f) => batch.set(doc(sub(uid, pid, 'files'), `drive_${f.id}`), {
    driveId: f.id,
    name: f.name,
    mimeType: f.mimeType,
    url: f.url,
    iconUrl: f.iconUrl || null,
    addedAt: serverTimestamp(),
  }, { merge: true }));
  await batch.commit();
}

export const detachDriveFile = (uid, pid, id) => deleteDoc(doc(sub(uid, pid, 'files'), id));

/* --------------------------------- Settings ------------------------------- */

export const saveUserSettings = (uid, changes) => setDoc(userDoc(uid), changes, { merge: true });

export async function uploadProfileImage(uid, file) {
  const imageRef = ref(storage, `profile_pictures/${uid}`);
  await uploadBytes(imageRef, file);
  const url = await getDownloadURL(imageRef);
  await saveUserSettings(uid, { profileImageUrl: url });
  return url;
}
