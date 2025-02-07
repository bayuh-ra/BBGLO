import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api/accounts/';

export const signup = (data) => axios.post(`${API_URL}signup/`, data);
export const login = (data) => axios.post(`${API_URL}login/`, data);
export const logout = () => axios.post(`${API_URL}logout/`);
