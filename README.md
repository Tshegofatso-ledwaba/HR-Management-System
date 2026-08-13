# HRFlow

HRFlow is a TypeScript HR management platform with independent Next.js frontend and Express/Prisma backend applications.

## Included foundation

- JWT login and current-user API endpoint
- Role-based API authorization: `ADMIN`, `HR_MANAGER`, `HR_OFFICER`, `EMPLOYEE`
- Prisma/PostgreSQL models for users, employees, departments, leave, notifications, and activity logs
- Employee, department, leave, notification, and live dashboard API routes
- Responsive HR dashboard that consumes the dashboard API through a dedicated service
- Helmet, CORS, rate limiting, Zod request validation, and centralized error responses

## Setup

1. Copy `backend/.env.example` to `backend/.env` and add a Neon PostgreSQL `DATABASE_URL` and secure `JWT_SECRET`.
2. Copy `frontend/.env.example` to `frontend/.env.local`.
3. In `backend`, run `npx prisma migrate dev --name init` and `npm run prisma:seed`.
4. Start the backend with `npm run dev`.
5. Start the frontend with `npm run dev`.

Open `http://localhost:3000`. The API health endpoint is at `http://localhost:4000/health`.

## Seed credential

`admin@hrflow.dev` / `Admin123!`

Change this development credential before any deployment.

## Deployment

Deploy `frontend` to Vercel with `NEXT_PUBLIC_API_URL` set to the API URL. Deploy `backend` to a Node-compatible host with `DATABASE_URL`, `JWT_SECRET`, and `FRONTEND_URL` configured. Use a Neon PostgreSQL connection string with SSL enabled.