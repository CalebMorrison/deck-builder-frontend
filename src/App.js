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
      try {
        setIsLoadingBackend(true); // Ensure loading state is true at the start of the ping
        setBackendMessage("Waking up backend...");

        // Send a lightweight GET request to your backend's health endpoint
        // Use a longer timeout (e.g., 30 seconds = 30000 ms) for this initial ping
        await axios.get(`${API_URL}/health`, { timeout: 30000 });
        setBackendMessage("Backend is awake!");
        console.log("Backend wake-up ping successful.");
      } catch (error) {
        setBackendMessage(
          "Backend wake-up ping failed. It might still be starting or an error occurred."
        );
        console.error("Backend wake-up ping error:", error);
        // Important: Even if it fails, we still want to render the app
        // because the server might just be slow, or the error isn't critical
        // for basic frontend display. You can add more sophisticated error handling here.
      } finally {
        setIsLoadingBackend(false); // Once the ping attempt is made, stop loading
      }
    };

    // Call the ping function on component mount
    wakeUpBackend();
  }, []); // Empty dependency array means this runs only once on mount

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
