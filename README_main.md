# SQL Learning Platform 📚

> A full-stack educational platform for learning SQL through interactive worksheets, built with Angular and NestJS.

**University Group Project** | Full-Stack Web Development | Summer Semester 2025

---

## 🎯 Project Overview

An interactive learning management system designed for SQL education that enables tutors to create exercises, students to practice SQL queries, and provides automatic grading functionality.

**Key Features:**
- Role-based access control (Students, Tutors, Admins)
- Interactive SQL worksheet system
- Real-time database sandboxes for practice
- Automated submission grading
- Comprehensive admin dashboard

---

## 🛠️ Tech Stack

### Backend
- **NestJS** - Progressive Node.js framework
- **Prisma** - Next-generation ORM for PostgreSQL
- **PostgreSQL** - Relational database
- **JWT** - Authentication & authorization
- **Bcrypt** - Password hashing
- **Class-validator** - DTO validation

### Frontend
- **Angular 18** - Modern web framework
- **Angular Material** - UI component library
- **RxJS** - Reactive programming
- **TypeScript** - Type-safe development

---

## 🏗️ Architecture

```
sql-learning-platform/
├── sql-backend/          # NestJS REST API
│   ├── src/
│   │   ├── auth/        # JWT authentication
│   │   ├── worksheets/   # Exercise management
│   │   ├── users/        # User management
│   │   └── prisma/       # Database service
│   └── prisma/
│       └── schema.prisma # Database schema
│
└── sql-frontend/         # Angular SPA
    └── src/
        ├── app/
        │   ├── auth/            # Login/Register
        │   ├── student-dashboard/
        │   ├── tutor-dashboard/
        │   └── admin-dashboard/
        └── environments/
```

---

## 📊 Database Schema

**Core Models:**
- **User** - Students, Tutors, Admins with role-based permissions
- **Worksheet** - Exercise collections created by tutors
- **Task** - Individual questions (MCQ, SQL, Text)
- **Submission** - Student answers with grading
- **DatabaseCopy** - Isolated SQL sandboxes for practice
- **ManagedDatabase** - Template databases for exercises

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Backend Setup

```bash
cd sql-backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your PostgreSQL connection details

# Run Prisma migrations
npx prisma migrate dev

# Seed initial data (creates admin account)
npx prisma db seed

# Start development server
npm run start:dev
```

**Default Admin Credentials:**
- Email: `admin@example.com`
- Password: `Admin123!`

### Frontend Setup

```bash
cd sql-frontend

# Install dependencies
npm install

# Start development server
npm start
```

Visit `http://localhost:4200`

---

## 👥 User Roles

### Student
- Complete SQL worksheets
- Submit answers
- View grades and feedback
- Access personal database sandboxes

### Tutor
- Create and publish worksheets
- Design SQL exercises
- Grade student submissions
- Provide feedback

### Admin
- Manage users (ban/unban)
- Oversee all worksheets
- System-wide analytics
- Database management

**Tutor Registration:**
Tutors self-register using a secret key: `TUT0R-K3Y-2025` (configurable in `.env`)

---

## 🔐 Security Features

- JWT-based authentication
- Bcrypt password hashing
- Role-based access control (RBAC)
- Input validation with class-validator
- SQL injection prevention via Prisma ORM
- Database isolation per student

---

## 🧪 Testing

```bash
# Backend tests
cd sql-backend
npm run test           # Unit tests
npm run test:e2e       # End-to-end tests
npm run test:cov       # Coverage report

# Frontend tests
cd sql-frontend
npm run test
```

---

## 📈 Key Technical Achievements

**Database Management:**
- Dynamic database copy creation for student practice
- Schema management through Prisma migrations
- Complex multi-table relationships

**Real-time Features:**
- Reactive state management with RxJS
- Immediate submission feedback
- Live worksheet updates

**Scalability:**
- RESTful API architecture
- Modular NestJS structure
- Angular lazy-loading

---

## 🎓 Learning Outcomes

This project demonstrates proficiency in:
- Full-stack TypeScript development
- Database design and ORM usage
- Authentication & authorization patterns
- Role-based access control implementation
- RESTful API design
- Reactive frontend architecture
- Test-driven development

---

## 👨‍💻 Project Contributors

This was a collaborative university project. All team members contributed to design, implementation, and testing.

**My Contributions:**
- [List your specific contributions here]
- Database schema design and Prisma setup
- Authentication system implementation
- [Other contributions]

---

## 📝 License

This project was created for educational purposes as part of university coursework.

---

## 🔗 Related Technologies

- [NestJS Documentation](https://docs.nestjs.com/)
- [Angular Documentation](https://angular.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---