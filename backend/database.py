from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLALCHEMY_DATABASE_URL = "sqlite:///./dog_data.db"
SQLALCHEMY_DATABASE_URL = "postgresql://postgres.uxahqdjewqiizaldtjqf:anstkd6259%5E%5E@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"

# 엔진 생성
engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 앞으로 만들 DB 테이블들의 기본(Base) 클래스
Base = declarative_base()