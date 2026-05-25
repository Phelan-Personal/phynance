"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Lightbulb,
  ListTodo,
  Plus,
  Check,
  Trash2,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type { NextStep, NextStepCategory } from "@/types";
import type { Suggestion } from "@/lib/suggestions";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  addNextStep,
  deleteNextStep,
  toggleNextStep,
} from "@/app/(app)/next-steps-actions";

const CATEGORY_TONE: Record<NextStepCategory, string> = {
  debt: "bg-[var(--coral-bg)] text-[var(--coral)]",
  cashflow: "bg-[var(--amber-bg)] text-[var(--amber)]",
  income: "bg-[var(--teal-bg)] text-[var(--teal-dark)]",
  savings: "bg-[var(--blue-bg)] text-[var(--blue-fg)]",
  tax: "bg-[var(--purple-bg)] text-[var(--purple-fg)]",
  house: "bg-[var(--teal-bg)] text-[var(--teal-dark)]",
  rewards: "bg-[var(--teal-bg)] text-[var(--teal-dark)]",
  other: "bg-[var(--muted)] text-[var(--muted-foreground)]",
};

const PRIORITY_LABEL: Record<number, string> = {
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
  5: "Someday",
};

const PRIORITY_TONE: Record<number, string> = {
  1: "bg-[var(--coral-bg)] text-[var(--coral)]",
  2: "bg-[var(--amber-bg)] text-[var(--amber)]",
  3: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  4: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  5: "bg-[var(--muted)] text-[var(--muted-foreground)]",
};

