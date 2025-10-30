from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session, joinedload, subqueryload, aliased
from sqlalchemy import func, case, select
from typing import List, Optional
import json
import uuid
import time
from datetime import datetime

from app.database.database import get_db
from app.models.models import Poll, PollOption, User, Vote, PollLike
from app.schemas.schemas import PollCreate, Poll as PollSchema, PollOption as PollOptionSchema
from app.websocket.manager import manager
from app.utils.session import get_or_create_user_by_session, get_current_user
from app.utils.poll_details import get_poll_details

router = APIRouter()

@router.post("/", response_model=PollSchema)
async def create_poll(poll: PollCreate, db: Session = Depends(get_db), x_session_id: Optional[str] = Header(None)):
    # Get or create user based on session
    if not x_session_id:
        x_session_id = str(uuid.uuid4())
    
    user = get_or_create_user_by_session(db, x_session_id)

    # Validate expires_in (max 1 day = 86400 seconds)
    expires_in = poll.expires_in
    if expires_in is not None and expires_in > 86400:
        raise HTTPException(status_code=400, detail="Poll expiry cannot exceed 1 day (86400 seconds)")

    # Create the poll
    db_poll = Poll(
        title=poll.title,
        description=poll.description,
        user_id=user.id,
        booster=poll.booster,
        expires_in=poll.expires_in,
        created_at=datetime.now()
    )
    db.add(db_poll)
    db.commit()
    db.refresh(db_poll)

    # Create poll options
    for option_text in poll.options:
        db_option = PollOption(text=option_text, poll_id=db_poll.id)
        db.add(db_option)

    db.commit()
    db.refresh(db_poll)

    poll_data = {
        "id": db_poll.id,
        "user_id": db_poll.user_id,
        "username": db_poll.owner.username,
        "title": db_poll.title,
        "description": db_poll.description,
        "total_votes": db_poll.total_votes,
        "total_likes": db_poll.total_likes,
        "options": [],
        "created_at": db_poll.created_at,
        "booster": db_poll.booster,
        "expires_in": db_poll.expires_in,
        "is_active": db_poll.is_active
    }
    
    await manager.broadcast({
        "type": "poll_created",
        "poll_id": db_poll.id,
        "data": poll_data
    })

    db_poll.total_votes = 0
    db_poll.total_likes = 0
    for option in db_poll.options:
        option.vote_count = 0

    return db_poll

@router.get("/", response_model=List[PollSchema])
async def get_polls(status: str = "active", skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get list of polls with aggregated counts."""
    
    vote_count = select(func.count(Vote.id))\
        .where(Vote.poll_id == Poll.id)\
        .correlate(Poll)\
        .scalar_subquery()
    
    like_count = select(func.count(PollLike.id))\
        .where(PollLike.poll_id == Poll.id)\
        .correlate(Poll)\
        .scalar_subquery()
    
    query = db.query(Poll)\
        .add_columns(
            vote_count.label('total_votes'),
            like_count.label('total_likes')
        )\
        .options(
            joinedload(Poll.owner).load_only(User.id, User.username, User.email)
        )\
        .filter(Poll.is_active == (status == "active"))
    
    if current_user:
        user_voted = select(Vote.id)\
            .where(Vote.poll_id == Poll.id, Vote.user_id == current_user.id)\
            .correlate(Poll)\
            .exists()
        
        user_liked = select(PollLike.id)\
            .where(PollLike.poll_id == Poll.id, PollLike.user_id == current_user.id)\
            .correlate(Poll)\
            .exists()
        
        query = query.add_columns(user_voted, user_liked)
    
    results = query\
        .order_by(Poll.created_at.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()
    
    polls_data = []
    for row in results:
        if current_user:
            poll, total_votes, total_likes, has_voted, has_liked = row
        else:
            poll, total_votes, total_likes = row
            has_voted = has_liked = None
        
        poll_data = PollSchema(
            id=poll.id,
            is_active=poll.is_active,
            created_at=poll.created_at,
            user_id=poll.user_id,
            username=poll.owner.username if poll.owner else None,
            booster=poll.booster,
            title=poll.title,
            description=poll.description,
            options=[],
            expires_in=poll.expires_in,
            total_votes=total_votes,
            total_likes=total_likes,
            user_liked=has_liked,
            user_voted_option_id=has_voted
        )
        
        polls_data.append(poll_data)
    
    return polls_data

@router.get("/{poll_id}", response_model=PollSchema)
async def get_poll(poll_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get a poll by ID."""

    poll = get_poll_details(db, poll_id, current_user.id if current_user else None)
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")

    return poll

@router.delete("/{poll_id}")
async def delete_poll(poll_id: int, db: Session = Depends(get_db)):
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if poll is None:
        raise HTTPException(status_code=404, detail="Poll not found")

    poll.is_active = False
    db.commit()

    # Notify WebSocket clients
    await manager.broadcast({
        "type": "poll_deleted",
        "poll_id": poll_id,
        "data": {}
    })

    return {"message": "Poll deleted successfully"}
