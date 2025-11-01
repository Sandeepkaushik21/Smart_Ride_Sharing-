import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
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

// Handle responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log error for debugging
    console.error('API Error:', error);
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Better error handling
    if (!error.response) {
      // Network error
      error.message = 'Network error. Please check if the backend server is running.';
    } else if (error.response.data?.message) {
      error.message = error.response.data.message;
    } else if (error.response.data?.error) {
      error.message = error.response.data.error;
    } else {
      error.message = error.message || 'An error occurred';
    }
    
    return Promise.reject(error);
  }
);

export default api;

