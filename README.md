# Sync-Board — Real-Time Collaborative Whiteboard

A browser-based collaborative whiteboard for classrooms and study groups. Create a room, share its short class code, and work on the same board in real time.

> Student project exploring real-time web applications, collaborative interfaces, and AI-assisted development.

## ✨ Features

- **Quick room sharing:** create or join a classroom with a short alphanumeric code.
- **Live collaboration:** synchronize drawing strokes and board changes with other participants.
- **Drawing tools:** use a range of pen, shape, text, selection, and eraser tools.
- **Multi-page boards:** create, switch, and rename whiteboard pages.
- **Classroom controls:** participant list, teacher/student roles, board locking, and class-ending controls.
- **Undo/redo:** manage board edits.
- **Export:** export board content as PNG or PDF.
- **Voice features:** voice chat is implemented using browser WebRTC APIs.
- **Connection feedback:** status messages and reconnect handling.
- **Health endpoint:** check server status at `/api/health`.

Feature availability may depend on running the app with its server and configuring the required environment.

## 🧱 Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Styling/UI:** Tailwind CSS, Lucide React, Motion
- **Backend:** Node.js, Express
- **Real-time events:** Socket.IO
- **Voice:** WebRTC browser APIs
- **AI integration dependency:** Google GenAI SDK
- **Build/type checks:** Vite, TypeScript, and `tsx`

## 🚀 Run Locally

### Prerequisites

- Node.js (a current LTS release is recommended)
- npm, or Bun if you prefer the included `bun.lock`
- A Gemini API key if you use server features that require Gemini

### 1. Clone the repository

```bash
git clone https://github.com/prince-sarann/Sync-Board.git
cd Sync-Board
```

### 2. Install dependencies

With npm:

```bash
npm install
```

Or with Bun:

```bash
bun install
```

### 3. Configure environment variables

Create a local `.env` file based on `.env.example`. Add your own values only if required by the features you run.

```env
GEMINI_API_KEY=your_gemini_api_key
APP_URL=http://localhost:3000
```

Keep real credentials in your local `.env` file. Never commit API keys or secrets to GitHub. The repository's `.gitignore` excludes local environment files.

### 4. Start the development server

```bash
npm run dev
```

The project starts through `tsx server.ts`; check the terminal output for the actual local URL and port. If your setup requires a different port or environment configuration, adjust it locally.

### 5. Build and type-check

```bash
npm run build
npm run lint
```

## 🔎 Useful Endpoint

When the server is running, visit `/api/health` on the same host and port to receive a health response including the current number of active rooms.

## 🔐 Privacy & Security Notes

- Classroom state is held in the running server's memory; do not assume rooms persist after a server restart.
- Do not share API keys, tokens, or private configuration in screenshots or commits.
- This is a learning project, not a security-audited production classroom service.
- Before public deployment, review CORS settings, access controls, rate limits, and data-handling requirements.

## 🗺️ Possible Improvements

- Add automated tests for room creation, joining, and collaboration events.
- Add deployment instructions and a verified live demo link.
- Add screenshots or a short demo recording.
- Review production security and error handling before wider use.

## 👨‍💻 Author

**Prince Kumar Saran** · [GitHub](https://github.com/prince-sarann) · [LinkedIn](https://www.linkedin.com/in/prince-saran-bb1437441)

---

Made as a student project to make collaborative learning more interactive.
