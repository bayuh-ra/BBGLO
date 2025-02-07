import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api/suppliers/";

export const fetchSuppliers = async () => {
    try {
        const response = await axios.get(API_URL);
        return response.data;
    } catch (error) {
        console.error("Error fetching suppliers:", error);
        throw error;
    }
};

export const addSupplier = async (supplier) => {
    try {
        const response = await axios.post(API_URL, supplier);
        return response.data;
    } catch (error) {
        console.error("Error adding supplier:", error);
        throw error;
    }
};

export const deleteSupplier = async (supplierId) => {
    try {
        const response = await axios.delete(`${API_URL}${supplierId}/`);
        return response.data;
    } catch (error) {
        console.error("Error deleting supplier:", error);
        throw error;
    }
};

export const updateSupplier = async (supplierId, supplier) => {
    try {
        const response = await axios.put(`${API_URL}${supplierId}/`, supplier);
        return response.data;
    } catch (error) {
        console.error("Error updating supplier:", error);
        throw error;
    }
};
