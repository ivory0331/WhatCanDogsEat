import { create } from 'zustand';

// 1. 강아지 정보 타입 정의
export interface DogInfo {
    id?: number;
    name: string;
    age: string;
    breed: string;
    allergies: string;
    healthIssues: string;
}

// 2. 저장소(Store)가 가질 상태와 함수 타입 정의
interface DogStore {
    dogs: DogInfo[]; // 여러 마리의 강아지 리스트
    selectedDog: DogInfo | null; // 현재 검색하려고 선택한 '대표 강아지'
    setDogs: (dogs: DogInfo[]) => void;
    setSelectedDog: (dog: DogInfo | null) => void;
}

// 3. Zustand 저장소 생성 (Vue의 defineStore 역할)
export const useDogStore = create<DogStore>((set) => ({
    dogs: [],
    selectedDog: null,
    setDogs: (dogs) => set({ dogs }),
    setSelectedDog: (dog) => set({ selectedDog: dog }),
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