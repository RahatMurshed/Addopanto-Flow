<div align="center">

# Addopanto Flow

**Multi-tenant financial management for educational institutions**

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Auth_·_Postgres_·_RLS-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-12.34-0055FF?logo=framer&logoColor=white)](https://www.framer.com/motion)
[![License](https://img.shields.io/badge/License-Proprietary-333333)](#)

[Live Demo](https://addopantoflowdemo.lovable.app) · [Report Issue](../../issues)

</div>

---

## What Is This?

Addopanto Flow is a complete back-office platform purpose-built for schools, coaching centers, and academies that need to manage tuition fees, allocate revenue across expense accounts, track employee salaries, monitor investor obligations, and generate financial reports — all while operating multiple branches or organizations from a single login. If you run an educational business and currently juggle spreadsheets for fee collection, expense tracking, and payroll, this replaces all of them.

From an engineering perspective, this is a single-page application with a row-level-security-enforced multi-tenant architecture. Every database table is scoped to a `company_id` and protected by Postgres RLS policies. The access control layer implements a five-tier role hierarchy (Cipher › Admin › Moderator › Data Entry Operator › Viewer) with 30+ granular permission flags per membership. Routes are lazy-loaded, dashboard aggregations use server-side RPC functions, and all mutations are captured in an append-only audit log. Real-time synchronization is handled through Supabase Realtime channels.

---

## Features

### Financial Management
- Allocate incoming revenue proportionally across named expense accounts (Khatas)
- Record and categorize expenses with vendor details, invoice numbers, and receipt uploads
- Transfer funds between expense accounts with full transfer history
- View profit/loss dashboards with period-over-period comparison

### Student Management
- Enroll students through a multi-step wizard capturing personal, contact, family, and academic details
- Track admission fees and monthly tuition with per-student payment histories
- Detect overdue payments automatically and surface them in a dedicated section
- Assign students to batches individually or in bulk
- Import students via CSV and export filtered lists to CSV or PDF
- Detect and merge duplicate student records across batches
- View lifetime value, enrollment timeline, and financial breakdown per student profile

### Course · Batch System
- Create courses with codes, categories, and duration
- Schedule batches under courses with start/end dates, capacity limits, and default fee structures
- Track enrollment counts against batch capacity
- Auto-complete batches when their end date passes

### Employee · Payroll
- Maintain employee records with personal details, qualifications, banking information, and employment type
- Record monthly salary payments with deduction breakdowns
- Track employment status transitions (active, on leave, terminated)

### Investor · Loan Tracking
- Record investments with ownership percentages, profit-sharing terms, and receipt verification
- Manage loan disbursement workflows including gross amount, deductions, and net disbursed figures
- Track loan repayments with principal/interest splits and remaining balances
- Allocate investor and loan funds to specific expense accounts with compliance tracking

### Product Sales
- Organize products into categories with custom icons and colors
- Maintain inventory with stock quantities, reorder levels, and supplier links
- Record sales tied to students or walk-in customers with payment status tracking
- View stock movement history for every adjustment and sale

### Reports · Exports
- Generate date-filtered revenue and expense summaries
- Compare current period performance against previous periods
- Export any data view to CSV or generate PDF reports with institutional branding

### Multi-Organization Support
- Create isolated organizations with their own data, currency, and fiscal year settings
- Request new organization creation (reviewed by platform administrators)
- Join existing organizations via invite code and password
- Switch between organizations without logging out

### Access Control
- Five-tier role hierarchy: **Cipher** (platform owner) › **Admin** › **Moderator** › **Data Entry Operator** › **Viewer**
- 30+ granular permission flags per membership covering finance, students, batches, employees, and reports
- PII restriction banners for roles without sensitive data access
- Permission assignment interface for admins to configure moderator and operator capabilities

### Audit · Security
- Append-only audit log capturing every create, update, and delete operation with before/after snapshots
- Row-level security on every table — no data crosses organization boundaries
- Dashboard access logging with anomaly detection
- Rate limiting on sensitive operations

---

## Screenshots

> Replace the placeholders below with actual screenshots of your deployment.

| View | Description |
|------|-------------|
| **Dashboard** | Revenue vs. expense charts, obligation summaries, period-over-period stats |
| **Student Management** | Searchable student list with filters by batch, status, and payment standing |
| **Student Profile** | Lifetime value banner, enrollment timeline, payment breakdown, and quick actions |
| **Reports** | Date-filtered P&L summaries with CSV/PDF export controls |
| **Course · Batch View** | Course cards with linked batches, enrollment counts, and capacity indicators |
| **Employee Management** | Employee directory with salary payment history and employment status |
| **Stakeholder · Investor View** | Investment records, loan disbursement steps, and repayment tracking |
| **Settings** | Organization configuration, member management, and permission matrix |

---

## Tech Stack · Architecture

| Layer | Technology | Role |
|-------|-----------|------|
| UI Framework | React 18.3 | Component architecture with lazy-loaded route splitting |
| Language | TypeScript 5.8 | End-to-end type safety across client and database types |
| Build Tool | Vite 5.4 | Sub-second HMR, optimized production builds |
| Styling | Tailwind CSS 3.4 + shadcn/ui | Design token system with Radix UI primitives |
| Backend | Supabase | Auth, Postgres, Row-Level Security, Edge Functions, Realtime |
| Data Fetching | TanStack React Query 5 | Server state with automatic cache invalidation and optimistic updates |
| Routing | React Router 6 | Nested layouts, protected routes, lazy loading |
| Charts | Recharts 2 | Responsive SVG charts for dashboard visualizations |
| Animation | Framer Motion 12 | Page transitions, micro-interactions, layout animations |
| Validation | Zod 3 + React Hook Form 7 | Schema-driven form validation with type inference |
| PDF Export | jsPDF + html2canvas | Client-side PDF generation with institutional branding |
| Monitoring | Sentry | Error tracking with source maps in production |
| Date Handling | date-fns 3 | Immutable, tree-shakeable date operations |

---

## Installation · Local Setup

### Prerequisites

- Node.js 18+ and npm
- A Supabase project (or use the connected Lovable Cloud instance)

### Steps

```bash
# 1 ― Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# 2 ― Install dependencies
npm install

# 3 ― Configure environment variables
cp .env.example .env
```

Edit `.env` with your values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SENTRY_DSN=your-sentry-dsn          # optional
```

```bash
# 4 ― Start the development server
npm run dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Production build |
| `npm run build:dev` | Development build with source maps |
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint with ESLint |
| `npm run preview` | Preview production build locally |

---

## Roadmap

- **AI Payment Assistant** — An AI agent that flags overdue students, drafts reminder messages, and suggests optimal payment plans based on each student's payment history and enrollment duration

- **Smart Attendance Integration** — Link attendance records to payment status so administrators can correlate class presence with fee compliance across batches

- **Parent Portal** — A read-only interface for parents to check their child's payment status, outstanding dues, and enrolled batches without contacting the admin office

- **Automated WhatsApp · SMS Reminders** — Scheduled payment reminders sent directly to students or parents via WhatsApp API or SMS when dues are approaching or overdue

- **AI-Powered Financial Insights** — A dashboard layer that forecasts monthly collection rates, identifies dropout risk from payment patterns, and summarizes batch-level financial health in plain language

---

<div align="center">

Built by **Grammar Addopanto**

</div>
