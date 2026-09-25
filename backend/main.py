from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models
import schemas
from database import engine, SessionLocal

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

# DB 연결 세션을 열고 닫아주는 안전장치 함수
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 프론트엔드에서 강아지 정보를 받아 DB에 저장하는 API
@app.post("/api/dogs")
def create_dog(dog: schemas.DogCreate, db: Session = Depends(get_db)):
    # 프론트에서 넘어온 데이터를 DB 모델에 매핑
    db_dog = models.Dog(
        name=dog.name,
        age=dog.age,
        breed=dog.breed,
        allergies=dog.allergies,
        health_issues=dog.health_issues
    )
    # DB에 추가하고 저장(commit)
    db.add(db_dog)
    db.commit()
    db.refresh(db_dog)

    return {"message": "강아지 정보가 DB에 성공적으로 저장되었습니다!", "dog": db_dog}

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