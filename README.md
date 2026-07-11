# MediKarya Case Studio

A medical case studio for students to write, review, and share clinical case reports.

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Authentication**: Clerk
- **Database & Backend**: Supabase (PostgreSQL + Row Level Security)
- **PDF Generation**: react-pdf
- **UI Components**: shadcn/ui

## Project Structure

```
.
├── app/
│   ├── (auth)/              # Clerk sign-in/sign-up pages
│   ├── dashboard/
│   │   ├── author/          # Author dashboard & case editor
│   │   ├── reviewer/        # Reviewer dashboard & review screens
│   │   └── admin/           # Admin panel
│   ├── layout.tsx           # Root layout with Clerk provider
│   └── page.tsx             # Landing page
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── case/                # Case-related components
│   ├── review/              # Review components
│   └── pdf/                 # PDF template components
├── lib/
│   ├── supabase/            # Supabase client and queries
│   ├── clerk/               # Authentication utilities
│   └── types.ts             # Shared TypeScript types
├── supabase/
│   └── migrations/          # Database schema and RLS policies
├── middleware.ts            # Clerk route protection
└── package.json
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your credentials:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### 3. Set Up Clerk

1. Create a Clerk account at [clerk.com](https://clerk.com)
2. Create a new application
3. Copy your publishable and secret keys to `.env.local`
4. Configure user roles in Clerk's public metadata

### 4. Set Up Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL migration from `supabase/migrations/001_initial_schema.sql`
3. Copy your project URL and anon key to `.env.local`

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Authentication & Roles

The platform supports three user roles:

- **Author (Student)**: Can create, edit, and submit their own cases
- **Reviewer (Professor)**: Can view submitted cases, approve them, or request changes
- **Admin**: Has full access to manage users and oversee all cases

Roles are stored in Clerk's public metadata and enforced via Supabase Row Level Security (RLS) policies.

## Case Status Workflow

1. **Draft**: Case is being written, can be edited freely
2. **Submitted**: Case is sent for review, cannot be edited
3. **Approved**: Case is accepted and can be exported as PDF
4. **Changes Requested**: Reviewer requests modifications, case returns to draft state

## Database Schema

The database uses a normalized schema:

- `users`: User profiles with roles
- `cases`: Case metadata and status
- `case_sections`: Structured case content (6 sections)
- `case_reviews`: Review decisions and comments

All tables have RLS policies to ensure proper access control.

## License

MIT
