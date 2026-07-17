# VibeVTU - Nigerian VTU Reseller Platform

A full-stack VTU (Value Added Services) reseller platform for Nigerian market - supporting data, airtime, and bill payments.

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Payments**: Paystack (for wallet funding)

## Project Structure

```
vibevtus/
├── frontend/              # Next.js frontend application
│   ├── src/
│   │   ├── app/          # Next.js App Router pages
│   │   ├── components/   # React components
│   │   └── lib/          # Utilities and Supabase client
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── backend/              # Express backend API
│   ├── src/
│   │   ├── config/       # Configuration files
│   │   ├── controllers/  # Route controllers
│   │   ├── middleware/   # Express middleware
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   └── types/        # TypeScript types
│   ├── database/
│   │   └── migrations/   # SQL migration files
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Paystack account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Vibeaman/VibeVTUs.git
cd VibeVTUs
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Install backend dependencies:
```bash
cd ../backend
npm install
```

### Configuration

1. Copy the example environment files:
```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

2. Update the environment variables with your Supabase and Paystack credentials.

### Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Run the migration in Supabase SQL Editor or using Supabase CLI:
```bash
cd backend
supabase db push
```

Or manually execute the SQL in:
```
backend/database/migrations/001_initial_schema.sql
```

### Running the Application

**Frontend (development):**
```bash
cd frontend
npm run dev
```

**Backend (development):**
```bash
cd backend
npm run dev
```

## Database Schema

The platform uses the following tables:

| Table | Description |
|-------|-------------|
| users | User accounts with email and phone |
| wallets | User wallet balances |
| transactions | All financial transactions |
| data_orders | Data purchase orders |
| airtime_orders | Airtime purchase orders |
| notifications | User notifications |
| referrals | Referral tracking |

### Row Level Security (RLS)

All tables have RLS policies ensuring users can only access their own data. The backend uses the Supabase service role key for administrative operations.

## API Endpoints

Coming soon...

## License

MIT
