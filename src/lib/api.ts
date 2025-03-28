import axios from 'axios';

// Use the server IP directly for production deployment
const API_URL = 'http://161.97.177.233:5000';

console.log('API config using URL:', API_URL);

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: false, // Temporarily disable credentials to isolate the issue
  headers: {
    'Content-Type': 'application/json',
  },
}); 