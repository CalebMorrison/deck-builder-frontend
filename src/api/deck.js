import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "/api";

const getAuthHeaders = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user && user.token) {
    return {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    };
  }
  return {};
};

const createDeck = async (deckData) => {
  const response = await axios.post(
    `${API_URL}/decks`,
    deckData,
    getAuthHeaders()
  );
  return response.data;
};

const getDecks = async () => {
  const response = await axios.get(`${API_URL}/decks`, getAuthHeaders());
  return response.data;
};

const getDeckById = async (id) => {
  const response = await axios.get(`${API_URL}/decks/${id}`, getAuthHeaders());
  return response.data;
};

const updateDeck = async (id, deckData) => {
  const response = await axios.put(
    `${API_URL}/decks/${id}`,
    deckData,
    getAuthHeaders()
  );
  return response.data;
};

const deleteDeck = async (id) => {
  const response = await axios.delete(
    `${API_URL}/decks/${id}`,
    getAuthHeaders()
  );
  return response.data;
};

const deckService = {
  createDeck,
  getDecks,
  getDeckById,
  updateDeck,
  deleteDeck,
};

export default deckService;
