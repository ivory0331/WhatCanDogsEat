from sqlalchemy import Column, Integer, String, ForeignKey
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