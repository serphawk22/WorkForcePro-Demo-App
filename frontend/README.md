# WorkForce Pro

Modern workforce management platform built with Next.js 14, TypeScript, Tailwind CSS, and shadcn/ui.

## Features

- **Landing Page**: Beautiful marketing page with hero, features, how-it-works, and AI vision sections
- **Admin Dashboard**: Complete admin overview with stats, charts, and activity feed
- **Employee Dashboard**: Personalized employee view with tasks and time tracking
- **Task Management**: Hierarchical task management with priorities and status tracking
- **Attendance Tracking**: Real-time attendance monitoring and reporting
- **Payroll Management**: Comprehensive payroll summary and export
- **Employee Directory**: Team member management with search
- **Reports**: Workforce analytics and insights with charts
- **Request Management**: Leave and equipment request handling
- **Dark/Light Theme**: System-aware theme with manual toggle

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui + Radix UI
- **Charts**: Recharts
- **Icons**: Lucide React
- **State Management**: TanStack Query
- **Form Handling**: React Hook Form + Zod

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Landing page
│   ├── layout.tsx         # Root layout with providers
│   ├── globals.css        # Global styles and CSS variables
│   ├── login/             # Login page
│   ├── dashboard/         # Admin dashboard
│   ├── employee-dashboard/# Employee dashboard
│   ├── tasks/             # Task management
│   ├── attendance/        # Attendance tracking
│   ├── reports/           # Reports & analytics
│   ├── payroll/           # Payroll management
│   ├── employees/         # Employee directory
│   ├── requests/          # Request management
│   └── profile/           # User profile
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── landing/           # Landing page sections
│   ├── dashboard/         # Dashboard layout components
│   ├── ThemeProvider.tsx  # Theme provider wrapper
│   ├── ThemeToggle.tsx    # Theme toggle button
│   └── QueryProvider.tsx  # React Query provider
├── lib/
│   └── utils.ts           # Utility functions
└── hooks/
    ├── use-mobile.tsx     # Mobile detection hook
    └── use-toast.ts       # Toast notifications hook
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## License

MIT
