const DEFAULT_API_BASE_URL = 'https://what-can-dogs-eat.onrender.com';

// 로컬 테스트 시 frontend/.env.local 에 VITE_API_BASE_URL=http://localhost:8000 을 설정하세요.
const envBaseUrl: unknown = import.meta.env.VITE_API_BASE_URL;

export const API_BASE_URL: string = (
    typeof envBaseUrl === 'string' && envBaseUrl.trim() !== '' ? envBaseUrl.trim() : DEFAULT_API_BASE_URL
).replace(/\/+$/, '');
