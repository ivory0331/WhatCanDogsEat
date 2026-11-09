import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' // 추가된 부분
import App from './App.tsx'
import { wakeUpBackend } from './wakeUpBackend'

// 앱 시작 즉시 백엔드(Render 무료 서버)를 깨움
wakeUpBackend()

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter> {/* 라우터 적용 */}
            <App />
        </BrowserRouter>
    </StrictMode>,
)