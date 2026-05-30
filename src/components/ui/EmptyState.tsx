import type { ReactNode } from "react";
import Link from "next/link";

interface Action {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: Action;
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-8 text-center">
      {icon ? (
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)]">
          <div className="h-8 w-8 text-[var(--accent)]">{icon}</div>
        </div>
      ) : (
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)]">
          <svg
            className="h-8 w-8 text-[var(--accent)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        </div>
      )}
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && (
        <p className="mt-2 text-sm text-[color:var(--muted)]">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          {action.href ? (
            <Link
              href={action.href}
              className="inline-flex rounded-md bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex rounded-md bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
