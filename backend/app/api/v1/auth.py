from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token, UserUpdate, PasswordChange
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    payload: UserCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Register a new user account. If this is the very first user, they automatically become ADMIN."""
    existing_user = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists"
        )
    
    # Check total users count; if 0, grant ADMIN privileges to initial system architect
    total_users = db.query(User).count()
    assigned_role = UserRole.ADMIN.value if total_users == 0 else payload.role.value

    new_user = User(
        email=payload.email.lower(),
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        role=assigned_role,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    client_ip = request.client.host if request.client else None
    log_audit_event(
        db=db,
        action="REGISTER",
        entity_name="USER",
        user_id=new_user.id,
        user_email=new_user.email,
        entity_id=new_user.id,
        details={"role": new_user.role, "full_name": new_user.full_name},
        ip_address=client_ip
    )

    return new_user

@router.post("/login", response_model=Token)
def login(
    payload: UserLogin,
    request: Request,
    db: Session = Depends(get_db)
):
    """Authenticate with email and password, returning a JWT access token and user profile."""
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    client_ip = request.client.host if request.client else None

    if not user or not verify_password(payload.password, user.hashed_password):
        log_audit_event(
            db=db,
            action="LOGIN_FAILED",
            entity_name="USER",
            user_email=payload.email.lower(),
            details={"reason": "Invalid credentials"},
            ip_address=client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        log_audit_event(
            db=db,
            action="LOGIN_BLOCKED",
            entity_name="USER",
            user_id=user.id,
            user_email=user.email,
            details={"reason": "Account deactivated"},
            ip_address=client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact an administrator."
        )

    token = create_access_token(
        subject=user.email,
        role=user.role,
        user_id=user.id
    )

    log_audit_event(
        db=db,
        action="LOGIN_SUCCESS",
        entity_name="USER",
        user_id=user.id,
        user_email=user.email,
        entity_id=user.id,
        details={"role": user.role},
        ip_address=client_ip
    )

    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """Retrieve profile and permissions for currently authenticated user."""
    return current_user

@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """List all user accounts (Administrator privilege required)."""
    return db.query(User).order_by(User.created_at.desc()).all()

@router.patch("/users/{user_id}/status", response_model=UserResponse)
def update_user_status(
    user_id: str,
    payload: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Activate or deactivate user account (Admin only). Cannot deactivate self."""
    if user_id == current_user.id and payload.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot deactivate their own account"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.role is not None:
        user.role = payload.role.value
    if payload.full_name is not None:
        user.full_name = payload.full_name

    db.commit()
    db.refresh(user)

    client_ip = request.client.host if request.client else None
    log_audit_event(
        db=db,
        action="UPDATE_USER",
        entity_name="USER",
        user_id=current_user.id,
        user_email=current_user.email,
        entity_id=user.id,
        details={"updated_fields": payload.model_dump(exclude_unset=True)},
        ip_address=client_ip
    )

    return user

@router.post("/change-password")
def change_password(
    payload: PasswordChange,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Change password for currently authenticated user."""
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password verification failed"
        )
    
    current_user.hashed_password = get_password_hash(payload.new_password)
    db.commit()

    client_ip = request.client.host if request.client else None
    log_audit_event(
        db=db,
        action="PASSWORD_CHANGE",
        entity_name="USER",
        user_id=current_user.id,
        user_email=current_user.email,
        entity_id=current_user.id,
        ip_address=client_ip
    )

    return {"message": "Password updated successfully"}
