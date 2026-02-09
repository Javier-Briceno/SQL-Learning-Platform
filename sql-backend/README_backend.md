# SQL Learning Platform - Backend 🔧

> NestJS REST API with PostgreSQL and Prisma ORM

---

## 🎯 Overview

RESTful API backend for the SQL Learning Platform, handling authentication, worksheet management, submission grading, and database sandboxes.

---

## 📦 Tech Stack

- **NestJS 11** - Progressive Node.js framework
- **Prisma 6** - Type-safe ORM
- **PostgreSQL** - Primary database
- **JWT** - Token-based authentication
- **Bcrypt** - Password hashing
- **Class Validator** - DTO validation
- **Jest** - Testing framework

---

## 🏗️ Project Structure

```
src/
├── auth/                 # Authentication & JWT
│   ├── dto/             # Login, Register, ChangePassword DTOs
│   ├── jwt.strategy.ts  # Passport JWT strategy
│   └── auth.service.ts  # Auth business logic
│
├── users/               # User management
│   ├── users.service.ts
│   └── users.controller.ts
│
├── worksheets/          # Exercise management
│   ├── worksheets.service.ts
│   ├── worksheets.controller.ts
│   └── database.dto.ts  # SQL execution DTOs
│
├── prisma/              # Database service
│   └── prisma.service.ts
│
└── main.ts              # Application entry point

prisma/
├── schema.prisma        # Database schema
├── seed.ts              # Initial data seeding
└── migrations/          # Database migrations
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sql_learning_platform"

# JWT
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Tutor Registration
TUTOR_REGISTRATION_KEY="TUT0R-K3Y-2025"

# Admin Setup
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="Admin123!"
```

### 3. Database Setup

```bash
# Run migrations
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate

# Seed initial data (admin account)
npx prisma db seed
```

### 4. Run Development Server

```bash
npm run start:dev
```

API runs at `http://localhost:3000`

---

## 📚 API Endpoints

### Authentication

```
POST   /auth/register          # Register new user
POST   /auth/login             # Login (returns JWT)
GET    /auth/profile           # Get current user (protected)
PATCH  /auth/change-password   # Change password (protected)
```

### Worksheets

```
GET    /worksheets             # List all worksheets
GET    /worksheets/:id         # Get worksheet details
POST   /worksheets             # Create worksheet (Tutor+)
PATCH  /worksheets/:id         # Update worksheet (Tutor+)
DELETE /worksheets/:id         # Delete worksheet (Tutor+)
POST   /worksheets/:id/publish # Publish worksheet (Tutor+)
```

### Submissions

```
GET    /submissions            # List submissions (filtered by role)
POST   /submissions            # Create/update submission
GET    /submissions/:id        # Get submission details
PATCH  /submissions/:id/grade  # Grade submission (Tutor+)
```

### Database Management

```
POST   /worksheets/execute-query    # Execute SQL in sandbox
GET    /worksheets/database-schema  # Get database schema
POST   /worksheets/copy-database    # Create student sandbox
```

### Users (Admin only)

```
GET    /users                  # List all users
PATCH  /users/:id/ban          # Ban user
PATCH  /users/:id/unban        # Unban user
DELETE /users/:id              # Delete user
```

---

## 🔐 Authentication Flow

1. User registers via `/auth/register`
2. Server hashes password with bcrypt
3. User logs in via `/auth/login`
4. Server validates credentials and returns JWT
5. Client includes JWT in `Authorization: Bearer <token>` header
6. JWT strategy validates token on protected routes

**Role Hierarchy:**
- `STUDENT` - Basic access
- `TUTOR` - Can create/grade worksheets
- `ADMIN` - Full system access

---

## 🗄️ Database Schema Highlights

### User Model
```prisma
model User {
  id               Int          @id @default(autoincrement())
  email            String       @unique
  passwordHash     String
  name             String
  role             Role         @default(STUDENT)
  isBanned         Boolean      @default(false)
  submissions      Submission[]
  tutorWorksheets  Worksheet[]
}
```

### Worksheet Model
```prisma
model Worksheet {
  id          Int      @id @default(autoincrement())
  title       String
  description String?
  database    String   // Target database name
  tutorId     Int
  dueDate     DateTime?
  isPublished Boolean  @default(false)
  tasks       Task[]
  submissions Submission[]
}
```

### Task Model
```prisma
model Task {
  id          Int      @id @default(autoincrement())
  title       String
  taskType    TaskType // MCQ, SQL, TEXT
  order       Int
  points      Int      @default(0)
  solution    String?  // Expected SQL query
  options     Json?    // For MCQ tasks
}
```

---

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

---

## 📊 Database Management

### Migrations

```bash
# Create new migration
npx prisma migrate dev --name your_migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset
```

### Prisma Studio

View/edit database in GUI:

```bash
npx prisma studio
```

Opens at `http://localhost:5555`

---

## 🔧 Development Scripts

```bash
npm run start          # Production mode
npm run start:dev      # Watch mode
npm run start:debug    # Debug mode
npm run build          # Build for production
npm run lint           # Run ESLint
npm run format         # Format with Prettier
```

---

## 🛡️ Security Best Practices

✅ **Implemented:**
- Password hashing with bcrypt (10 rounds)
- JWT token authentication
- Role-based authorization guards
- Input validation with class-validator
- SQL injection prevention via Prisma
- Environment variable configuration

⚠️ **Production Recommendations:**
- Use strong JWT_SECRET (min 32 characters)
- Enable HTTPS
- Implement rate limiting
- Add CORS configuration
- Use database connection pooling
- Enable request logging

---

## 📈 Performance Considerations

- **Prisma Connection Pooling** - Configured in `DATABASE_URL`
- **Lazy Loading** - Relations loaded on-demand
- **Indexes** - Email field indexed for fast lookups
- **Caching** - Consider Redis for session management

---

## 🐛 Common Issues

**Issue:** `Error: Cannot find module '@prisma/client'`
```bash
Solution: npx prisma generate
```

**Issue:** Database connection refused
```bash
Solution: Check PostgreSQL is running and DATABASE_URL is correct
```

**Issue:** Migrations out of sync
```bash
Solution: npx prisma migrate reset (dev only)
```

---

## 📝 API Documentation

When running in development, Swagger docs are available at:

`http://localhost:3000/api`

---

## 🔗 Related Documentation

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---