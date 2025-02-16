import axios from "./api"; // Ensure this points to your configured Axios instance

const API_URL = "/sales/orders"; // Adjust this based on your backend API endpoint

// Fetch all pending & in-progress sales orders
export const fetchSalesOrders = async () => {
    try {
        const response = await axios.get(`${API_URL}/pending`);
        return response.data; // Returns { pending: [...], inProgress: [...] }
    } catch (error) {
        console.error("Error fetching sales orders:", error);
        throw error;
    }
};

// Fetch previous (completed) sales orders
export const fetchPreviousSalesOrders = async () => {
    try {
        const response = await axios.get(`${API_URL}/completed`); // Ensure backend has an endpoint for completed orders
        return response.data;
    } catch (error) {
        console.error("Error fetching previous sales orders:", error);
        throw error;
    }
};

// Confirm an order (Moves it from 'Pending' to 'In Progress')
export const confirmOrder = async (orderId) => {
    try {
        const response = await axios.put(`${API_URL}/${orderId}/update-status`, { status: "IN_PROGRESS" });
        return response.data;
    } catch (error) {
        console.error("Error confirming order:", error);
        throw error;
    }
};

// Delete an order
export const deleteOrder = async (orderId) => {
    try {
        await axios.delete(`${API_URL}/${orderId}`);
    } catch (error) {
        console.error("Error deleting order:", error);
        throw error;
    }
};
