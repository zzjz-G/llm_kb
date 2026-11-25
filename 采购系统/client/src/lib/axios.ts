import axios from 'axios';

const CLIENT_BASE_PATH = process.env.CLIENT_BASE_PATH || '/';
const baseURL = CLIENT_BASE_PATH === '/' ? '/api' : `${CLIENT_BASE_PATH}/api`;

const apiClient = axios.create({
  baseURL,
  timeout: 30000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const loginUrl = `${CLIENT_BASE_PATH === '/' ? '' : CLIENT_BASE_PATH}/login`;
      if (!window.location.pathname.includes('/login')) {
        window.location.assign(loginUrl);
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
export { baseURL };
