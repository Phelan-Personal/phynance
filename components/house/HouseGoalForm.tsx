"use client";

import { useTransition } from "react";
import { Home } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { FinancialSettings } from "@/types";
import { saveHouseGoal } from "@/app/(app)/house-goal/actions";

export function HouseGoalForm({
  settings,
  existing,
}: {
  settings: FinancialSettings;
  existing: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <Card>
      <CardTitle>{existing ? "Edit House Goal" : "Set up your House Goal"}</CardTitle>
      {!existing && (
        <p className="-mt-2 mb-4 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <Home size={12} />
          Pick a target price and your monthly savings rate to see when
          you'll be ready.
        </p>
      )}
      <form
        action={(fd) =>
          startTransition(async () => {
            await saveHouseGoal(fd);
          })
        }
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        <Field label="Target home price">
          <input
            type="number"
            name="house_target_price"
            step="1000"
            min="0"
            required
            defaultValue={settings.house_target_price ?? ""}
            placeholder="450000"
          />
        </Field>
        <Field label="Down payment %">
          <input
            type="number"
            name="house_down_payment_pct"
            step="0.1"
            min="0"
            defaultValue={settings.house_down_payment_pct ?? 20}
          />
        </Field>
        <Field label="Current savings toward down payment">
          <input
            type="number"
            name="house_current_savings"
            step="100"
            min="0"
            defaultValue={settings.house_current_savings ?? 0}
          />
        </Field>
        <Field label="Monthly savings toward down payment">
          <input
            type="number"
            name="house_monthly_save"
            step="100"
            min="0"
            defaultValue={settings.house_monthly_save ?? 0}
          />
        </Field>
        <Field label="Expected mortgage rate %">
          <input
            type="number"
            name="house_mortgage_rate"
            step="0.01"
            min="0"
            defaultValue={settings.house_mortgage_rate ?? 7}
          />
        </Field>
        <Field label="Target move-in date (optional)">
          <input
            type="date"
            name="house_target_date"
            defaultValue={settings.house_target_date ?? ""}
          />
        </Field>
        <div className="md:col-span-2">
          <Button type="submit" disabled={isPending}>
            {existing ? "Save changes" : "Set goal"}
          </Button>
        </div>
      </form>
    </Card>
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