export function NextStepsAndSuggestions({
  suggestions,
  nextSteps,
}: {
  suggestions: Suggestion[];
  nextSteps: NextStep[];
}) {
  const [banner, setBanner] = useState<
    { kind: "ok" | "err"; text: string } | null
  >(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const addedKeys = useMemo(() => {
    const s = new Set<string>();
    for (const ns of nextSteps) if (ns.source_key) s.add(ns.source_key);
    return s;
  }, [nextSteps]);

  const visibleSuggestions = suggestions.filter(
    (s) => !addedKeys.has(s.key)
  );

  const open = nextSteps.filter((s) => !s.is_completed);
  const done = nextSteps.filter((s) => s.is_completed);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Suggested actions */}
      <Card>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Lightbulb size={14} className="text-[var(--amber)]" />
            Suggested actions
          </span>
        </CardTitle>
        {banner && (
          <div
            className={cn(
              "mb-3 rounded-md border px-3 py-2 text-xs flex items-start gap-2",
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
        {visibleSuggestions.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)] py-3">
            Nothing pressing right now — your numbers look reasonable. Keep
            logging income and watching the cashflow timeline.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)] -mx-1">
            {visibleSuggestions.slice(0, 8).map((s) => (
              <SuggestionRow
                key={s.key}
                suggestion={s}
                onAdd={() => setBanner({ kind: "ok", text: "Added to your list." })}
                onError={(msg) =>
                  setBanner({ kind: "err", text: `Couldn't add: ${msg}` })
                }
              />
            ))}
          </ul>
        )}
        {suggestions.length > 8 && (
          <div className="mt-3 text-[10px] text-[var(--muted-foreground)]">
            Showing 8 of {suggestions.length}. Resolve some to see the rest.
          </div>
        )}
      </Card>

      {/* My next steps */}
      <Card>
        <CardTitle
          right={
            done.length > 0 && (
              <button
                onClick={() => setShowCompleted((v) => !v)}
                className="text-[11px] text-[var(--teal)] hover:underline"
              >
                {showCompleted ? "Hide" : "Show"} done ({done.length})
              </button>
            )
          }
        >
          <span className="inline-flex items-center gap-2">
            <ListTodo size={14} className="text-[var(--teal)]" />
            My next steps
          </span>
        </CardTitle>

        <AddManualForm
          onAdded={() => setBanner({ kind: "ok", text: "Added." })}
          onError={(msg) =>
            setBanner({ kind: "err", text: `Couldn't add: ${msg}` })
          }
        />

        {open.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)] py-3">
            Your list is empty. Add suggestions from the left, or type one
            in above.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)] -mx-1 mt-2">
            {open
              .sort((a, b) => a.priority - b.priority)
              .map((s) => (
                <NextStepRow
                  key={s.id}
                  step={s}
                  onBanner={setBanner}
                />
              ))}
          </ul>
        )}

        {showCompleted && done.length > 0 && (
          <ul className="divide-y divide-[var(--border)] -mx-1 mt-2 opacity-70">
            {done
              .sort((a, b) =>
                (b.completed_at ?? "").localeCompare(a.completed_at ?? "")
              )
              .slice(0, 10)
              .map((s) => (
                <NextStepRow
                  key={s.id}
                  step={s}
                  onBanner={setBanner}
                />
              ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function SuggestionRow({
  suggestion,
  onAdd,
  onError,
}: {
  suggestion: Suggestion;
  onAdd: () => void;
  onError: (msg: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const handleAdd = () => {
    const fd = new FormData();
    fd.set("title", suggestion.title);
    fd.set("description", suggestion.description);
    fd.set("category", suggestion.category);
    fd.set("priority", String(suggestion.priority));
    fd.set("source_key", suggestion.key);
    startTransition(async () => {
      try {
        await addNextStep(fd);
        onAdd();
      } catch (e) {
        onError((e as Error).message);
      }
    });
  };
  return (
    <li className="px-1 py-2.5 flex items-start gap-2 text-xs">
      <span
        className={cn(
          "shrink-0 mt-0.5 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-medium",
          PRIORITY_TONE[suggestion.priority]
        )}
        title={`Priority: ${PRIORITY_LABEL[suggestion.priority] ?? suggestion.priority}`}
      >
        {PRIORITY_LABEL[suggestion.priority] ?? suggestion.priority}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium">{suggestion.title}</div>
        <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
          {suggestion.description}
        </div>
        <div className="mt-1.5 flex items-center gap-3">
          {suggestion.link && (
            <Link
              href={suggestion.link}
              className="inline-flex items-center gap-1 text-[10px] text-[var(--teal)] hover:underline"
            >
              Open <ArrowUpRight size={10} />
            </Link>
          )}
          <button
            onClick={handleAdd}
            disabled={isPending}
            className="inline-flex items-center gap-1 text-[10px] text-[var(--teal)] hover:underline disabled:opacity-50"
          >
            <Plus size={10} /> Add to my list
          </button>
        </div>
      </div>
    </li>
  );
}

function NextStepRow({
  step,
  onBanner,
}: {
  step: NextStep;
  onBanner: (b: { kind: "ok" | "err"; text: string } | null) => void;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <li className="px-1 py-2.5 flex items-start gap-2 text-xs">
      <button
        onClick={() => {
          startTransition(async () => {
            try {
              await toggleNextStep(step.id, !step.is_completed);
            } catch (e) {
              onBanner({
                kind: "err",
                text: `Couldn't toggle: ${(e as Error).message}`,
              });
            }
          });
        }}
        disabled={isPending}
        aria-label={step.is_completed ? "Mark not done" : "Mark done"}
        className={cn(
          "shrink-0 mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors",
          step.is_completed
            ? "bg-[var(--teal)] border-[var(--teal)] text-white"
            : "border-[var(--border)] hover:border-[var(--teal)]"
        )}
      >
        {step.is_completed && <Check size={10} strokeWidth={3} />}
      </button>
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "text-[12px] font-medium flex items-center gap-2 flex-wrap",
            step.is_completed && "line-through text-[var(--muted-foreground)]"
          )}
        >
          <span>{step.title}</span>
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider",
              CATEGORY_TONE[step.category]
            )}
          >
            {step.category}
          </span>
        </div>
        {step.description && (
          <div
            className={cn(
              "text-[11px] mt-0.5 text-[var(--muted-foreground)]",
              step.is_completed && "line-through"
            )}
          >
            {step.description}
          </div>
        )}
      </div>
      <button
        onClick={() => {
          if (!confirm(`Delete "${step.title}"?`)) return;
          startTransition(async () => {
            try {
              await deleteNextStep(step.id);
            } catch (e) {
              onBanner({
                kind: "err",
                text: `Couldn't delete: ${(e as Error).message}`,
              });
            }
          });
        }}
        disabled={isPending}
        aria-label="Delete"
        className="shrink-0 text-[var(--muted-foreground)] hover:text-[var(--coral)]"
      >
        <Trash2 size={11} />
      </button>
    </li>
  );
}

function AddManualForm({
  onAdded,
  onError,
}: {
  onAdded: () => void;
  onError: (msg: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <form
      action={async (fd) => {
        try {
          await addNextStep(fd);
          (document.getElementById("ns-form") as HTMLFormElement)?.reset();
          onAdded();
        } catch (e) {
          onError((e as Error).message);
        }
      }}
      id="ns-form"
      className="flex items-center gap-2"
    >
      <input
        name="title"
        required
        placeholder="Add a next step…"
        className="!py-1 !text-xs"
      />
      <select
        name="category"
        defaultValue="other"
        className="!w-auto !py-1 !text-xs"
      >
        <option value="debt">Debt</option>
        <option value="cashflow">Cashflow</option>
        <option value="income">Income</option>
        <option value="savings">Savings</option>
        <option value="tax">Tax</option>
        <option value="house">House</option>
        <option value="rewards">Rewards</option>
        <option value="other">Other</option>
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="shrink-0 inline-flex items-center gap-1 rounded-md bg-[var(--teal)] text-white px-2 py-1 text-xs font-medium hover:bg-[var(--teal-dark)] transition-colors disabled:opacity-50"
      >
        <Plus size={11} /> Add
      </button>
    </form>
  );
}
