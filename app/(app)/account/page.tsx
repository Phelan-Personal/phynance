import { requireUser } from "@/lib/auth";
import { AccountClient } from "@/components/account/AccountClient";

export default async function AccountPage() {
  const { user } = await requireUser();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Account</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Manage your sign-in and password.
        </p>
      </div>
      <AccountClient email={user.email ?? ""} />
    </div>
  );
}
