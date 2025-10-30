from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import json
from contextlib import asynccontextmanager
import asyncio

from app.database.database import engine, Base, create_tables
from app.routers import polls_router as polls, users_router as users, votes_router as votes, likes_router as likes
from app.websocket.manager import manager
from app.models.models import Poll
from app.services.demo_data_generator import demo_data_generator

# Create database tables
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_tables()
    
    # Start demo data generator in background
    print("🚀 Starting demo data generator...")
    asyncio.create_task(demo_data_generator.start())
    
    yield
    
    # Shutdown
    print("🛑 Stopping demo data generator...")
    demo_data_generator.stop()

app = FastAPI(
    title="Free Poll API",
    description="Real-time polling platform API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(polls, prefix="/api/polls", tags=["polls"])
app.include_router(users, prefix="/api/users", tags=["users"])
app.include_router(votes, prefix="/api/votes", tags=["votes"])
app.include_router(likes, prefix="/api/likes", tags=["likes"])

@app.get("/")
async def root():
    return {"message": "Free Poll API", "version": "1.0.0"}

@app.websocket("/ws/{poll_id}")
async def websocket_endpoint(websocket: WebSocket, poll_id: int):
    await manager.connect(websocket)
    
    # For poll_id 0, this is a global listener (just connects without subscribing to specific poll)
    if poll_id != 0:
        await manager.subscribe_to_poll(poll_id, websocket)

    try:
        # Send current poll state when client connects (only for specific polls)
        if poll_id != 0:
            from app.database.database import SessionLocal
            db = SessionLocal()
            try:
                poll = db.query(Poll).filter(Poll.id == poll_id, Poll.is_active == True).first()
                if poll:
                    poll.total_votes = len(poll.votes)
                    poll.total_likes = len(poll.likes)
                    for option in poll.options:
                        option.vote_count = len([v for v in poll.votes if v.option_id == option.id])

                    await manager.send_personal_message(json.dumps({
                        "type": "poll_state",
                        "poll_id": poll_id,
                        "data": {
                            "total_votes": poll.total_votes,
                            "total_likes": poll.total_likes,
                            "options": [
                                {
                                    "id": opt.id,
                                    "text": opt.text,
                                    "vote_count": opt.vote_count,
                                    "percentage": (opt.vote_count / poll.total_votes * 100) if poll.total_votes > 0 else 0
                                }
                                for opt in poll.options
                            ]
                        }
                    }), websocket)
            finally:
                db.close()
        else:
            await manager.send_personal_message(json.dumps({
                "type": "connected",
                "poll_id": 0,
                "data": {"message": "Connected to global updates"}
            }), websocket)

        while True:
            data = await websocket.receive_text()
            # Handle client messages if needed
            await manager.send_personal_message(f"Echo: {data}", websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
