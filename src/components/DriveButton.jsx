import { useState } from 'react';
import { driveConfigured, pickFromDrive } from '../lib/googleDrive.js';

const DRIVE_ICON = (
  <svg width="16" height="16" viewBox="0 0 87.3 78" aria-hidden="true">
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
    <path d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44A9.06 9.06 0 0 0 0 53h27.5z" fill="#00ac47" />
    <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.5z" fill="#ea4335" />
    <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
    <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
    <path d="M73.4 26.5 60.7 4.5c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
  </svg>
);

// "Choose from Google Drive" button. Calls onPicked(files) with the picked files,
// and shows its own errors (popup blocked, not configured, …).
export default function DriveButton({ label = 'Google Drive', mimeTypes, multiple, title, onPicked, className = 'secondary', disabled }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const open = async () => {
    setError('');
    setBusy(true);
    try {
      const files = await pickFromDrive({ mimeTypes, multiple, title });
      if (files.length) await onPicked(files);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <span className="row" style={{ gap: '0.4rem' }}>
      <button
        type="button"
        className={className}
        onClick={open}
        disabled={disabled || busy}
        title={driveConfigured ? undefined : 'Google Drive isn’t configured yet. See README.'}
      >
        {busy ? <span className="spinner" /> : DRIVE_ICON} {label}
      </button>
      {error && <span className="small" style={{ color: 'var(--danger)' }}>{error}</span>}
    </span>
  );
}
