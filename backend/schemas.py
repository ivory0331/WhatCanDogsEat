from pydantic import BaseModel
from typing import Optional

# 회원가입/로그인 시 받을 데이터
class UserCreate(BaseModel):
    username: str
    password: str

# 기존 강아지 등록 데이터
class DogCreate(BaseModel):
    name: str
    age: str
    breed: str
    allergies: Optional[str] = None
    health_issues: Optional[str] = None