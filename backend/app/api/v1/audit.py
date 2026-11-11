from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List, Dict, Any
import json

from app.core.database import get_db
from app.core.deps import require_role
from app.models.user import User, UserRole
from app.models.audit import AuditLog

router = APIRouter(prefix="/audit", tags=["Security & Compliance Audit Logs"])

@router.get("/logs")
def list_audit_logs(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    action: Optional[str] = Query(None, description="Filter by action (e.g. LOGIN, CREATE, EXPORT_PDF_REPORT)"),
    entity_name: Optional[str] = Query(None, description="Filter by entity (e.g. PATIENT, ENCOUNTER, ML_MODEL)"),
    search: Optional[str] = Query(None, description="Search user email or entity ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.BIOCHEMIST]))
):
    """
    Query system security and data mutation audit trail.
    Restricted to Chief Biochemist and Administrator roles.
    """
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action.upper())

    if entity_name:
        query = query.filter(AuditLog.entity_name == entity_name.upper())

    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (AuditLog.user_email.ilike(search_fmt)) |
            (AuditLog.entity_id.ilike(search_fmt)) |
            (AuditLog.details_json.ilike(search_fmt))
        )

    total = query.count()
    logs = (
        query
        .order_by(desc(AuditLog.timestamp))
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    items = []
    for log in logs:
        parsed_details = None
        if log.details_json:
            try:
                parsed_details = json.loads(log.details_json)
            except Exception:
                parsed_details = {"raw": log.details_json}

        items.append({
            "id": log.id,
            "timestamp": log.timestamp.isoformat(),
            "user_id": log.user_id,
            "user_email": log.user_email or "SYSTEM/ANONYMOUS",
            "action": log.action,
            "entity_name": log.entity_name,
            "entity_id": log.entity_id,
            "details": parsed_details,
            "ip_address": log.ip_address or "127.0.0.1",
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
    }
