"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Pencil,
  Trash2,
  Wallet,
  ArrowUp,
  ArrowDown,
  Archive,
  Clock,
} from "lucide-react";
import type { IncomeStream, IncomeHistory } from "@/types";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, fmtCurrency } from "@/lib/utils";
import {
  contractDurationLabel,
  isStreamEnded,
} from "@/lib/streams";
import {
  deleteStream,
  upsertStream,
} from "@/app/(app)/income/actions";

const TYPE_LABEL: Record<string, string> = {
  business: "Business",
  freelance: "Freelance",
  rental: "Rental",
  investment: "Investment",
  side_business: "Side business",
  other: "Other",
};

export function IncomeStreamsList({
  streams,
  history,
}: {
  streams: IncomeStream[];
  history: IncomeHistory[];
}) {
  const [editing, setEditing] = useState<IncomeStream | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showEnded, setShowEnded] = useState(false);

  const { active, ended } = useMemo(() => {
    const a: IncomeStream[] = [];
    const e: IncomeStream[] = [];
    for (const s of streams) {
      if (isStreamEnded(s)) e.push(s);
      else a.push(s);
    }
    return { active: a, ended: e };
  }, [streams]);

  const trendByStream: Record<string, "up" | "down" | "flat"> = {};
  for (const s of streams) {
    const own = history
      .filter((h) => h.stream_id === s.id)
      .sort((a, b) => b.month.localeCompare(a.month));
    const last3 = own.slice(0, 3);
    const prev3 = own.slice(3, 6);
    const lastAvg =
      last3.length > 0 ? last3.reduce((a, h) => a + Number(h.amount), 0) / last3.length : 0;
    const prevAvg =
      prev3.length > 0 ? prev3.reduce((a, h) => a + Number(h.amount), 0) / prev3.length : 0;
    trendByStream[s.id] =
      prevAvg === 0
        ? "flat"
        : lastAvg > prevAvg * 1.02
          ? "up"
          : lastAvg < prevAvg * 0.98
            ? "down"
            : "flat";
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle
          right={
            <Button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
            >
              Add Stream
            </Button>
          }
        >
          Income Streams
        </CardTitle>

        {active.length === 0 && ended.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No income streams yet"
            description="Add your business and any side income so cashflow math is accurate."
            action={
              <Button onClick={() => setShowForm(true)}>
                Add your first stream
              </Button>
            }
          />
        ) : active.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)] py-2">
            No currently active streams. All {ended.length} stream
            {ended.length === 1 ? " has" : "s have"} ended — see the
            archive below.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {active.map((s) => (
              <Row
                key={s.id}
                stream={s}
                trend={trendByStream[s.id]}
                onEdit={() => {
                  setEditing(s);
                  setShowForm(true);
                }}
              />
            ))}
          </ul>
        )}
      </Card>

      {ended.length > 0 && (
        <Card>
          <button
            onClick={() => setShowEnded((v) => !v)}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <Archive size={14} className="text-[var(--muted-foreground)]" />
              Ended streams ({ended.length})
              <span className="text-[11px] text-[var(--muted-foreground)] font-normal">
                — excluded from current cashflow
              </span>
            </span>
            <span className="text-[11px] text-[var(--teal)]">
              {showEnded ? "Hide" : "Show"}
            </span>
          </button>
          {showEnded && (
            <ul className="divide-y divide-[var(--border)] mt-3">
              {ended.map((s) => (
                <Row
                  key={s.id}
                  stream={s}
                  trend={trendByStream[s.id]}
                  isEnded
                  onEdit={() => {
                    setEditing(s);
                    setShowForm(true);
                  }}
                />
              ))}
            </ul>
          )}
        </Card>
      )}

      {showForm && (
        <StreamForm
          stream={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function Row({
  stream,
  trend,
  isEnded,
  onEdit,
}: {
  stream: IncomeStream;
  trend: "up" | "down" | "flat";
  isEnded?: boolean;
  onEdit: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const duration = contractDurationLabel(stream);
  return (
    <li className={cn("py-3 flex items-center gap-3", isEnded && "opacity-70")}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{stream.name}</span>
          <span className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px]">
            {TYPE_LABEL[stream.type] ?? stream.type}
          </span>
          {stream.is_primary && !isEnded && (
            <span className="rounded bg-[var(--teal-bg)] text-[var(--teal-dark)] px-1.5 py-0.5 text-[10px] font-medium">
              Primary
            </span>
          )}
          {isEnded && (
            <span className="inline-flex items-center gap-1 rounded bg-[var(--muted)] text-[var(--muted-foreground)] px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
              <Archive size={10} /> Ended
            </span>
          )}
        </div>
        {duration && (
          <div className="mt-0.5 text-[11px] text-[var(--muted-foreground)] flex items-center gap-1">
            <Clock size={10} aria-hidden /> {duration}
          </div>
        )}
        {stream.notes && (
          <div className="mt-0.5 text-[11px] text-[var(--muted-foreground)] truncate">
            {stream.notes}
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="flex items-center justify-end gap-1 font-mono text-sm">
          {trend === "up" && !isEnded && (
            <ArrowUp size={11} className="text-[var(--teal)]" />
          )}
          {trend === "down" && !isEnded && (
            <ArrowDown size={11} className="text-[var(--coral)]" />
          )}
          {fmtCurrency(Number(stream.avg_monthly))}
        </div>
        <div className="text-[10px] text-[var(--muted-foreground)]">
          {isEnded ? "final avg/mo" : "avg/mo"}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil size={12} />
        </Button>
        <Button
          variant="danger"
          size="sm"
          disabled={isPending}
          onClick={() => {
            if (!confirm(`Delete "${stream.name}"?`)) return;
            startTransition(async () => {
              await deleteStream(stream.id);
            });
          }}
        >
          <Trash2 size={12} />
        </Button>
      </div>
    </li>
  );
}

function StreamForm({
  stream,
  onClose,
}: {
  stream: IncomeStream | null;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--background)] p-5">
        <h3 className="text-base font-semibold mb-4">
          {stream ? "Edit Stream" : "Add Income Stream"}
        </h3>
        <form
          action={(fd) => {
            startTransition(async () => {
              await upsertStream(fd);
              onClose();
            });
          }}
          className="space-y-3"
        >
          {stream && <input type="hidden" name="id" value={stream.id} />}
          <Field label="Name">
            <input
              name="name"
              required
              defaultValue={stream?.name ?? ""}
              placeholder="Main Business, Rental – Oak St…"
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Type">
              <select name="type" defaultValue={stream?.type ?? "business"}>
                {Object.entries(TYPE_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Avg / month">
              <input
                type="number"
                name="avg_monthly"
                step="0.01"
                min="0"
                defaultValue={stream?.avg_monthly ?? ""}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Active from (optional)">
              <input
                type="month"
                name="start_month"
                defaultValue={stream?.start_month?.slice(0, 7) ?? ""}
              />
            </Field>
            <Field label="Ended (optional)">
              <input
                type="month"
                name="end_month"
                defaultValue={stream?.end_month?.slice(0, 7) ?? ""}
              />
            </Field>
          </div>
          <Field label='Pay days (e.g. "1", "1,15", "15,30")'>
            <input
              name="pay_days"
              defaultValue={stream?.pay_days ?? ""}
              placeholder="comma-separated day numbers 1–31"
            />
          </Field>
          <Field label="Notes">
            <input
              name="notes"
              defaultValue={stream?.notes ?? ""}
              placeholder="e.g. ramp-up planned Q3"
            />
          </Field>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              name="is_primary"
              defaultChecked={stream?.is_primary ?? false}
            />
            <span>
              Primary business — personal draw is taken from this stream
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {stream ? "Save" : "Add"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-[11px] text-[var(--muted-foreground)] mb-1">
        {label}
      </div>
      {children}
    </label>
  );
}
