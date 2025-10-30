from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func
from typing import Optional
from sqlalchemy.sql import func, select

from app.models.models import Poll, PollOption, User, Vote, PollLike
from app.schemas.schemas import Poll as PollSchema, PollOption as PollOptionSchema

def get_poll_details(db: Session, poll_id: int, user_id: Optional[int] = None):
    """Get single poll with full details."""
    
    vote_count = select(func.count(Vote.id))\
        .where(Vote.poll_id == Poll.id)\
        .correlate(Poll)\
        .scalar_subquery()
    
    like_count = select(func.count(PollLike.id))\
        .where(PollLike.poll_id == Poll.id)\
        .correlate(Poll)\
        .scalar_subquery()
    
    poll_query = db.query(Poll)\
        .add_columns(
            vote_count.label('total_votes'),
            like_count.label('total_likes')
        )\
        .options(
            joinedload(Poll.owner).load_only(User.id, User.username, User.email),
            joinedload(Poll.options)
        )\
        .filter(Poll.id == poll_id)\
        .one_or_none()
    
    if not poll_query:
        return None
    
    poll, total_votes, total_likes = poll_query

    option_votes = db.query(
        PollOption.id,
        func.count(Vote.id).label('vote_count')
    )\
    .outerjoin(Vote)\
    .filter(PollOption.poll_id == poll_id)\
    .group_by(PollOption.id)\
    .all()
    
    vote_counts = dict(option_votes)
    
    user_vote = None
    user_liked = False
    
    if user_id:
        user_vote = db.query(Vote.option_id)\
            .filter(Vote.poll_id == poll_id, Vote.user_id == user_id)\
            .scalar()
        
        user_liked = db.query(PollLike.id)\
            .filter(PollLike.poll_id == poll_id, PollLike.user_id == user_id)\
            .first() is not None
    
    poll_data = PollSchema(
        id=poll.id,
        user_id=poll.user_id,
        username=poll.owner.username,
        title=poll.title,
        description=poll.description,
        created_at=poll.created_at,
        is_active=poll.is_active,
        booster=poll.booster,
        expires_in=poll.expires_in,
        total_votes=total_votes,
        total_likes=total_likes,
        options=[
            PollOptionSchema(
                id=opt.id,
                text=opt.text,
                poll_id=opt.poll_id,
                vote_count=vote_counts.get(opt.id, 0),
                created_at=opt.created_at,
                percentage=int((vote_counts.get(opt.id, 0) / total_votes * 100) if total_votes > 0 else 0)
            )
            for opt in poll.options
        ],
        user_voted_option_id=user_vote,
        user_liked=user_liked
    )

    return poll_data
