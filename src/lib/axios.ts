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

const API_BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
});

// Add a request interceptor to add the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api; 