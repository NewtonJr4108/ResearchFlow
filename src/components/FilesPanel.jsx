import { useState } from 'react';
import { attachDriveFiles, detachDriveFile, toDate, useDriveFiles } from '../data/store.js';
import { driveConfigured, embedUrl, kindLabel } from '../lib/googleDrive.js';
import DriveButton from './DriveButton.jsx';

export default function FilesPanel({ uid, projectId }) {
  const { data: files, loading, error } = useDriveFiles(uid, projectId);
  const [openId, setOpenId] = useState(null);
  const open = files.find((f) => f.id === openId) || null;

  return (
    <div className="stack">
      <div className="spread">
        <p className="muted" style={{ margin: 0 }}>
          Link notes, drafts, datasets and papers from Google Drive. Files stay in Drive; ResearchFlow keeps a link and a preview.
        </p>
        <DriveButton
          label="Add from Google Drive"
          className=""
          multiple
          title="Attach files to this project"
          onPicked={(picked) => attachDriveFiles(uid, projectId, picked)}
        />
      </div>

      {!driveConfigured && (
        <div className="alert warn">
          Google Drive isn’t connected yet. Add <code>VITE_GOOGLE_CLIENT_ID</code>, <code>VITE_GOOGLE_API_KEY</code> and{' '}
          <code>VITE_GOOGLE_APP_ID</code> to <code>.env.local</code> (README → Google Drive), then restart <code>npm run dev</code>.
        </div>
      )}
      {error && <div className="alert">Could not load files: {error.message}</div>}

      {loading ? (
        <p className="muted">Loading files…</p>
      ) : files.length === 0 ? (
        <div className="empty">No Drive files linked yet.</div>
      ) : (
        <div className="files-layout">
          <ul className="file-list">
            {files.map((f) => (
              <li key={f.id} className={f.id === openId ? 'active' : ''}>
                <button className="file-row" onClick={() => setOpenId(f.id === openId ? null : f.id)}>
                  {f.iconUrl ? <img src={f.iconUrl} alt="" width="16" height="16" /> : <span className="badge">{kindLabel(f.mimeType)}</span>}
                  <span className="grow file-name">{f.name}</span>
                  {toDate(f.addedAt) && <span className="small muted">{toDate(f.addedAt).toLocaleDateString()}</span>}
                </button>
              </li>
            ))}
          </ul>

          {open ? (
            <div className="card file-preview">
              <div className="spread" style={{ marginBottom: '0.6rem' }}>
                <strong className="grow" style={{ overflowWrap: 'anywhere' }}>{open.name}</strong>
                <div className="row">
                  <a className="btn secondary small" href={open.url} target="_blank" rel="noreferrer">Open in Drive</a>
                  <button className="danger small" onClick={() => { detachDriveFile(uid, projectId, open.id); setOpenId(null); }}>Unlink</button>
                </div>
              </div>
              <iframe title={open.name} src={embedUrl({ id: open.driveId, mimeType: open.mimeType })} allow="autoplay" />
              <p className="small muted" style={{ margin: '0.5rem 0 0' }}>
                Preview blank? Sign in to Google in this browser with an account that can open this file.
              </p>
            </div>
          ) : (
            <div className="empty file-preview">Select a file to preview it here.</div>
          )}
        </div>
      )}
    </div>
  );
}
