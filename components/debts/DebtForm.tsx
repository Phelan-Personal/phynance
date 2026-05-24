"use client";

import { useTransition } from "react";
import type { Debt } from "@/types";
import { Button } from "@/components/ui/Button";
import { upsertDebt } from "@/app/(app)/debts/actions";

export function DebtForm({
  debt,
  onClose,
}: {
  debt: Debt | null;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-6">
      <div className="w-full md:max-w-md rounded-t-xl md:rounded-xl border border-[var(--border)] bg-[var(--background)] p-5">
        <h3 className="text-base font-semibold mb-4">
          {debt ? "Edit Debt" : "Add a Debt"}
        </h3>
        <form
          action={(fd) => {
            startTransition(async () => {
              await upsertDebt(fd);
              onClose();
            });
          }}
          className="space-y-3"
        >
          {debt && <input type="hidden" name="id" value={debt.id} />}
          <Field label="Name">
            <input
              name="name"
              required
              defaultValue={debt?.name ?? ""}
              placeholder="Chase Sapphire, SBA Loan…"
              autoFocus
            />
          </Field>
          <Field label="Type">
            <select name="type" defaultValue={debt?.type ?? "personal"}>
              <option value="personal">Personal</option>
              <option value="business">Business</option>
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Balance">
              <input
                type="number"
                name="balance"
                required
                step="0.01"
                min="0"
                defaultValue={debt?.balance ?? ""}
              />
            </Field>
            <Field label="APR %">
              <input
                type="number"
                name="interest_rate"
                step="0.01"
                min="0"
                defaultValue={debt?.interest_rate ?? ""}
              />
            </Field>
            <Field label="Min/mo">
              <input
                type="number"
                name="min_payment"
                step="0.01"
                min="0"
                defaultValue={debt?.min_payment ?? ""}
              />
            </Field>
          </div>
          <Field label="Original Balance (optional)">
            <input
              type="number"
              name="original_balance"
              step="0.01"
              min="0"
              defaultValue={debt?.original_balance ?? ""}
            />
          </Field>
          <Field label="Notes">
            <input name="notes" defaultValue={debt?.notes ?? ""} />
          </Field>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {debt ? "Save" : "Add Debt"}
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
