🐶 WhatCanDogsEat

반려견의 건강 정보를 기반으로 음식 급여 가능 여부를 분석하는 AI 서비스

개발 기간: 2026.09 ~ 2026.10
개발 인원: 1명
개발 형태: 개인 프로젝트
Frontend: React 18, TypeScript, Vite
Backend: Python, FastAPI
Database: Supabase
AI: Google Gemini API
Deployment: Vercel, Render, Supabase
배포 URL: https://whatcandogseat-frontend.vercel.app

[시스템 아키텍처]

             사용자 (Client)
                    │
                    ▼
       ┌───────────────────────────┐
       │          Vercel           │
       │    React + TypeScript     │
       │    Vite / Tailwind CSS    │
       └─────────────┬─────────────┘
                     │ HTTPS / REST API
                     │ Authorization: Bearer JWT
                     ▼
       ┌───────────────────────────┐
       │          Render           │
       │      FastAPI Backend      │
       │                           │
       │     PyJWT / Pydantic      │
       │        SQLAlchemy         │
       └───────┬───────────┬───────┘
               │           │
   Connection  │           │ API Call
   Pooling     │           │ (Prompt)
       ▼       ▼           ▼       ▼
 ┌─────────────────┐   ┌─────────────────┐
 │    Supabase     │   │   Gemini API    │
 │  PostgreSQL DB  │   │   AI Analysis   │
 └─────────────────┘   └─────────────────┘

시스템 요청 처리 흐름 (Data Flow)
1. 사용자가 Vercel CDN을 통해 배포된 React 프론트엔드 웹 서비스에 접속합니다.
2. 사용자가 로그인하거나 검색을 시도하면, 프론트엔드에서 Render에 배포된 FastAPI 서버로 RESTful API 요청을 보냅니다.
3. 회원 정보가 필요한 요청의 경우, 프론트엔드에서 발급받은 JWT(JSON Web Token)를 HTTP 헤더(Bearer)에 담아 전달하여 백엔드에서 안전하게 권한을 검증합니다.
4. 백엔드는 SQLAlchemy(ORM)를 거쳐 Supabase(PostgreSQL) 데이터베이스와 통신하며, 사용자 및 반려견 프로필 데이터를 빠르고 안전하게 조회합니다.
5. 음식 검색 요청 시, DB에서 조회한 반려견의 특성(나이, 몸무게 등)과 음식 이름을 조합하여 Gemini AI API로 전송합니다.
6. AI가 분석한 급여 가능 여부 및 주의사항 결과를 백엔드가 JSON 형태로 프론트엔드에 반환하고, 화면에 통통 튀는 애니메이션과 함께 직관적으로 렌더링 됩니다.

[주요 구현 내용]
① JWT 기반 인증
사용자 인증을 위해 JWT 기반 인증 방식을 적용했습니다.
- 로그인 후 인증 토큰 발급
- 프론트엔드에서 인증 토큰 관리
- API 요청 시 Authorization 헤더 전달
- 백엔드에서 토큰을 검증하고 사용자 정보 확인

구현 목적: 로그인 상태를 기반으로 사용자별 데이터를 구분하고, 인증이 필요한 API를 처리하기 위한 구조를 구현했습니다.

② 사용자별 반려견 데이터 관리
사용자와 반려견의 관계를 1:N으로 설계하고, 현재 선택한 반려견의 정보를 음식 분석 요청에 활용하도록 구현했습니다.
이를 통해 단순히 사용자 계정에 연결된 데이터를 관리하는 것을 넘어, 분석 대상인 반려견을 구분해 개인화된 요청을 처리하도록 구성했습니다.

③ Gemini API 연동
FastAPI에서 Gemini API를 호출하고, 음식 이름 및 선택한 반려견의 건강 정보를 프롬프트에 전달하도록 구현했습니다.
AI 응답은 음식 이름, 급여 가능 여부, 판단 근거를 포함하는 JSON 구조로 반환하도록 설계했습니다.

④ 프론트엔드 상태 관리
Zustand를 활용해 로그인 상태와 반려견 목록 등 여러 화면에서 공유하는 상태를 관리했습니다.
React Router를 통해 홈, 인증, 회원가입 페이지를 구분하고, 컴포넌트 기반으로 화면을 구성했습니다.
