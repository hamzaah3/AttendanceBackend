# Attendance API (Express backend)

Express backend for the Attendance app. Exposes REST endpoints for users, attendance, holidays, and commitment history. Connects to MongoDB Atlas.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/users?firebaseUid=...` | Get user by Firebase UID |
| POST   | `/api/users` | Create or update user (body: firebaseUid, name, email, ...) |
| GET    | `/api/attendance?userId=...` | List attendance for user |
| GET    | `/api/attendance?userId=...&date=...` | Get one day |
| POST   | `/api/attendance` | Create attendance |
| PATCH  | `/api/attendance` | Update (body: id, checkInTime, checkOutTime, notes) |
| DELETE | `/api/attendance?id=...` | Delete attendance |
| GET    | `/api/holidays?userId=...` | List holidays |
| POST   | `/api/holidays` | Add holiday |
| DELETE | `/api/holidays?id=...` | Delete holiday |
| GET    | `/api/commitment?userId=...` | List commitment history |
| POST   | `/api/commitment` | Add commitment |
| GET    | `/api/health` | Health check |

## Environment variables

Create a `.env` file in this directory (see `.env.example`):

- **`MONGODB_URI`** (required): MongoDB Atlas connection string.
- **`MONGODB_DATABASE`** (optional): Database name, default `attendance`.
- **`PORT`** (optional): Local server port, default `3000`. Ignored on Vercel.

Do **not** commit `.env`. Add it to `.gitignore` (already listed).

## Local development

```bash
cd attendanceApi
npm install
cp .env.example .env
# Edit .env and set MONGODB_URI
npm start
```

Server runs at `http://localhost:3000`. In the Expo app, set `EXPO_PUBLIC_API_ORIGIN=http://localhost:3000` to use this backend.

## Deploy to Vercel

1. Deploy this folder as a Vercel project (e.g. connect repo and set **Root Directory** to `attendanceApi`).
2. In the Vercel project **Settings → Environment Variables**, add:
   - **`MONGODB_URI`**: your Atlas connection string.
   - **`MONGODB_DATABASE`** (optional): e.g. `attendance`.
3. After deploy, use the deployment URL (e.g. `https://attendance-api-xxx.vercel.app`) as **`EXPO_PUBLIC_API_ORIGIN`** in the Expo app.

No build step required; Vercel runs the Node serverless function from `api/index.js` and rewrites all requests to it via `vercel.json`.
