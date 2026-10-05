# 🛡️ WhistleDrop — Speak Without Being Seen

> **Confidential, zero-knowledge organizational whistleblowing and case tracking platform.**

WhistleDrop provides a secure, privacy-first channel for employees and stakeholders to safely report misconduct, harassment, security incidents, and corruption without revealing their identity or creating an account. Authorized moderators can review reports, inspect submitted messages and evidence URLs, and manage audit updates through a dedicated, protected dashboard.

---

## 🌟 Key Features

### 1. 🔏 True Anonymous Reporting
* **Zero Account Footprint**: Whistleblowers submit reports without accounts, emails, or personal identifiers.
* **Metadata Sanitization**: Submissions capture only the selected category, description, and optional evidence URL.
* **Cryptographic Case Codes**: The system generates a unique, human-friendly 14-character tracking code (e.g. `6D19-275D-58A6`) returned exclusively to the reporter.

### 2. 🔍 Real-Time Case Tracking
* **Audit Trail**: Reporters can query their Case Code at any time to monitor status changes (`SUBMITTED` ➔ `UNDER_REVIEW` ➔ `RESOLVED` / `DISMISSED`).
* **Moderator Notes**: View timestamped chronological notes published by investigation teams without compromising anonymity.

### 3. 💼 Secure Moderator Command Center
* **JWT-Authenticated Access**: Protected by signed JSON Web Tokens (`/moderator/*`).
* **Interactive Investigation Modal**: Moderators can click **`📄 View Message & URL`** to inspect the full submitted message and clickable evidence links in a dedicated modal window.
* **Atomic Case Updates**: Status changes and internal audit logs are written atomically using PostgreSQL database transactions (`BEGIN` / `COMMIT`).
* **Active Cache Invalidation**: Status modifications immediately flush the Redis query cache, ensuring live updates across all moderation sessions.

### 4. ⚡ High-Throughput Scalability & Enterprise Defense
* **Multi-Core Clustering Support**: Ready-to-use Node.js cluster scaling (`npm run start:cluster`) forks worker processes across all available CPU cores, multiplying request throughput without extra hardware.
* **Non-Blocking Atomic Cache Invalidation**: Replaced legacy $O(N)$ Redis `KEYS` scanning with an $O(1)$ Redis Set registry (`cache_registry:reports:all`) to guarantee zero event loop freezing under high traffic.
* **Dual-Tier Redis Caching**:
  * **Public Case Lookups**: 60s cached responses shield PostgreSQL from concurrent refresh spikes.
  * **Admin Listings**: Cached paginated views with instant invalidation upon status updates.
* **Keyset / Cursor Pagination ($O(1)$)**: Supports both traditional offset and timestamp cursor pagination (`?cursor=...`), maintaining instantaneous page loading speeds even over millions of rows.
* **Compound Database Indexes**: Pre-sorted compound indexes on `(status, created_at DESC)` and `(category, created_at DESC)` eliminate sequential disk scans.
* **HTTP Response Compression**: Integrated Gzip payload compression reducing outbound network payloads by up to 75%.
* **Redis Rate Limiting**: Centralized IP-based rate limiting on anonymous submission endpoints protects against automated spam and denial-of-service attacks.
* **SQL Injection Immunity**: 100% parameterized SQL queries via native PostgreSQL driver (`pg`).
* **Cross-Site Scripting (XSS) Prevention**: Hardened HTTP headers via `helmet` and safe DOM text bindings on the frontend.
* **CORS Policy Protection**: Fine-grained origin control and explicit preflight handling.

---

## 🛠️ Technology Stack

| Layer | Technology | Role |
| :--- | :--- | :--- |
| **Backend Runtime** | Node.js (v20+) | High-performance asynchronous execution & clustering |
| **API Framework** | Express.js 5.x | RESTful API routing, middleware chaining |
| **Primary Database** | PostgreSQL 15 | Relational data persistence with compound indexes |
| **Cache & Rate Limiting** | Redis 7 | Distributed key-value store for rate limits & $O(1)$ cache |
| **Compression** | compression | Automatic Gzip/Brotli HTTP payload compression |
| **Data Validation** | Zod | Runtime schema validation for requests and query parameters |
| **Authentication** | JSON Web Tokens & bcrypt | Moderator authorization and secure credential hashing |
| **Security Headers** | Helmet | Content Security Policy, MIME-sniffing prevention |
| **Frontend UI** | Modern Vanilla JS / CSS3 / HTML5 | Lightweight, responsive, zero-dependency presentation layer |

---

## 📁 Repository Structure

