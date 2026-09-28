from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import jwt
from passlib.context import CryptContext

import models
import schemas
from database import engine, SessionLocal

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 보안 및 인증 설정 ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "my-super-secret-key-for-toy-project" # 토큰 암호화 키
ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 토큰을 열어서 누군지 확인하는 보안 함수
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="로그인이 풀렸거나 유효하지 않은 토큰입니다.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # 토큰을 해독해서 아이디(sub)를 꺼냅니다.
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError: # 토큰이 위조되었거나 만료된 경우
        raise credentials_exception

    # 해독한 아이디로 DB에서 진짜 유저 정보를 찾아서 반환합니다.
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

# --- 인증 API ---
@app.post("/api/signup")
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # 1. 아이디 중복 확인
    existing_user = db.query(models.User).filter(models.User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="이미 존재하는 아이디입니다.")

    # 2. 비밀번호 암호화 후 저장
    hashed_password = pwd_context.hash(user.password)
    new_user = models.User(username=user.username, password=hashed_password)
    db.add(new_user)
    db.commit()
    return {"message": "회원가입이 완료되었습니다!"}

@app.post("/api/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # 1. 유저 확인
    user = db.query(models.User).filter(models.User.username == form_data.username).first()

    # 2. 비밀번호 검증
    if not user or not pwd_context.verify(form_data.password, user.password):
        raise HTTPException(status_code=400, detail="아이디 또는 비밀번호가 틀렸습니다.")

    # 3. 로그인 성공 시 JWT 출입증(토큰) 발급
    access_token = jwt.encode({"sub": user.username}, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": access_token, "token_type": "bearer"}

# --- 기존 API들 (임시) ---
@app.get("/")
def read_root():
    return {"message": "백엔드 정상 작동 중!"}

@app.get("/api/search")
def search_food(food_name: str):
    return {"food": food_name, "is_safe": True, "description": f"{food_name}은(는) 안전합니다."}

@app.post("/api/dogs")
def create_dog(
        dog: schemas.DogCreate,
        current_user: models.User = Depends(get_current_user), # 👈 토큰 검사 후 유저 정보 받아옴
        db: Session = Depends(get_db)
):
    # 강아지 정보에 '주인 ID(owner_id)'를 덧붙여서 DB에 저장합니다.
    db_dog = models.Dog(
        name=dog.name,
        age=dog.age,
        breed=dog.breed,
        allergies=dog.allergies,
        health_issues=dog.health_issues,
        owner_id=current_user.id  # 👈 주인이 누군지 꼬리표 달기!
    )
    db.add(db_dog)
    db.commit()
    db.refresh(db_dog)

    return {"message": "내 강아지로 성공적으로 등록되었습니다!", "dog": db_dog}

@app.get("/api/dogs/me")
def get_my_dog(current_user: models.User = Depends(get_current_user)):
    # 유저에게 등록된 강아지가 있다면 첫 번째 강아지 정보를 반환합니다.
    if current_user.dogs:
        dog = current_user.dogs[0]
        # 리액트에서 사용하는 형태에 맞게 딕셔너리로 변환해서 보내줍니다.
        return {
            "name": dog.name,
            "age": dog.age,
            "breed": dog.breed,
            "allergies": dog.allergies,
            "health_issues": dog.health_issues
        }
    # 등록된 강아지가 없으면 빈 값(null)을 반환합니다.
    return None
