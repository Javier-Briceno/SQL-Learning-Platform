# SQL-Lernplattform 📚

> Eine Full-Stack-Bildungsplattform zum Erlernen von SQL durch interaktive Arbeitsblätter, entwickelt mit Angular und NestJS.

**Universitäts-Gruppenprojekt** | Full-Stack-Webentwicklung | Sommersemester 2025

---

## 🎯 Projektübersicht

Ein interaktives Lernmanagementsystem für SQL-Bildung, das es Tutoren ermöglicht, Übungen zu erstellen, Studenten SQL-Abfragen zu üben und automatische Bewertungsfunktionen bereitstellt.

**Hauptmerkmale:**
- Rollenbasierte Zugriffskontrolle (Studenten, Tutoren, Administratoren)
- Interaktives SQL-Arbeitsblattsystem
- Echtzeit-Datenbank-Sandboxen zum Üben
- Automatisierte Bewertung von Einreichungen
- Umfassendes Admin-Dashboard

---

## 🛠️ Tech-Stack

### Backend
- **NestJS** - Progressives Node.js-Framework
- **Prisma** - ORM der nächsten Generation für PostgreSQL
- **PostgreSQL** - Relationale Datenbank
- **JWT** - Authentifizierung & Autorisierung
- **Bcrypt** - Passwort-Hashing
- **Class-validator** - DTO-Validierung

### Frontend
- **Angular 18** - Modernes Web-Framework
- **Angular Material** - UI-Komponentenbibliothek
- **RxJS** - Reaktive Programmierung
- **TypeScript** - Typsichere Entwicklung

---

## 🏗️ Architektur

```
sql-learning-platform/
├── sql-backend/          # NestJS REST API
│   ├── src/
│   │   ├── auth/        # JWT-Authentifizierung
│   │   ├── worksheets/   # Übungsverwaltung
│   │   ├── users/        # Benutzerverwaltung
│   │   └── prisma/       # Datenbankdienst
│   └── prisma/
│       └── schema.prisma # Datenbankschema
│
└── sql-frontend/         # Angular SPA
    └── src/
        ├── app/
        │   ├── auth/            # Login/Registrierung
        │   ├── student-dashboard/
        │   ├── tutor-dashboard/
        │   └── admin-dashboard/
        └── environments/
```

---

## 📊 Datenbankschema

**Kernmodelle:**
- **User** - Studenten, Tutoren, Administratoren mit rollenbasierten Berechtigungen
- **Worksheet** - Übungssammlungen, erstellt von Tutoren
- **Task** - Einzelne Fragen (MCQ, SQL, Text)
- **Submission** - Studentenantworten mit Bewertung
- **DatabaseCopy** - Isolierte SQL-Sandboxen zum Üben
- **ManagedDatabase** - Vorlagendatenbanken für Übungen

---

## 🚀 Erste Schritte

### Voraussetzungen

- Node.js 18+
- PostgreSQL 14+
- npm oder yarn

### Backend-Einrichtung

```bash
cd sql-backend

# Abhängigkeiten installieren
npm install

# Umgebungsvariablen konfigurieren
cp .env.example .env
# .env mit Ihren PostgreSQL-Verbindungsdetails bearbeiten

# Prisma-Migrationen ausführen
npx prisma migrate dev

# Anfangsdaten einspielen (erstellt Admin-Konto)
npx prisma db seed

# Entwicklungsserver starten
npm run start:dev
```

**Standard-Admin-Anmeldedaten:**
- E-Mail: `admin@example.com`
- Passwort: `Admin123!`

### Frontend-Einrichtung

```bash
cd sql-frontend

# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm start
```

Besuchen Sie `http://localhost:4200`

---

## 👥 Benutzerrollen

### Student
- SQL-Arbeitsblätter bearbeiten
- Antworten einreichen
- Noten und Feedback anzeigen
- Zugriff auf persönliche Datenbank-Sandboxen

### Tutor
- Arbeitsblätter erstellen und veröffentlichen
- SQL-Übungen entwerfen
- Studenteneinreichungen bewerten
- Feedback geben

### Administrator
- Benutzer verwalten (sperren/entsperren)
- Alle Arbeitsblätter überwachen
- Systemweite Analysen
- Datenbankverwaltung

