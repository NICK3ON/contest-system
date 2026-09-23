# Optional demo frontend

This folder is intentionally independent from the backend implementation. It is a small vanilla HTML, CSS, and JavaScript demonstration layer; it has no build process, dependencies, API business logic, or separate database.

Start the API normally, then open `http://localhost:3000/demo/`. Public browsing stays on that page; authentication lives at `http://localhost:3000/demo/sign-in/`.

The demo supports public contest browsing, Gemini-assisted natural-language search, registration/login, joining an eligible active contest, loading participant-safe questions, saving answers, submitting, participation history, prizes, and contest/global leaderboards. When an ADMIN signs in, it also supports contest creation and editing, manual or Gemini-generated questions, deletion, and prize finalization.

The interface separates these capabilities into role-aware views: Explore, Admin workspace, My activity, and Leaderboard. The admin workspace uses one contest selector and focused task tabs so only one management form is shown at a time.
