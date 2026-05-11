# System Architecture

## Overview
A Next.js 14 application leveraging the App Router for server-side rendering and client-side interactivity.

## Technical Stack
- **Framework:** Next.js (React)
- **Styling:** Tailwind CSS
- **Icons:** Lucide-React
- **Testing:** Vitest

## Data Flow
1. User inputs token usage or API logs.
2. The **Audit Engine** (pure TypeScript logic) parses the usage based on current model pricing.
3. The **Forecasting Module** calculates the monthly burn rate using linear regression models.
4. Data is persisted via LocalStorage for privacy.
