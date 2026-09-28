import { create } from 'zustand';

// 1. 강아지 정보 타입 정의
export interface DogInfo {
    name: string;
    age: string;
    breed: string;
    allergies: string;
    healthIssues: string;
}

// 2. 저장소(Store)가 가질 상태와 함수 타입 정의
interface DogStore {
    dogInfo: DogInfo | null; // 현재 등록된 강아지 정보 (없을 수도 있으니 null 허용)
    saveDogInfo: (info: DogInfo) => void; // 정보를 저장하는 함수
}

// 3. Zustand 저장소 생성 (Vue의 defineStore 역할)
export const useDogStore = create<DogStore>((set) => ({
    dogInfo: null, // 초기값은 비어있음
    saveDogInfo: (info) => set({ dogInfo: info }), // 들어온 정보를 dogInfo에 덮어씀
}));

interface AuthStore {
    token: string | null;
    username: string | null;
    login: (token: string, username: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
    // 처음에 앱을 켤 때 로컬 스토리지에 저장된 토큰이 있는지 확인합니다.
    token: localStorage.getItem('token'),
    username: localStorage.getItem('username'),

    // 로그인 성공 시 호출될 함수
    login: (token, username) => {
        localStorage.setItem('token', token);
        localStorage.setItem('username', username);
        set({ token, username });
    },

    // 로그아웃 시 호출될 함수
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        set({ token: null, username: null });
    }
}));