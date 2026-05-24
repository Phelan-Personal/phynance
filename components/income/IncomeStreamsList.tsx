"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, Wallet, ArrowUp, ArrowDown } from "lucide-react";
import type { IncomeStream, IncomeHistory } from "@/types";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, fmtCurrency } from "@/lib/utils";
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

      {streams.length === 0 ? (
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
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {streams.map((s) => (
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

      {showForm && (
        <StreamForm
          stream={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}
    </Card>
  );
}

function Row({
  stream,
  trend,
  onEdit,
}: {
  stream: IncomeStream;
  trend: "up" | "down" | "flat";
  onEdit: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <li className="py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{stream.name}</span>
          <span className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px]">
            {TYPE_LABEL[stream.type] ?? stream.type}
          </span>
          {stream.is_primary && (
            <span className="rounded bg-[var(--teal-bg)] text-[var(--teal-dark)] px-1.5 py-0.5 text-[10px] font-medium">
              Primary
            </span>
          )}
        </div>
        {stream.notes && (
          <div className="mt-0.5 text-[11px] text-[var(--muted-foreground)] truncate">
            {stream.notes}
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="flex items-center justify-end gap-1 font-mono text-sm">
          {trend === "up" && (
            <ArrowUp size={11} className="text-[var(--teal)]" />
          )}
          {trend === "down" && (
            <ArrowDown size={11} className="text-[var(--coral)]" />
          )}
          {fmtCurrency(Number(stream.avg_monthly))}
        </div>
        <div className="text-[10px] text-[var(--muted-foreground)]">avg/mo</div>
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
