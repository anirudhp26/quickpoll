from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.models import User
from fastapi import Header, Depends
from app.database.database import get_db

def get_or_create_user_by_session(db: Session, session_id: str):
    """
    Get or create a user based on session ID (fingerprint ID from frontend).
    This ensures each browser session gets a unique user that persists across actions.
    Handles race conditions and duplicate key violations gracefully.
    """
    username = f"visitor_{session_id[:8]}"
    email = f"{session_id}@anonymous.local"
    
    # First try to find by email (which is guaranteed unique)
    user = db.query(User).filter(User.email == email).first()
    if user:
        # Update username in case it changed (session regenerated)
        if user.username != username:
            user.username = username
            db.commit()
        return user
    
    # Try to create new user, handle race condition
    try:
        user = User(
            username=username,
            email=email,
            hashed_password="no_password"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except IntegrityError:
        # Race condition: another request created the user
        db.rollback()
        # Try to get the user again by email
        user = db.query(User).filter(User.email == email).first()
        if user:
            return user
        # If still not found, raise the error
        raise

def get_current_user(x_session_id: str | None = Header(None), db: Session = Depends(get_db)) -> User | None:
    if x_session_id:
        return get_or_create_user_by_session(db, x_session_id)
    return None

