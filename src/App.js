import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import HomePage from "./pages/HomePage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import DeckBuilderPage from "./pages/DeckBuilderPage";
import PrivateRoute from "./components/PrivateRoute"; // For protected routes
import "./styles/App.css"; // You'll create this

function App() {
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
            />{" "}
            {/* For editing existing decks */}
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
