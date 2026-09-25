from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models
from database import engine

# FastAPI 서버가 실행될 때, models.py에 정의된 테이블들을 DB 파일에 생성합니다.
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# (아래 CORS 설정과 기존 코드들은 그대로 유지합니다)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "What Can Dogs Eat 백엔드 서버가 정상 작동 중입니다! 🐶"}

@app.get("/api/search")
def search_food(food_name: str):
    return {
        "food": food_name,
        "is_safe": True,
        "description": f"{food_name}은(는) 강아지가 먹어도 괜찮습니다."
    }