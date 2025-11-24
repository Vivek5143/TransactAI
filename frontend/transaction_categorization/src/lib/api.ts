import axios, { AxiosError } from 'axios';


const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 second timeout
});

// UPDATE OR ADD THIS:
const API_BASE = 'http://localhost:8000/api';  // For development
// const API_BASE = 'https://your-backend.onrender.com/api';  // For production

export const fetchTransactions = async () => {
  const response = await fetch(`${API_BASE}/transactions`);
  return response.json();
};
// Request interceptor for retry logic
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const config = error.config as any;
        
        // Retry logic for network errors
        if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
            if (!config._retry) {
                config._retry = true;
                // Wait 1 second before retry
                await new Promise(resolve => setTimeout(resolve, 1000));
                return api(config);
            }
        }
        
        return Promise.reject(error);
    }
);

export const endpoints = {
    classify: '/classify',
    manualCategory: '/manual-category',
    addCategory: '/add-category',
    getTransactions: '/transactions',
    getSummary: '/summary',
    getInsightsMonthly: '/insights/monthly',
    getInsightsWeekly: '/insights/weekly',
    getInsightsDaily: '/insights/daily',
};
