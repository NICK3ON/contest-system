# Contest Participation System

A JavaScript/Express and PostgreSQL backend for a timed contest platform. It supports role-based access, answer editing until the deadline, exact-set scoring, deterministic leaderboards, prize finalization, and Gemini-assisted search and question generation.

## Prerequisites

- Node.js 18 or newer
- PostgreSQL 14 or newer, or Docker

## Local setup

1. Copy `.env.example` to `.env`. Set a strong `JWT_SECRET` and, if using the AI endpoints, a `GEMINI_API_KEY`. Never commit `.env`.
2. Start PostgreSQL. The included Docker configuration can do this with:

   ```bash
   docker compose up -d db
   ```

3. Install dependencies and prepare the database:

   ```bash
   npm install
   npm run prisma:deploy
   npm run prisma:seed
   ```

4. Start the API:

   ```bash
   npm run dev
   ```

The API defaults to `http://localhost:3000`; `GET /health` returns `{ "status": "ok" }`.

### Optional demo frontend

The assessment does not require a frontend, but a dependency-free demo is included as a bonus. It is isolated in [`frontend/`](frontend) and served by the API at `http://localhost:3000/demo/`; its separate sign-in/register screen is at `http://localhost:3000/demo/sign-in/`. It demonstrates public browsing, Gemini-assisted search, role-aware participation, answer saving and submission, history, prizes, leaderboards, and the main ADMIN workflows: contest creation/editing/deletion, manual and AI-generated questions, answer-key review, and prize finalization. It does not change API business logic.

The development seed creates these local-only accounts, all with password `ChangeMe123!`:

| Role | Email |
| --- | --- |
| ADMIN | `admin@example.com` |
| VIP | `vip@example.com` |
| USER | `user@example.com` |

Change or remove seeded credentials before using a shared environment.

## How the system works

1. An administrator creates a contest and adds questions manually or through Gemini. Contest status is calculated from the server clock, so no background job is needed to move a contest between `UPCOMING`, `ACTIVE`, and `ENDED`.
2. Guests can browse contest details. An authenticated `USER` can join an active `NORMAL` contest; a `VIP` can join active `NORMAL` and `VIP` contests. An `ADMIN` cannot participate.
3. After joining, the participant fetches the contest questions. Correct options and explanations are removed from participant-facing responses.
4. Each answer is saved separately and can be replaced while the contest is active. The server records `answeredAt`; client timestamps are never accepted.
5. When the participant submits, the API locks that participation, scores the latest answers saved by the deadline, and changes it from `IN_PROGRESS` to `SUBMITTED`. Only one concurrent submission can succeed.
6. Contest and global leaderboards are calculated from submitted participations. After a contest ends, an administrator finalizes it once and the highest-ranked participant receives the configured prize.
7. Gemini is used only to produce structured search filters or question candidates. Zod validates its output, and application code—not Gemini—queries or writes the database.

## API overview

Send protected requests with `Authorization: Bearer <token>`.

| Method and path | Access | Purpose |
| --- | --- | --- |
| `POST /api/auth/register` | Public | Register a `USER`; callers cannot select a role |
| `POST /api/auth/login` | Public | Authenticate and receive a JWT |
| `GET /api/auth/me` | Authenticated | Return the current user |
| `GET /api/contests` | Public | List contests with derived status |
| `GET /api/contests/:id` | Public | Get contest details |
| `POST /api/contests/search` | Public, AI-limited | Search contests using natural language |
| `POST /api/contests` | ADMIN | Create a contest |
| `PATCH /api/contests/:id` | ADMIN | Update a contest |
| `DELETE /api/contests/:id` | ADMIN | Delete a contest |
| `POST /api/contests/:id/questions` | ADMIN | Add a validated question |
| `POST /api/contests/:id/questions/generate` | ADMIN, AI-limited | Generate validated questions with Gemini |
| `GET /api/contests/:id/questions` | Joined participant or ADMIN | Get participant-safe questions, or the complete admin answer key |
| `POST /api/contests/:id/join` | USER or VIP | Join an eligible active contest |
| `PUT /api/participations/:id/answers/:questionId` | Owner | Create or change a saved answer before the deadline |
| `POST /api/participations/:id/submit` | Owner | Finalize and score saved answers |
| `GET /api/contests/:id/leaderboard` | Public | Get the contest ranking |
| `GET /api/leaderboard` | Public | Get aggregate global rankings |
| `GET /api/users/me/history` | Authenticated | Get completed participation history |
| `GET /api/users/me/in-progress` | Authenticated | Get the current in-progress contest |
| `GET /api/users/me/prizes` | Authenticated | Get awarded prizes |
| `POST /api/contests/:id/finalize` | ADMIN | Award the ended contest's prize idempotently |

## Core behavior and design decisions

- Contest status is derived from server time and `startTime`/`endTime`; it is not stored as mutable state.
- Normal contests accept `USER` and `VIP` participants. VIP contests accept only `VIP`. Admins cannot participate.
- A user can join a contest once. Participant questions never expose correct-option flags or explanations.
- Answers are upserted, so participants can change them while the contest is active. The server owns `answeredAt`; writes after the deadline are rejected.
- Submission can occur after the deadline, but scoring includes only answers saved by the deadline. Finalizing the contest closes late submission and keeps the awarded winner stable.
- A question scores one point only when the selected option set exactly matches the correct set. There is no partial credit or negative marking.
- Submission and finalization use PostgreSQL row locks. Database uniqueness constraints protect participation, answers, and prize creation from duplicate or concurrent operations.
- Leaderboards use score, completion duration, and participation ID for stable deterministic ordering.

