# QuickPoll Frontend

This is the frontend for QuickPoll, a real-time polling application built with Next.js and TypeScript.

## Features

- **Real-time Updates**: See poll results update in real-time without refreshing the page.
- **Create and Share Polls**: Easily create new polls and share them with others.
- **Vote on Polls**: Participate in polls by casting your vote.
- **Like Polls**: Show your appreciation for polls you find interesting.
- **User Identification**: Uses a session-based approach to identify users and prevent duplicate voting.
- **Responsive Design**: The application is designed to work on both desktop and mobile devices.

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/quickpoll.git
   ```
2. Navigate to the frontend directory:
   ```bash
   cd quickpoll/frontend
   ```
3. Install the dependencies:
   ```bash
   npm install
   ```
4. Create a `.env.local` file in the `frontend` directory and add the following environment variable:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

The application should now be running at `http://localhost:3000`.

## Tech Stack

- **Framework**: Next.js
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks and Context API
- **Real-time Communication**: WebSockets
- **Deployment**: Vercel (recommended)

## API Communication

The frontend communicates with the backend via a RESTful API. The API client is located in `src/lib/api.ts` and provides methods for interacting with the backend services.

### API Endpoints

- `GET /polls?status=<status>`: Get a list of active polls.
- `GET /polls/<pollId>`: Get a specific poll by its ID.
- `POST /polls`: Create a new poll.
- `POST /votes`: Cast a vote on a poll.
- `POST /likes`: Like a poll.
- `DELETE /likes/<pollId>`: Unlike a poll.
- `GET /polls/<pollId>/stats`: Get statistics for a poll.
