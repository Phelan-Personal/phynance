"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Banknote,
  Building2,
  Coins,
  ExternalLink,
  LineChart,
  Wallet,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, fmtCurrency } from "@/lib/utils";
import { assetValue, type Asset, type AssetType } from "@/types";
import { deleteAsset, upsertAsset } from "@/app/(app)/assets/actions";

const TYPE_LABEL: Record<AssetType, string> = {
  savings: "Savings",
  bank_account: "Bank",
  crypto: "Crypto",
  stock: "Stock",
  other: "Other",
};

const TYPE_ICON: Record<AssetType, typeof Wallet> = {
  savings: Banknote,
  bank_account: Building2,
  crypto: Coins,
  stock: LineChart,
  other: Wallet,
};

const TYPE_TONE: Record<AssetType, string> = {
  savings: "bg-[var(--teal-bg)] text-[var(--teal-dark)]",
  bank_account: "bg-[var(--blue-bg)] text-[var(--blue-fg)]",
  crypto: "bg-[var(--amber-bg)] text-[var(--amber)]",
  stock: "bg-[var(--purple-bg)] text-[var(--purple-fg)]",
  other: "bg-[var(--muted)] text-[var(--muted-foreground)]",
};

export function AssetsList({ assets }: { assets: Asset[] }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [banner, setBanner] = useState<
    { kind: "ok" | "err"; text: string } | null
  >(null);

  const totalsByType = useMemo(() => {
    const m: Record<AssetType, { value: number; count: number }> = {
      savings: { value: 0, count: 0 },
      bank_account: { value: 0, count: 0 },
      crypto: { value: 0, count: 0 },
      stock: { value: 0, count: 0 },
      other: { value: 0, count: 0 },
    };
    for (const a of assets) {
      m[a.type].value += assetValue(a);
      m[a.type].count += 1;
    }
    return m;
  }, [assets]);

  const grandTotal = useMemo(
    () => assets.reduce((a, x) => a + assetValue(x), 0),
    [assets]
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <SummaryCell label="Total" value={fmtCurrency(grandTotal)} tone="primary" />
        <SummaryCell
          label="Bank"
          value={fmtCurrency(totalsByType.bank_account.value)}
          sub={`${totalsByType.bank_account.count} account${totalsByType.bank_account.count === 1 ? "" : "s"}`}
        />
        <SummaryCell
          label="Savings"
          value={fmtCurrency(totalsByType.savings.value)}
          sub={`${totalsByType.savings.count} account${totalsByType.savings.count === 1 ? "" : "s"}`}
        />
        <SummaryCell
          label="Crypto"
          value={fmtCurrency(totalsByType.crypto.value)}
          sub={`${totalsByType.crypto.count} holding${totalsByType.crypto.count === 1 ? "" : "s"}`}
        />
        <SummaryCell
          label="Stocks"
          value={fmtCurrency(totalsByType.stock.value)}
          sub={`${totalsByType.stock.count} position${totalsByType.stock.count === 1 ? "" : "s"}`}
        />
        <SummaryCell
          label="Other"
          value={fmtCurrency(totalsByType.other.value)}
          sub={`${totalsByType.other.count} item${totalsByType.other.count === 1 ? "" : "s"}`}
        />
      </div>

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
              Add Asset
            </Button>
          }
        >
          Assets
        </CardTitle>

        {assets.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No assets yet"
            description="Track savings, crypto holdings, and stock positions to see your full picture."
            action={
              <Button onClick={() => setShowForm(true)}>Add your first asset</Button>
            }
          />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {assets.map((a) => (
              <AssetRow
                key={a.id}
                asset={a}
                onEdit={() => {
                  setEditing(a);
                  setShowForm(true);
                }}
                onBanner={setBanner}
              />
            ))}
          </ul>
        )}
      </Card>

      <p className="text-[11px] text-[var(--muted-foreground)]">
        Live prices coming later — for now, update the price per unit yourself.
      </p>

      {showForm && (
        <AssetForm
          asset={editing}
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

function AssetRow({
  asset,
  onEdit,
  onBanner,
}: {
  asset: Asset;
  onEdit: () => void;
  onBanner: (b: { kind: "ok" | "err"; text: string } | null) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const value = assetValue(asset);
  const isNegative = value < 0;
  const Icon = TYPE_ICON[asset.type];
  return (
    <li className="py-3 flex items-center gap-3">
      <div
        className={cn(
          "shrink-0 rounded-md p-1.5",
          isNegative
            ? "bg-[var(--coral-bg)] text-[var(--coral)]"
            : TYPE_TONE[asset.type]
        )}
      >
        <Icon size={14} aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{asset.name}</span>
          {asset.symbol && (
            <span className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px] font-mono">
              {asset.symbol}
            </span>
          )}
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] capitalize",
              TYPE_TONE[asset.type]
            )}
          >
            {TYPE_LABEL[asset.type]}
          </span>
        </div>
        {Number(asset.units) > 1 && (
          <div className="mt-0.5 text-[11px] text-[var(--muted-foreground)] font-mono">
            {Number(asset.units).toLocaleString(undefined, {
              maximumFractionDigits: 8,
            })}{" "}
            × {fmtCurrency(Number(asset.price_per_unit))}
          </div>
        )}
        {asset.notes && (
          <div className="mt-0.5 text-[11px] text-[var(--muted-foreground)] truncate">
            {asset.notes}
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <div
          className={cn(
            "font-mono text-sm font-medium",
            isNegative && "text-[var(--coral)]"
          )}
        >
          {fmtCurrency(value)}
        </div>
        <div className="text-[10px] text-[var(--muted-foreground)]">
          {isNegative ? "overdrawn" : "value"}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {asset.link_url && (
          <a
            href={asset.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--teal-dark)] hover:bg-[var(--teal-bg)] transition-colors"
            aria-label={`Open ${asset.name}`}
          >
            <ExternalLink size={11} />
            Open
          </a>
        )}
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil size={12} />
        </Button>
        <Button
          variant="danger"
          size="sm"
          disabled={isPending}
          onClick={() => {
            if (!confirm(`Delete "${asset.name}"?`)) return;
            startTransition(async () => {
              try {
                await deleteAsset(asset.id);
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
      </div>
    </li>
  );
}

function AssetForm({
  asset,
  onClose,
  onBanner,
}: {
  asset: Asset | null;
  onClose: () => void;
  onBanner: (b: { kind: "ok" | "err"; text: string } | null) => void;
}) {
  const [type, setType] = useState<AssetType>(asset?.type ?? "savings");
  const wasUnitTracked = asset ? Number(asset.units) > 1 : false;
  const [trackUnits, setTrackUnits] = useState<boolean>(wasUnitTracked);
  const [units, setUnits] = useState<string>(
    wasUnitTracked ? String(asset?.units ?? "") : ""
  );
  const [price, setPrice] = useState<string>(
    wasUnitTracked ? String(asset?.price_per_unit ?? "") : ""
  );
  const [balance, setBalance] = useState<string>(
    asset && !wasUnitTracked ? String(asset.price_per_unit) : ""
  );
  const [isPending, startTransition] = useTransition();

  const isSimpleType = type === "savings" || type === "bank_account";
  const effectiveTrack = !isSimpleType && trackUnits;

  const computedTotal = effectiveTrack
    ? (parseFloat(units) || 0) * (parseFloat(price) || 0)
    : parseFloat(balance) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-6">
      <div className="w-full md:max-w-md rounded-t-xl md:rounded-xl border border-[var(--border)] bg-[var(--background)] p-5">
        <h3 className="text-base font-semibold mb-4">
          {asset ? "Edit Asset" : "Add Asset"}
        </h3>
        <form
          action={(fd) => {
            startTransition(async () => {
              try {
                await upsertAsset(fd);
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
          {asset && <input type="hidden" name="id" value={asset.id} />}
          <Field label="Name">
            <input
              name="name"
              required
              defaultValue={asset?.name ?? ""}
              placeholder={
                type === "bank_account"
                  ? "Chase Checking, Ally Bank…"
                  : type === "savings"
                    ? "Emergency fund, HYSA…"
                    : type === "crypto"
                      ? "Bitcoin, Ethereum…"
                      : "Vanguard 401k, Apple shares…"
              }
              autoFocus
            />
          </Field>
          <Field label="Type">
            <select
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value as AssetType)}
            >
              <option value="bank_account">Bank account (checking, etc.)</option>
              <option value="savings">Savings (cash balance)</option>
              <option value="crypto">Crypto</option>
              <option value="stock">Stock</option>
              <option value="other">Other</option>
            </select>
          </Field>

          {!isSimpleType && (
            <Field label="Symbol / ticker (optional)">
              <input
                name="symbol"
                defaultValue={asset?.symbol ?? ""}
                placeholder={
                  type === "crypto" ? "BTC, ETH, SOL…" : "AAPL, NVDA, VTI…"
                }
              />
            </Field>
          )}

          {!isSimpleType && (
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                name="track_units"
                checked={trackUnits}
                onChange={(e) => setTrackUnits(e.target.checked)}
              />
              <span>
                Track units × price (live prices will multiply this later)
              </span>
            </label>
          )}

          {effectiveTrack ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Units">
                  <input
                    type="number"
                    name="units"
                    step="any"
                    min="0"
                    required
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                  />
                </Field>
                <Field label="Price per unit ($)">
                  <input
                    type="number"
                    name="price_per_unit"
                    step="0.0001"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </Field>
              </div>
              <div className="rounded-md bg-[var(--muted)] px-3 py-2 flex justify-between text-xs">
                <span className="text-[var(--muted-foreground)]">
                  Total value
                </span>
                <span className="font-mono font-medium">
                  {fmtCurrency(computedTotal)}
                </span>
              </div>
            </>
          ) : (
            <Field
              label={
                type === "bank_account"
                  ? "Current balance ($) — can be negative if overdrawn"
                  : "Total value ($)"
              }
            >
              <input
                type="number"
                name="balance"
                step="0.01"
                required
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
              />
            </Field>
          )}

          <Field label="Link URL (broker / bank login)">
            <input
              type="url"
              name="link_url"
              defaultValue={asset?.link_url ?? ""}
              placeholder="schwab.com or https://schwab.com"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          <Field label="Notes">
            <input name="notes" defaultValue={asset?.notes ?? ""} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {asset ? "Save" : "Add"}
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

function SummaryCell({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "primary";
}) {
  return (
    <div
      className={cn(
        "rounded-md px-3 py-2",
        tone === "primary"
          ? "bg-[var(--teal-bg)] text-[var(--teal-dark)]"
          : "bg-[var(--muted)]"
      )}
    >
      <div
        className={cn(
          "text-[10px] uppercase tracking-wider",
          tone === "primary"
            ? "text-[var(--teal-dark)]/80"
            : "text-[var(--muted-foreground)]"
        )}
      >
        {label}
      </div>
      <div className="mt-1 font-mono text-sm font-medium">{value}</div>
      {sub && (
        <div
          className={cn(
            "text-[10px] mt-0.5",
            tone === "primary"
              ? "text-[var(--teal-dark)]/70"
              : "text-[var(--muted-foreground)]"
          )}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