```text
WhistleDrop/
├── database/
│   └── init.sql                     # Raw PostgreSQL schema & indices initialization
├── frontend/
│   ├── index.html                   # Public portal (Submit & Track cases)
│   ├── app.js                       # Public portal interaction logic & API integration
│   ├── admin.html                   # Moderator command center & case inspection modal
│   ├── admin.js                     # Moderator authentication, pagination & status updates
│   └── style.css                    # Responsive styling
├── src/
│   ├── config/
│   │   ├── db.js                    # PostgreSQL connection pool & transaction helper
│   │   ├── env.js                   # Validated environment configuration loader
│   │   └── redis.js                 # Redis client lifecycle & connection manager
│   ├── controllers/
│   │   ├── auth.controller.js       # Moderator login & token issuance
│   │   └── report.controller.js     # Submission, tracking, pagination & atomic updates
│   ├── middlewares/
│   │   ├── auth.middleware.js       # JWT authorization guard for moderator routes
│   │   ├── error.middleware.js      # Centralized global error handler
│   │   ├── rateLimit.middleware.js  # Redis-backed submission rate limiting
│   │   └── validate.middleware.js   # Zod schema request validation middleware
│   ├── routes/
│   │   ├── auth.routes.js           # Authentication endpoints (/api/auth)
│   │   └── report.routes.js         # Report submission & management endpoints (/api/reports)
│   ├── schemas/
│   │   ├── auth.schema.js           # Credentials validation schemas
│   │   └── report.schema.js         # Submission & status validation schemas
│   ├── services/
│   │   └── crypto.service.js        # High-entropy random Case Code generator
│   ├── utils/
│   │   ├── AppError.js              # Operational HTTP error class
│   │   └── catchAsync.js            # Asynchronous route handler wrapper
│   ├── app.js                       # Express application bootstrap & middleware pipeline
│   └── server.js                    # Server startup, database pre-checks & port listener
├── create-admin.js                  # Automated moderator seeding script
├── docker-compose.yml               # Container definitions for PostgreSQL & Redis
├── .env.example                     # Environment variables configuration template
├── package.json                     # Dependencies & runnable scripts
└── README.md                        # Documentation
```

---

## 🚀 Quickstart Guide (3-Minute Setup)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Shantnu01/WhistleDrop.git
cd WhistleDrop
npm install
```

### 2. Configure Environment Variables
Copy the template to create your `.env` file:
```bash
cp .env.example .env
```
Default configuration template:
```env
PORT=3001
DATABASE_URL="postgresql://postgres:postgres@localhost:5454/whistledrop"
REDIS_URL="redis://localhost:6380"
JWT_SECRET="replace_with_your_strong_random_secret_min_32_chars"
NODE_ENV="development"
```

> ⚠️ **Security Notice:** Never commit actual production secrets to version control. Keep real credentials in your local `.env` file (which is gitignored) and generate a secure random 256-bit key for production deployments.

### 3. Spin Up PostgreSQL & Redis
WhistleDrop includes a turnkey `docker-compose.yml` configured on non-conflicting ports (`5454` for Postgres, `6380` for Redis):
```bash
docker compose up -d
```
*(The initialization script at `database/init.sql` executes automatically on first container launch).*

### 4. Seed Initial Moderator Account
Initialize default administrator credentials in the database:
```bash
npm run seed:admin
```
* **Default Username:** `admin`
* **Default Password:** `admin123`

### 5. Launch the Application
Start the backend API server:
```bash
npm run dev
```
*(Runs on [http://localhost:3001](http://localhost:3001))*

Serve the frontend client in a separate terminal:
```bash
npx http-server ./frontend -p 8080 -c-1
```
*(Runs on [http://localhost:8080](http://localhost:8080))*

---

## 🖥️ User Experience & Portals

### Public Portal (`http://localhost:8080`)
* **Submit Report**: Select category (`SECURITY`, `HARASSMENT`, `CORRUPTION`, `TECHNICAL`, `OTHER`), provide detailed description (minimum 10 characters), and optionally attach an evidence URL.
* **Receive Case Code**: Displays a generated Case Code with a confirmation toast.
* **Track Case**: Paste the Case Code anytime to inspect live status and moderator audit timeline.

### Moderator Command Center (`http://localhost:8080/admin.html`)
* **Secure Authentication**: Log in with administrator credentials.
* **Paginated Case Table**: Review cases organized by code, category, live status, and submission date.
* **Inspect Details**: Click **`📄 View Message & URL`** to inspect the full submitted message and clickable evidence links.
* **Update Case Status**: Change status to `UNDER_REVIEW`, `RESOLVED`, or `DISMISSED` with an attached investigation note.

---

## 🔐 Security Architecture

| Vector | Risk | WhistleDrop Countermeasure |
| :--- | :--- | :--- |
| **SQL Injection** | Unauthorized query execution | Parameterized `$1, $2` queries across all raw SQL interactions via `pg`. |
| **Cross-Site Scripting (XSS)** | Malicious script execution in browser | `helmet()` Content-Security-Policy & safe text-binding (`textContent`) on UI. |
| **Spam / Flood Attack** | Database exhaustion via anonymous submissions | Distributed Redis token-bucket rate limiting (5 requests / 15 mins / IP). |
| **Credential Theft** | Password database compromise | High-work-factor `bcrypt` cryptographic password hashing (salt rounds: 10). |
| **Tampering & Hijacking** | Unauthorized administrative actions | Signed, stateless JSON Web Tokens (JWT) verified on every protected route. |
| **Parameter Pollution** | Unvalidated extra parameters | Strict `Zod` object schemas rejecting or stripping undeclared payload fields. |
| **Data Inconsistency** | Partial updates on concurrent requests | ACID transactions (`BEGIN` ... `COMMIT` / `ROLLBACK`) for dual-table updates. |

