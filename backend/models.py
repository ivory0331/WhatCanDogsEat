from sqlalchemy import Column, Integer, String
from database import Base

class Dog(Base):
    __tablename__ = "dogs" # DB에 생성될 테이블 이름

    id = Column(Integer, primary_key=True, index=True) # 고유 번호 (자동 1, 2, 3...)
    name = Column(String, index=True)
    age = Column(String)
    breed = Column(String)
    allergies = Column(String, nullable=True)     # 빈값 허용(선택 항목)
    health_issues = Column(String, nullable=True) # 빈값 허용(선택 항목)