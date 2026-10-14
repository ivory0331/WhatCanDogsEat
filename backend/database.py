import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLALCHEMY_DATABASE_URL = "sqlite:///./dog_data.db"

# 엔진 생성
# engine = create_engine(SQLALCHEMY_DATABASE_URL)
engine = create_engine(os.getenv("DATABASE_URL"))

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 앞으로 만들 DB 테이블들의 기본(Base) 클래스
Base = declarative_base()