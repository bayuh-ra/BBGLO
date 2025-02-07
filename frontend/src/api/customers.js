import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api/customers/";

export const fetchCustomers = async () => {
    const response = await axios.get(API_URL);
    return response.data;
};

export const fetchCustomerById = async (id) => {
    const response = await axios.get(`${API_URL}${id}/`);
    return response.data;
};

export const addCustomer = async (customer) => {
    const response = await axios.post(API_URL, customer);
    return response.data;
};

export const deleteCustomer = async (customerId) => {
    const response = await axios.delete(`${API_URL}${customerId}/`);
    return response.data;
};

export const updateCustomer = async (customerId, customer) => {
    const response = await axios.put(`${API_URL}${customerId}/`, customer);
    return response.data;
};
