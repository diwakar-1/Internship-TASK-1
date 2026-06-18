# FormCraft

A comprehensive, full-stack form builder SaaS application for small to medium-sized businesses, educational institutions, and event organizers.

## Features

- **Drag-and-drop form builder** with 10+ field types (text, email, number, dropdown, checkbox, radio, date, textarea, file, rating, signature)
- **Theming & branding** with custom colors, fonts, logos, and per-form styling
- **Real-time response collection** with Firebase Firestore (or localStorage fallback)
- **Response management** - search, filter, edit, delete, view individual responses
- **Export** responses to CSV or Excel
- **Analytics dashboard** with charts for response counts, time-series, and field-level summaries
- **Sharing** via direct link, QR code, and embed code with password protection and access controls
- **Form management** - duplicate, archive, version history, soft delete
- **Authentication & RBAC** - admin, editor, viewer roles
- **Responsive design** - mobile-first, fully accessible

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, TailwindCSS
- **Backend:** Firebase (Auth, Firestore, Storage) with localStorage fallback for development
- **Drag & Drop:** @dnd-kit
- **Charts:** Recharts
- **Validation:** Zod + react-hook-form
- **QR Codes:** qrcode

## Getting Started

```bash
cd formcraft
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and create an account.

### Optional: Connect Firebase

Copy `.env.example` to `.env.local` and fill in your Firebase credentials. The app automatically uses Firebase when configured, otherwise falls back to localStorage for instant local development.

## Scripts

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm start` - Production server
- `npm run lint` - Lint
- `npm run typecheck` - TypeScript check
- `npm run seed` - Seed sample forms and responses

## Project Structure

```
src/
  app/                # Next.js app router pages
    (auth)/           # Login, signup
    (dashboard)/      # Authenticated app
      forms/          # Form list, builder
      responses/      # Response dashboards
      analytics/      # Analytics
      settings/       # Account settings
    forms/[id]/       # Public form view
    embed/[id]/       # Embeddable form view
  components/         # Reusable UI components
  lib/                # Firebase, helpers, mock data
  types/              # TypeScript types
  hooks/              # Custom React hooks
```

## Security

- All user input validated client- and server-side via Zod
- Role-based access controls on forms and responses
- Password-protected forms option
- Soft-delete with 30-day recovery window
- XSS-safe rendering of submitted content
