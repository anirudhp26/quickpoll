# QuickPoll - Real-Time Polling Platform

A modern, real-time polling platform where users can create polls, vote, like polls, and see live updates as other users interact. Built with a FastAPI backend and Next.js frontend, with WebSocket support for real-time functionality.

## Features

- ✅ **Create Polls**: Users can create polls with multiple options.
- ✅ **Real-time Voting**: Vote on polls and see results update in real-time.
- ✅ **Like System**: Like polls and see like counts update live.
- ✅ **Responsive Design**: Mobile-friendly interface built with Tailwind CSS.
- ✅ **WebSocket Integration**: Live updates across all connected clients.
- ✅ **Session-based Tracking**: Anonymous users are tracked by session to prevent duplicate votes.

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: Database ORM
- **PostgreSQL**: Primary database
- **WebSockets**: Real-time communication
- **Pydantic**: Data validation

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **React Hooks**: State management

## Project Structure

```
quickpoll/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── database/        # Database configuration
│   │   ├── models/          # SQLAlchemy models
│   │   ├── routers/         # API endpoints
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── websocket/       # WebSocket management
│   │   └── main.py          # FastAPI application
│   └── requirements.txt     # Python dependencies
├── frontend/                # Next.js frontend
│   ├── src/
│   │   ├── app/             # Next.js app router
│   │   ├── components/      # React components
│   │   ├── lib/             # Utilities and API client
│   │   └── types/           # TypeScript definitions
│   ├── package.json         # Node.js dependencies
│   └── tailwind.config.ts   # Tailwind configuration
└── README.md
```

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 18+
- Docker and Docker Compose (recommended for PostgreSQL)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/quickpoll.git
   cd quickpoll
   ```

2. **Run PostgreSQL with Docker**
   ```bash
   docker-compose up -d
   ```
   This will start a PostgreSQL container and make it available at `postgresql://user:password@localhost/quickpolldb`.

### Backend Setup

1. **Navigate to the backend directory**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create a `.env` file**
   In the `backend/app` directory, create a `.env` file with the following content:
   ```env
   DATABASE_URL="postgresql://user:password@localhost/quickpolldb"
   ```

5. **Run the backend server**
   ```bash
   uvicorn app.main:app --reload
   ```
   The backend will be available at `http://localhost:8000`.

### Frontend Setup

1. **Navigate to the frontend directory**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create a `.env.local` file**
   In the `frontend` directory, create a `.env.local` file with the following content:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:3000`.

## API Endpoints

The API is documented using Swagger UI, which can be accessed at `http://localhost:8000/docs` when the backend is running.

### Polls
- `GET /api/polls`: Get all active polls.
- `GET /api/polls/{poll_id}`: Get a specific poll.
- `POST /api/polls`: Create a new poll.
- `DELETE /api/polls/{poll_id}`: Deactivate a poll.

### Votes
- `POST /api/votes`: Cast a vote.

### Likes
- `POST /api/likes`: Like a poll.
- `DELETE /api/likes/{poll_id}`: Unlike a poll.

### WebSocket
- `WS /ws/{poll_id}`: Connect to a poll for real-time updates.

## Database Schema

### Users
- `id`: Primary key
- `username`: Unique username (for session-based users: `session_<uuid>`)
- `email`: User's email
- `hashed_password`: Hashed password
- `is_active`: Account status
- `created_at`: Timestamp

### Polls
- `id`: Primary key
- `title`: Poll title
- `description`: Optional description
- `is_active`: Poll status
- `created_at`: Timestamp
- `user_id`: Foreign key to the creator

### Poll Options
- `id`: Primary key
- `text`: Option text
- `poll_id`: Foreign key to the poll

### Votes
- `id`: Primary key
- `user_id`: Foreign key to the user
- `poll_id`: Foreign key to the poll
- `option_id`: Foreign key to the option
- `created_at`: Timestamp
- **Constraint**: A user can only vote once per poll.

### Poll Likes
- `id`: Primary key
- `user_id`: Foreign key to the user
- `poll_id`: Foreign key to the poll
- `created_at`: Timestamp
- **Constraint**: A user can only like a poll once.

## License

This project is licensed under the MIT License. See the `LICENSE` file for more details.
