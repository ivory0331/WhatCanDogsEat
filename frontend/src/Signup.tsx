import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store'; // 방금 만든 저장소 불러오기

export default function Signup() {
    const navigate = useNavigate(); // 화면 이동 함수 (Vue Router의 router.push 역할)
    const location = useLocation(); // 이전 화면에서 넘겨준 데이터를 받는 역할
    const token = useAuthStore((state) => state.token); // Zustand에서 토큰 꺼내기

    // App.tsx에서 '수정' 버튼을 눌렀을 때 넘어온 강아지 정보
    const dogToEdit = location.state?.dogToEdit;

    const [dogInfo, setDogInfo] = useState({
        id: undefined as number | undefined,
        name: '', age: '', breed: '', allergies: '', health_issues: ''
    });

    // 컴포넌트가 열릴 때, 기존 정보가 있다면 빈칸에 싹 채워 넣기
    useEffect(() => {
        if (dogToEdit) {
            setDogInfo({
                id: dogToEdit.id,
                name: dogToEdit.name || '',
                age: dogToEdit.age || '',
                breed: dogToEdit.breed || '',
                allergies: dogToEdit.allergies || '',
                health_issues: dogToEdit.health_issues || dogToEdit.healthIssues || ''
            });
        } else {
            setDogInfo({ id: undefined, name: '', age: '', breed: '', allergies: '', health_issues: '' });
        }
    }, [dogToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setDogInfo(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 로그인이 안 되어있으면 튕겨내기
        if (!token) {
            alert("로그인이 필요한 서비스입니다.");
            navigate('/auth');
            return;
        }

        try {
            // 1. 파이썬 백엔드로 데이터 전송 (POST 요청)
            const response = await fetch('http://localhost:8000/api/dogs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // 서버에 출입증(토큰) 제시하기
                },
                body: JSON.stringify(dogInfo),
            });

            if (!response.ok) throw new Error("저장 실패");

            alert(dogToEdit ? "수정 완료!" : "새 가족 등록 완료!");

            window.location.href = '/'; // 홈으로 이동

        } catch (error) {
            console.error("에러 발생:", error);
            alert("정보 저장 중 오류가 발생했습니다.");
        }
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
                    <textarea name="health_issues" value={dogInfo.health_issues} onChange={handleChange} placeholder="예: 신부전 초기, 슬개골 탈구" style={{ display: 'block', width: '100%', padding: '10px', marginTop: '5px', height: '80px' }} />
                </label>
                <button type="submit" style={{ padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', marginTop: '10px' }}>
                    정보 저장하기
                </button>
            </form>
        </div>
    );
}