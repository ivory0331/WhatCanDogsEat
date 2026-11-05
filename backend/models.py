from datetime import date, datetime

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True) # 로그인 아이디
    password = Column(String) # 암호화되어 저장될 비밀번호

    # 이 유저가 등록한 강아지들
    dogs = relationship("Dog", back_populates="owner")

class Dog(Base):
    __tablename__ = "dogs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    age = Column(String)
    breed = Column(String)
    allergies = Column(String, nullable=True)
    health_issues = Column(String, nullable=True)

    # 누구의 강아지인지 기억하기 위한 주인의 ID (Foreign Key)
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="dogs")

    # 이 강아지가 먹는 약/영양제
    medications = relationship("Medication", back_populates="dog", cascade="all, delete-orphan")

class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    dog_id = Column(Integer, ForeignKey("dogs.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String, nullable=False)
    kind = Column(String, nullable=False, default="supplement")  # "supplement" | "medicine"
    dosage = Column(String, nullable=True)  # 예: "1알", "2ml"
    frequency = Column(String, nullable=False, default="daily")  # "daily" | "weekly" | "monthly"
    days_of_week = Column(String, nullable=True)  # weekly일 때 "0,2,4" (월=0 ~ 일=6)
    day_of_month = Column(Integer, nullable=True)  # monthly일 때 1~31
    memo = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(Date, nullable=False, default=date.today)

    dog = relationship("Dog", back_populates="medications")
    logs = relationship("MedicationLog", back_populates="medication", cascade="all, delete-orphan")

class MedicationLog(Base):
    __tablename__ = "medication_logs"
    __table_args__ = (UniqueConstraint("medication_id", "date", name="uq_medication_log_date"),)

    id = Column(Integer, primary_key=True, index=True)
    medication_id = Column(Integer, ForeignKey("medications.id", ondelete="CASCADE"), index=True, nullable=False)
    date = Column(Date, nullable=False)
    taken_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    medication = relationship("Medication", back_populates="logs")
