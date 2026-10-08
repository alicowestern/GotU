# GotU - Share your location. Stay in control.

## Product Overview
GotU is a modern, consent-based live GPS location-sharing SaaS platform. It allows registered users to request live location sharing from friends or family through secure invitation links. Recipients can voluntarily share their GPS location without registering.

## Roles and Permissions
1. **Super Admin**: Manages users, sharing sessions, and platform security. May view authorized active location sessions for legitimate oversight.
2. **Registered User**: Can generate secure location-sharing invitations and view live GPS locations only for their own authorized sharing sessions.
3. **Recipient (Guest)**: Does not need an account. Must explicitly consent before GPS permission is requested. Can choose 15, 30, or 60 minutes of sharing and stop sharing at any time.

## Technology Stack
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS & shadcn/ui
- Supabase (PostgreSQL, Auth, Realtime)
- Leaflet + OpenStreetMap
- Zod, Vitest, Playwright

## Project Structure
- `src/app`: Next.js App Router pages (public, auth, user dashboard, admin dashboard, share token)
- `src/components`: UI components (shadcn/ui), layout, landing, dashboard, maps, sharing
- `src/features`: Feature-based business logic (auth, users, invitations, sessions, etc.)
- `src/lib`: Utilities, validations, Supabase client
- `src/hooks`, `src/types`, `src/config`: Custom React hooks, TS types, config files

## Installation Instructions
1. Clone the repository
2. Run `npm install`
3. Copy `.env.example` to `.env.local` and fill in the values
4. Run `npm run dev` to start the development server

## Development Commands
- `npm run dev`: Start local development server
- `npm run build`: Build for production
- `npm run lint`: Run ESLint
- `npx tsc --noEmit`: Run TypeScript compiler check
- `npm run test`: Run Vitest tests

## Environment Configuration
See `.env.example` for required environment variables. Do not commit actual secrets to source control.

## Security Principles
- Location sharing is voluntary and requires explicit consent.
- Expired sessions do not provide access to coordinates.
- No historical location trails are retained in the planned MVP.
- Admin access is disclosed to recipients before consent.

## Task 1 Completion Summary
Initialized the Next.js project with Tailwind CSS and shadcn/ui. Created the scalable folder structure, landing page, authentication UI shells, user and admin dashboard shells, and the recipient consent UI. No business logic or actual Supabase connections have been implemented yet.

## Future Implementation Phases
- Task 2: Supabase authentication and database schema setup.
- Task 3: Invitation generation and Realtime location sharing with Leaflet.
- Task 4: Security enhancements and admin oversight tools.
