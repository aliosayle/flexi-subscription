import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://192.168.10.70:5000',
  headers: {
    'Content-Type': 'application/json',
  },
}); 