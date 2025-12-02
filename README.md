# Medha MERN Registration

Simple MERN-style app to register a user by Registration Id and Password to MongoDB Atlas.

## Stack
- Backend: Node.js, Express, Mongoose, bcrypt, CORS
- Frontend: React 18 via CDN + TailwindCSS (static file)

## Prerequisites
- Node.js 18+

## Setup (Windows)
1. Install server dependencies:
   - Open a terminal in `medha-mern/server` and run:
     ```bash
     npm install
     ```
2. Start the server:
   ```bash
   npm run dev
   ```
   Server starts on `http://localhost:4000`. If that port is busy, it will fall back to the next free port (e.g., 4001).

3. Open the frontend:
   - Double-click `medha-mern/client/index.html` to open in your browser, or serve it with any static server.
   - The frontend auto-tries backend ports 4000, 4001, 4002 for API requests.

## Configuration
- The MongoDB URL is hardcoded in `server/src/index.js` using the value you provided. Replace it with an environment variable for production use.

## API
- `POST /api/register`
  - Body: `{ registrationId, password, confirmPassword }`
  - Responses: `201` on success, `400/409/500` on validation/conflict/error.

### Questions (Rounds & Levels)

Supports 4 rounds, each with 3 levels (1–3). Upload 3 CSV files at once (one per level) and the server will parse and store questions.

- `POST /api/questions/upload?round=<1|2|3|4>`
  - Content-Type: `multipart/form-data`
  - Files (all required):
    - `level1`: CSV for level 1
    - `level2`: CSV for level 2
    - `level3`: CSV for level 3
  - CSV format (header row + rows):
    - Required columns (case-insensitive variants accepted):
      - `question`
      - `A`, `B`, `C`, `D`
      - `answer` (one of A/B/C/D)
  - Example header:
    ```csv
    question,A,B,C,D,answer
    Who founded Python?,Guido van Rossum,Brendan Eich,James Gosling,Dennis Ritchie,A
    ```
  - Response: `{ message, inserted, levels: { 1: n, 2: n, 3: n } }`

- `GET /api/questions`
  - Returns up to 5000 questions (sorted by round, level)

- `GET /api/questions/:round/:level`
  - Returns questions for a specific round and level
