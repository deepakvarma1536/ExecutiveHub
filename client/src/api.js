import axios from 'axios';

const api = axios.create({ 
  baseURL: '/api',
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
