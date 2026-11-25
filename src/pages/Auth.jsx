import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase.js';
import { useAuth } from '../context/AuthContext.jsx';

const MESSAGES = {
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/invalid-email': 'That email address is not valid.',
  'auth/user-not-found': 'No account uses that email.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/email-already-in-use': 'An account with that email already exists. Log in instead.',
  'auth/weak-password': 'Use a password with at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
  'auth/network-request-failed': 'Network error. Check your connection.',
};

const friendly = (err) => MESSAGES[err.code] || err.message;

function AuthForm({ mode }) {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const isLogin = mode === 'login';

  if (currentUser) return <Navigate to={location.state?.from || '/dashboard'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isLogin) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(friendly(err));
      setBusy(false);
    }
  };

  const reset = async () => {
    setError('');
    if (!email) return setError('Enter your email above first.');
    try {
      await sendPasswordResetEmail(auth, email);
      setNotice('Password reset email sent.');
    } catch (err) {
      setError(friendly(err));
    }
  };

  return (
    <div className="page narrow">
      <form className="card auth-card stack" onSubmit={submit}>
        <h1>{isLogin ? 'Welcome back' : 'Create your account'}</h1>
        <p className="muted" style={{ textAlign: 'center' }}>
          Find sources, pull references out of papers, and cite them in one place.
        </p>
        {error && <div className="alert">{error}</div>}
        {notice && <div className="alert info">{notice}</div>}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password" type="password" required minLength={6}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
          {busy ? <span className="spinner" /> : isLogin ? 'Log in' : 'Sign up'}
        </button>
        <div className="spread small">
          {isLogin ? <Link to="/signup">Create an account</Link> : <Link to="/login">I already have an account</Link>}
          {isLogin && <button type="button" className="ghost small" onClick={reset}>Forgot password?</button>}
        </div>
      </form>
    </div>
  );
}

export const Login = () => <AuthForm mode="login" />;
export const Signup = () => <AuthForm mode="signup" />;
