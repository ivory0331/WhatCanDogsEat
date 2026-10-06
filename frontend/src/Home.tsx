import { useState } from 'react';
import { useDogStore, useAuthStore } from './store'; // 저장소 불러오기

interface SearchResult {
    food: string;
    is_safe: boolean;
    description: string;
}

export default function Home() {
    const [keyword, setKeyword] = useState('');
    const [result, setResult] = useState<SearchResult | null>(null);
    const [loading, setLoading] = useState(false);

    // 🌟 여러 마리 배열(dogs)과 현재 선택된 강아지(selectedDog) 가져오기
    const dogs = useDogStore((state) => state.dogs);
    const selectedDog = useDogStore((state) => state.selectedDog);
    const setSelectedDog = useDogStore((state) => state.setSelectedDog);
    const token = useAuthStore((state) => state.token);

    // 검색
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!keyword.trim()) return;

        setLoading(true);

        try {
            // 토큰이 있으면 헤더에 담고, 없으면 안 담음
            const headers: Record<string, string> = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const params = new URLSearchParams({
                food_name: keyword,
            });

            if (selectedDog) {
                params.append("dog_id", String(selectedDog.id));
            }

            const response = await fetch(
                `http://localhost:8000/api/search?${params.toString()}`,
                { headers }
            );

            const data = await response.json();
            setResult(data);

        } catch (error) {
            alert("서버 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{textAlign: 'center', padding: '40px 20px'}}>
            <h1>What Can Dogs Eat? 🐶</h1>

            {/* 강아지 선택 버튼 영역 */}
            {dogs.length > 0 && (
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '20px 0' }}>
                    {dogs.map(dog => (
                        <button
                            key={dog.id}
                            onClick={() => setSelectedDog(dog)} // 클릭하면 선택된 강아지가 바뀜
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                // 선택된 강아지는 파란색 테두리와 배경으로 강조!
                                border: selectedDog?.id === dog.id ? '2px solid #3b82f6' : '1px solid #ccc',
                                backgroundColor: selectedDog?.id === dog.id ? '#eff6ff' : 'white',
                                fontWeight: selectedDog?.id === dog.id ? 'bold' : 'normal',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {dog.name}
                        </button>
                    ))}
                </div>
            )}

            <p style={{ color: '#666', marginBottom: '30px' }}>
                {selectedDog ? `${selectedDog.name}에게 안전한 음식인지 확인해보세요!` : '강아지가 먹어도 되는 음식인지 검색해보세요!'}
            </p>

            {/* 아래 form과 결과창 코드는 기존과 완벽하게 동일합니다 */}
            <form onSubmit={handleSearch} style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="예: 포도, 고구마"
                       style={{padding: '12px', flex: 1, borderRadius: '8px', border: '1px solid #ccc'}}/>
                <button type="submit" style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    cursor: 'pointer'
                }}>검색
                </button>
            </form>

            {/* 로딩 애니메이션 추가 */}
            {loading && (
                <div style={{ textAlign: 'center', margin: '40px 0' }}>
                    {/* CSS 애니메이션을 리액트 안에서 직접 주입합니다 */}
                    <style>
                        {`
              @keyframes bounceDog {
                0%, 100% { transform: translateY(0) scale(1); }
                50% { transform: translateY(-20px) scale(1.05); }
              }
              @keyframes shadowFade {
                0%, 100% { transform: scale(1); opacity: 0.2; }
                50% { transform: scale(0.6); opacity: 0.1; }
              }
            `}
                    </style>

                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        {/* 뛰어오르는 강아지 이모지 */}
                        <div style={{ fontSize: '60px', animation: 'bounceDog 0.5s infinite alternate' }}>
                            🐕
                        </div>
                        {/* 강아지 그림자 (디테일!) */}
                        <div style={{
                            width: '40px', height: '10px', backgroundColor: 'black',
                            borderRadius: '50%', margin: '0 auto',
                            animation: 'shadowFade 0.5s infinite alternate'
                        }} />
                    </div>

                    <p style={{ color: '#3b82f6', fontWeight: 'bold', marginTop: '15px', fontSize: '16px' }}>
                        {selectedDog ? `${selectedDog.name}의 정보를 바탕으로 분석 중이에요 🐾...` : 'AI가 열심히 수의학 데이터를 분석 중이에요 🐾...'}
                    </p>
                </div>
            )}

            {result && !loading && (
                <div style={{
                    marginTop: '40px',
                    padding: '30px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    backgroundColor: '#f9fafb'
                }}>
                    <h2 style={{fontSize: '24px', marginBottom: '15px'}}>{result.food}</h2>
                    <h3 style={{fontSize: '20px', color: result.is_safe ? '#16a34a' : '#dc2626'}}>
                        {result.is_safe ? '✅ 먹어도 괜찮아요!' : '❌ 절대 안 돼요!'}
                    </h3>
                    <p style={{marginTop: '10px'}}>{result.description}</p>
                </div>
            )}
        </div>
    );
}