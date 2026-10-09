import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' // 추가된 부분
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter> {/* 라우터 적용 */}
            <App />
        </BrowserRouter>
    </StrictMode>,
)