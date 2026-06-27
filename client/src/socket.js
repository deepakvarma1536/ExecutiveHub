import { io } from 'socket.io-client';

/**
 * Creates a Socket.io connection that works in both dev and production.
 * - In dev: connects to same origin (Vite proxy forwards to localhost:5002)
 * - In prod (Vercel): connects directly to the Render backend URL
 */
export function createSocket() {
  const serverUrl = import.meta.env.VITE_API_URL || '';
  return io(serverUrl, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    withCredentials: true,
  });
}
