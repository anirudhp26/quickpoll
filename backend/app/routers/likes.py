from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy import and_
from sqlalchemy.orm import Session, joinedload

from app.database.database import get_db
from app.models.models import Poll, PollLike, User
from app.models.models import PollOption
from app.schemas.schemas import (
    Poll as PollSchema,
    PollLike as PollLikeSchema,
    PollLikeCreate,
    PollOption as PollOptionSchema,
)
from app.utils.session import get_or_create_user_by_session
from app.websocket.manager import manager

router = APIRouter()

@router.post("/", response_model=PollLikeSchema)
async def create_like(like: PollLikeCreate, db: Session = Depends(get_db), x_session_id: Optional[str] = Header(None)):
    poll = db.query(Poll).filter(
        and_(Poll.id == like.poll_id, Poll.is_active == True)
    ).first()
    if poll is None:
        raise HTTPException(status_code=404, detail="Poll not found")

    session_id = x_session_id if x_session_id else str(uuid.uuid4())
    temp_user = get_or_create_user_by_session(db, session_id)

    existing_like = db.query(PollLike).filter(
        and_(PollLike.user_id == temp_user.id, PollLike.poll_id == like.poll_id)
    ).first()

    if existing_like:
        raise HTTPException(status_code=400, detail="You have already liked this poll")

    db_like = PollLike(
        user_id=temp_user.id,
        poll_id=like.poll_id
    )
    db.add(db_like)
    db.commit()
    db.refresh(db_like)

    poll = db.query(Poll)\
        .options(
            joinedload(Poll.options).joinedload(PollOption.votes),
            joinedload(Poll.votes),
            joinedload(Poll.likes),
            joinedload(Poll.owner).load_only(User.id, User.username, User.email)
        )\
        .filter(Poll.id == like.poll_id)\
        .first()
    
    like_message = {
        "type": "poll_update",
        "poll_id": like.poll_id,
        "data": {
            "id": poll.id,
            "title": poll.title,
            "description": poll.description,
            "total_votes": poll.total_votes,
            "total_likes": poll.total_likes,
            "options": [{
                "id": o.id,
                "text": o.text,
                "vote_count": o.vote_count,
                "created_at": o.created_at,
                "poll_id": o.poll_id,
                "percentage": int((o.vote_count / poll.total_votes * 100) if poll.total_votes > 0 else 0)
            } for o in poll.options],
            "user_id": poll.user_id,
            "username": poll.owner.username,
            "created_at": poll.created_at,
            "booster": poll.booster,
            "expires_in": poll.expires_in,
            "is_active": poll.is_active
        }
    }

    await manager.broadcast_to_poll(like.poll_id, like_message)
    
    await manager.broadcast(like_message)

    return {
        "id": db_like.id,
        "poll_id": db_like.poll_id,
        "user_id": db_like.user_id,
        "created_at": db_like.created_at,
        "session_id": session_id
    }

@router.delete("/{poll_id}")
async def delete_like(poll_id: int, db: Session = Depends(get_db), x_session_id: Optional[str] = Header(None)):
    if not x_session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    temp_user = get_or_create_user_by_session(db, x_session_id)

    like = db.query(PollLike).filter(
        and_(PollLike.user_id == temp_user.id, PollLike.poll_id == poll_id)
    ).first()
    if like is None:
        raise HTTPException(status_code=404, detail="Like not found")

    db.delete(like)
    db.commit()

    poll = db.query(Poll)\
        .options(
            joinedload(Poll.options).joinedload(PollOption.votes),
            joinedload(Poll.votes),
            joinedload(Poll.likes),
            joinedload(Poll.owner).load_only(User.id, User.username, User.email)
        )\
        .filter(Poll.id == poll_id)\
        .first()
    
    unlike_message = {
        "type": "poll_update",
        "poll_id": poll_id,
            "data": {
            "id": poll.id,
            "title": poll.title,
            "description": poll.description,
            "total_votes": poll.total_votes,
            "total_likes": poll.total_likes,
            "options": [{
                "id": o.id,
                "text": o.text,
                "vote_count": o.vote_count,
                "created_at": o.created_at,
                "poll_id": o.poll_id,
                "percentage": int((o.vote_count / poll.total_votes * 100) if poll.total_votes > 0 else 0)
            } for o in poll.options],
            "user_id": poll.user_id,
            "username": poll.owner.username,
            "created_at": poll.created_at,
            "booster": poll.booster,
            "expires_in": poll.expires_in,
            "is_active": poll.is_active
        }
    }

    await manager.broadcast_to_poll(poll_id, unlike_message)

    await manager.broadcast(unlike_message)

    return {"message": "Like deleted successfully"}
