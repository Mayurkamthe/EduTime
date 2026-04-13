# EduTime - SPPU Engineering College Smart Timetable Generator

A complete timetable management system for SPPU-affiliated engineering colleges.

## Tech Stack
- **Backend**: Node.js + Express.js
- **Frontend**: EJS + Bootstrap 5
- **Database**: MongoDB (Mongoose)
- **Auth**: Email + OTP (Nodemailer)

## Features
- OTP-based login (no passwords)
- CRUD for Subjects, Professors, Rooms, Classes
- Auto batch generation (2–3 batches per class)
- Smart timetable generation (Greedy + Backtracking)
- Batch-wise lab scheduling with no clashes
- Class / Faculty / Room timetable views
- Export to PDF and Excel
- Role-based access (Admin / HoD)

## Setup

```bash
npm install
cp .env.example .env   # fill in your values
node app.js
```

## Environment Variables

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/sppu_timetable
SESSION_SECRET=your_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_app_password
SMTP_FROM=SPPU Timetable <your@email.com>
```

## Usage

1. Start MongoDB locally
2. Run `node app.js`
3. Visit `http://localhost:3000`
4. Add a user via MongoDB or the settings panel, then login with email OTP

## Project Structure

```
/models         - Mongoose schemas
/routes         - Express routers
/controllers    - Request handlers
/services       - Timetable algorithm (slotEngine + generator)
/views          - EJS templates
/public         - CSS / JS assets
/config         - DB + Mailer config
app.js          - Entry point
```
