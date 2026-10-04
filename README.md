# WhistleDrop Backend (Vanilla JS Edition)

WhistleDrop is a confidential reporting backend system that allows individuals to submit reports anonymously, without exposing their identity or needing to create an account. It provides a secure way for moderators to review these reports and provide updates without jeopardizing the reporter's privacy.

## Features
- **Anonymous Reporting**: Submit a report (category, description, evidence URL) without an account.
- **Case Tracking**: Receive a unique, cryptographically secure Case Code (e.g., `A1B2-C3D4-E5F6`) to check the status of the report.
- **Moderator Access**: Secure JWT-based authentication for moderators to list, filter, and update cases.
- **Rate Limiting via Redis**: Protects the public submission endpoint from spam and DDoS attacks using Redis.
- **Raw SQL**: Pure SQL queries and transactions using `pg`, ensuring maximum database performance without an ORM.

## Tech Stack
- **Node.js / Express.js**: REST API Framework.
- **PostgreSQL (`pg`)**: Relational database for structured data storage, queried natively.
- **Redis (`redis` & `rate-limit-redis`)**: High-performance, distributed rate limiting.
- **Zod**: Robust request validation.
- **JWT & bcrypt**: Moderator authentication and password hashing.

## Setup Instructions

### Prerequisites
- Node.js (v20+)
- PostgreSQL server
- Redis server

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
PORT=3000
DATABASE_URL="postgresql://username:password@localhost:5432/whistledrop"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your_super_secret_jwt_key"
NODE_ENV="development"
```

### 3. Database Initialization
Because this project does not use an ORM, you must manually execute the raw SQL script to create the necessary tables.
Using `psql` or any Postgres client (pgAdmin, DBeaver), run the script located at:
```
database/init.sql
```

### 4. Running the Server
Development mode (using Node's native watch mode):
```bash
npm run dev
```
Production mode:
```bash
npm start
```

## API Endpoints Summary

### Public Anonymous Endpoints
- `POST /api/reports` - Submit a new report. *(Protected by Redis rate limiting)*
- `GET /api/reports/:caseCode` - Get report status and moderator updates.

### Moderator Endpoints (Requires Bearer Token)
- `POST /api/auth/login` - Authenticate a moderator.
- `GET /api/reports/moderator/all` - List and filter all reports.
- `PATCH /api/reports/moderator/:id/status` - Update report status and add a note.

*(Note: There is a helper route `POST /api/auth/create-moderator` to quickly generate your first moderator account).*
