# Contest Participation System

A JavaScript/Express backend for the Contest Participation System take-home assessment. This repository currently implements **Phases 1 and 2**: application foundation plus JWT authentication, password hashing, and RBAC middleware.

## Prerequisites

- Node.js 18 or newer
- PostgreSQL 14 or newer

## Setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL` for a local PostgreSQL database.
2. Install packages with `npm install`.
3. Create the schema and apply the initial migration:

   ```bash
   npm run prisma:migrate -- --name init
   ```

   If using the committed migration against an existing deployment database, use:

   ```bash
   npm run prisma:deploy
   ```

4. Seed development data:

   ```bash
   npm run prisma:seed
   ```

5. Start the API:

   ```bash
   npm run dev
   ```

`GET /health` returns `{ "status": "ok" }`.

## Authentication

- `POST /api/auth/register` accepts `{ "name", "email", "password" }` and always creates a `USER` account. Roles cannot be selected at registration.
- `POST /api/auth/login` accepts `{ "email", "password" }` and returns a JWT plus a safe user profile.
- `GET /api/auth/me` requires `Authorization: Bearer <token>` and returns the current user.
- The `authenticate` middleware verifies the JWT and reloads the user from the database; `authorize('ADMIN')` (or another role) can protect subsequent phase endpoints.

Passwords require 8-128 characters, are bcrypt-hashed (12 rounds), and are never returned by the API. Registration and login share a strict auth rate limit.

The included seed creates an admin account for local development only: `admin@example.com` / `ChangeMe123!`. Change or remove that account before any shared environment.

## Data-model decisions

- Contest state is deliberately not persisted. It will be derived from `startTime` and `endTime` as `UPCOMING`, `ACTIVE`, or `ENDED`.
- Guest users have no database model; only authenticated roles (`ADMIN`, `VIP`, `USER`) are stored.
- `Participation` is unique per `(userId, contestId)`, enforcing one join per user and contest.
- `Answer` is unique per `(participationId, questionId)`, allowing a saved answer to be updated while preserving a server-generated `answeredAt` timestamp in later phases.
- `Prize.contestId` is unique, which supports idempotent single-winner prize awarding.
- Correctness is stored on options and answers but will be excluded from participant-facing query selections in the questions API.

## Scope status

## Contests and questions

- `GET /api/contests` and `GET /api/contests/:id` are public and return all contests. Their `status` is derived at response time from `startTime` and `endTime`.
- `POST`, `PATCH`, and `DELETE /api/contests/:id` management endpoints are restricted to `ADMIN` (creation is `POST /api/contests`).
- `POST /api/contests/:id/questions` is restricted to `ADMIN` and validates each supported question type and its options.
- `GET /api/contests/:id/questions` requires an eligible authenticated participant: `USER` for normal contests and `VIP` for normal/VIP contests. Admins do not receive participant questions. Correct-option flags and explanations are not exposed.

Phases 4 onward are intentionally not implemented yet: participation/scoring, leaderboards, prizes, and Gemini functionality remain out of scope until requested.
