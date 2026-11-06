import { ChevronRight, Landmark, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Modal, ModalContent } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import type { Business } from "@/features/businesses/api";
import { useMoney } from "@/features/businesses/useMoney";
import { useAccounts } from "@/features/finance/api";
import { cn } from "@/lib/cn";
import { formatDate, todayIn } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { parseMoney } from "@/lib/money";
import { useFormatting } from "@/lib/preferences";
import { useReconciliations, useStartReconciliation } from "./api";

// A statement balance may be below zero (an overdrawn account), so a leading minus is allowed here.
export const parseSignedMoney = (text: string, currency: string) => {
  const trimmed = text.trim();
  const negative = /^[-−]/.test(trimmed);
  const minor = parseMoney(negative ? trimmed.slice(1) : trimmed, currency);
  return minor === null ? null : negative && minor !== "0" ? `-${minor}` : minor;
};

// Statements checked against the books, the ones still going first.
export const ReconcileTab = ({ businessId, business, canPost }: { businessId: string; business: Business; canPost: boolean }) => {
  const { t } = useTranslation("ledger");
  const money = useMoney();
  const { locale, digitStyle } = useFormatting();
  const reconciliations = useReconciliations(businessId);
  const accounts = useAccounts(businessId);
  const [starting, setStarting] = useState(false);
  const accountName = (id: string) => accounts.data?.find((account) => account.id === id)?.name ?? "";
  const list = [...(reconciliations.data ?? [])].sort((a, b) => (a.status === b.status ? b.statementDate.localeCompare(a.statementDate) : a.status === "OPEN" ? -1 : 1));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t("reconcileHint")}</p>
        {canPost ? (
          <Button variant="outline" onClick={() => setStarting(true)}>
            <Plus />
            {t("startReconciliation")}
          </Button>
        ) : null}
      </div>

      {reconciliations.isError ? <Alert tone="danger">{errorMessage(reconciliations.error)}</Alert> : null}
      {reconciliations.isLoading ? <Spinner className="mt-12" /> : null}
      {reconciliations.isSuccess && list.length === 0 ? (
        <Card>
          <EmptyState
            icon={Landmark}
            title={t("noReconciliations")}
            body={t("noReconciliationsHint")}
            action={
              canPost ? (
                <Button onClick={() => setStarting(true)}>
                  <Plus />
                  {t("startReconciliation")}
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : null}

      {list.length > 0 ? (
        <Card className="overflow-hidden">
          <ul className="divide-y">
            {list.map((item) => {
              const open = item.status === "OPEN";
              const difference = item.differenceMinor ? BigInt(item.differenceMinor) : 0n;
              return (
                <li key={item.id} className="group relative flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/50 sm:px-5">
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", open ? "bg-foreground text-background" : "bg-muted")}>
                    <Landmark className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`reconcile/${item.id}`} className="truncate font-medium after:absolute after:inset-0">
                        {accountName(item.financialAccountId)}
                      </Link>
                      <Badge className={cn(open && "bg-foreground text-background")}>{t(`rec_${item.status}`)}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {t("statementOn", { date: formatDate(item.statementDate, locale, digitStyle) })}
                      {!open && difference !== 0n ? ` · ${t("difference")} ${money(difference, business.baseCurrency)}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{money(item.statementBalanceMinor, business.baseCurrency)}</p>
                    <p className="text-xs text-muted-foreground">{t("statement")}</p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      {starting ? <StartDialog businessId={businessId} business={business} onClose={() => setStarting(false)} /> : null}
    </div>
  );
};

const StartDialog = ({ businessId, business, onClose }: { businessId: string; business: Business; onClose: () => void }) => {
  const { t } = useTranslation(["ledger", "common"]);
  const accounts = useAccounts(businessId);
  const start = useStartReconciliation(businessId);
  const navigate = useNavigate();
  const usable = (accounts.data ?? []).filter((account) => account.isActive && account.currency === business.baseCurrency);
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(todayIn(business.timezone));
  const [balance, setBalance] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const chosen = accountId || usable.find((account) => account.type !== "CASH")?.id || usable[0]?.id || "";

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const statementBalanceMinor = parseSignedMoney(balance, business.baseCurrency);
    if (!balance.trim() || statementBalanceMinor === null) return setProblem(t("ledger:balanceNeeded"));
    setProblem(null);
    start.mutate(
      { financialAccountId: chosen, statementDate: date, statementBalanceMinor },
      {
        onSuccess: (created) => {
          toast.success(t("ledger:startReconciliation"));
          void navigate(`/b/${businessId}/ledger/reconcile/${created.id}`);
        },
      },
    );
  };

  return (
    <Modal open onOpenChange={(next) => !next && onClose()}>
      <ModalContent title={t("ledger:startReconciliation")} description={t("ledger:startHint")}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {problem ? <Alert tone="danger">{problem}</Alert> : null}
          {start.isError ? <Alert tone="danger">{errorMessage(start.error)}</Alert> : null}
          <Field label={t("ledger:bankAccount")}>
            <Select value={chosen} onChange={(event) => setAccountId(event.target.value)}>
              {usable.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("ledger:statementDate")}>
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </Field>
            <Field label={t("ledger:statementBalance")}>
              <MoneyInput currency={business.baseCurrency} value={balance} onChange={(event) => setBalance(event.target.value)} placeholder="0.00" inputMode="decimal" />
            </Field>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose}>
              {t("common:cancel")}
            </Button>
            <Button type="submit" disabled={start.isPending || !chosen}>
              {t("ledger:startReconciliation")}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
};
