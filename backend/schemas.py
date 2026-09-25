from pydantic import BaseModel
from typing import Optional

class DogCreate(BaseModel):
    name: str
    age: str
    breed: str
    # 빈값을 허용하는 선택 항목은 Optional을 붙여줍니다.
    allergies: Optional[str] = None
    health_issues: Optional[str] = None