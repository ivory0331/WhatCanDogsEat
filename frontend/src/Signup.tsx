import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDogStore } from './store'; // 방금 만든 저장소 불러오기

export default function Signup() {
    const navigate = useNavigate(); // 화면 이동 함수 (Vue Router의 router.push 역할)
    const saveDogInfo = useDogStore((state) => state.saveDogInfo); // 저장 함수 꺼내오기

    const [dogInfo, setDogInfo] = useState({
        name: '',
        age: '',
        breed: '',
        allergies: '',
        healthIssues: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setDogInfo(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveDogInfo(dogInfo); // Zustand 전역 상태에 정보 저장!
        alert(`${dogInfo.name}의 정보가 기기 메모리에 저장되었습니다.`);
        navigate('/'); // 홈 화면(검색창)으로 이동
    };

    return (
        <div style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>🐾 내 강아지 정보 등록</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <label>
                    강아지 이름
                    <input type="text" name="name" value={dogInfo.name} onChange={handleChange} required style={{ display: 'block', width: '100%', padding: '10px', marginTop: '5px' }} />
                </label>
                <label>
                    나이
                    <input type="number" name="age" value={dogInfo.age} onChange={handleChange} placeholder="예: 3" required style={{ display: 'block', width: '100%', padding: '10px', marginTop: '5px' }} />
                </label>
                <label>
                    견종
                    <input type="text" name="breed" value={dogInfo.breed} onChange={handleChange} placeholder="예: 말티즈, 골든리트리버" required style={{ display: 'block', width: '100%', padding: '10px', marginTop: '5px' }} />
                </label>
                <label>
                    알레르기 (선택)
                    <input type="text" name="allergies" value={dogInfo.allergies} onChange={handleChange} placeholder="예: 닭고기, 연어" style={{ display: 'block', width: '100%', padding: '10px', marginTop: '5px' }} />
                </label>
                <label>
                    기타 건강 상태/기저질환 (선택)
                    <textarea name="healthIssues" value={dogInfo.healthIssues} onChange={handleChange} placeholder="예: 신부전 초기, 슬개골 탈구" style={{ display: 'block', width: '100%', padding: '10px', marginTop: '5px', height: '80px' }} />
                </label>
                <button type="submit" style={{ padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', marginTop: '10px' }}>
                    정보 저장하기
                </button>
            </form>
        </div>
    );
}