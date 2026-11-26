import axios from 'axios';

const CLIENT_BASE_PATH = process.env.CLIENT_BASE_PATH || '/';
// 接口 url 已统一包含 /api 前缀，baseURL 只保留基础路径，避免拼成 /api/api
const baseURL = CLIENT_BASE_PATH;

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
