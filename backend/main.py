from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import jwt
from passlib.context import CryptContext

import models
import schemas
from database import engine, SessionLocal

import os
import json
from dotenv import load_dotenv
import google.generativeai as genai
from fastapi import Header
from typing import Optional

# 환경변수(.env) 로드 및 제미나이 설정
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-3.8-flash')

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

@app.get("/")
def read_root():
    return {"message": "백엔드 정상 작동 중!"}

# AI 검색 API
@app.get("/api/search")
def search_food(
        food_name: str,
        dog_id: Optional[int] = None,
        authorization: Optional[str] = Header(None), # 프론트에서 보낸 토큰(선택사항)
        db: Session = Depends(get_db)
):
    # 1. 로그인한 유저인지 확인하고, 맞춤 강아지 정보(알러지, 질환 등)를 문장으로 만들기.
    dog_context = ""

    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
            user = db.query(models.User).filter(models.User.username == username).first()

            # 선택한 강아지 ID로 정확한 강아지 정보를 찾기
            selected_dog = db.query(models.Dog).filter(models.Dog.id == dog_id, models.Dog.owner_id == user.id).first()

            if selected_dog:
                dog_context = f"""
                [주의사항] 질문하는 사용자의 강아지 정보는 다음과 같습니다. 이 정보를 반드시 바탕으로 대답해주세요:
                - 이름: {selected_dog.name}
                - 나이: {selected_dog.age}살
                - 견종: {selected_dog.breed}
                - 알러지: {selected_dog.allergies or '없음'}
                - 기저질환 또는 건강상태: {selected_dog.health_issues or '없음'}
                """
        except:
            pass # 로그인이 안 되어있으면 그냥 일반 강아지 기준으로 검색 진행

    # 2. 제미나이에게 명령할 프롬프트 작성
    prompt = f"""
    당신은 수의학 및 강아지 영양학 전문가입니다.
    사용자가 검색한 음식: '{food_name}'
    
    {dog_context}
    
    위 음식을 강아지가 먹어도 되는지 판단하고, 반드시 아래의 JSON 형식으로만 정확하게 답변해주세요. (마크다운 기호나 다른 설명은 절대 추가하지 마세요)
    {{
        "food": "{food_name}",
        "is_safe": true 또는 false,
        "description": "강아지가 먹어도 되는지 여부와 그 이유, 주의할 점을 3~4문장으로 친절하게 설명해주세요. 만약 사용자의 강아지 정보(알러지, 기저질환, 건강상태)가 주어졌다면 그 이름과 상태에 맞춰서 맞춤형으로 설명해주세요."
    }}
    """

    # 3. 제미나이 호출 및 프론트엔드로 결과 전달
    try:
        response = model.generate_content(prompt)
        # 제미나이가 준 텍스트에서 불필요한 마크다운(```json 등)을 제거하고 딕셔너리로 변환
        clean_text = response.text.strip().replace('```json', '').replace('```', '')
        result = json.loads(clean_text)
        return result
    except Exception as e:
        print("Gemini API 에러:", e)
        return {
            "food": food_name,
            "is_safe": False,
            "description": "AI 분석 중 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
        }

# 강아지 추가 또는 수정하기
@app.post("/api/dogs")
def create_or_update_dog(
        dog: schemas.DogCreate,
        current_user: models.User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    # 이미 이 유저에게 등록된 강아지가 있는지 확인
    if dog.id:
        # id가 있다면 기존 강아지 수정
        db_dog = db.query(models.Dog).filter(models.Dog.id == dog.id, models.Dog.owner_id == current_user.id).first()

        if db_dog:
            db_dog.name = dog.name
            db_dog.age = dog.age
            db_dog.breed = dog.breed
            db_dog.allergies = dog.allergies
            db_dog.health_issues = dog.health_issues
            message = "강아지 정보가 성공적으로 수정되었습니다! ✏️"
    else:
        # 등록된 강아지가 없다면 새로 추가
        db_dog = models.Dog(
            name=dog.name,
            age=dog.age,
            breed=dog.breed,
            allergies=dog.allergies,
            health_issues=dog.health_issues,
            owner_id=current_user.id
        )
        db.add(db_dog)
        message = "내 강아지로 성공적으로 등록되었습니다! 🎉"

    db.commit()
    db.refresh(db_dog)

    return {"message": message, "dog": db_dog}


# 내 강아지 목록 가져오기
@app.get("/api/dogs/me")
def get_my_dog(current_user: models.User = Depends(get_current_user)):
    return current_user.dogs

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)