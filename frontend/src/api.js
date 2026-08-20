const configuredApiUrl = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');

export const API = configuredApiUrl || (import.meta.env.DEV ? 'http://localhost:4000/api' : '/api');
