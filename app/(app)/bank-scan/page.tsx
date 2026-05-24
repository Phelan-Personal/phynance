import { BankScanClient } from "@/components/bank-scan/BankScanClient";

export default function BankScanPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Bank Scan</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Upload a CSV of recent transactions to find subscriptions and
          spending cuts. Parsing is 100% local.
        </p>
      </div>
      <BankScanClient />
    </div>
  );
}
