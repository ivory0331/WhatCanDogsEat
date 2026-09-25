import { useState } from 'react';
import { useDogStore } from './store'; // 저장소 불러오기

interface SearchResult {
    food: string;
    is_safe: boolean;
    description: string;
}

export default function Home() {
    const [keyword, setKeyword] = useState('');
    const [result, setResult] = useState<SearchResult | null>(null);
    const [loading, setLoading] = useState(false);

    // Zustand에서 현재 저장된 강아지 정보 꺼내기
    const dogInfo = useDogStore((state) => state.dogInfo);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!keyword.trim()) return;

        setLoading(true);
        try {
            const response = await fetch(`http://localhost:8000/api/search?food_name=${keyword}`);
            const data = await response.json();
            setResult(data);
        } catch (error) {
            alert("서버 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '28px', marginBottom: '10px' }}>🐶 강아지가 이걸 먹어도 될까?</h1>

            {/* 강아지 정보가 있으면 이름을 불러와서 맞춤형 문구 출력! */}
            {dogInfo ? (
                <p style={{ color: '#3b82f6', marginBottom: '30px', fontWeight: 'bold' }}>
                    {dogInfo.name}({dogInfo.breed}, {dogInfo.age}살)를 위한 맞춤 검색
                </p>
            ) : (
                <p style={{ color: '#666', marginBottom: '30px' }}>
                    상단 메뉴에서 내 강아지를 먼저 등록해 보세요!
                </p>
            )}

            {/* 아래 form과 결과창 코드는 기존과 완벽하게 동일합니다 */}
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="예: 포도, 고구마" style={{ padding: '12px', flex: 1, borderRadius: '8px', border: '1px solid #ccc' }} />
                <button type="submit" style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer' }}>검색</button>
            </form>

            {loading && <p style={{ marginTop: '20px' }}>분석 중...</p>}
            {result && !loading && (
                <div style={{ marginTop: '40px', padding: '30px', border: '1px solid #e5e7eb', borderRadius: '12px', backgroundColor: '#f9fafb' }}>
                    <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>{result.food}</h2>
                    <h3 style={{ fontSize: '20px', color: result.is_safe ? '#16a34a' : '#dc2626' }}>
                        {result.is_safe ? '✅ 먹어도 괜찮아요!' : '❌ 절대 안 돼요!'}
                    </h3>
                    <p style={{ marginTop: '10px' }}>{result.description}</p>
                </div>
            )}
        </div>
    );
}