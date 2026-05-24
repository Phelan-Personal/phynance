import { BankScanClient } from "@/components/bank-scan/BankScanClient";
import { listRecentTransactions } from "./actions";
import type { ExpenseTransaction } from "@/types";

export default async function BankScanPage() {
  const recent = (await listRecentTransactions(30)) as ExpenseTransaction[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Bank Scan</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Upload a CSV of recent transactions to find spending cuts.
          Imported rows land in dated transactions, not recurring expenses,
          so monthly cashflow stays accurate.
        </p>
      </div>
      <BankScanClient initialRecentTransactions={recent} />
    </div>
  );
}
