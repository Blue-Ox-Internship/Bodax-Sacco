import axios from 'axios';

// In production (Render), VITE_API_BASE_URL is the full API origin,
// e.g. "https://bodax-api.onrender.com".
// In local dev it is empty, so axios uses the Vite proxy via "/api".
const baseURL = (typeof __API_BASE_URL__ !== 'undefined' && __API_BASE_URL__)
  ? `${__API_BASE_URL__}/api`
  : '/api';

const api = axios.create({ baseURL });

const cache = new Map();

export function clearApiCache() {
  cache.clear();
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bodax_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle expired/invalid sessions globally: clear storage and redirect to login
api.interceptors.response.use(
  (response) => {
    // Automatically clear cache on any mutation
    const method = response.config?.method?.toLowerCase();
    if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
      cache.clear();
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect if it's an auth failure, not a deliberate login attempt
      const url = error.config?.url || '';
      if (!url.includes('/auth/login')) {
        localStorage.removeItem('bodax_token');
        localStorage.removeItem('bodax_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Wrap api.get with client-side caching
const originalGet = api.get;
api.get = async function (url, config = {}) {
  const cacheKey = url + (config.params ? JSON.stringify(config.params) : '');
  
  if (config.bypassCache) {
    const response = await originalGet.call(this, url, config);
    cache.set(cacheKey, { data: response.data, timestamp: Date.now() });
    return response;
  }

  const cached = cache.get(cacheKey);
  const TTL = 15000; // 15 seconds TTL
  if (cached && Date.now() - cached.timestamp < TTL) {
    return { data: cached.data, status: 200, statusText: 'OK', headers: {}, config };
  }

  const response = await originalGet.call(this, url, config);
  cache.set(cacheKey, { data: response.data, timestamp: Date.now() });
  return response;
};

export default api;
