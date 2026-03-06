

## Plan: Generate Professional README.md

### What the App Is

**Addopanto Flow** is a multi-tenant financial management platform built for educational institutions (schools, academies, coaching centers). It handles revenue allocation, expense tracking, student fee management, employee payroll, course/batch management, investor/loan tracking, and financial reporting — all with granular role-based access control across multiple organizations.

**App Name:** Addopanto Flow
**Copyright:** Grammar Addopanto
**Published URL:** https://addopantoflowdemo.lovable.app

### README Structure

**1. Hero Section**
- Centered `<div align="center">` with app name, tagline: *"Multi-tenant financial management for educational institutions"*
- shields.io badges with real versions: React 18.3, TypeScript 5.8, Vite 5.4, Tailwind CSS 3.4, Supabase, Framer Motion 12.34
- Demo link to published URL

**2. What Is This?**
- Business paragraph: explains it manages tuition fees, revenue allocation, expenses, payroll, and reporting for schools/academies running multiple branches
- Technical paragraph: SPA with RLS-secured multi-tenant architecture, granular RBAC (cipher/admin/moderator/viewer/data-entry), real-time sync, lazy-loaded routes, RPC-based dashboard aggregations

**3. Features** (grouped by area, benefit-focused)
- Financial Management: revenue allocation to expense accounts, expense tracking, inter-account transfers, profit/loss dashboards
- Student Management: enrollment wizard, fee tracking (admission + monthly), overdue detection, batch assignments, bulk import/export, duplicate detection, student profiles with lifetime value
- Course & Batch System: course creation, batch scheduling with capacity, enrollment tracking, auto-complete
- Employee & Payroll: employee records, salary payments with deductions, employment status tracking
- Investor & Loan Tracking: investment recording, loan disbursement workflow, repayment tracking, fund allocation to expenses
- Product Sales: product categories, inventory with stock adjustments, sales recording
- Reports & Exports: date-filtered P&L, revenue/expense summaries, CSV/PDF export, period-over-period comparison
- Multi-Organization: isolated company data, company creation requests, join via invite code, company switching
- Access Control: 5-tier role system (Cipher > Admin > Moderator > Data Entry Operator > Viewer), 30+ granular permissions per membership
- Audit & Security: audit log for all mutations, RLS on every table, PII restriction banners

**4. Screenshots**
- Placeholder section with captions: Dashboard, Student Management, Reports, Course & Batch View, Employee Management, Stakeholder/Investor View, Settings

**5. Tech Stack & Architecture**
- Markdown table with: React 18, TypeScript 5.8, Vite 5, Tailwind CSS 3.4, shadcn/ui (Radix primitives), Supabase (Auth + Postgres + Edge Functions + RLS), TanStack React Query 5, React Router 6, Recharts 2, Framer Motion 12, Zod 3, React Hook Form 7, jsPDF + html2canvas, Sentry, date-fns 3

**6. Installation & Local Setup**
- Clone, `npm install`, env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SENTRY_DSN`), `npm run dev`, scripts: `npm run build`, `npm test`

**7. Roadmap** (the 5 specified items)
- AI Payment Assistant
- Smart Attendance Integration
- Parent Portal
- Automated WhatsApp/SMS Reminders
- AI-Powered Financial Insights

### Design Rules Applied
- No generic emojis — Unicode section markers (―, │, ·) and clean markdown only
- All badges use real versions from package.json
- No hardcoded colors in HTML — only standard markdown and `<div align="center">`
- Senior, handcrafted tone — every sentence derived from actual codebase inspection
- GitHub dark/light mode compatible

### File Modified
- `README.md` — complete rewrite

