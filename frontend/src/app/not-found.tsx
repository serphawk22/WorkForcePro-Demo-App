import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center max-w-lg mx-auto px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-bold mx-auto mb-6">
          404
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Page Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Home
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
          >
            Login
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Admin: <Link href="/admin/dashboard" className="text-primary underline underline-offset-2">Dashboard</Link>
          {" · "}
          Employee: <Link href="/employee-dashboard" className="text-primary underline underline-offset-2">Dashboard</Link>
        </p>
      </div>
    </div>
  );
}
