import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const HomePage = () => {
  const { user } = useAuth();

  return (
    <div style={{ textAlign: "center", padding: "50px 20px" }}>
      <h1>Welcome to the MTG Commander Deck Builder!</h1>
      <p>
        Build, manage, and optimize your Magic: The Gathering Commander decks.
      </p>
      {user ? (
        <div style={{ marginTop: "30px" }}>
          <h2>Hello, {user.username}!</h2>
          <p>Ready to build or refine your next deck?</p>
          <Link to="/dashboard" style={{ marginRight: "15px" }}>
            <button>Go to Dashboard</button>
          </Link>
          <Link to="/build">
            <button>Start New Deck</button>
          </Link>
        </div>
      ) : (
        <div style={{ marginTop: "30px" }}>
          <p>Join now to start building your ultimate Commander decks.</p>
          <Link to="/register" style={{ marginRight: "15px" }}>
            <button>Register</button>
          </Link>
          <Link to="/login">
            <button>Login</button>
          </Link>
        </div>
      )}
      <p style={{ marginTop: "50px", fontSize: "0.9em", color: "#666" }}>
        This application uses the Scryfall API for card data.
      </p>
    </div>
  );
};

export default HomePage;
