# Synapp POC API

A Node.js REST API for real-time quiz and poll events with CQRS architecture, JWT authentication, Matrix integration, and Supabase as the database.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM) |
| Framework | Express.js v5 |
| Database | Supabase (PostgreSQL) |
| Auth | JWT + Matrix (Synapse) |
| Architecture | CQRS (Command Query Responsibility Segregation) |
| API Docs | Swagger UI (OpenAPI 3.0) |
| Password Hashing | bcrypt |

---

## Folder Structure

```
synapp-poc/
├── src/
│   ├── config/
│   │   ├── db.js                        # Supabase client
│   │   └── swagger.js                   # OpenAPI 3.0 spec
│   ├── controller/
│   │   ├── auth.controller.js           # Login, signup handlers
│   │   └── event.controller.js          # Quiz/poll create, vote, answer handlers
│   ├── middleware/
│   │   ├── auth.js                      # Matrix token middleware
│   │   └── jwt.js                       # JWT verification middleware
│   ├── models/
│   │   ├── index.js                     # Exports all models
│   │   ├── event.model.js               # events table schema
│   │   ├── pollVote.model.js            # poll_votes table schema
│   │   └── quizAnswer.model.js          # quiz_answers table schema
│   ├── routes/
│   │   ├── index.js                     # Root router
│   │   ├── auth.routes.js               # /api/auth/*
│   │   └── event.routes.js              # /api/event/*
│   ├── services/
│   │   ├── auth.service.js              # Signup/login business logic
│   │   ├── matrix.service.js            # Matrix/Synapse integration
│   │   └── event/
│   │       ├── event.command.service.js # CQRS — write side
│   │       └── event.query.service.js   # CQRS — read side
│   └── server.js                        # Express app entry point
├── .env                                 # Environment variables (not committed)
├── .env.example                         # Environment variable reference
├── eslint.config.js                     # ESLint configuration
├── package.json
└── README.md
```

---

## Installation

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd synapp-poc

# 2. Install dependencies
npm install

# 3. Copy env file and fill in values
cp .env.example .env
```

---

## Environment Variables

Create a `.env` file in the root with the following:

```env
PORT=5001

SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key

DATABASE_URL=your_supabase_postgres_connection_string

MATRIX_BASE_URL=http://your-matrix-server:8008

JWT_SECRET=your_jwt_secret_key

SWAGGER_USER=synapp
SWAGGER_PASS=your_swagger_password
```

---

## Database Setup

Run the following SQL in your **Supabase SQL Editor** in order:

### 1. users table
```sql
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username     TEXT NOT NULL UNIQUE,
  password     TEXT NOT NULL,
  matrixUserId TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);
```

### 2. events table
```sql
CREATE TABLE events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name   TEXT NOT NULL CHECK (event_name IN ('quiz', 'poll')),
  event_title  TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('create', 'update')),
  user_id      UUID NOT NULL,
  question     TEXT NOT NULL,
  options      JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ
);
```

### 3. poll_votes table
```sql
CREATE TABLE poll_votes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id),
  user_id      UUID NOT NULL,
  option_index INT  NOT NULL CHECK (option_index BETWEEN 0 AND 3),
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);
```

### 4. quiz_answers table
```sql
CREATE TABLE quiz_answers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id),
  user_id      UUID NOT NULL,
  option_index INT  NOT NULL CHECK (option_index BETWEEN 0 AND 3),
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);
```

---

## Running the Server

```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

Server starts at: `http://localhost:5001`

---

## Swagger API Docs

```
http://localhost:5001/api-docs
```

Protected with basic auth:
- **Username:** `synapp`
- **Password:** *(set in .env as SWAGGER_PASS)*

---

## API Endpoints

### Auth

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/signup` | Register a new user | None |
| POST | `/api/auth/login` | Login, returns JWT + Matrix token | None |

### Events (Quiz & Poll)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/event` | Create or update a quiz/poll | JWT |
| GET | `/api/event` | Get all events for logged-in user | JWT |
| GET | `/api/event/:id` | Get single event by UUID | JWT |

### Poll

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/event/:id/vote` | Cast vote on a poll option (0–3) | JWT |
| GET | `/api/event/:id/results` | Get vote counts + percentages | JWT |

### Quiz

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/event/:id/answer` | Submit answer to a quiz by eventTitle | JWT |
| GET | `/api/event/:id/my-answer` | Get your own answer for a quiz | JWT |
| GET | `/api/event/:id/answers` | Get all answers — creator only | JWT |

---

## CQRS Architecture

```
POST /api/event  →  event.controller  →  event.command.service  →  Supabase (write)
GET  /api/event  →  event.controller  →  event.query.service    →  Supabase (read)
```

**Command side** (`event.command.service.js`):
- `createEventCommand` — inserts a new quiz/poll
- `updateEventCommand` — updates an existing event (owner only)
- `castVoteCommand` — upserts a poll vote
- `submitQuizAnswerCommand` — upserts a quiz answer

**Query side** (`event.query.service.js`):
- `getEventsByUserQuery` — all events by user
- `getEventByIdQuery` — single event by UUID
- `getPollResultsQuery` — vote counts + percentage per option
- `getMyQuizAnswerQuery` — logged-in user's answer for a quiz
- `getQuizAllAnswersQuery` — all answers + summary (creator only)

---

## Sample Requests

### Signup
```bash
curl -X POST http://localhost:5001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "pass123"}'
```

### Login
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "pass123"}'
```

### Create a Poll
```bash
curl -X POST http://localhost:5001/api/event \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT>" \
  -d '{
    "eventName": "poll",
    "eventTitle": "Friday Fun Poll",
    "type": "create",
    "question": "Favourite language?",
    "options": ["JavaScript", "Python", "Go", "Rust"]
  }'
```

### Create a Quiz
```bash
curl -X POST http://localhost:5001/api/event \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT>" \
  -d '{
    "eventName": "quiz",
    "eventTitle": "Math Quiz Round 1",
    "type": "create",
    "question": "What is 2 + 2?",
    "options": ["1", "2", "4", "8"]
  }'
```

### Cast a Poll Vote
```bash
curl -X POST http://localhost:5001/api/event/<POLL_UUID>/vote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT>" \
  -d '{"optionIndex": 1}'
```

### Get Poll Results
```bash
curl http://localhost:5001/api/event/<POLL_UUID>/results \
  -H "Authorization: Bearer <JWT>"
```

### Submit Quiz Answer
```bash
curl -X POST http://localhost:5001/api/event/Math%20Quiz%20Round%201/answer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT>" \
  -d '{"optionIndex": 2}'
```

### Get My Quiz Answer
```bash
curl http://localhost:5001/api/event/<QUIZ_UUID>/my-answer \
  -H "Authorization: Bearer <JWT>"
```

### Get All Quiz Answers (Creator only)
```bash
curl http://localhost:5001/api/event/<QUIZ_UUID>/answers \
  -H "Authorization: Bearer <JWT>"
```

---

## Linting

```bash
# Run ESLint
npx eslint src/
```
