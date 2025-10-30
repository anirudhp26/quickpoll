# Demo Data Generator

The demo data generator automatically creates polls, votes, and likes to make the platform more interesting for demo purposes.

## How It Works

### Poll Creation
- Every 1 minute, 10 random polls are selected from the 100 polls in `sample_polls.json`
- Each poll is created with its options
- Polls are created by the `demo_user`

### Vote and Like Generation
- Every 1 second, up to 10 random active polls are selected
- For each selected poll:
  - **1 vote** is added by `demo_user` (if they haven't already voted)
  - **2-5 likes** are added by `demo_user` (if they haven't already liked)

## File Structure

- `sample_polls.json`: Contains 100 sample polls with titles, descriptions, and options
- The poll data includes diverse topics like programming, food, hobbies, technology, etc.

## Configuration

The demo data generator starts automatically when the FastAPI app starts and stops when the app shuts down.

To disable it, you can comment out the related code in `app/main.py`.
