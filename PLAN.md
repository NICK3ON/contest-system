# Implementation Plan

## Phase 1 — complete

- Express bootstrap, configuration, environment example, and health endpoint
- Prisma PostgreSQL schema, initial migration, and seed structure
- Pino request/application logging and centralized safe error responses
- Request-validation helper and baseline/rule-specific rate-limit middleware
- Initial health test and Postman collection

## Remaining phases

6. Gemini natural-language search and validated question generation.
7. Endpoint-level rate-limit application, security review, comprehensive tests, Postman examples, and final documentation.

## Phase 2 - complete

- `POST /api/auth/register`, `POST /api/auth/login`, and protected `GET /api/auth/me`
- bcrypt password hashing, JWT issuance/verification, and database-backed authentication
- Reusable role authorization middleware; public registration is intentionally limited to `USER`

## Phase 3 - complete

- Public contest listing/detail endpoints with derived `UPCOMING`, `ACTIVE`, and `ENDED` status
- Admin-only contest CRUD and manual question creation
- Validated single-select, multi-select, and true/false questions with unique option text
- Protected participant question retrieval with contest access-level enforcement and no correct-answer fields

## Phase 4 - complete

- Active-contest joining with role/access enforcement and one participation per user/contest
- Individually saved answers with server timestamps, option ownership checks, and deadline enforcement
- Exact-set scoring for all question types with no negative marking
- Transactional final submission using a PostgreSQL row lock to prevent duplicate/concurrent finalization
- Late submission support that scores only answers saved on or before the contest deadline

## Phase 5 - complete

- Public contest leaderboards ordered by score, completion duration, and deterministic participation ID
- Public global leaderboard derived from submitted participation score totals
- Authenticated participation history, in-progress contest, and prize history endpoints
- Admin-only ended-contest finalization with contest/participation row locks and idempotent prize creation
- Finalization closes late submission so an awarded winner cannot be displaced afterward
