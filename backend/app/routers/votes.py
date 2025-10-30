from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from typing import Optional
import uuid

from app.database.database import get_db
from app.models.models import Poll, PollOption, User, Vote
from app.schemas.schemas import VoteCreate, Vote as VoteSchema, Poll as PollSchema, PollOption as PollOptionSchema
from app.websocket.manager import manager
from app.utils.session import get_or_create_user_by_session

router = APIRouter()

@router.post("/", response_model=VoteSchema)
async def create_vote(vote: VoteCreate, db: Session = Depends(get_db), x_session_id: Optional[str] = Header(None)):
    poll = db.query(Poll).filter(
        and_(Poll.id == vote.poll_id, Poll.is_active == True)
    ).first()
    if poll is None:
        raise HTTPException(status_code=404, detail="Poll not found")

    option = db.query(PollOption).filter(
        and_(PollOption.id == vote.option_id, PollOption.poll_id == vote.poll_id)
    ).first()
    if option is None:
        raise HTTPException(status_code=404, detail="Poll option not found")

    session_id = x_session_id if x_session_id else str(uuid.uuid4())
    temp_user = get_or_create_user_by_session(db, session_id)

    existing_vote = db.query(Vote).filter(
        and_(Vote.user_id == temp_user.id, Vote.poll_id == vote.poll_id)
    ).first()

    if existing_vote:
        existing_vote.option_id = vote.option_id
        db.commit()
        db.refresh(existing_vote)
    else:
        db_vote = Vote(
            user_id=temp_user.id,
            poll_id=vote.poll_id,
            option_id=vote.option_id
        )
        db.add(db_vote)
        db.commit()
        db.refresh(db_vote)

        existing_vote = db_vote

    db.commit()
    
    from sqlalchemy.orm import joinedload
    poll = db.query(Poll)\
        .options(
            joinedload(Poll.options).joinedload(PollOption.votes),
            joinedload(Poll.owner).load_only(User.id, User.username, User.email),
            joinedload(Poll.votes),
            joinedload(Poll.likes)
        )\
        .filter(Poll.id == vote.poll_id)\
        .first()
    
    vote_message = {
        "type": "poll_update",
        "poll_id": vote.poll_id,
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

    await manager.broadcast(vote_message)

    return {
        "id": existing_vote.id,
        "poll_id": existing_vote.poll_id,
        "option_id": existing_vote.option_id,
        "user_id": existing_vote.user_id,
        "created_at": existing_vote.created_at,
        "session_id": session_id
    }

@router.delete("/{vote_id}")
async def delete_vote(vote_id: int, db: Session = Depends(get_db)):
    vote = db.query(Vote).filter(Vote.id == vote_id).first()
    if vote is None:
        raise HTTPException(status_code=404, detail="Vote not found")

    poll_id = vote.poll_id
    db.delete(vote)
    db.commit()

    await manager.broadcast_to_poll(poll_id, {
        "type": "vote_removed",
        "poll_id": poll_id,
        "data": {"vote_id": vote_id}
    })

    return {"message": "Vote deleted successfully"}
