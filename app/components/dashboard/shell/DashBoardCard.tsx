export function DashboardCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white shadow-sm border border-slate-200 p-2 lg:p-4">
      <div className="mb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle ? (
          <div className="text-sm text-slate-600">{subtitle}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
}