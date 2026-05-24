import { type LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-4">
      <div className="rounded-full bg-[var(--muted)] p-3 mb-3">
        <Icon size={20} className="text-[var(--muted-foreground)]" aria-hidden />
      </div>
      <div className="text-sm font-medium">{title}</div>
      {description && (
        <div className="mt-1 text-xs text-[var(--muted-foreground)] max-w-xs">
          {description}
        </div>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
