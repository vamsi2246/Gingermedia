import axios from 'axios';

// Single source of truth for the API base URL.
// In development: falls back to localhost.
// In production (Vercel): reads VITE_API_URL from environment variables.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Helper to resolve full asset URLs (e.g., uploaded image paths)
export const resolveAssetUrl = (path) => `${BASE_URL}${path}`;

export default apiClient;
