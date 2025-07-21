import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import deckService from "../api/deck";
import { useAuth } from "../context/AuthContext";

const DashboardPage = () => {
  const { user } = useAuth();
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDecks = async () => {
      try {
        const userDecks = await deckService.getDecks();
        setDecks(userDecks);
      } catch (err) {
        setError("Failed to fetch decks. Please try again.");
        console.error("Error fetching decks:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDecks();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleDeleteDeck = async (deckId) => {
    if (window.confirm("Are you sure you want to delete this deck?")) {
      try {
        await deckService.deleteDeck(deckId);
        setDecks(decks.filter((deck) => deck._id !== deckId));
      } catch (err) {
        setError("Failed to delete deck. Please try again.");
        console.error("Error deleting deck:", err);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        Loading decks... (If it is the first load in awhile the backend will be
        spinning up)
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  if (!user) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        Please log in to view your dashboard.
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>{user.username}'s Decks</h2>
      <Link to="/build">
        <button style={{ marginBottom: "20px" }}>+ Create New Deck</button>
      </Link>

      {decks.length === 0 ? (
        <p>You haven't created any decks yet. Start building one!</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "20px",
          }}
        >
          {decks.map((deck) => (
            <div
              key={deck._id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "15px",
                boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                backgroundColor: "white",
              }}
            >
              <h3 style={{ margin: "0 0 10px 0", fontSize: "1.2em" }}>
                {deck.name}
              </h3>
              {deck.commander && deck.commander.imageUrl && (
                <img
                  src={deck.commander.imageUrl}
                  alt={deck.commander.name}
                  style={{
                    width: "100%",
                    borderRadius: "4px",
                    marginBottom: "10px",
                  }}
                />
              )}
              <p>Commander: {deck.commander ? deck.commander.name : "N/A"}</p>
              <p>
                Total Cards: {deck.stats ? deck.stats.totalCards : "N/A"}
              </p>{" "}
              {/* +1 for commander */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "10px",
                  marginTop: "15px",
                }}
              >
                <Link to={`/deck/${deck._id}`} style={{ flexGrow: 1 }}>
                  <button style={{ width: "100%", backgroundColor: "#28a745" }}>
                    Edit Deck
                  </button>
                </Link>
                <button
                  onClick={() => handleDeleteDeck(deck._id)}
                  style={{ width: "100%", backgroundColor: "#dc3545" }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
