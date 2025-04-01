import axios from "axios";
const API_URL = "http://127.0.0.1:8000/api/staff-profiles/";

export const fetchEmployees = async () => {
    const response = await axios.get(API_URL);
    return response.data;
};

export const fetchEmployeeById = async (employeeId) => {
    const response = await axios.get(`${API_URL}${employeeId}/`);
    return response.data;
};

export const addEmployee = async (employee) => {
    const response = await axios.post(API_URL, employee);
    return response.data;
};

export const deleteEmployee = async (employeeId) => {
    const response = await axios.delete(`${API_URL}${employeeId}/`);
    return response.data;
};

export const updateEmployee = async (employeeId, employee) => {
    const response = await axios.put(`${API_URL}${employeeId}/`, employee);
    return response.data;
};
