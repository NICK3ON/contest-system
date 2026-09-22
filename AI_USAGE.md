# AI Usage Disclosure

Codex was used to help generate and organize this project foundation, including boilerplate, the initial Prisma schema/migration, documentation, and the health test. Generated code was reviewed and deliberately kept within the requested Phase 1 scope.

Gemini is the planned in-application provider for the two later AI features: natural-language contest search and admin question generation. Gemini will be constrained to structured data, validated with Zod, and will never generate or execute SQL.

Important business decisions—including derived contest status, one participation per user/contest, server-generated answer timing, exact-set multi-select scoring, and one idempotent prize per contest—are represented deliberately in the schema or deferred service design. They are not delegated to AI output.
