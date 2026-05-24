export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--muted)] p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Phynance</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Cashflow, debt, and the road to a house.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
