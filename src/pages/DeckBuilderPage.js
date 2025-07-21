import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import scryfallService from "../api/scryfall";
import deckService from "../api/deck";
import { useAuth } from "../context/AuthContext";
// Chart.js components
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const DeckBuilderPage = () => {
  const { id: deckId } = useParams(); // Get deck ID from URL for editing
  const navigate = useNavigate();
  const { user } = useAuth();

  const [deckName, setDeckName] = useState("");
  const [commander, setCommander] = useState(null); // { scryfallId, name, imageUrl, colorIdentity }
  const [mainboard, setMainboard] = useState([]); // [{ scryfallId, name, count, imageUrl, type_line, cmc, colors, color_identity }]
  const [sideboard, setSideboard] = useState([]); // [{ scryfallId, name, count }] - For future use

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(false);

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [validationErrors, setValidationErrors] = useState([]); // From backend
  const [deckStats, setDeckStats] = useState(null); // From backend

  // --- Load Deck for Editing ---
  useEffect(() => {
    if (deckId) {
      const fetchDeck = async () => {
        try {
          setSaveMessage("Loading deck...");
          setMessageType("info");
          const fetchedDeck = await deckService.getDeckById(deckId);

          setDeckName(fetchedDeck.name);
          setCommander(fetchedDeck.commander);

          // For mainboard and sideboard, we need to fetch full card data
          const mainboardWithFullData = await Promise.all(
            fetchedDeck.mainboard.map(async (cardRef) => {
              const fullCard = await scryfallService.getCardByName(
                cardRef.name
              );
              return { ...cardRef, ...fullCard }; // Merge count with full card data
            })
          );
          setMainboard(mainboardWithFullData);
          setSideboard(fetchedDeck.sideboard); // Assuming sideboard also needs full data later
          setDeckStats(fetchedDeck.stats); // Use stored stats initially

          setSaveMessage("Deck loaded successfully!");
          setMessageType("success");
          setTimeout(() => setSaveMessage(""), 2000);
        } catch (err) {
          console.error("Error loading deck:", err);
          setSaveMessage(
            "Failed to load deck: " +
              (err.response?.data?.message || err.message)
          );
          setMessageType("danger");
        }
      };
      fetchDeck();
    } else {
      // Clear for new deck
      setDeckName("");
      setCommander(null);
      setMainboard([]);
      setSideboard([]);
      setDeckStats(null);
    }
  }, [deckId]);

  // --- Card Search Logic (Debounced) ---
  const handleSearch = useCallback(async (query, pageNum) => {
    if (query.trim() === "") {
      setSearchResults([]);
      setHasMorePages(false);
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    try {
      const response = await scryfallService.searchCards(query, pageNum);
      // For basic lands, Scryfall returns multiple printings, just take one.
      // For this builder, assume user wants 1 of each non-basic.
      const uniqueCards = response.data.filter(
        (card, index, self) =>
          index ===
          self.findIndex(
            (c) => c.name === card.name && c.set === card.set // Consider set for unique if printings matter
          )
      );
      setSearchResults(uniqueCards);
      setHasMorePages(response.has_more);
      setCurrentPage(pageNum);
    } catch (err) {
      console.error("Search error:", err);
      setSearchError(
        "Failed to search cards: " +
          (err.response?.data?.message || err.message)
      );
      setSearchResults([]);
      setHasMorePages(false);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      handleSearch(searchTerm, 1); // Reset to page 1 on new search term
    }, 500); // Debounce by 500ms
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, handleSearch]);

  const handlePageChange = (newPage) => {
    handleSearch(searchTerm, newPage);
  };

  // --- Deck Building Actions ---
  const setAsCommander = (card) => {
    if (
      !card.type_line.includes("Legendary Creature") &&
      !(
        card.type_line.includes("Planeswalker") &&
        card.oracle_text.includes("can be your commander")
      )
    ) {
      setSaveMessage(
        "Only legendary creatures or specific planeswalkers can be commanders."
      );
      setMessageType("danger");
      return;
    }
    if (card.legalities && card.legalities.commander !== "legal") {
      setSaveMessage(
        "This card is not legal as a commander in the Commander format."
      );
      setMessageType("danger");
      return;
    }

    setCommander({
      scryfallId: card.id,
      name: card.name,
      imageUrl: card.image_uris.normal || null,
      colorIdentity: card.color_identity,
    });
    setSaveMessage(""); // Clear previous messages
    setMessageType("");
  };

  const addCardToMainboard = (card) => {
    if (!commander) {
      setSaveMessage("Please select a commander first.");
      setMessageType("danger");
      return;
    }

    // Check color identity of the card against commander's color identity
    const commanderColors = new Set(commander.colorIdentity || []);
    const cardColors = new Set(card.color_identity || []);
    for (const color of cardColors) {
      if (!commanderColors.has(color)) {
        setSaveMessage(
          `Card "${card.name}" is outside commander's color identity.`
        );
        setMessageType("danger");
        return;
      }
    }

    // Check legality
    if (card.legalities && card.legalities.commander !== "legal") {
      setSaveMessage(
        `Card "${card.name}" is ${card.legalities.commander} in Commander format.`
      );
      setMessageType("danger");
      return;
    }

    const isBasicLand = card.type_line.includes("Basic Land");

    setMainboard((prev) => {
      const existingCard = prev.find((c) => c.scryfallId === card.id);
      if (existingCard) {
        // If it's a basic land, increment count
        if (isBasicLand) {
          return prev.map((c) =>
            c.scryfallId === card.id ? { ...c, count: c.count + 1 } : c
          );
        } else {
          // Non-basic lands or other cards: Check for duplicates. Max 1 copy.
          setSaveMessage(
            `Only one copy of "${card.name}" allowed (excluding basic lands).`
          );
          setMessageType("danger");
          return prev; // Do not add
        }
      }
      // Add new card (default count 1)
      return [
        ...prev,
        {
          scryfallId: card.id,
          name: card.name,
          count: 1,
          imageUrl: card.image_uris.normal || null,
          type_line: card.type_line,
          cmc: card.cmc,
          colors: card.colors,
          color_identity: card.color_identity,
        },
      ];
    });
    setSaveMessage(""); // Clear previous messages
    setMessageType("");
  };

  const removeCardFromMainboard = (scryfallId, removeAll = false) => {
    setMainboard((prev) => {
      const cardToRemove = prev.find((c) => c.scryfallId === scryfallId);
      if (cardToRemove) {
        if (removeAll || cardToRemove.count === 1) {
          return prev.filter((c) => c.scryfallId !== scryfallId);
        } else {
          return prev.map((c) =>
            c.scryfallId === scryfallId ? { ...c, count: c.count - 1 } : c
          );
        }
      }
      return prev;
    });
  };

  // --- Save Deck Logic ---
  const handleSaveDeck = async () => {
    if (!deckName.trim()) {
      setSaveMessage("Deck name cannot be empty.");
      setMessageType("danger");
      return;
    }
    if (!commander) {
      setSaveMessage("Please select a commander.");
      setMessageType("danger");
      return;
    }

    setSaveLoading(true);
    setSaveMessage("");
    setMessageType("");
    setValidationErrors([]); // Clear previous validation errors

    const deckDataToSave = {
      name: deckName,
      commander: {
        scryfallId: commander.scryfallId,
        name: commander.name,
        imageUrl: commander.imageUrl,
        colorIdentity: commander.colorIdentity,
      },
      mainboard: mainboard.map((card) => ({
        scryfallId: card.scryfallId,
        name: card.name,
        count: card.count,
        imageUrl: card.imageUrl,
        cmc: card.cmc,
        color_identity: card.color_identity,
        type_line: card.type_line,
        colors: card.colors,
      })),
      sideboard: sideboard.map((card) => ({
        // For simplicity, assume sideboard also has scryfallId, name, count
        scryfallId: card.scryfallId,
        name: card.name,
        count: card.count,
      })),
    };

    try {
      let response;
      if (deckId) {
        response = await deckService.updateDeck(deckId, deckDataToSave);
        setSaveMessage("Deck updated successfully!");
      } else {
        response = await deckService.createDeck(deckDataToSave);
        setSaveMessage("Deck created successfully!");
        navigate(`/deck/${response._id}`); // Update URL to reflect new deck ID
      }
      setMessageType("success");
      setDeckStats(response.stats); // Update with fresh stats from backend
      // No need to set mainboard/commander again if backend returns full details
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      console.error("Error saving deck:", error.response?.data || error);
      const backendMessage =
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message;
      setSaveMessage("Failed to save deck: " + backendMessage);
      setMessageType("danger");
      if (backendMessage.includes("Deck validation failed:")) {
        setValidationErrors(
          backendMessage.split("Deck validation failed: ")[1].split(", ")
        );
      } else {
        setValidationErrors([backendMessage]);
      }
    } finally {
      setSaveLoading(false);
    }
  };

  // --- Render Helpers ---
  const groupCardsByType = (cards) => {
    const grouped = {
      Commander: commander ? [{ ...commander, count: 1 }] : [], // Commander is always count 1
      Creature: [],
      Instant: [],
      Sorcery: [],
      Artifact: [],
      Enchantment: [],
      Planeswalker: [],
      Land: [],
      Other: [],
    };

    cards.forEach((card) => {
      const typeLine = card.type_line.toLowerCase();
      if (typeLine.includes("creature")) grouped.Creature.push(card);
      else if (typeLine.includes("instant")) grouped.Instant.push(card);
      else if (typeLine.includes("sorcery")) grouped.Sorcery.push(card);
      else if (typeLine.includes("artifact")) grouped.Artifact.push(card);
      else if (typeLine.includes("enchantment")) grouped.Enchantment.push(card);
      else if (typeLine.includes("planeswalker"))
        grouped.Planeswalker.push(card);
      else if (typeLine.includes("land")) grouped.Land.push(card);
      else grouped.Other.push(card);
    });

    // Sort cards within each group alphabetically
    for (const type in grouped) {
      if (grouped[type]) {
        grouped[type].sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    return grouped;
  };

  const groupedMainboard = groupCardsByType(mainboard);

  // --- Chart Data ---
  const manaCurveData = deckStats?.manaCurve
    ? {
        labels: Object.keys(deckStats.manaCurve),
        datasets: [
          {
            label: "Number of Cards",
            data: Object.values(deckStats.manaCurve),
            backgroundColor: "rgba(75, 192, 192, 0.6)",
          },
        ],
      }
    : null;

  const colorBreakdownData = deckStats?.colorBreakdown
    ? {
        labels: Object.keys(deckStats.colorBreakdown).filter(
          (c) => deckStats.colorBreakdown[c] > 0
        ),
        datasets: [
          {
            data: Object.values(deckStats.colorBreakdown).filter((v) => v > 0),
            backgroundColor: [
              "rgba(255, 255, 255, 0.6)", // W
              "rgba(0, 0, 255, 0.6)", // U
              "rgba(0, 0, 0, 0.6)", // B
              "rgba(255, 0, 0, 0.6)", // R
              "rgba(0, 128, 0, 0.6)", // G
              "rgba(128, 128, 128, 0.6)", // C
            ],
            borderColor: "white",
            borderWidth: 1,
          },
        ],
      }
    : null;

  return (
    <div
      style={{
        padding: "20px",
        display: "flex",
        gap: "20px",
        flexWrap: "wrap",
      }}
    >
      {/* Left Column: Deck Editor */}
      <div
        style={{
          flex: "2 1 600px",
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
        }}
      >
        <h2>{deckId ? "Edit Deck" : "New Deck"}</h2>
        {saveMessage && (
          <div className={`alert alert-${messageType}`}>{saveMessage}</div>
        )}
        {validationErrors.length > 0 && (
          <div className="alert alert-danger" style={{ marginBottom: "15px" }}>
            <h4>Validation Errors:</h4>
            <ul>
              {validationErrors.map((err, index) => (
                <li key={index}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ marginBottom: "20px" }}>
          <label
            htmlFor="deckName"
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            Deck Name:
          </label>
          <input
            type="text"
            id="deckName"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="My Awesome Commander Deck"
            required
          />
        </div>

        <button
          onClick={handleSaveDeck}
          disabled={saveLoading}
          style={{ marginBottom: "20px", width: "100%" }}
        >
          {saveLoading ? "Saving..." : deckId ? "Update Deck" : "Save Deck"}
        </button>

        {/* Commander Section */}
        <h3
          style={{
            borderBottom: "1px solid #eee",
            paddingBottom: "10px",
            marginBottom: "15px",
          }}
        >
          Commander
        </h3>
        {commander ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "15px",
              marginBottom: "20px",
              border: "1px solid #ddd",
              padding: "10px",
              borderRadius: "4px",
            }}
          >
            <img
              src={
                commander.imageUrl ||
                "https://via.placeholder.com/60x80?text=No+Image"
              }
              alt={commander.name}
              style={{
                width: "60px",
                height: "80px",
                objectFit: "cover",
                borderRadius: "4px",
              }}
            />
            <div>
              <p style={{ margin: 0, fontWeight: "bold" }}>{commander.name}</p>
              <button
                onClick={() => setCommander(null)}
                style={{
                  background: "none",
                  color: "#dc3545",
                  border: "none",
                  padding: "0",
                  cursor: "pointer",
                  fontSize: "0.9em",
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <p>No commander selected. Search and click "Set as Commander".</p>
        )}

        {/* Mainboard Section */}
        <h3
          style={{
            borderBottom: "1px solid #eee",
            paddingBottom: "10px",
            marginBottom: "15px",
          }}
        >
          Mainboard ({mainboard.reduce((acc, card) => acc + card.count, 0)}/99)
        </h3>
        {Object.entries(groupedMainboard).map(
          ([type, cards]) =>
            cards.length > 0 &&
            type !== "Commander" && (
              <div key={type} style={{ marginBottom: "15px" }}>
                <h4>
                  {type} ({cards.reduce((acc, card) => acc + card.count, 0)})
                </h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {cards.map((card) => (
                    <div
                      key={card.scryfallId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        border: "1px solid #eee",
                        borderRadius: "4px",
                        padding: "5px",
                        backgroundColor: "#f9f9f9",
                      }}
                    >
                      <img
                        src={
                          card.imageUrl ||
                          "https://via.placeholder.com/40x55?text=No+Image"
                        }
                        alt={card.name}
                        style={{
                          width: "40px",
                          height: "55px",
                          objectFit: "cover",
                          borderRadius: "2px",
                          marginRight: "5px",
                        }}
                      />
                      <div>
                        <p style={{ margin: 0, fontSize: "0.9em" }}>
                          {card.count > 1 ? `${card.count}x ` : ""}
                          {card.name}
                        </p>
                        <button
                          onClick={() =>
                            removeCardFromMainboard(card.scryfallId)
                          }
                          style={{
                            background: "none",
                            color: "#dc3545",
                            border: "none",
                            padding: "0",
                            cursor: "pointer",
                            fontSize: "0.8em",
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
        )}
      </div>

      {/* Right Column: Card Search & Stats */}
      <div
        style={{
          flex: "1 1 300px",
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
        }}
      >
        <h3
          style={{
            borderBottom: "1px solid #eee",
            paddingBottom: "10px",
            marginBottom: "15px",
          }}
        >
          Card Search
        </h3>
        <input
          type="text"
          placeholder="Search for cards..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ marginBottom: "15px" }}
        />

        {searchLoading && <p>Searching...</p>}
        {searchError && <div className="alert alert-danger">{searchError}</div>}

        <div
          style={{
            maxHeight: "400px",
            overflowY: "auto",
            border: "1px solid #eee",
            padding: "10px",
            borderRadius: "4px",
          }}
        >
          {searchResults.length === 0 &&
            !searchLoading &&
            !searchError &&
            searchTerm && <p>No cards found.</p>}
          {searchResults.map((card) => (
            <div
              key={card.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "10px",
                padding: "8px",
                borderBottom: "1px solid #eee",
              }}
            >
              <img
                src={
                  card.image_uris
                    ? card.image_uris.small
                    : card.card_faces && card.card_faces[0].image_uris
                    ? card.card_faces[0].image_uris.small
                    : "https://via.placeholder.com/60x80?text=No+Image"
                }
                alt={card.name}
                style={{
                  width: "60px",
                  height: "80px",
                  objectFit: "cover",
                  borderRadius: "4px",
                }}
              />
              <div style={{ flexGrow: 1 }}>
                <p style={{ margin: 0, fontWeight: "bold" }}>{card.name}</p>
                <p style={{ margin: 0, fontSize: "0.8em", color: "#666" }}>
                  {card.type_line}
                </p>
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "5px" }}
              >
                <button
                  onClick={() => setAsCommander(card)}
                  style={{
                    padding: "5px 10px",
                    fontSize: "0.8em",
                    backgroundColor: "#6c757d",
                  }}
                >
                  Set as Commander
                </button>
                <button
                  onClick={() => addCardToMainboard(card)}
                  style={{ padding: "5px 10px", fontSize: "0.8em" }}
                >
                  Add to Mainboard
                </button>
              </div>
            </div>
          ))}
          {hasMorePages && (
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={searchLoading}
              style={{ width: "100%", marginTop: "10px" }}
            >
              Load More
            </button>
          )}
        </div>

        {/* Deck Statistics */}
        <h3
          style={{
            borderBottom: "1px solid #eee",
            paddingBottom: "10px",
            marginTop: "30px",
            marginBottom: "15px",
          }}
        >
          Deck Statistics
        </h3>
        {deckStats ? (
          <div>
            <p>Total Mainboard Cards: {deckStats.totalCards}/99</p>
            <p>Average CMC: {deckStats.avgCmc}</p>
            <div style={{ marginBottom: "20px" }}>
              <h4>Mana Curve</h4>
              {manaCurveData ? <Bar data={manaCurveData} /> : <p>No data</p>}
            </div>
            {/* 
            <div style={{ marginBottom: "20px" }}>
              <h4>Color Breakdown</h4>
              {colorBreakdownData ? (
                <Pie data={colorBreakdownData} />
              ) : (
                <p>No data</p>
              )}
            </div>
            {/* You can add more stats like card type breakdown 
            <h4>Card Type Breakdown</h4>
            <ul>
              {Object.entries(deckStats.cardTypes || {}).map(
                ([type, count]) =>
                  count > 0 && (
                    <li key={type}>
                      {type}: {count}
                    </li>
                  )
              )}
            </ul>
            */}
          </div>
        ) : (
          <p>Add cards to your deck to see statistics.</p>
        )}
      </div>
    </div>
  );
};

export default DeckBuilderPage;
