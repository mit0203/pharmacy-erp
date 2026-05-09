import axios from 'axios';

const BASE_URL = 'http://localhost:8080';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// =======================
// Request interceptor
// =======================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// =======================
// Refresh Token Logic
// =======================
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const logoutUser = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');

  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

// =======================
// Response interceptor
// =======================
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;

    // Not 401 → normal error
    if (status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('refreshToken');

    // No refresh token → logout
    if (!refreshToken) {
      logoutUser();
      return Promise.reject(error);
    }

    // If already refreshing → queue request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const res = await axios.post(`${BASE_URL}/api/auth/refresh`, {
        refreshToken,
      });

      const data = res.data?.data || res.data;

      if (!data?.token) {
        throw new Error('Invalid refresh response');
      }

      // Save new tokens
      localStorage.setItem('token', data.token);

      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      // Update user object (important for role-based UI)
      const oldUser = JSON.parse(localStorage.getItem('user') || '{}');

      localStorage.setItem(
        'user',
        JSON.stringify({
          ...oldUser,
          id: data.id || oldUser.id,
          username: data.username || oldUser.username,
          email: data.email || oldUser.email,
          roles: data.roles || oldUser.roles,
          refreshToken: data.refreshToken || oldUser.refreshToken,
        })
      );

      // Update headers globally
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

      processQueue(null, data.token);

      // Retry original request
      originalRequest.headers.Authorization = `Bearer ${data.token}`;
      return api(originalRequest);
    } catch (err) {
      processQueue(err, null);
      logoutUser();
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;