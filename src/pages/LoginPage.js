import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // 'success' or 'danger'

  const { user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard"); // If already logged in, redirect
    }
  }, [user, navigate]);

  const submitHandler = async (e) => {
    e.preventDefault();
    setMessage("");
    setMessageType("");

    try {
      await login(email, password);
      setMessage("Login successful! Redirecting to dashboard...");
      setMessageType("success");
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (error) {
      const errorMessage =
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message;
      setMessage(errorMessage);
      setMessageType("danger");
    }
  };

  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "50px auto",
        padding: "20px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
      }}
    >
      <h2>Login</h2>
      {message && <div className={`alert alert-${messageType}`}>{message}</div>}
      <form onSubmit={submitHandler}>
        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" style={{ width: "100%", padding: "12px" }}>
          Login
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