**Tutor-Registrierung:**
Tutoren registrieren sich selbst mit einem geheimen Schlüssel: `TUT0R-K3Y-2025` (konfigurierbar in `.env`)

---

## 🔐 Sicherheitsfunktionen

- JWT-basierte Authentifizierung
- Bcrypt-Passwort-Hashing
- Rollenbasierte Zugriffskontrolle (RBAC)
- Eingabevalidierung mit class-validator
- SQL-Injection-Prävention über Prisma ORM
- Datenbank-Isolation pro Student

---

## 🧪 Testen

```bash
# Backend-Tests
cd sql-backend
npm run test           # Unit-Tests
npm run test:e2e       # End-to-End-Tests
npm run test:cov       # Abdeckungsbericht

# Frontend-Tests
cd sql-frontend
npm run test
```

---

## 📈 Wichtige technische Errungenschaften

**Datenbankverwaltung:**
- Dynamische Erstellung von Datenbankkopien für Studentenübungen
- Schema-Verwaltung durch Prisma-Migrationen
- Komplexe Beziehungen zwischen mehreren Tabellen

**Echtzeit-Funktionen:**
- Reaktive Zustandsverwaltung mit RxJS
- Sofortiges Feedback zu Einreichungen
- Live-Aktualisierungen von Arbeitsblättern

**Skalierbarkeit:**
- RESTful-API-Architektur
- Modulare NestJS-Struktur
- Angular Lazy-Loading

---

## 🎓 Lernergebnisse

Dieses Projekt demonstriert Kompetenz in:
- Full-Stack-TypeScript-Entwicklung
- Datenbankdesign und ORM-Nutzung
- Authentifizierungs- & Autorisierungsmuster
- Implementierung rollenbasierter Zugriffskontrolle
- RESTful-API-Design
- Reaktive Frontend-Architektur
- Testgetriebene Entwicklung

---

## 👨‍💻 Projektteam

Dies war ein kollaboratives Universitäts-Gruppenprojekt, entwickelt von einem Team aus 5 Studenten.

**Demonstrierte Technologien & Fähigkeiten:**
- Full-Stack-Entwicklung mit TypeScript, NestJS und Angular
- PostgreSQL-Datenbankdesign mit Prisma ORM
- JWT-basierte Authentifizierung und rollenbasierte Autorisierung
- RESTful-API-Entwicklung und -Integration
- Agile Teamzusammenarbeit und Versionskontrolle mit Git

**Projektumfang:**
Das Team hat gemeinsam alle Funktionen entworfen und implementiert, einschließlich Benutzerauthentifizierung, Arbeitsblattverwaltung, Datenbank-Sandboxing und automatisierte Bewertungssysteme.

---

## 🎓 Lernergebnisse

Dieses Projekt demonstriert Kompetenz in:
- Full-Stack-TypeScript-Entwicklung
- Datenbankdesign und ORM-Nutzung
- Authentifizierungs- & Autorisierungsmuster
- Implementierung rollenbasierter Zugriffskontrolle
- RESTful-API-Design
- Reaktive Frontend-Architektur
- Kollaborative Softwareentwicklung

---

## 📝 Lizenz

Dieses Projekt wurde für Bildungszwecke im Rahmen von Universitätskursen erstellt.

---

## 🔗 Verwandte Technologien

- [NestJS-Dokumentation](https://docs.nestjs.com/)
- [Angular-Dokumentation](https://angular.dev/)
- [Prisma-Dokumentation](https://www.prisma.io/docs)
- [PostgreSQL-Dokumentation](https://www.postgresql.org/docs/)

---

---
---
---

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

## 👨‍💻 Project Team

This was a collaborative university group project developed by a team of 5 students.

**Technologies & Skills Demonstrated:**
- Full-stack development with TypeScript, NestJS, and Angular
- PostgreSQL database design with Prisma ORM
- JWT-based authentication and role-based authorization
- RESTful API development and integration
- Agile team collaboration and version control with Git

**Project Scope:**
The team collaboratively designed and implemented all features including user authentication, worksheet management, database sandboxing, and automated grading systems.

---

## 🎓 Learning Outcomes

This project demonstrates proficiency in:
- Full-stack TypeScript development
- Database design and ORM usage
- Authentication & authorization patterns
- Role-based access control implementation
- RESTful API design
- Reactive frontend architecture
- Collaborative software development

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
