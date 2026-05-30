"""
schemas/notice.py — CMS Notice Schemas
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime
import json


class AudienceAll(BaseModel):
    type: Literal["all"] = "all"


class AudienceDepot(BaseModel):
    type: Literal["depot"] = "depot"
    depot_id: int


class AudienceRole(BaseModel):
    type: Literal["role"] = "role"
    role: str


class NoticeCreate(BaseModel):
    """Body of POST /notices — admin creates a notice."""
    title: str = Field(..., min_length=3, max_length=200)
    body: str = Field(..., min_length=10)
    audience_json: str = Field(default='{"type":"all"}',
                               description='JSON: {"type":"all"} | {"type":"depot","depot_id":2} | {"type":"role","role":"driver"}')
    publish_at: datetime
    requires_ack: bool = False

    @field_validator("audience_json")
    @classmethod
    def validate_audience(cls, v: str) -> str:
        """Ensure audience_json is valid JSON with correct structure."""
        try:
            data = json.loads(v)
            if data.get("type") not in ("all", "depot", "role"):
                raise ValueError("audience type must be 'all', 'depot', or 'role'")
        except json.JSONDecodeError:
            raise ValueError("audience_json must be valid JSON")
        return v


class NoticeReadOut(BaseModel):
    """Read receipt for one user."""
    user_id: int
    user_name: str
    read_at: datetime
    acked_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NoticeOut(BaseModel):
    """Full notice detail."""
    id: int
    title: str
    body: str
    audience_json: str
    publish_at: datetime
    requires_ack: bool
    created_at: datetime
    created_by_name: str
    is_read: Optional[bool] = None     # Populated for the current user's context
    is_acked: Optional[bool] = None

    class Config:
        from_attributes = True


class NoticeListItem(BaseModel):
    """Compact notice for list view."""
    id: int
    title: str
    publish_at: datetime
    requires_ack: bool
    is_read: bool = False
    is_acked: bool = False
    read_count: int = 0
    total_audience: int = 0

    class Config:
        from_attributes = True
