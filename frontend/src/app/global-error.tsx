'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center max-w-lg mx-auto px-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive text-destructive-foreground text-2xl font-bold mx-auto mb-6">
              !
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-8">
              {error.message || 'An unexpected error occurred. Please try again.'}
            </p>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
