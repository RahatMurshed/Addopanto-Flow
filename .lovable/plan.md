

# Automatic Revenue Allocation & Expense Management System

A smart financial management app for small business owners in Bangladesh that automatically allocates revenue to expense accounts (khatas), tracks spending, and provides real-time profit visibility.

---

## Phase 1: Foundation & Authentication

### 1.1 Project Setup & Design System
- Configure color scheme: Blue primary (#3B82F6), Green for success, Red for danger, Orange for warnings
- Set up responsive layout framework (desktop, tablet, mobile)
- Create consistent typography and component styling

### 1.2 User Authentication
- Email/password registration and login
- Email verification
- Password reset flow
- Session management with auto-logout after 7 days

### 1.3 Profile Management
- Business name, currency (default BDT), fiscal year start month settings
- Profile edit page

### 1.4 Database Setup (Supabase)
- Create all core tables: user_profiles, revenue_sources, revenues, expense_accounts, allocations, expenses
- Enable Row-Level Security on all tables so users can only access their own data
- Create database functions for automatic allocation and profit calculation

---

## Phase 2: Core Features

### 2.1 Expense Account (Khata) Management
- Create, edit, deactivate expense accounts with name, allocation percentage, color, and optional expected monthly expense
- Default account suggestions (Marketing, Salary, Rent, Office Supplies, Tax Reserve, Emergency Fund)
- Warning when total allocation percentages exceed 100%

### 2.2 Revenue Entry & Tracking
- Add revenue with date, amount, source, and description
- Edit and delete revenue entries with confirmation
- Revenue source management
- Display total revenue for current month, year, and custom date ranges

### 2.3 Automatic Allocation Engine
- When revenue is entered, automatically distribute to all active accounts based on their percentages
- Allocations accumulate month-over-month; unspent balances carry forward
- Show current month allocation vs. carried balance separately

### 2.4 Expense Recording
- Add expenses assigned to specific accounts with date, amount, and description
- Optional receipt upload (image/PDF) via Supabase Storage
- Real-time balance deduction; allow negative balances (deficit) with warnings
- Edit and delete expenses with confirmation

---

## Phase 3: Dashboard & Analytics

### 3.1 Main Dashboard
- Key metric cards: Total Revenue, Total Expenses, Allocated Profit, Actual Profit, Total Account Balance
- Account overview table showing allocation %, allocated amount, spent amount, balance, and status
- Revenue trend line chart (last 6 months)
- Expense breakdown pie chart by account
- Recent transactions list (last 10)
- Quick action buttons: Add Revenue, Add Expense

### 3.2 Profit Calculation & Display
- Allocated Profit = Total Revenue - Total Allocations
- Actual Profit = Total Revenue - Total Expenses
- Profit margin percentage
- Side-by-side comparison of allocated vs. actual profit
- Profit trend chart over time

### 3.3 Balance Alerts
- In-app alerts when account balance goes negative
- Warnings when balance falls below expected monthly expense
- Notifications when 80% of allocated funds are used

---

## Phase 4: Reports & Polish

### 4.1 Reports
- Monthly summary report: revenue by source, allocations by account, expenses by account, profit calculation
- Account-wise detailed report with running balance
- Revenue vs. Expense comparison with trends
- Export to CSV

### 4.2 Mobile Responsiveness & Polish
- Fully responsive across desktop, tablet, and mobile breakpoints
- Performance optimization for fast dashboard loading
- Clear error handling with user-friendly messages
- Intuitive navigation with maximum 3 clicks to complete any action

