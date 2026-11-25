// Google Drive integration: Google's file picker + Drive API, entirely in the browser.
//
// Uses the `drive.file` scope, so the app can only open files the user explicitly
// picks. It never sees the rest of their Drive. Google treats this scope as
// non-sensitive, so no app verification is needed.
//
// Needs three values in .env.local (see README → Google Drive):
//   VITE_GOOGLE_CLIENT_ID  OAuth client ID (Web application)
//   VITE_GOOGLE_API_KEY    API key allowed to call the Google Picker API
//   VITE_GOOGLE_APP_ID     Google Cloud project number

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const APP_ID = import.meta.env.VITE_GOOGLE_APP_ID;
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE = 'https://www.googleapis.com/drive/v3/files';

export const MIME = {
  pdf: 'application/pdf',
  doc: 'application/vnd.google-apps.document',
  sheet: 'application/vnd.google-apps.spreadsheet',
  slides: 'application/vnd.google-apps.presentation',
};

export const driveConfigured = Boolean(CLIENT_ID && API_KEY && APP_ID);

/* ------------------------------ Script loading ----------------------------- */

const scripts = {};
function loadScript(src) {
  scripts[src] ||= new Promise((resolve, reject) => {
    const el = Object.assign(document.createElement('script'), { src, async: true, defer: true });
    el.onload = resolve;
    el.onerror = () => {
      delete scripts[src];
      reject(new Error('Could not load Google’s sign-in or picker script. Check your connection or ad blocker.'));
    };
    document.head.appendChild(el);
  });
  return scripts[src];
}

let pickerReady;
function loadPicker() {
  pickerReady ||= loadScript('https://apis.google.com/js/api.js').then(
    () => new Promise((resolve, reject) => window.gapi.load('picker', { callback: resolve, onerror: reject })),
  );
  return pickerReady;
}

/* ---------------------------------- Auth ----------------------------------- */

let token = null; // { value, expires }
let tokenClient = null;

async function getToken() {
  if (token && token.expires > Date.now() + 60_000) return token.value;
  await loadScript('https://accounts.google.com/gsi/client');
  return new Promise((resolve, reject) => {
    tokenClient ||= window.google.accounts.oauth2.initTokenClient({ client_id: CLIENT_ID, scope: SCOPE, callback: () => {} });
    tokenClient.callback = (res) => {
      if (res.error) return reject(new Error(res.error_description || `Google sign-in failed (${res.error})`));
      token = { value: res.access_token, expires: Date.now() + Number(res.expires_in || 3600) * 1000 };
      resolve(token.value);
    };
    tokenClient.error_callback = (err) => reject(new Error(
      err?.type === 'popup_closed' ? 'Google sign-in was closed before finishing.'
        : err?.type === 'popup_failed_to_open' ? 'Your browser blocked the Google sign-in popup. Allow popups for this site and try again.'
          : 'Google sign-in failed.',
    ));
    tokenClient.requestAccessToken({ prompt: token ? '' : undefined });
  });
}

/* --------------------------------- Picker ---------------------------------- */

// Opens Google's file picker. Resolves with the picked files ([] if cancelled):
// [{ id, name, mimeType, url, iconUrl, sizeBytes }]
export async function pickFromDrive({ mimeTypes, multiple = false, title } = {}) {
  if (!driveConfigured) throw new Error('Google Drive isn’t set up yet. Add the VITE_GOOGLE_* values to .env.local (see README).');
  const [accessToken] = await Promise.all([getToken(), loadPicker()]);
  const { picker } = window.google;

  return new Promise((resolve) => {
    const view = new picker.DocsView(picker.ViewId.DOCS).setIncludeFolders(true).setSelectFolderEnabled(false);
    if (mimeTypes?.length) view.setMimeTypes(mimeTypes.join(','));
    const builder = new picker.PickerBuilder()
      .addView(view)
      .addView(new picker.DocsUploadView())
      .setOAuthToken(accessToken)
      .setDeveloperKey(API_KEY)
      .setAppId(APP_ID)
      .setOrigin(window.location.origin)
      .setCallback((data) => {
        const action = data[picker.Response.ACTION];
        if (action === picker.Action.PICKED) {
          resolve(data[picker.Response.DOCUMENTS].map((d) => ({
            id: d[picker.Document.ID],
            name: d[picker.Document.NAME],
            mimeType: d[picker.Document.MIME_TYPE],
            url: d[picker.Document.URL],
            iconUrl: d[picker.Document.ICON_URL] || null,
            sizeBytes: Number(d.sizeBytes) || null,
          })));
        } else if (action === picker.Action.CANCEL) {
          resolve([]);
        }
      });
    if (multiple) builder.enableFeature(picker.Feature.MULTISELECT_ENABLED);
    if (title) builder.setTitle(title);
    builder.build().setVisible(true);
  });
}

/* ------------------------------ File contents ------------------------------ */

async function driveFetch(url) {
  const accessToken = await getToken();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 401) token = null;
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message || `Google Drive returned ${res.status}`);
  }
  return res;
}

// A picked PDF as a File, or a Google Doc/Slides exported to PDF.
export async function downloadAsPdf(file) {
  const native = file.mimeType === MIME.pdf;
  const url = native
    ? `${DRIVE}/${encodeURIComponent(file.id)}?alt=media&supportsAllDrives=true`
    : `${DRIVE}/${encodeURIComponent(file.id)}/export?mimeType=${encodeURIComponent(MIME.pdf)}`;
  const blob = await (await driveFetch(url)).blob();
  const name = native || /\.pdf$/i.test(file.name) ? file.name : `${file.name}.pdf`;
  return new File([blob], name, { type: MIME.pdf });
}

// A Google Doc's text (for the writing assistant).
export async function exportDocText(file) {
  const res = await driveFetch(`${DRIVE}/${encodeURIComponent(file.id)}/export?mimeType=text%2Fplain`);
  return (await res.text()).replace(/^﻿/, '');
}

// A Google Doc as HTML (headings, bold/italic, lists survive the import into the editor).
export async function exportDocHtml(file) {
  const res = await driveFetch(`${DRIVE}/${encodeURIComponent(file.id)}/export?mimeType=text%2Fhtml`);
  return res.text();
}

/* --------------------------------- Embeds ---------------------------------- */

// URL for an inline preview. The viewer must be signed in to a Google account
// that can open the file (Drive's own sharing rules apply).
export function embedUrl(file) {
  const id = encodeURIComponent(file.id || file.driveId);
  switch (file.mimeType) {
    case MIME.doc: return `https://docs.google.com/document/d/${id}/preview`;
    case MIME.sheet: return `https://docs.google.com/spreadsheets/d/${id}/preview`;
    case MIME.slides: return `https://docs.google.com/presentation/d/${id}/embed`;
    default: return `https://drive.google.com/file/d/${id}/preview`;
  }
}

export function kindLabel(mimeType) {
  if (mimeType === MIME.pdf) return 'PDF';
  if (mimeType === MIME.doc) return 'Doc';
  if (mimeType === MIME.sheet) return 'Sheet';
  if (mimeType === MIME.slides) return 'Slides';
  if (mimeType?.startsWith('image/')) return 'Image';
  return 'File';
}
