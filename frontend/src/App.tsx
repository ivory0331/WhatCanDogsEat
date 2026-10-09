import { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import Home from './Home';
import Signup from './Signup'; // 강아지 등록 컴포넌트
import Auth from './Auth';     // 방금 만든 로그인/유저가입 컴포넌트
import { useAuthStore, useDogStore } from './store';

function App() {
    const navigate = useNavigate();

    const [showProfile, setShowProfile] = useState(false);

    // 로그인 상태 가져오기
    const token = useAuthStore((state) => state.token);
    const username = useAuthStore((state) => state.username);
    const logout = useAuthStore((state) => state.logout);

    const dogs = useDogStore((state) => state.dogs);
    const selectedDog = useDogStore((state) => state.selectedDog);
    const setDogs = useDogStore((state) => state.setDogs);
    const setSelectedDog = useDogStore((state) => state.setSelectedDog);

    // 토큰(로그인)은 있는데 강아지 정보가 비어있다면 서버에서 가져옴
    useEffect(() => {
        if (token && dogs.length === 0) {
            fetch('https://what-can-dogs-eat.onrender.com/api/dogs/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
                .then(response => response.json())
                .then(data => {
                    // 서버에서 강아지 정보가 무사히 넘어왔다면 Zustand(메모리)에 저장!
                    console.log("백엔드에서 온 데이터:", data);

                    if (data && data.length > 0) {
                        setDogs(data); // 배열 전체를 저장
                        setSelectedDog(data[0]); // 기본으로 첫 번째 강아지를 선택해 둠
                    }
                })
                .catch(error => console.error("강아지 정보 불러오기 실패:", error));
        }
    }, [token, dogs.length, setDogs, setSelectedDog]);

    const handleLogout = () => {
        logout();
        setDogs([]); // 로그아웃 시 목록 비우기
        setSelectedDog(null);
        alert("로그아웃 되었습니다.");
        window.location.href = '/';
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>

            <nav style={{ padding: '20px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px' }}>
                <Link to="/" style={{ textDecoration: 'none', color: '#3b82f6', fontWeight: 'bold' }}>홈(검색)</Link>

                {/* 로그인 했을 때와 안 했을 때 보여주는 메뉴가 다름 (Vue의 v-if, v-else) */}
                {token ? (
                    <>
                        <div style={{position: 'relative'}}>
                          <span
                              onClick={() => setShowProfile(!showProfile)}
                              style={{
                                  fontSize: '15px',
                                  color: '#3b82f6',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  textDecoration: 'underline'
                              }}
                          >
                              {username}님 (마이페이지) ▼
                          </span>

                            {/* 클릭 시 나타나는 마이페이지 드롭다운 */}
                            {showProfile && (
                                <div style={{
                                    position: 'absolute', top: '35px', right: '0', backgroundColor: 'white',
                                    border: '1px solid #ddd', borderRadius: '12px', padding: '20px',
                                    width: '220px', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', zIndex: 100
                                }}>
                                    {/* 강아지 목록 반복해서 그리기 */}
                                    <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                                        {dogs.length > 0 ? (
                                            dogs.map((dog) => (
                                                <div key={dog.id} style={{marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #eee'}}>
                                                    <p style={{margin: '0 0 5px 0',fontSize: '16px'}}>
                                                        🐶 <strong>{dog.name}</strong> ({dog.age}살)</p>
                                                    <p style={{margin: '3px 0', fontSize: '13px'}}>
                                                        <strong>견종:</strong> {dog.breed}</p>
                                                    <button
                                                        // 수정 버튼을 누르면 해당 강아지 정보를 쥐고 Signup 페이지로 넘어갑니다.
                                                        onClick={() => {
                                                            setShowProfile(false);
                                                            navigate('/signup', {state: {dogToEdit: dog}} as any);
                                                        }}
                                                        style={{
                                                            marginTop: '8px',
                                                            padding: '5px 10px',
                                                            backgroundColor: '#f3f4f6',
                                                            border: '1px solid #ccc',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '12px'
                                                        }}
                                                    >
                                                        ✏️ 수정
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <p style={{fontSize: '14px', textAlign: 'center', marginBottom: '15px'}}>등록된
                                                강아지가 없습니다.</p>
                                        )}
                                    </div>

                                    {/* 새 강아지 추가 버튼 */}
                                    <button
                                        onClick={() => {
                                            setShowProfile(false);
                                            navigate('/signup', {state: {dogToEdit: null}}as any);
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            backgroundColor: '#3b82f6',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        + 새 가족 추가하기
                                    </button>

                                </div>
                            )}
                        </div>

                        <button onClick={handleLogout} style={{
                            padding: '6px 12px',
                            border: '1px solid #ccc',
                            backgroundColor: 'transparent',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}>로그아웃
                        </button>
                    </>
                ) : (
                    <Link to="/auth" style={{textDecoration: 'none', color: '#3b82f6', fontWeight: 'bold'}}>로그인</Link>
                )}
            </nav>

            <Routes>
                <Route path="/" element={<Home/>}/>
                <Route path="/auth" element={<Auth/>}/>
                <Route path="/signup" element={<Signup/>}/>
            </Routes>
        </div>
    );
}

export default App;