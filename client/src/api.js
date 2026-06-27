import axios from 'axios';

// In production (Vercel), VITE_API_URL = https://your-app.onrender.com
// In development, proxy handles /api → localhost:5002
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({ 
  baseURL: BASE_URL,
  withCredentials: true 
});

export function getGuestId() {
  let guestId = localStorage.getItem('guest_id');
  if (!guestId) {
    guestId = globalThis.crypto?.randomUUID?.()
      || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('guest_id', guestId);
  }
  return guestId;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