## Gemini features

`POST /api/contests/search` converts natural language into validated filters. Application code constructs the Prisma query; Gemini never creates or executes SQL. Supported filters include derived status, access level, topic, keyword, difficulty, prize presence, and start-time ranges. Keywords match contest names, descriptions, and topics. If AI filters find nothing, the complete query is also checked as a deterministic keyword fallback.

`POST /api/contests/:id/questions/generate` accepts optional `topic`, `difficulty`, `count` (1-20), and `questionTypes`. Generated data is validated for shape, count, requested types, unique options, and type-specific correctness. Normalized duplicate questions are skipped.

Contest and question difficulty is standardized as `BEGINNER`, `INTERMEDIATE`, or `ADVANCED`. The API, database, demo UI, and Gemini structured responses all enforce the same values.

The default model is `gemini-3.5-flash-lite`. The client has a 60-second request bound and makes up to four attempts with exponential backoff and jitter for transient rate-limit or provider failures. Provider-supplied retry timing is respected, daily quota exhaustion fails promptly, and minimal thinking is used for these focused structured-output tasks. Missing configuration returns `503`; exhausted provider or invalid-output failures return a safe `502`. Gemini may still be temporarily unavailable under sustained provider load or an exhausted daily quota.

## Validation and security

- Zod validates request bodies and AI output; relevant mutation bodies reject unknown fields.
- Passwords require 8-128 characters and are bcrypt-hashed with 12 rounds.
- Authentication, general API traffic, and AI endpoints have separate rate limits.
- JSON request bodies are limited to 100 KB. Malformed and oversized payloads receive safe `400` and `413` responses.
- Production startup requires a JWT secret of at least 32 characters.
- Authorization headers, cookies, credentials, tokens, API keys, and error request bodies are redacted from logs.
- Prisma constraint and not-found errors are translated into safe client responses; unexpected internals are not exposed.

## How to verify the project

### 1. Verify the database and API

After completing the local setup, validate the Prisma schema and confirm that all committed migrations are applied:

```bash
npx prisma validate
npm run prisma:deploy
```

Start the API with `npm run dev`, then open a second terminal and check its health:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{"status":"ok"}
```

### 2. Run the automated tests

Run the fast unit and HTTP security tests with:

```bash
npm test
```

Database-backed suites are skipped by default. Run the complete suite after PostgreSQL is migrated and seeded.

PowerShell:

```powershell
$env:RUN_INTEGRATION_TESTS='1'; npm test -- --detectOpenHandles
```

macOS/Linux shell:

```bash
RUN_INTEGRATION_TESTS=1 npm test -- --detectOpenHandles
```

All suites should pass. The full suite checks authentication, access levels, hidden correct answers, answer saving, exact-set scoring, deadline rejection, late submission of previously saved answers, duplicate concurrent submission, deterministic ranking, prize finalization, AI validation/retry behavior, and malformed or oversized requests. Gemini is mocked in automated tests, so these checks do not spend API quota.

### 3. Check the complete API flow with Postman

1. Import `postman/contest-system.postman_collection.json` into Postman.
2. Ensure the seeded API is running at `http://localhost:3000`. Change the collection's `baseUrl` variable if a different port is used.
3. Run the numbered folders in order:
   - `1 - System and authentication` checks health, logs in the seeded ADMIN and VIP, registers a unique USER, and captures all tokens.
   - `2 - Contest and question management` creates an active contest, captures its IDs, adds a question, and demonstrates the two Gemini endpoints.
   - `3 - Participation workflow` joins the contest, confirms correctness data is hidden, saves an answer, and submits it.
   - `4 - Leaderboards and user data` checks contest/global rankings and the authenticated user's history.
   - `5 - VIP and prize finalization` exercises VIP access, ends and finalizes the normal contest, and removes the created contests.
4. Confirm that the Postman test results are green and that the collection variables contain captured tokens and IDs.

The collection regenerates its temporary email and contest times automatically, so it can be run again. If `GEMINI_API_KEY` is empty, skip the two requests containing `Gemini` or `Natural-language`; the rest of the collection is independent of the external provider.

### Expected business-rule checks

- A guest can list contests but receives `401` when attempting a protected action.
- A `USER` is rejected from a `VIP` contest, while a `VIP` can join it.
- Participant question and answer responses never contain `isCorrect`.
- Re-saving an answer before the deadline replaces it; changing it after the deadline returns `409`.
- Two simultaneous submissions produce one success and one `409` conflict.
- Repeating prize finalization returns the existing prize instead of creating another one.

## Project notes

- `.env.example` documents required configuration without secrets; `.env` is Git-ignored.
- [`PLAN.md`](PLAN.md) summarizes completed phases.
- [`AI_USAGE.md`](AI_USAGE.md) discloses how AI tooling was used in the project and application.
- [`frontend/README.md`](frontend/README.md) describes the optional UI demo and its deliberately limited scope.
