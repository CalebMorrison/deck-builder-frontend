import React, { useEffect, useState } from "react"; // Import useEffect and useState
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import axios from "axios"; // Import Axios

import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import HomePage from "./pages/HomePage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import DeckBuilderPage from "./pages/DeckBuilderPage";
import PrivateRoute from "./components/PrivateRoute";
import "./styles/App.css"; // Your existing CSS

// Ensure your API_URL correctly points to your Render backend base URL
// Make sure you have REACT_APP_API_URL set in your .env file for Vercel deployment
// e.g., REACT_APP_API_URL=https://your-render-app-name.onrender.com/api
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function App() {
  const [isLoadingBackend, setIsLoadingBackend] = useState(true);
  const [backendMessage, setBackendMessage] = useState("Waking up backend...");

  useEffect(() => {
    const wakeUpBackend = async () => {
      setIsLoadingBackend(true);
      setBackendMessage("Waking up backend...");

      let connectionRefused = false;

      const tryPing = async () => {
        try {
          await axios.get(`${API_URL}/health`, { timeout: 30000 });
          return true;
        } catch (error) {
          if (
            error.code === "ECONNREFUSED" ||
            error.message.includes("connect ECONNREFUSED")
          ) {
            console.warn("Connection refused. Backend likely asleep.");
            connectionRefused = true;
          } else {
            console.error("Backend wake-up ping error:", error);
          }
          return false;
        }
      };

      let success = await tryPing();

      // Retry loop if initial ping fails due to connection refused
      const maxRetries = 5;
      let retries = 0;
      const delay = (ms) => new Promise((res) => setTimeout(res, ms));

      while (!success && retries < maxRetries) {
        await delay(5000); // Wait 5 seconds before retrying
        retries++;
        success = await tryPing();
      }

      if (success) {
        setBackendMessage("Backend is awake!");
        console.log("Backend wake-up ping successful.");
        if (connectionRefused) {
          // Add the 50-second delay if we got a refusal first
          await delay(50000);
        }
      } else {
        setBackendMessage(
          "Backend wake-up ping failed. It might still be starting or an error occurred."
        );
      }

      setIsLoadingBackend(false);
    };

    wakeUpBackend();
  }, []);

  // Conditional rendering: Show loading screen if backend is still waking up
  if (isLoadingBackend) {
    return (
      <div className="loading-container">
        <div className="spinner"></div> {/* Basic CSS spinner */}
        <h2>{backendMessage}</h2>
        <p>This may take a moment if the backend was inactive.</p>
        <p>
          Unfortunately with Render free version it shuts down with inactivity
          and this ping will wake it up in ~50 seconds
        </p>
      </div>
    );
  }

  // If backend is awake, render your main application
  return (
    <Router>
      <div className="App">
        <Header />
        <main className="container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <DashboardPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/build"
              element={
                <PrivateRoute>
                  <DeckBuilderPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/deck/:id"
              element={
                <PrivateRoute>
                  <DeckBuilderPage />
                </PrivateRoute>
              }
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
