import { API_BASE_URL } from './apiConfig';

// Render 무료 플랜은 일정 시간 요청이 없으면 서버가 잠들어서 첫 요청이 느립니다.
// 앱이 켜지자마자 헬스체크를 미리 보내 서버를 깨워두면, 사용자가 로그인할 즈음엔 서버가 준비되어 있습니다.
const WAKE_UP_TIMEOUT_MS = 60_000; // 콜드 스타트는 길게는 수십 초 걸릴 수 있음

let hasRequested = false;

export function wakeUpBackend(): void {
    if (hasRequested) return; // 중복 호출 방지
    hasRequested = true;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), WAKE_UP_TIMEOUT_MS);

    fetch(`${API_BASE_URL}/health`, { method: 'GET', signal: controller.signal })
        .then((response) => {
            if (!response.ok) {
                console.warn(`백엔드 헬스체크 응답 이상: ${response.status}`);
            }
        })
        .catch((error: unknown) => {
            if (error instanceof Error && error.name === 'AbortError') {
                // 타임아웃이나 페이지 이탈로 취소된 경우이므로 정상 범주
                return;
            }
            // 깨우기 용도이므로 실패해도 앱 동작에는 영향 없음
            console.warn('백엔드 헬스체크 실패:', error);
        })
        .finally(() => window.clearTimeout(timeoutId));
}
