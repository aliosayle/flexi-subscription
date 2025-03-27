import axios from 'axios';

// Use the server IP directly for production deployment
export const api = axios.create({
  baseURL: 'http://161.97.177.233:5000',
  headers: {
    'Content-Type': 'application/json',
  },
}); 