---

## 📮 Postman Testing Guide

WhistleDrop includes a ready-to-use, pre-configured **Postman Collection v2.1** (`postman_collection.json`) in the root directory.

### Option A: 1-Click Postman Import (Recommended)
1. Open **Postman**.
2. Click **Import** (top left) and select or drag-and-drop [`postman_collection.json`](postman_collection.json).
3. The collection imports all 5 requests with automatic variable chaining:
   * When you run **Submit Anonymous Report**, your new `caseCode` is automatically saved to variables.
   * When you run **Moderator Login**, the returned JWT `token` is automatically captured and attached as Bearer Token to all protected requests.
   * When you run **List All Reports**, the first `reportId` is automatically captured for the update request.

---

### Option B: Manual Testing Parameters

#### 1. Global Connection & Auth Settings
* **Base URL:** `http://localhost:3001/api`
* **Default Moderator Credentials:**
  * **Username:** `admin`
  * **Password:** `admin123`
* **Header required for JSON requests:**
  * `Content-Type: application/json`
* **Header required for Moderator endpoints:**
  * `Authorization: Bearer <YOUR_JWT_TOKEN>`

#### 2. Allowed Enumeration Values (Strict Validation)
To avoid Zod validation errors, ensure your request payloads use these exact allowed values:
* **`category` (Case-Sensitive):**
  * `"SECURITY"`
  * `"HARASSMENT"`
  * `"CORRUPTION"`
  * `"TECHNICAL"`
  * `"OTHER"`
* **`status` (Case-Sensitive):**
  * `"SUBMITTED"`
  * `"UNDER_REVIEW"`
  * `"RESOLVED"`
  * `"DISMISSED"`
* **`description`:** String (minimum 10 characters required)
* **`evidenceUrl`:** Optional string (must be valid `https://...` URL or blank `""`)

---

## 📡 REST API Reference

### Public Endpoints

#### 1. Submit Anonymous Report
* **Endpoint:** `POST /api/reports`
* **Rate Limited:** Yes (5 requests per 15 min window per IP)
* **Payload:**
  ```json
  {
    "category": "SECURITY",
    "description": "Critical firewall misconfiguration observed on internal staging subnet.",
    "evidenceUrl": "https://example.com/log-dump.txt"
  }
  ```
* **Response (`201 Created`):**
  ```json
  {
    "message": "Report submitted successfully",
    "caseCode": "6D19-275D-58A6",
    "status": "SUBMITTED"
  }
  ```

#### 2. Track Case by Code
* **Endpoint:** `GET /api/reports/:caseCode`
* **Response (`200 OK`):**
  ```json
  {
    "category": "SECURITY",
    "status": "UNDER_REVIEW",
    "createdAt": "2026-10-04T14:23:21.507Z",
    "updates": [
      {
        "status": "UNDER_REVIEW",
        "note": "Investigation opened by Security Operations Team.",
        "createdAt": "2026-10-04T14:28:10.120Z"
      }
    ]
  }
  ```

---

### Moderator Endpoints (Requires `Authorization: Bearer <TOKEN>`)

#### 3. Moderator Authentication
* **Endpoint:** `POST /api/auth/login`
* **Payload:**
  ```json
  {
    "username": "admin",
    "password": "admin123"
  }
  ```
* **Response (`200 OK`):**
  ```json
  {
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

#### 4. List All Reports
* **Endpoint:** `GET /api/reports/moderator/all?page=1&limit=50`
* **Response (`200 OK`):**
  ```json
  {
    "meta": {
      "total": 12,
      "page": 1,
      "limit": 50,
      "totalPages": 1
    },
    "data": [
      {
        "id": "7620e77f-e8d7-4d01-a059-41fda2af41dd",
        "case_code": "6D19-275D-58A6",
        "category": "SECURITY",
        "description": "Critical firewall misconfiguration observed on internal staging subnet.",
        "evidence_url": "https://example.com/log-dump.txt",
        "status": "UNDER_REVIEW",
        "created_at": "2026-10-04T14:23:21.507Z"
      }
    ]
  }
  ```

#### 5. Update Report Status
* **Endpoint:** `PATCH /api/reports/moderator/:id/status`
* **Payload:**
  ```json
  {
    "status": "RESOLVED",
    "note": "Firewall configuration patched and security rules reapplied."
  }
  ```
* **Response (`200 OK`):**
  ```json
  {
    "message": "Report status updated successfully",
    "report": {
      "id": "7620e77f-e8d7-4d01-a059-41fda2af41dd",
      "status": "RESOLVED"
    }
  }
  ```

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
