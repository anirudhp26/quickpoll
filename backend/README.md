# QuickPoll Backend

This is the backend for QuickPoll, a real-time polling application built with FastAPI and Python.

## Features

- **Real-time Updates**: Uses WebSockets to provide real-time updates for poll results.
- **RESTful API**: Provides a comprehensive set of API endpoints for managing polls, users, votes, and likes.
- **Database Integration**: Uses SQLAlchemy to interact with a PostgreSQL database.
- **Session-based User Identification**: Identifies users with a session ID to prevent duplicate voting.
- **Demo Data Generator**: Includes a background task to generate sample poll data for demonstration purposes.

## Getting Started

### Prerequisites

- Python 3.8+
- pip
- Docker (optional, for running a PostgreSQL database)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/quickpoll.git
   ```
2. Navigate to the backend directory:
   ```bash
   cd quickpoll/backend
   ```
3. Create a virtual environment:
   ```bash
   python -m venv venv
   ```
4. Activate the virtual environment:
   - On Windows:
     ```bash
     venv\Scripts\activate
     ```
   - On macOS and Linux:
     ```bash
     source venv/bin/activate
     ```
5. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
6. Create a `.env` file in the `backend/app` directory and add the following environment variable for the database connection:
   ```env
   DATABASE_URL="postgresql://user:password@localhost/quickpolldb"
   ```
   **Note**: If you're using Docker, you can use the provided `docker-compose.yml` to start a PostgreSQL container.
7. Start the development server:
   ```bash
   uvicorn app.main:app --reload
   ```

The API should now be running at `http://localhost:8000`.

## API Documentation

The API is documented using Swagger UI and can be accessed at `http://localhost:8000/docs` when the server is running.

### API Endpoints

#### Polls

- `POST /api/polls/`: Create a new poll.
- `GET /api/polls/`: Get a list of polls.
- `GET /api/polls/{poll_id}`: Get a specific poll by its ID.
- `DELETE /api/polls/{poll_id}`: Delete a poll.

#### Users

- `POST /api/users/`: Create a new user.
- `GET /api/users/{user_id}`: Get a user by their ID.
- `GET /api/users/`: Get a list of users.

#### Votes

- `POST /api/votes/`: Cast a vote on a poll.
- `DELETE /api/votes/{vote_id}`: Delete a vote.

#### Likes

- `POST /api/likes/`: Like a poll.
- `DELETE /api/likes/{poll_id}`: Unlike a poll.

### WebSockets

The WebSocket endpoint is available at `/ws/{poll_id}`. It allows clients to subscribe to real-time updates for a specific poll.
- `poll_id=0` is a global listener for events like new polls.

## Tech Stack

- **Framework**: FastAPI
- **Language**: Python
- **Database**: PostgreSQL with SQLAlchemy
- **Real-time Communication**: WebSockets
- **Deployment**: Docker, uvicorn
