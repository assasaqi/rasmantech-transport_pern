import { io } from 'socket.io-client';
import { API_BASE_URL } from '@/services/api';

/**
 * Helper untuk mendapatkan URL Socket secara dinamis.
 * Mengubah URL API (.../api) menjadi Root Domain server.
 */
export const getSocketUrl = (customUrl) => {
  const base =
    customUrl ||
    API_BASE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');
  return base.replace(/\/api\/?$/, '');
};

// Inisialisasi Instance Socket.io
export const socket = io(getSocketUrl(), {
  transports: ['websocket', 'polling'],
  withCredentials: true,
  autoConnect: true
});

/**
 * Helper reconnect jika ingin mengganti URL / Auth secara runtime
 */
export const connectSocket = (customUrl, authParams = {}) => {
  const newUrl = getSocketUrl(customUrl);

  if (socket.connected) {
    socket.disconnect();
  }

  socket.io.uri = newUrl;
  if (Object.keys(authParams).length > 0) {
    socket.auth = authParams;
  }

  socket.connect();
  return socket;
};

// EXPORT DEFAULT (Untuk komponen yang menggunakan `import socket from ...`)
export default socket;
