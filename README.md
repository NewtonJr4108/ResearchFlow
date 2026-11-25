# ResearchFlow

A research workspace: organize work into projects, find papers, pull the reference list out of any PDF, find sources that back up your own writing, and export citations (APA, MLA, Chicago, IEEE, BibTeX).

## Getting started

Requires Node 20.19+ or 22.12+ (an even-numbered LTS release is recommended).

```bash
npm install
cp .env.example .env.local   # then fill in the Firebase values
npm run dev                  # web app on http://localhost:5173, API on :5050
```

Don't run `npm audit fix --force`: it can install broken or downgraded packages. Ordinary `npm audit fix` is fine.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server + API server with auto-reload |
| `npm test` | Unit tests (reference extraction, matching, citation formats) |
| `npm run build` | Production build of the client into `dist/` |
| `npm start` | API server; also serves `dist/` if it exists |

## How it fits together

```
src/                 React client (Vite)
  pages/             Dashboard, project Workspace, Settings, Login/Signup
  components/        Library, Search, Writing, PDF and Tasks panels
  data/store.js      All Firestore/Storage reads and writes
  lib/citations.js   Citation formatting
server/              Express API (no database; proxies public scholarly APIs)
  routes/research.js /api/search, /api/suggest, /api/references
  lib/sources.js     OpenAlex, arXiv and Crossref clients
  lib/text.js        Sentence/keyword handling, reference-list extraction
```

All user data lives in Firebase under `users/{uid}/…` (projects, tasks, sources, uploaded papers).

## Firebase setup

- Enable **Email/Password** sign-in in Authentication.
- Deploy the security rules in `firestore.rules` and `storage.rules` (Firebase console → Firestore/Storage → Rules, or `firebase deploy --only firestore:rules,storage`).
- Storing uploaded PDFs needs Cloud Storage enabled. If it isn't, reference extraction still works; only the original file isn't saved.

## Google Drive

The **Files** tab links Drive files to a project with an inline preview; the **PDF** tab can import a PDF or Google Doc from Drive; the **Writing** tab can import a Google Doc draft. The app only gets access to files the user picks (`drive.file` scope).

One-time setup in the [Google Cloud console](https://console.cloud.google.com), using the same project as Firebase (`researchflow-4e70d`):

1. **APIs & Services → Library**: enable **Google Drive API** and **Google Picker API**.
2. **OAuth consent screen**: choose *External*, fill in the app name and your email, add the scope `.../auth/drive.file`. While the app is in *Testing*, add yourself (and teammates) as test users.
3. **Credentials → Create credentials → OAuth client ID** → *Web application*. Under *Authorized JavaScript origins* add `http://localhost:5173` (plus your production URL later). Copy the client ID → `VITE_GOOGLE_CLIENT_ID`.
4. **Credentials → Create credentials → API key**. Restrict it to the *Google Picker API* and to HTTP referrer `http://localhost:5173/*`. Copy it → `VITE_GOOGLE_API_KEY`.
5. **Project settings** (Cloud console → IAM & Admin → Settings): copy the **Project number** → `VITE_GOOGLE_APP_ID`.

Restart `npm run dev` after editing `.env.local`. Previews in the Files tab show only when the viewer is signed in to a Google account that can open the file.

## Search limits

OpenAlex allows a small shared daily budget without a key (about 100 searches/day per network). Get a free key at https://openalex.org/settings/api and set `OPENALEX_API_KEY` in `.env.local` for about 10× more. Results are cached for 30 minutes.
