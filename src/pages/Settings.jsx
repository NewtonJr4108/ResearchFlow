import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { uploadProfileImage } from '../data/store.js';
import { StyleSelect } from '../components/papers.jsx';

export default function Settings() {
  const { currentUser, settings, darkMode, citationStyle, updateSettings } = useAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState({ busy: false, error: '', done: false });

  const pick = (e) => {
    const f = e.target.files[0];
    if (preview) URL.revokeObjectURL(preview);
    if (f && f.type.startsWith('image/')) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    } else {
      setFile(null);
      setPreview(null);
    }
  };

  const upload = async () => {
    setStatus({ busy: true, error: '', done: false });
    try {
      await uploadProfileImage(currentUser.uid, file);
      setFile(null);
      setPreview(null);
      setStatus({ busy: false, error: '', done: true });
    } catch (err) {
      setStatus({ busy: false, error: `Upload failed: ${err.code || err.message}`, done: false });
    }
  };

  return (
    <div className="page narrow">
      <h1>Settings</h1>
      <div className="card stack">
        <div>
          <label>Account</label>
          <div>{currentUser.email}</div>
        </div>

        <div>
          <label>Theme</label>
          <div className="row">
            <button className={darkMode ? 'secondary' : ''} onClick={() => updateSettings({ darkMode: false })}>Light</button>
            <button className={darkMode ? '' : 'secondary'} onClick={() => updateSettings({ darkMode: true })}>Dark</button>
          </div>
        </div>

        <div>
          <label>Default citation style</label>
          <StyleSelect value={citationStyle} onChange={(v) => updateSettings({ citationStyle: v })} />
        </div>

        <div>
          <label htmlFor="avatar">Profile image</label>
          <div className="row">
            {(preview || settings.profileImageUrl) && (
              <img src={preview || settings.profileImageUrl} alt="Profile" className="avatar" style={{ width: 64, height: 64 }} />
            )}
            <input id="avatar" type="file" accept="image/*" onChange={pick} style={{ width: 'auto' }} />
            <button onClick={upload} disabled={!file || status.busy}>{status.busy ? 'Uploading…' : 'Upload'}</button>
          </div>
          {status.error && <div className="alert" style={{ marginTop: '0.5rem' }}>{status.error}</div>}
          {status.done && <div className="alert info" style={{ marginTop: '0.5rem' }}>Profile image updated.</div>}
        </div>
      </div>
    </div>
  );
}
