# KPI Management System

Base project for the DCG KPI system, built with Next.js App Router, TypeScript and Tailwind CSS.

## Getting started

1. Copy `.env.example` to `.env.local` and set `AUTH_API_URL` when the .NET Web API is available.
2. Install dependencies with `npm install`.
3. Run `npm run dev`.

Open `/login`. Without `AUTH_API_URL`, the development demo accepts `admin@dcg.local` (or `admin`) with password `password`.

## Authentication design

The browser posts credentials only to `POST /api/auth/login`. That route calls the .NET API server-to-server and writes the access token to an HttpOnly cookie; JavaScript never receives or stores the token. `middleware.ts` protects `/dashboard`.

Cookies are marked `Secure` in production. This is necessary because Secure cookies are not sent by browsers over local HTTP; deploy behind HTTPS in production.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```
