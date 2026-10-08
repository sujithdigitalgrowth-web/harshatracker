# Harsha Tracker

A personal dashboard for keeping track of every client: notes and changes, when each client was last checked, deadlines, links (sheets, reports, folders) and logins.

Live at https://harshatracker.vercel.app (sign-in required).

## How it's built

- `index.html`: the whole page. No build step.
- `api/login.js`: checks the password and sets a 30-day sign-in cookie.
- `api/data.js`: loads and saves everything. The page saves on its own after each change.
- Data lives in a Neon Postgres database (one `items` table, created on first use).

## Settings in Vercel

| Variable | What it's for |
|---|---|
| `DATABASE_URL` | Added by Vercel when the Neon database is connected |
| `APP_PASSWORD` | The password you sign in with. Changing it signs every device out |

Never commit these values. `.env*` files are ignored.

Opened without its server (for example as a local file), the page shows sample data instead.

## Tabs

- **Today**: a note box, a "needs your attention" list (late deadlines and clients you haven't checked in time), the week with arrows to move between weeks, and your recent notes.
- **Clients**: grouped by agency. Each client page has a note box, the notes history (filter by changes, notes or calls), deadlines, links and logins.
- **Links**: every sheet, report and folder, mapped to a client.
- **Logins**: email IDs and passwords, grouped by client.

## Shortcuts

- `/` search
- `N` new note
- `Ctrl + Enter` save the note you're typing
- `Esc` close a window or clear search

Deleting anything shows an **Undo** button for a few seconds.
