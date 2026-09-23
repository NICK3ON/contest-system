# AI Usage Disclosure

Codex was used for boilerplate, schema and migration work, implementation, refactoring, tests, debugging, and documentation. Generated code was reviewed, tested, and modified before inclusion.

Gemini is the in-application provider for natural-language contest search and admin question generation. Gemini returns structured JSON only. Every response is validated with Zod before it can affect a Prisma query or database insert. Gemini never generates or executes SQL.

Important architectural and business decisions—including derived contest status, role access, server-generated answer timing, exact-set scoring, row locking, deterministic ranking, and idempotent prize awarding—were made deliberately in application and database code. They are not delegated to AI output.

The final output was verified with automated unit, HTTP, security, and database-backed integration tests. AI-generated suggestions were not accepted as a substitute for validation or test evidence.
