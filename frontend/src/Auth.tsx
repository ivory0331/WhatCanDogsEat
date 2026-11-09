import { useState } from 'react';
import { useAuthStore } from './store';
import { API_BASE_URL } from './apiConfig';

export default function Auth() {
    const loginAction = useAuthStore((state) => state.login);

    // Vue의 ref(true) 와 동일: true면 로그인 화면, false면 회원가입 화면
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    // 요청 처리 중 여부 (서버가 느릴 때 중복 클릭 방지 + 로딩 표시)
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return; // 이미 처리 중이면 무시

        setIsSubmitting(true);
        try {
            if (isLoginMode) {
                // --- 1. 로그인 요청 ---
                // !중요: FastAPI의 OAuth2는 JSON이 아닌 Form(URLSearchParams) 형식을 요구합니다.
                const formData = new URLSearchParams();
                formData.append('username', username);
                formData.append('password', password);

                const response = await fetch(`${API_BASE_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData,
                });

                if (!response.ok) {
                    // 입력창 비우기
                    setUsername('');
                    setPassword('');
                    throw new Error("아이디 또는 비밀번호가 틀렸습니다.");
                }

                const data = await response.json();
                loginAction(data.access_token, username); // Zustand & LocalStorage에 토큰 저장
                alert(`${username}님 환영합니다!`);
                window.location.href = '/'; // 홈으로 이동

            } else {

                // --- 2. 회원가입 요청 ---
                const response = await fetch(`${API_BASE_URL}/api/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });

                if (!response.ok) throw new Error("회원가입 실패 (중복된 아이디 등)");

                alert("회원가입 성공! 이제 로그인해 주세요.");

                // 입력창 비우기
                setUsername('');
                setPassword('');

                setIsLoginMode(true); // 로그인 모드로 화면 전환
            }
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '40px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '12px', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '20px' }}>{isLoginMode ? '로그인' : '회원가입'}</h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input
                    type="text"
                    placeholder="아이디"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    style={{ padding: '10px', fontSize: '16px', borderRadius: '8px', border: '1px solid #ccc' }}
                />
                <input
                    type="password"
                    placeholder="비밀번호"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ padding: '10px', fontSize: '16px', borderRadius: '8px', border: '1px solid #ccc' }}
                />
                <button
                    type="submit"
                    disabled={isSubmitting}
                    aria-busy={isSubmitting}
                    style={{
                        padding: '12px',
                        backgroundColor: isSubmitting ? '#93c5fd' : '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                    }}
                >
                    {isSubmitting && (
                        <span
                            aria-hidden="true"
                            style={{
                                width: '16px',
                                height: '16px',
                                border: '2px solid rgba(255, 255, 255, 0.4)',
                                borderTopColor: 'white',
                                borderRadius: '50%',
                                animation: 'authSpin 0.8s linear infinite',
                            }}
                        />
                    )}
                    {isSubmitting ? '처리 중...' : isLoginMode ? '로그인하기' : '가입하기'}
                </button>
                {isSubmitting && (
                    <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                        서버를 깨우는 중이면 최대 1분 정도 걸릴 수 있어요 🐾
                    </p>
                )}
                <style>{`@keyframes authSpin { to { transform: rotate(360deg); } }`}</style>
            </form>

            <p style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
                {isLoginMode ? "계정이 없으신가요? " : "이미 계정이 있으신가요? "}
                <span
                    style={{ color: '#3b82f6', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: isSubmitting ? 0.5 : 1 }}
                    onClick={() => {
                        if (!isSubmitting) setIsLoginMode(!isLoginMode); // 처리 중엔 모드 전환 막기
                    }}
                >
          {isLoginMode ? '회원가입' : '로그인'}
        </span>
            </p>
        </div>
    );
}