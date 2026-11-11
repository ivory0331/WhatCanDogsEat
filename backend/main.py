from fastapi import FastAPI, Depends, HTTPException, Query, status
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import jwt
from passlib.context import CryptContext

import models
import schemas
from database import engine, SessionLocal

import os
import asyncio
import json
from dotenv import load_dotenv
from google import genai
from fastapi import Header
from typing import Optional
import calendar
from datetime import date

# 1. 환경변수(.env) 로드
load_dotenv()
# 2. 제미나이 sdk 초기화, 글로벌 모델 선언
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
model_id = "gemini-3.5-flash-lite"
# 3. DB테이블 생성
models.Base.metadata.create_all(bind=engine)

# 비동기 웜업 함수 (서버 시작을 방해하지 않고 뒤에서 조용히 실행)
async def warm_up_gemini():
    try:
        # 동기 호출인 generate_content를 별도 쓰레드에서 비동기로 실행
        await client.aio.models.generate_content(
            model=model_id, contents="ping"
        )
        print(f"Gemini AI Model({model_id}) Warmed up successfully!")
    except Exception as e:
        print(f"Gemini Warm-up skipped or failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 백엔드 서버가 켜질 때 웜업 작업을 '백그라운드'로 던져두고 바로 통과!
    asyncio.create_task(warm_up_gemini())
    yield

# FastAPI 앱 생성
app = FastAPI(lifespan=lifespan)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# .env파일 읽기
load_dotenv()

# --- 보안 및 인증 설정 ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY")
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

# -- 백엔드 헬스체크 --
@app.get("/health")
def health_check():
    return {"status": "ok"}

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
    #user = db.query(models.User).filter(models.User.username == form_data.username).first()

    # --- 디버깅용 ---
    print("=== 로그인 디버깅 시작 ===")
    print(f"1. 프론트에서 받은 비번: {form_data.password}")
    print(f"2. 받은 비번의 길이: {len(form_data.password)}")

    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if user:
        print(f"3. DB 비번 길이: {len(user.password)}")
    # ----------------------------

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
async def search_food(
        food_name: str,
        dog_id: Optional[int] = None,
        authorization: Optional[str] = Header(None), # 프론트에서 보낸 토큰(선택사항)
        db: Session = Depends(get_db)
):
    # 1. 로그인한 유저인지 확인하고, 맞춤 강아지 정보(알러지, 질환 등)를 문장으로 만들기.
    dog_context = ""
    analysis_instruction = f"'{food_name}'의 성분이 일반적인 건강한 강아지에게 안전한지 판단하고,"

    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
            user = db.query(models.User).filter(models.User.username == username).first()

            if user and dog_id:
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
                    - 복용 중인 약/영양제: {format_active_medications(selected_dog)}
                    """
                    analysis_instruction = f"'{food_name}'성분과 제공된 강아지의 알러지, 건강 상태, 복용 중인 약/영양제와의 상호작용을 꼼꼼히 교차 검증하여 안전성을 판단하고,"
        except:
            pass # 로그인이 안 되어있으면 그냥 일반 강아지 기준으로 검색 진행

    # 2. 제미나이에게 명령할 프롬프트 작성
    prompt = f"""
    당신은 아주 엄격하고 보수적인 수의학 및 강아지 영양학 전문가입니다.
    사용자가 검색한 음식: '{food_name}'
    
    {dog_context}
    
    {analysis_instruction} 최종 판단의 근거를 2~3문장으로 설명하세요.
    위 분석을 바탕으로, 최종 결과만 반드시 아래의 JSON 형식으로 정확하게 답변해주세요. (마크다운 기호 금지)
    {{
        "food": "{food_name}",
        "is_safe": true 또는 false,
        "description": "왜 먹여도 되는지, 혹은 왜 먹이면 안 되는지 필수 분석 단계를 거친 논리적인 이유를 2~3문장으로 설명해주세요."
    }}
    """

    # 3. 제미나이 호출 및 프론트엔드로 결과 전달
    try:
        response = await client.aio.models.generate_content(
            model=model_id, contents=prompt
        )
        # 제미나이가 준 텍스트에서 불필요한 마크다운(```json 등)을 제거하고 딕셔너리로 변환
        clean_text = response.text.strip().replace('```json', '').replace('```', '')
        result = json.loads(clean_text)
        return result
    except Exception as e:
        error_msg = str(e) # 에러 메시지를 문자열로 변환
        print("Gemini API 에러 원인:", error_msg)

        # 🌟 에러 메시지 안에 429나 Quota(할당량) 단어가 포함되어 있다면?
        if "429" in error_msg or "Quota" in error_msg:
            return {
                "food": food_name,
                "is_safe": False,
                "description": "앗! 현재 AI 분석 요청이 너무 많아 무료 사용량이 일시적으로 초과되었습니다. 1~2분 뒤에 다시 시도해주세요! ⏳"
            }
        else:
            # 그 외의 일반적인 서버 오류일 경우
            return {
                "food": food_name,
                "is_safe": False,
                "description": "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
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

# --- 약/영양제 체크리스트 ---

def format_active_medications(dog: models.Dog) -> str:
    active = [med for med in dog.medications if med.is_active]
    if not active:
        return "없음"
    return ", ".join(f"{med.name}({med.dosage})" if med.dosage else med.name for med in active)


def get_owned_dog(dog_id: int, user: models.User, db: Session) -> models.Dog:
    dog = db.query(models.Dog).filter(models.Dog.id == dog_id, models.Dog.owner_id == user.id).first()
    if dog is None:
        raise HTTPException(status_code=404, detail="강아지 정보를 찾을 수 없습니다.")
    return dog


def get_owned_medication(medication_id: int, user: models.User, db: Session) -> models.Medication:
    medication = (
        db.query(models.Medication)
        .join(models.Dog, models.Medication.dog_id == models.Dog.id)
        .filter(models.Medication.id == medication_id, models.Dog.owner_id == user.id)
        .first()
    )
    if medication is None:
        raise HTTPException(status_code=404, detail="약/영양제 정보를 찾을 수 없습니다.")
    return medication


def apply_medication_fields(medication: models.Medication, payload: schemas.MedicationCreate) -> None:
    medication.name = payload.name
    medication.kind = payload.kind
    medication.dosage = payload.dosage or None
    medication.frequency = payload.frequency
    medication.days_of_week = (
        ",".join(str(day) for day in payload.days_of_week)
        if payload.frequency == "weekly" and payload.days_of_week
        else None
    )
    medication.day_of_month = payload.day_of_month if payload.frequency == "monthly" else None
    medication.memo = payload.memo or None
    medication.is_active = payload.is_active


def is_due(medication: models.Medication, target_date: date) -> bool:
    """해당 날짜에 먹어야 하는 약/영양제인지 판단"""
    if not medication.is_active:
        return False
    if medication.frequency == "weekly":
        days = {int(day) for day in (medication.days_of_week or "").split(",") if day.strip()}
        return target_date.weekday() in days
    if medication.frequency == "monthly":
        if medication.day_of_month is None:
            return False
        # 31일처럼 그 달에 없는 날짜는 그 달의 마지막 날로 처리
        last_day = calendar.monthrange(target_date.year, target_date.month)[1]
        return target_date.day == min(medication.day_of_month, last_day)
    return True  # daily


@app.get("/api/dogs/{dog_id}/medications", response_model=list[schemas.MedicationResponse])
def list_medications(
        dog_id: int,
        current_user: models.User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    dog = get_owned_dog(dog_id, current_user, db)
    return sorted(dog.medications, key=lambda med: med.id)


@app.post("/api/dogs/{dog_id}/medications", response_model=schemas.MedicationResponse, status_code=201)
def create_medication(
        dog_id: int,
        payload: schemas.MedicationCreate,
        current_user: models.User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    dog = get_owned_dog(dog_id, current_user, db)
    medication = models.Medication(dog_id=dog.id)
    apply_medication_fields(medication, payload)
    db.add(medication)
    db.commit()
    db.refresh(medication)
    return medication


@app.put("/api/medications/{medication_id}", response_model=schemas.MedicationResponse)
def update_medication(
        medication_id: int,
        payload: schemas.MedicationUpdate,
        current_user: models.User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    medication = get_owned_medication(medication_id, current_user, db)
    apply_medication_fields(medication, payload)
    db.commit()
    db.refresh(medication)
    return medication


@app.delete("/api/medications/{medication_id}", status_code=204)
def delete_medication(
        medication_id: int,
        current_user: models.User = Depends(get_current_user),
        db: Session = Depends(get_db)
) -> None:
    medication = get_owned_medication(medication_id, current_user, db)
    db.delete(medication)
    db.commit()


@app.get("/api/dogs/{dog_id}/checklist", response_model=list[schemas.ChecklistItemResponse])
def get_checklist(
        dog_id: int,
        target_date: date = Query(alias="date"),
        current_user: models.User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    dog = get_owned_dog(dog_id, current_user, db)
    due = sorted((med for med in dog.medications if is_due(med, target_date)), key=lambda med: med.id)
    if not due:
        return []

    taken_ids = {
        log.medication_id
        for log in db.query(models.MedicationLog).filter(
            models.MedicationLog.medication_id.in_([med.id for med in due]),
            models.MedicationLog.date == target_date,
        )
    }
    return [{"medication": med, "taken": med.id in taken_ids} for med in due]


@app.put("/api/medications/{medication_id}/logs/{log_date}", response_model=schemas.MedicationLogResponse)
def mark_taken(
        medication_id: int,
        log_date: date,
        current_user: models.User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    medication = get_owned_medication(medication_id, current_user, db)
    # 클라이언트 시간대 차이를 고려해 하루 여유를 둠
    if (log_date - date.today()).days > 1:
        raise HTTPException(status_code=400, detail="미래 날짜는 체크할 수 없습니다.")

    existing = db.query(models.MedicationLog).filter(
        models.MedicationLog.medication_id == medication.id,
        models.MedicationLog.date == log_date,
    ).first()
    if existing is None:
        db.add(models.MedicationLog(medication_id=medication.id, date=log_date))
        db.commit()
    return {"medication_id": medication.id, "date": log_date, "taken": True}


@app.delete("/api/medications/{medication_id}/logs/{log_date}", response_model=schemas.MedicationLogResponse)
def unmark_taken(
        medication_id: int,
        log_date: date,
        current_user: models.User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    medication = get_owned_medication(medication_id, current_user, db)
    db.query(models.MedicationLog).filter(
        models.MedicationLog.medication_id == medication.id,
        models.MedicationLog.date == log_date,
    ).delete()
    db.commit()
    return {"medication_id": medication.id, "date": log_date, "taken": False}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)