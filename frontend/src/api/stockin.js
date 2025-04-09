// src/api/stockin.js
import axios from "axios";
const API_BASE_URL = "http://127.0.0.1:8000/api";

export const fetchStockInRecords = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/stockin/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching stock-in records:", error);
    return [];
  }
};

export const addStockInRecord = async (data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/stockin/`, data);
    console.log("Stock-in added:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error adding stock-in record:", error);
    throw error;
  }
};

