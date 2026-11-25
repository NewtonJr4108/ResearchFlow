import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// Apply the last-used theme before first paint to avoid a flash.
try {
  document.documentElement.dataset.theme = localStorage.getItem('rf-theme') === 'dark' ? 'dark' : 'light';
} catch {
  /* ignore */
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
