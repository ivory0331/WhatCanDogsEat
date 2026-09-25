from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 현재 폴더(backend) 안에 dog_data.db 라는 파일 형태로 DB가 만들어집니다.
SQLALCHEMY_DATABASE_URL = "sqlite:///./dog_data.db"

# SQLite 연결 엔진 생성
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 앞으로 만들 DB 테이블들의 기본(Base) 클래스
Base = declarative_base()