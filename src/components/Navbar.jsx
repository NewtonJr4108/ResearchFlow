import { NavLink, Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { currentUser, settings } = useAuth();

  return (
    <nav className="navbar">
      <Link to={currentUser ? '/dashboard' : '/login'} className="brand">
        Research<span>Flow</span>
      </Link>
      {currentUser ? (
        <>
          <div className="nav-links">
            <NavLink to="/dashboard">Projects</NavLink>
            <NavLink to="/research">Research</NavLink>
            <NavLink to="/settings">Settings</NavLink>
          </div>
          <div className="row">
            {settings.profileImageUrl && <img className="avatar" src={settings.profileImageUrl} alt="" />}
            <button className="ghost" onClick={() => signOut(auth)}>Log out</button>
          </div>
        </>
      ) : (
        <div className="nav-links" />
      )}
    </nav>
  );
}
