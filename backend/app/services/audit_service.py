import json
from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models.audit import AuditLog

def log_audit_event(
    db: Session,
    action: str,
    entity_name: str,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    entity_id: Optional[str] = None,
    details: Optional[dict[str, Any]] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    """Record an audit trail event in the database for security compliance."""
    audit_entry = AuditLog(
        user_id=user_id,
        user_email=user_email,
        action=action,
        entity_name=entity_name,
        entity_id=entity_id,
        details_json=json.dumps(details, default=str) if details else None,
        ip_address=ip_address,
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry
