import axios from 'axios';

// Use relative URLs in development to leverage Vite's proxy
// In production, use the full URL with hostname
const getBaseUrl = () => {
  if (import.meta.env.DEV) {
    // When in development, use relative URLs which will be proxied by the Vite dev server
    return '/api';
  } else {
    // When in production, use the same hostname as the client but port 5000
    return `http://${window.location.hostname}:5000/api`;
  }
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
}); 