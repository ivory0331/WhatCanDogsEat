from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

# 회원가입/로그인 시 받을 데이터
class UserCreate(BaseModel):
    username: str
    password: str

# 기존 강아지 등록 데이터
class DogCreate(BaseModel):
    id: Optional[int] = None
    name: str
    age: str
    breed: str
    allergies: Optional[str] = None
    health_issues: Optional[str] = None

# --- 약/영양제 체크리스트 ---
MedicationKind = Literal["supplement", "medicine"]
MedicationFrequency = Literal["daily", "weekly", "monthly"]


class MedicationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    kind: MedicationKind = "supplement"
    dosage: Optional[str] = Field(default=None, max_length=50)
    frequency: MedicationFrequency = "daily"
    days_of_week: Optional[list[int]] = None  # 월=0 ~ 일=6
    day_of_month: Optional[int] = Field(default=None, ge=1, le=31)
    memo: Optional[str] = Field(default=None, max_length=300)
    is_active: bool = True

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("이름을 입력해주세요.")
        return stripped

    @field_validator("days_of_week")
    @classmethod
    def validate_days(cls, value: Optional[list[int]]) -> Optional[list[int]]:
        if value is None:
            return None
        if any(day < 0 or day > 6 for day in value):
            raise ValueError("요일은 0(월)~6(일) 사이여야 합니다.")
        return sorted(set(value))

    @model_validator(mode="after")
    def validate_schedule(self) -> "MedicationCreate":
        if self.frequency == "weekly" and not self.days_of_week:
            raise ValueError("매주 복용은 요일을 하나 이상 선택해야 합니다.")
        if self.frequency == "monthly" and self.day_of_month is None:
            raise ValueError("매월 복용은 날짜를 선택해야 합니다.")
        return self


class MedicationUpdate(MedicationCreate):
    pass


class MedicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    dog_id: int
    name: str
    kind: MedicationKind
    dosage: Optional[str] = None
    frequency: MedicationFrequency
    days_of_week: Optional[list[int]] = None
    day_of_month: Optional[int] = None
    memo: Optional[str] = None
    is_active: bool

    @field_validator("days_of_week", mode="before")
    @classmethod
    def parse_days(cls, value: object) -> Optional[list[int]]:
        # DB에는 "0,2,4" 문자열로 저장되어 있음
        if value is None or value == "":
            return None
        if isinstance(value, str):
            return [int(day) for day in value.split(",") if day.strip()]
        if isinstance(value, list):
            return [int(day) for day in value]
        raise ValueError("잘못된 요일 형식입니다.")


class ChecklistItemResponse(BaseModel):
    medication: MedicationResponse
    taken: bool


class MedicationLogResponse(BaseModel):
    medication_id: int
    date: date
    taken: bool
