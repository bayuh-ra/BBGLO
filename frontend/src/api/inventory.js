import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000/api"; // Ensure this does not end with inventory

export const fetchInventoryItems = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/inventory/`); // Corrected path
        console.log("Fetched Inventory Data:", response.data); // Debugging log
        return response.data;
    } catch (error) {
        console.error("Error fetching inventory:", error);
        return [];
    }
};

export const addInventoryItem = async (item) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/inventory/`, {
            item_name: item.item_name,
            brand: item.brand, // ✅ added
            size: item.size,   // ✅ added
            category: item.category,
            quantity: parseInt(item.quantity, 10),
            uom: item.uom,
            cost_price: parseFloat(item.cost_price),
            selling_price: parseFloat(item.selling_price),
            supplier: item.supplier,
        });
        return response.data;
    } catch (error) {
        console.error("Error adding inventory item:", error);
        throw error;
    }
};


export const deleteInventoryItem = async (itemId) => {
    if (!itemId) {
        throw new Error("Item ID is required to delete an item.");
    }
    try {
        const response = await axios.delete(`${API_BASE_URL}/inventory/${itemId}/`);
        return response.data;
    } catch (error) {
        console.error("Error deleting inventory item:", error);
        throw error;
    }
};

export const updateInventoryItem = async (itemId, item) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/inventory/${itemId}/`, {
            item_name: item.item_name,
            brand: item.brand, // ✅ added
            size: item.size,   // ✅ added
            category: item.category,
            quantity: parseInt(item.quantity, 10),
            uom: item.uom,
            cost_price: parseFloat(item.cost_price),
            selling_price: parseFloat(item.selling_price),
            supplier: item.supplier,
        });
        return response.data;
    } catch (error) {
        console.error("Error updating inventory item:", error);
        throw error;
    }
};

