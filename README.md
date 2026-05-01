# Expense Tracker

Personal finance dashboard web app. Track expenses, income, budgets and savings goals.

**Stack:** Java + Spring Boot · React + TypeScript · PostgreSQL · JWT Auth

---

## Frontend

**Requirements:** Node 18+

```bash
cd expense-tracker-frontend
npm install
npm run dev
```

App runs on `http://localhost:5173`

---

## Backend

**Requirements:** Java 17+, PostgreSQL

Environment variables needed:
```
DB_URL=jdbc:postgresql://localhost:5432/expense_tracker
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password
JWT_SECRET=your_jwt_secret
```

```bash
cd expense-tracker-backend
./mvnw spring-boot:run
```

API runs on `http://localhost:8080`

---

## Project Structure

```
expense-tracker/
├── expense-tracker-frontend/   # React app
└── expense-tracker-backend/    # Spring Boot API (coming soon)
```
