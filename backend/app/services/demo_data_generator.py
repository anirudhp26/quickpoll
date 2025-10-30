import asyncio
import random
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from collections import defaultdict

from app.database.database import SessionLocal
from app.models.models import Poll, Vote, PollLike, User
from app.websocket.manager import manager
from app.schemas.schemas import Poll as PollSchema, PollOption as PollOptionSchema

class DemoDataGenerator:
    def __init__(self):
        self.running = False
        self.demo_user_ids = []  # Store only IDs, not full objects
    
    async def _create_demo_users_pool(self, db: Session, count: int = 50):
        """Create a pool of demo users to reuse for votes and likes"""
        # Single query to get existing demo users
        existing_users = db.query(User.id).filter(
            User.username.like("demo_user_%")
        ).limit(count).all()
        
        existing_count = len(existing_users)
        self.demo_user_ids = [user.id for user in existing_users]
        
        if existing_count >= count:
            return
        
        # Bulk insert remaining users
        users_to_create = count - existing_count
        print(f"👥 Creating {users_to_create} demo users...")
        
        new_users = [
            User(
                username=f"demo_user_{existing_count + i}",
                email=f"{existing_count + i}@demo.local",
                hashed_password="no_password"
            )
            for i in range(users_to_create)
        ]
        
        db.bulk_save_objects(new_users, return_defaults=True)
        db.commit()
        
        # Refresh user IDs
        all_users = db.query(User.id).filter(
            User.username.like("demo_user_%")
        ).limit(count).all()
        self.demo_user_ids = [user.id for user in all_users]

    async def start(self):
        """Start the demo data generator"""
        self.running = True
        
        db = SessionLocal()
        try:
            # Use exists() for faster check
            demo_user_exists = db.query(
                db.query(User).filter(User.username == "obsidian").exists()
            ).scalar()
            
            if not demo_user_exists:
                demo_user = User(
                    username="obsidian",
                    email="obsidian@example.com",
                    hashed_password="obsidian_password"
                )
                db.add(demo_user)
                db.commit()
            
            await self._create_demo_users_pool(db, count=50)
        finally:
            db.close()
        
        asyncio.create_task(self._add_votes_and_likes_periodically())
        asyncio.create_task(self._expire_polls_periodically())
    
    def stop(self):
        """Stop the demo data generator"""
        self.running = False
    
    async def _add_votes_and_likes_periodically(self):
        """Add votes and likes to the last 5 created polls every 15 seconds"""
        while self.running:
            db = SessionLocal()
            try:
                if not self.demo_user_ids:
                    await self._create_demo_users_pool(db, count=50)
                
                from datetime import datetime, timezone
                now = datetime.now(timezone.utc)
                
                # Eager load options to avoid N+1 queries
                from sqlalchemy.orm import joinedload
                polls = db.query(Poll).options(
                    joinedload(Poll.options)
                ).filter(
                    Poll.is_active == True,
                    Poll.booster == True
                ).order_by(Poll.created_at.desc()).limit(5).all()
                
                # Filter expired polls in Python (faster than multiple DB calls)
                active_polls = [poll for poll in polls if not poll.is_expired()]
                
                if not active_polls:
                    await asyncio.sleep(15)
                    continue
                
                # Process all polls in parallel
                tasks = [
                    self._add_likes_and_votes_to_poll(db, poll) 
                    for poll in active_polls
                ]
                await asyncio.gather(*tasks, return_exceptions=True)
                
            except Exception as e:
                print(f"❌ Error in periodic vote/like addition: {e}")
            finally:
                db.close()
            
            await asyncio.sleep(15)
    
    async def _expire_polls_periodically(self):
        """Check and expire polls every 30 seconds"""
        while self.running:
            db = SessionLocal()
            try:
                # Get only necessary fields
                polls = db.query(Poll.id, Poll.title, Poll.expires_in, Poll.created_at).filter(
                    Poll.is_active == True,
                    Poll.expires_in != None
                ).all()
                
                from datetime import datetime, timedelta
                now = datetime.now()
                
                # Identify expired polls
                expired_poll_ids = []
                for poll in polls:
                    if poll.expires_in and poll.created_at:
                        expiry_time = poll.created_at + timedelta(seconds=poll.expires_in)
                        if now >= expiry_time:
                            expired_poll_ids.append(poll.id)
                            print(f"⏰ Poll {poll.id} ('{poll.title}') has expired")
                
                if expired_poll_ids:
                    # Bulk update
                    db.query(Poll).filter(
                        Poll.id.in_(expired_poll_ids)
                    ).update({Poll.is_active: False}, synchronize_session=False)
                    db.commit()
                    
                    print(f"✅ Expired {len(expired_poll_ids)} poll(s)")
                    
                    # Broadcast deletions
                    for poll_id in expired_poll_ids:
                        await manager.broadcast({
                            "type": "poll_deleted",
                            "poll_id": poll_id,
                            "data": {}
                        })
                
            except Exception as e:
                print(f"❌ Error checking poll expiration: {e}")
                db.rollback()
            finally:
                db.close()
            
            await asyncio.sleep(30)
    
    async def _add_likes_and_votes_to_poll(self, db: Session, poll: Poll):
        """Add 10-20 votes and 10-20 likes to a specific poll"""
        if not poll.options:
            return
        
        votes_to_add = random.randint(10, 20)
        likes_to_add = random.randint(10, 20)
        
        if votes_to_add == 0 and likes_to_add == 0:
            return
        
        print(f"🗳️  Adding {votes_to_add} votes and {likes_to_add} likes to poll {poll.id}")
        
        # Get random unique users
        num_users_needed = max(votes_to_add, likes_to_add)
        selected_user_ids = random.sample(
            self.demo_user_ids, 
            min(num_users_needed, len(self.demo_user_ids))
        )
        
        # Batch query existing votes and likes for these users
        existing_votes = db.query(Vote.user_id, Vote.option_id).filter(
            and_(Vote.user_id.in_(selected_user_ids), Vote.poll_id == poll.id)
        ).all()
        existing_votes_map = {v.user_id: v.option_id for v in existing_votes}
        
        existing_likes = db.query(PollLike.user_id).filter(
            and_(PollLike.user_id.in_(selected_user_ids), PollLike.poll_id == poll.id)
        ).all()
        existing_likes_set = {like.user_id for like in existing_likes}
        
        # Prepare bulk operations
        votes_to_insert = []
        votes_to_update = []
        likes_to_insert = []
        option_vote_deltas = defaultdict(int)
        
        votes_added = 0
        likes_added = 0
        
        option_ids = [opt.id for opt in poll.options]
        
        for i, user_id in enumerate(selected_user_ids):
            # Add vote
            if i < votes_to_add:
                random_option_id = random.choice(option_ids)
                
                if user_id in existing_votes_map:
                    # Update existing vote
                    old_option_id = existing_votes_map[user_id]
                    if old_option_id != random_option_id:
                        votes_to_update.append((user_id, random_option_id))
                        option_vote_deltas[old_option_id] -= 1
                        option_vote_deltas[random_option_id] += 1
                else:
                    # Insert new vote
                    votes_to_insert.append(Vote(
                        user_id=user_id,
                        poll_id=poll.id,
                        option_id=random_option_id
                    ))
                    option_vote_deltas[random_option_id] += 1
                    votes_added += 1
            
            # Add like
            if i < likes_to_add and user_id not in existing_likes_set:
                likes_to_insert.append(PollLike(
                    user_id=user_id,
                    poll_id=poll.id
                ))
                likes_added += 1
        
        # Bulk insert new votes and likes
        if votes_to_insert:
            db.bulk_save_objects(votes_to_insert)
        
        if likes_to_insert:
            db.bulk_save_objects(likes_to_insert)
        
        # Bulk update changed votes
        for user_id, new_option_id in votes_to_update:
            db.query(Vote).filter(
                and_(Vote.user_id == user_id, Vote.poll_id == poll.id)
            ).update({Vote.option_id: new_option_id}, synchronize_session=False)
        
        db.commit()
        
        # Update counters in memory
        if votes_added > 0 or likes_added > 0:
            poll.total_votes += votes_added
            poll.total_likes += likes_added
            
            for option in poll.options:
                if option.id in option_vote_deltas:
                    option.vote_count += option_vote_deltas[option.id]
            
            # Broadcast update
            update_message = {
                "type": "poll_update",
                "poll_id": poll.id,
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
            
            await manager.broadcast(update_message)
            
            print(f"✅ Poll {poll.id}: Added {votes_added} votes, {likes_added} likes")

demo_data_generator = DemoDataGenerator()