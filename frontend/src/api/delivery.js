import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api/deliveries/";

export const fetchDeliveries = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const updateDeliveryStatus = async (deliveryId, status) => {
  const response = await axios.put(`${API_URL}${deliveryId}/`, { status });
  return response.data;
};
