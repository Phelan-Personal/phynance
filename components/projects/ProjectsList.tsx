"use client";

import { useMemo, useState, useTransition } from "react";
import {
  FolderKanban,
  Pencil,
  Trash2,
  Archive,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type {
  Expense,
  ExpenseHistory,
  ExpenseTransaction,
  Project,
} from "@/types";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, fmtCurrency } from "@/lib/utils";
import { monthlyAmortized, variableAverage } from "@/lib/expenses";
import { deleteProject, upsertProject } from "@/app/(app)/projects/actions";

export function ProjectsList({
  projects,
  expenses,
  history,
  transactions,
}: {
  projects: Project[];
  expenses: Expense[];
  history: ExpenseHistory[];
  transactions: ExpenseTransaction[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [banner, setBanner] = useState<
    { kind: "ok" | "err"; text: string } | null
  >(null);

  const totals = useMemo(() => {
    const m = new Map<
      string,
      { monthly: number; oneOff: number; expenseCount: number; txnCount: number }
    >();
    for (const e of expenses) {
      if (!e.project_id) continue;
      const t = m.get(e.project_id) ?? {
        monthly: 0,
        oneOff: 0,
        expenseCount: 0,
        txnCount: 0,
      };
      t.monthly += monthlyAmortized(e, history);
      t.expenseCount += 1;
      m.set(e.project_id, t);
    }
    for (const x of transactions) {
      if (!x.project_id) continue;
      const t = m.get(x.project_id) ?? {
        monthly: 0,
        oneOff: 0,
        expenseCount: 0,
        txnCount: 0,
      };
      t.oneOff += Number(x.amount);
      t.txnCount += 1;
      m.set(x.project_id, t);
    }
    return m;
  }, [expenses, history, transactions]);

  return (
    <div className="space-y-4">
      {banner && (
        <div
          className={cn(
            "rounded-md border px-3 py-2 text-xs flex items-start gap-2",
            banner.kind === "ok"
              ? "bg-[var(--teal-bg)] border-[color:var(--teal)]/30 text-[var(--teal-dark)]"
              : "bg-[var(--coral-bg)] border-[color:var(--coral)]/30 text-[var(--coral)]"
          )}
        >
          {banner.kind === "ok" ? (
            <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      <Card>
        <CardTitle
          right={
            <Button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
            >
              New Project
            </Button>
          }
        >
          Projects
        </CardTitle>

        {projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Create a project, then tag related expenses and bank-scan transactions to it."
            action={
              <Button onClick={() => setShowForm(true)}>
                Create your first project
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {projects.map((p) => {
              const t = totals.get(p.id) ?? {
                monthly: 0,
                oneOff: 0,
                expenseCount: 0,
                txnCount: 0,
              };
              return (
                <ProjectRow
                  key={p.id}
                  project={p}
                  monthlyTotal={t.monthly}
                  oneOffTotal={t.oneOff}
                  expenseCount={t.expenseCount}
                  txnCount={t.txnCount}
                  onEdit={() => {
                    setEditing(p);
                    setShowForm(true);
                  }}
                  onBanner={setBanner}
                />
              );
            })}
          </ul>
        )}
      </Card>

      {showForm && (
        <ProjectForm
          project={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onBanner={setBanner}
        />
      )}
    </div>
  );
}

function ProjectRow({
  project,
  monthlyTotal,
  oneOffTotal,
  expenseCount,
  txnCount,
  onEdit,
  onBanner,
}: {
  project: Project;
  monthlyTotal: number;
  oneOffTotal: number;
  expenseCount: number;
  txnCount: number;
  onEdit: () => void;
  onBanner: (b: { kind: "ok" | "err"; text: string } | null) => void;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <li className="py-3 flex items-center gap-3">
      <div
        className={cn(
          "shrink-0 rounded-md p-1.5",
          project.is_archived
            ? "bg-[var(--muted)] text-[var(--muted-foreground)]"
            : "bg-[var(--blue-bg)] text-[var(--blue-fg)]"
        )}
      >
        <FolderKanban size={14} aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{project.name}</span>
          {project.is_archived && (
            <span className="inline-flex items-center gap-1 rounded bg-[var(--muted)] text-[var(--muted-foreground)] px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
              <Archive size={10} /> archived
            </span>
          )}
        </div>
        {project.notes && (
          <div className="text-[11px] text-[var(--muted-foreground)] truncate">
            {project.notes}
          </div>
        )}
      </div>
      <div className="text-right shrink-0 hidden sm:block">
        <div className="font-mono text-sm">{fmtCurrency(monthlyTotal)}/mo</div>
        <div className="text-[10px] text-[var(--muted-foreground)]">
          {expenseCount} expense{expenseCount === 1 ? "" : "s"}
          {oneOffTotal > 0 &&
            ` · ${txnCount} txn${txnCount === 1 ? "" : "s"} (${fmtCurrency(oneOffTotal)})`}
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onEdit}>
        <Pencil size={12} />
      </Button>
      <Button
        variant="danger"
        size="sm"
        disabled={isPending}
        onClick={() => {
          if (
            !confirm(
              `Delete project "${project.name}"? Expenses tagged to it will become untagged.`
            )
          )
            return;
          startTransition(async () => {
            try {
              await deleteProject(project.id);
            } catch (e) {
              onBanner({
                kind: "err",
                text: `Couldn't delete: ${(e as Error).message}`,
              });
            }
          });
        }}
      >
        <Trash2 size={12} />
      </Button>
    </li>
  );
}

function ProjectForm({
  project,
  onClose,
  onBanner,
}: {
  project: Project | null;
  onClose: () => void;
  onBanner: (b: { kind: "ok" | "err"; text: string } | null) => void;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-6">
      <div className="w-full md:max-w-md rounded-t-xl md:rounded-xl border border-[var(--border)] bg-[var(--background)] p-5">
        <h3 className="text-base font-semibold mb-4">
          {project ? "Edit Project" : "New Project"}
        </h3>
        <form
          action={(fd) => {
            if (project) fd.set("id", project.id);
            startTransition(async () => {
              try {
                await upsertProject(fd);
                onBanner({ kind: "ok", text: "Saved." });
                onClose();
              } catch (e) {
                onBanner({
                  kind: "err",
                  text: `Couldn't save: ${(e as Error).message}`,
                });
              }
            });
          }}
          className="space-y-3"
        >
          <label className="block">
            <div className="text-[11px] text-[var(--muted-foreground)] mb-1">
              Name
            </div>
            <input
              name="name"
              required
              defaultValue={project?.name ?? ""}
              placeholder="Project Alpha, Client X, …"
              autoFocus
            />
          </label>
          <label className="block">
            <div className="text-[11px] text-[var(--muted-foreground)] mb-1">
              Notes
            </div>
            <input
              name="notes"
              defaultValue={project?.notes ?? ""}
              placeholder="Client, scope, dates…"
            />
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              name="is_archived"
              defaultChecked={project?.is_archived ?? false}
            />
            <span>Archived (hidden from active project pickers)</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {project ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
