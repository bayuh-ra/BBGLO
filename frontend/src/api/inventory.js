import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api/inventory/";

export const fetchInventoryItems = async () => {
    const response = await axios.get(API_URL);
    return response.data;
};

export const addInventoryItem = async (item) => {
    const response = await axios.post(API_URL, {
        item_name: item.item_name,
        category: item.category,
        quantity: parseInt(item.quantity, 10),
        uom: item.uom,
        cost_price: parseFloat(item.cost_price),
        selling_price: parseFloat(item.selling_price),
        supplier: item.supplier,  // New supplier field
    });
    return response.data;
};

export const deleteInventoryItem = async (itemId) => {
    if (!itemId) {
        throw new Error("Item ID is required to delete an item.");
    }
    const response = await axios.delete(`${API_URL}${itemId}/`);
    return response.data;
};

export const updateInventoryItem = async (itemId, item) => {
    const response = await axios.put(`${API_URL}${itemId}/`, {
        item_name: item.item_name,
        category: item.category,
        quantity: parseInt(item.quantity, 10),
        uom: item.uom,
        cost_price: parseFloat(item.cost_price),
        selling_price: parseFloat(item.selling_price),
        supplier: item.supplier,  // New supplier field
    });
    return response.data;
};
