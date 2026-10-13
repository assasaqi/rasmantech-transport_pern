import axios from 'axios';

// 1. Penentuan Base URL Dinamis (Mendukung Environment Variable Vite)
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production'
    ? 'https://dafatih-transport.rasmantech.web.id/api'
    : 'http://localhost:5000/api');

// 2. Helper URL Gambar Global
export const getImageUrl = (imageUrl) => {
  if (!imageUrl) return 'https://placehold.co/400x250?text=No+Image';

  const path = typeof imageUrl === 'string'
    ? imageUrl
    : imageUrl?.image_url || imageUrl?.image || imageUrl?.image_path || '';

  if (!path) return 'https://placehold.co/400x250?text=No+Image';

  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
    return encodeURI(path);
  }

  const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return encodeURI(`${baseUrl}${cleanPath}`);
};

// 3. Inisialisasi Axios Instance
const API = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 4. Request Interceptor: Menyisipkan Token Berdasarkan Context Route
API.interceptors.request.use(
  (config) => {
    // Cek apakah request ditujukan ke endpoint client atau admin
    const isClientRoute = config.url?.startsWith('/client');

    let token = null;
    if (isClientRoute) {
      token = localStorage.getItem('clientToken') || localStorage.getItem('token');
    } else {
      token = localStorage.getItem('adminToken') || localStorage.getItem('token') || localStorage.getItem('clientToken');
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 5. Response Interceptor: Menangani Sesi Habis / Error 403 & 401
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;
    const requestUrl = error.config?.url || '';

    const isLoginRequest = requestUrl.includes('/login');
    const isLoginPage = window.location.pathname.includes('login');

    // A. Jika 404 Not Found -> Redirect ke /not-found
    if (status === 404 && !isLoginRequest && !isLoginPage) {
      if (window.location.pathname !== '/not-found') {
        window.location.href = '/not-found';
      }
      return Promise.reject(error);
    }

    // B. Jika 401 (Unauthorized / Token Expired) -> Auto-Redirect ke Login
    if (status === 401 && !isLoginRequest && !isLoginPage) {
      console.warn('Sesi telah habis. Silakan login kembali.');

      localStorage.removeItem('token');
      localStorage.removeItem('clientToken');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('client_user');
      sessionStorage.clear();

      window.location.href = '/login';
      return Promise.reject(error);
    }

    // C. Format pesan error yang ramah pengguna
    let friendlyMessage = 'Terjadi kesalahan sistem. Silakan coba beberapa saat lagi.';

    if (status >= 500) {
      friendlyMessage = 'Server sedang mengalami gangguan. Silakan coba lagi nanti.';
    } else if (status === 400 || status === 401 || status === 403) {
      friendlyMessage = error.response?.data?.message || 'Akses ditolak atau kredensial salah.';
    }

    error.userFriendlyMessage = friendlyMessage;

    return Promise.reject(error);
  }
);

// ================= API ENDPOINTS =================

// --- Client Auth API ---
export const registerClient = (data) => API.post('/client/register', data);
export const loginClient = (data) => API.post('/client/login', data);
export const getClientProfile = () => API.get('/client/profile');

// --- Admin Auth & Profile API ---
export const getProfile = (email) => API.get(`/profile${email ? `?email=${email}` : ''}`);
export const updateProfile = (data) => API.put('/profile', data);
export const loginAdmin = (data) => API.post('/login', data);
export const registerAdmin = (data) => API.post('/register', data);

// --- Vehicle / Armada API (Sewa Mobil) ---
export const getVehicles = () => API.get('/vehicles');
export const createVehicle = (formData) =>
  API.post('/vehicles', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const updateVehicle = (id, formData) =>
  API.put(`/vehicles/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const deleteVehicle = (id) => API.delete(`/vehicles/${id}`);

// --- Route & Tarif API (Antar Jemput) ---
export const getRoutes = () => API.get('/routes');
export const createRoute = (formData) =>
  API.post('/routes', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const updateRoute = (id, formData) =>
  API.put(`/routes/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const deleteRoute = (id) => API.delete(`/routes/${id}`);

// --- Tour Package API (Paket Tour) ---
export const getTourPackages = () => API.get('/tour-packages');
export const getTourPackageBySlug = (slug) => API.get(`/tour-packages/${slug}`);
export const createTourPackage = (formData) =>
  API.post('/tour-packages', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const updateTourPackage = (id, formData) =>
  API.put(`/tour-packages/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const deleteTourPackage = (id) => API.delete(`/tour-packages/${id}`);

// --- Booking API ---
export const getBookings = () => API.get('/bookings'); // Khusus Admin
export const getClientBookings = () => API.get('/client/bookings'); // DITAMBAHKAN: Khusus Client
export const createBooking = (bookingData) => API.post('/bookings', bookingData);
export const getBookingByCode = (code) => API.get(`/bookings/track/${code}`);
export const updateBookingStatus = (id, status) => API.put(`/bookings/${id}/status`, { status });
export const deleteBooking = (id) => API.delete(`/bookings/${id}`);

// --- Gallery API ---
export const getGalleries = () => API.get('/galleries');
export const createGallery = (formData) =>
  API.post('/galleries', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const updateGallery = (id, formData) =>
  API.put(`/galleries/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const deleteGallery = (id) => API.delete(`/galleries/${id}`);

// --- Blog API ---
export const getBlogs = () => API.get('/blogs');
export const createBlog = (formData) =>
  API.post('/blogs', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const updateBlog = (id, formData) =>
  API.put(`/blogs/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const deleteBlog = (id) => API.delete(`/blogs/${id}`);

export default API;
