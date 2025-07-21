import axios from "axios";

// For this project, you'll call your own backend, which then calls Scryfall.
// This is good for rate limiting and potentially caching on your backend.
const API_URL = process.env.REACT_APP_BACKEND_URL || "/api";

const searchCards = async (query, page = 1) => {
  const response = await axios.get(`${API_URL}/cards/searchCards`, {
    params: { q: query, page: page },
  });
  return response.data; // This will return Scryfall's object directly {data: [], has_more: true, etc.}
};

const getCardById = async (scryfallId) => {
  const response = await axios.get(`${API_URL}/cards/${scryfallId}`);
  return response.data;
};

const getCardByName = async (name) => {
  const response = await axios.get(`${API_URL}/cards/name/${name}`);
  return response.data;
};

const scryfallService = {
  searchCards,
  getCardById,
  getCardByName,
};

export default scryfallService;
