from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# React(포트 5173)에서 오는 요청을 허용하기 위한 CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 기본 경로(/)로 접속했을 때 보여줄 테스트 데이터
@app.get("/")
def read_root():
    return {"message": "What Can Dogs Eat 백엔드 서버가 정상 작동 중입니다! 🐶"}

# 강아지가 먹어도 되는지 확인하는 임시 검색 API (1단계 목적)
@app.get("/api/search")
def search_food(food_name: str):
    # 나중에 여기에 DB 조회나 AI 연동 로직이 들어갑니다.
    return {
        "food": food_name,
        "is_safe": True, # 임시 데이터
        "description": f"{food_name}은(는) 강아지가 먹어도 괜찮습니다."
    }