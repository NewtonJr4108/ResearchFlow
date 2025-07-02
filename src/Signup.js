import React, { useRef, useState } from "react";
import { auth } from "./firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";

export default function Signup() {
  const emailRef = useRef();
  const passwordRef = useRef();
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    createUserWithEmailAndPassword(auth, emailRef.current.value, passwordRef.current.value)
      .catch(err => setError(err.message));
  }

  return (
    <div>
      <h2>Sign Up</h2>
      {error && <p>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input type="email" ref={emailRef} placeholder="Email" required /><br/>
        <input type="password" ref={passwordRef} placeholder="Password" required /><br/>
        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
}
