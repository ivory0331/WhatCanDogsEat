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