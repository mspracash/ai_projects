# models.py

from typing import Optional, List
from pydantic import BaseModel, Field


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    responsibilities: Optional[str] = None
    uncategorized: List[str] = Field(default_factory=list)


class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    marketing_goals: Optional[str] = None
    products: Optional[str] = None
    services: Optional[str] = None
    customers: Optional[str] = None
    challenges: Optional[str] = None
    uncategorized: List[str] = Field(default_factory=list)


class ExtractResponse(BaseModel):
    customer: CustomerUpdate = Field(default_factory=CustomerUpdate)
    business: BusinessUpdate = Field(default_factory=BusinessUpdate)
    summary: str = ""
    newly_captured_fields: List[str] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)

class QuestionResponse(BaseModel):
    question: str = ""


class ClosingResponse(BaseModel):
    say: str = ""

REQUIRED_FIELDS = {
    "customer": ["name", "role", "email", "phone"],
    "business": ["name", "description", "address", "marketing_goals"],
}

FIELD_LABELS = {
    ("customer", "name"): "customer's full name",
    ("customer", "role"): "customer's role or title",
    ("customer", "email"): "customer's email address",
    ("customer", "phone"): "customer's phone number",
    ("business", "name"): "business name",
    ("business", "description"): "what the business does",
    ("business", "marketing_goals"): "marketing goals or desired outcomes",
    ("business", "website"): "business website URL",
    ("business", "address"): "business address",
}

FIELD_ORDER = [
    ("customer", "name"),
    ("customer", "role"),
    ("customer", "email"),
    ("customer", "phone"),
    ("business", "name"),
    ("business", "website"),
    ("business", "address"),
    ("business", "description"),
    ("business", "marketing_goals"),
]

OPTIONAL_FIELD_ORDER = [
    ("business", "services"),
    ("business", "customers"),
    ("business", "challenges"),
    ("business", "products"),
]