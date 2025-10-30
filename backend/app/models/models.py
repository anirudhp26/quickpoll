from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func, select
from sqlalchemy.ext.hybrid import hybrid_property
from app.database.database import Base
from datetime import datetime, timezone

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    polls = relationship("Poll", back_populates="owner", cascade="all, delete-orphan")
    votes = relationship("Vote", back_populates="user", cascade="all, delete-orphan")
    poll_likes = relationship("PollLike", back_populates="user", cascade="all, delete-orphan")

class Poll(Base):
    __tablename__ = "polls"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    booster = Column(Boolean, default=False)
    expires_in = Column(Integer)  # seconds

    # Relationships
    owner = relationship("User", back_populates="polls")
    options = relationship("PollOption", back_populates="poll", cascade="all, delete-orphan")
    votes = relationship("Vote", back_populates="poll", cascade="all, delete-orphan")
    likes = relationship("PollLike", back_populates="poll", cascade="all, delete-orphan")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.total_votes = 0
        self.total_likes = 0

    @hybrid_property
    def total_votes(self):
        return len(self.votes)

    @total_votes.setter
    def total_votes(self, value):
        self._total_votes = value

    @total_votes.expression
    def total_votes(cls):
        return select([func.count(Vote.id)]).where(Vote.poll_id == cls.id).label("total_votes")

    @hybrid_property
    def total_likes(self):
        return len(self.likes)

    @total_likes.setter
    def total_likes(self, value):
        self._total_likes = value

    @total_likes.expression
    def total_likes(cls):
        return select([func.count(PollLike.id)]).where(PollLike.poll_id == cls.id).label("total_likes")

    def is_expired(self):
        """Check if the poll has expired based on expires_in"""
        if not self.expires_in:
            return False
        
        # Ensure created_at is timezone-aware
        created_at_aware = self.created_at
        if created_at_aware.tzinfo is None:
            created_at_aware = created_at_aware.replace(tzinfo=timezone.utc)

        now = datetime.now(timezone.utc)
        elapsed = (now - created_at_aware).total_seconds()
        return elapsed >= self.expires_in

class PollOption(Base):
    __tablename__ = "poll_options"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(String, nullable=False)
    poll_id = Column(Integer, ForeignKey("polls.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(), nullable=False)

    # Relationships
    poll = relationship("Poll", back_populates="options")
    votes = relationship("Vote", back_populates="option", cascade="all, delete-orphan")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.vote_count = 0

    @hybrid_property
    def vote_count(self):
        return len(self.votes)

    @vote_count.setter
    def vote_count(self, value):
        self._vote_count = value

    @vote_count.expression
    def vote_count(cls):
        return select([func.count(Vote.id)]).where(Vote.option_id == cls.id).label("vote_count")

class Vote(Base):
    __tablename__ = "votes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    poll_id = Column(Integer, ForeignKey("polls.id"), nullable=False)
    option_id = Column(Integer, ForeignKey("poll_options.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="votes")
    poll = relationship("Poll", back_populates="votes")
    option = relationship("PollOption", back_populates="votes")

    # Ensure one vote per user per poll
    __table_args__ = (UniqueConstraint('user_id', 'poll_id', name='_user_poll_vote'),)

class PollLike(Base):
    __tablename__ = "poll_likes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    poll_id = Column(Integer, ForeignKey("polls.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="poll_likes")
    poll = relationship("Poll", back_populates="likes")

    # Ensure one like per user per poll
    __table_args__ = (UniqueConstraint('user_id', 'poll_id', name='_user_poll_like'),)
