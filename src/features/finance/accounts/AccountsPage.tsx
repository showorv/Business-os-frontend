import { Banknote, EllipsisVertical, Landmark, Pencil, Plus, Power, Smartphone, Wallet, WalletCards, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useAccess } from "@/features/businesses/api";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { useMoney } from "@/features/businesses/useMoney";
import { errorMessage } from "@/lib/errors";
import { Permission } from "@/lib/permissions";
import { useAccounts, useUpdateAccount, type Account } from "../api";
import { AccountDialog } from "./AccountDialog";
import { CategoriesCard } from "./CategoriesCard";

const ICONS: Record<string, LucideIcon> = { CASH: Banknote, BANK: Landmark, BKASH: Smartphone, NAGAD: Smartphone, MFS_OTHER: Smartphone, CUSTOM: Wallet };

// Cash, bank and mobile wallets, with what each holds now. Opening one shows its transactions.
export const AccountsPage = () => {
  const { t } = useTranslation(["finance", "shell"]);
  const businessId = useParams().businessId!;
  const { business } = useCurrentBusiness();
  const access = useAccess(businessId);
  const accounts = useAccounts(businessId);
  const money = useMoney();
  const [dialog, setDialog] = useState<{ account?: Account } | null>(null);
  if (!business || access.isLoading) return <Spinner className="mt-16" />;

  const canWrite = access.can(Permission.FINANCE_WRITE) && access.writable;
  const list = accounts.data ?? [];
  const active = list.filter((account) => account.isActive);
  const inactive = list.filter((account) => !account.isActive);
  // Only accounts in the business's own currency add up into one total.
  const total = active.filter((account) => account.currency === business.baseCurrency).reduce((sum, account) => sum + BigInt(account.currentBalanceMinor), 0n);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("shell:accounts")}</h1>
          <p className="mt-1 text-muted-foreground">{t("finance:accountsSubtitle")}</p>
        </div>
        {canWrite ? (
          <Button onClick={() => setDialog({})}>
            <Plus />
            {t("finance:addAccount")}
          </Button>
        ) : null}
      </div>

      {accounts.isLoading ? <Spinner /> : null}
      {accounts.isError ? <Alert tone="danger">{errorMessage(accounts.error)}</Alert> : null}

      {accounts.isSuccess ? (
        <Card>
          <CardContent className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm text-muted-foreground">{t("finance:totalBalance")}</span>
            <span className="text-2xl font-semibold tabular-nums" data-testid="total-balance">
              {money(total, business.baseCurrency)}
            </span>
          </CardContent>
        </Card>
      ) : null}

      {accounts.isSuccess && list.length === 0 ? (
        <Card>
          <EmptyState icon={WalletCards} title={t("finance:noAccounts")} body={t("finance:noAccountsHint")} />
        </Card>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[...active, ...inactive].map((account) => (
          <AccountCard key={account.id} businessId={businessId} account={account} canWrite={canWrite} onEdit={() => setDialog({ account })} />
        ))}
      </ul>

      <CategoriesCard businessId={businessId} canWrite={canWrite} />

      {dialog ? <AccountDialog businessId={businessId} currency={business.baseCurrency} timezone={business.timezone} account={dialog.account} onClose={() => setDialog(null)} /> : null}
    </div>
  );
};

const AccountCard = ({ businessId, account, canWrite, onEdit }: { businessId: string; account: Account; canWrite: boolean; onEdit: () => void }) => {
  const { t } = useTranslation("finance");
  const money = useMoney();
  const update = useUpdateAccount(businessId);
  const Icon = ICONS[account.type] ?? Wallet;
  const negative = account.currentBalanceMinor.startsWith("-");

  const toggleActive = () =>
    update.mutate(
      { accountId: account.id, isActive: !account.isActive },
      {
        onSuccess: () => toast.success(account.isActive ? t("accountHidden", { name: account.name }) : t("accountShown", { name: account.name })),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );

  return (
    <li className={account.isActive ? "" : "opacity-60"}>
      <Card className="relative h-full transition-colors hover:border-foreground/30">
        <CardContent className="flex h-full flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted" aria-hidden>
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              {/* The whole card opens the account's transactions. */}
              <Link to={`../transactions?accountId=${account.id}`} relative="path" className="block truncate font-medium after:absolute after:inset-0">
                {account.name}
              </Link>
              <p className="text-sm text-muted-foreground">
                {t(`accountType_${account.type}`)}
                {account.maskedNumber ? ` · ${account.maskedNumber}` : ""}
              </p>
            </div>
            {!account.isActive ? <Badge>{t("inactive")}</Badge> : null}
            {canWrite ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative z-10 -mt-1 -mr-2" aria-label={t("accountActions", { name: account.name })}>
                    <EllipsisVertical />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-44">
                  <DropdownMenuItem onSelect={onEdit}>
                    <Pencil />
                    {t("editAccount")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={toggleActive}>
                    <Power />
                    {account.isActive ? t("hideAccount") : t("showAccount")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
          <p className={`mt-auto text-xl font-semibold tabular-nums ${negative ? "text-danger" : ""}`}>{money(account.currentBalanceMinor, account.currency)}</p>
        </CardContent>
      </Card>
    </li>
  );
};
