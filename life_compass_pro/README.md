# Life Compass Pro — Local-First Life OS (Demo)

**What it is:** a single-page app you can host anywhere or run locally. It’s **multi-user (on this device)**, keeps everything **local-first** (per account), and supports **images via IndexedDB**.

> ⚠️ Auth is *demo only* — email/password are stored locally (hashed but not secure). For real multi-user across devices, you’d add a backend (e.g., Supabase/Firebase).

## Features
- **Accounts**: Create/sign in/out; each account has separate data.
- **Journal**: Text + optional photo; search, filter, edit, delete.
- **Vision Board**: Add text + image uploads.
- **Gallery**: Upload multiple images; download or delete.
- **Goals**: Kanban (To Do / Doing / Done) with drag-and-drop.
- **Habits**: Per-month tappable calendar + streak.
- **Growth Areas**: Spiritual, Physical, Financial, Emotional, Mental, Relationships — click to log notes (hour/day/week).
- **Planner**: 100-year calendar (current year → +100). Click a date to add tasks/notes; see dots on days with open items.
- **Alerts**: On-visit reminder for today’s items. Optional Browser Notifications (works while the page is open).
- **Backup**: Export/import JSON per account. Theme toggle (light/dark) and account reset.

## Run in VS Code
1. Open the folder.
2. Install **Live Server** (optional).
3. Open `index.html` in your browser.

## Upgrading to real multi-user & push alerts (optional)
- Add an auth backend (Supabase/Firebase) and sync data to a database.
- Register a Service Worker for background notifications & offline caching.
