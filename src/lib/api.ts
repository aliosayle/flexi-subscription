import axios from 'axios';

// Use window.location.hostname to dynamically get the server address
// This makes the app work regardless of where it's hosted
const getBaseUrl = () => {
  // Production server on same host but different port
  // Using the same hostname as the client but port 5000
  return `http://${window.location.hostname}:5000`;
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
}); 