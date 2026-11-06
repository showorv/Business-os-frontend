import { ArrowRight, Lock, Plus, Search, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { toast } from "sonner";
import { Dialog } from "radix-ui";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Modal, ModalContent } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { useTrialBalance } from "@/features/analytics/api";
import type { Business } from "@/features/businesses/api";
import { useMoney } from "@/features/businesses/useMoney";
import { cn } from "@/lib/cn";
import { todayIn } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { useFormatting } from "@/lib/preferences";
import { LEDGER_TYPES, useCreateLedgerAccount, useLedgerAccounts, useUpdateLedgerAccount, type LedgerAccount, type LedgerType } from "./api";
import { ledgerName, suggestCode } from "./parts";

const FLOWS = ["OPERATING", "INVESTING", "FINANCING"] as const;

interface Props {
  businessId: string;
  business: Business;
  canPost: boolean;
}

// Every account in the books, grouped by kind, with today's balance. Tiles on top filter by kind.
export const ChartOfAccounts = ({ businessId, business, canPost }: Props) => {
  const { t } = useTranslation("ledger");
  const money = useMoney();
  const { locale } = useFormatting();
  const accounts = useLedgerAccounts(businessId);
  const trial = useTrialBalance(businessId, todayIn(business.timezone));
  const [type, setType] = useState<LedgerType | null>(null);
  const [search, setSearch] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const currency = business.baseCurrency;

  // Balances read the way each kind grows: assets and expenses by debits, the rest by credits.
  const balances = useMemo(() => {
    const map = new Map<string, bigint>();
    for (const item of trial.data?.items ?? []) map.set(item.ledgerAccountId, BigInt(item.debitBalanceMinor) - BigInt(item.creditBalanceMinor));
    return map;
  }, [trial.data]);
  const balanceOf = (account: LedgerAccount) => {
    const net = balances.get(account.id) ?? 0n;
    return account.normalBalance === "DEBIT" ? net : -net;
  };

  const all = accounts.data ?? [];
  const visible = all.filter((account) => showHidden || account.isActive);
  const query = search.trim().toLowerCase();
  const shown = visible.filter(
    (account) =>
      (!type || account.type === type) &&
      (!query || account.code.includes(query) || account.name.toLowerCase().includes(query) || (account.nameBn ?? "").includes(search.trim())),
  );
  // Children sit under their parent, indented.
  const depthOf = (account: LedgerAccount) => {
    let depth = 0;
    let parent = all.find((item) => item.id === account.parentId);
    while (parent && depth < 4) {
      depth++;
      parent = all.find((item) => item.id === parent!.parentId);
    }
    return depth;
  };
  const open = all.find((account) => account.id === openId);

  if (accounts.isError) return <Alert tone="danger">{errorMessage(accounts.error)}</Alert>;
  if (!accounts.data) return <Spinner className="mt-12" />;

  return (
    <div className="space-y-5">
      {/* One tile per kind: how many accounts and what they hold. Clicking one shows only that kind. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {LEDGER_TYPES.map((key) => {
          const group = visible.filter((account) => account.type === key);
          const total = group.reduce((sum, account) => sum + balanceOf(account), 0n);
          const active = type === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => setType(active ? null : key)}
              className={cn(
                "group rounded-lg border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                active ? "border-foreground bg-foreground text-background" : "bg-surface hover:border-foreground/30",
                key === "EXPENSE" && "col-span-2 sm:col-span-1",
              )}
            >
              <p className={cn("text-sm", active ? "text-background/70" : "text-muted-foreground")}>{t(`type_${key}`)}</p>
              <p className="mt-1 truncate text-lg font-semibold tracking-tight tabular-nums">{trial.data ? money(total, currency) : "—"}</p>
              <p className={cn("mt-0.5 text-xs", active ? "text-background/70" : "text-muted-foreground")}>{t("accountsCount", { count: group.length })}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-auto sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("search")} aria-label={t("search")} className="pl-9" />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={showHidden} onChange={(event) => setShowHidden(event.target.checked)} className="size-4 accent-foreground" />
          {t("showHidden")}
        </label>
        {type ? (
          <Button variant="ghost" size="sm" onClick={() => setType(null)} aria-label={`${t("clearFilters")}: ${t(`type_${type}`)}`}>
            <X />
            {t(`type_${type}`)}
          </Button>
        ) : null}
        <div className="flex-1" />
        {canPost ? (
          <Button variant="outline" onClick={() => setAdding(true)}>
            <Plus />
            {t("newAccount")}
          </Button>
        ) : null}
      </div>

      <Card className="overflow-hidden">
        {shown.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">{t("noMatch")}</p> : null}
        {LEDGER_TYPES.filter((key) => shown.some((account) => account.type === key)).map((key) => {
          const group = shown.filter((account) => account.type === key);
          return (
            <section key={key} aria-label={t(`type_${key}`)} className="border-b last:border-b-0">
              <div className="flex items-baseline justify-between gap-3 bg-muted/40 px-5 py-2.5">
                <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t(`type_${key}`)}</h2>
                <p className="hidden truncate text-xs text-muted-foreground sm:block">{t(`typeHint_${key}`)}</p>
              </div>
              <ul className="divide-y">
                {group.map((account) => (
                  <li key={account.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(account.id)}
                      className={cn(
                        "grid w-full grid-cols-[3.5rem_1fr_auto] items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none sm:grid-cols-[4.5rem_1fr_auto]",
                        !account.isActive && "opacity-55",
                      )}
                    >
                      <span className="font-mono text-xs text-muted-foreground tabular-nums">{account.code}</span>
                      <span className="flex min-w-0 items-center gap-2" style={{ paddingLeft: `${depthOf(account) * 1}rem` }}>
                        <span className="truncate text-sm font-medium">{ledgerName(account, locale)}</span>
                        {!account.isActive ? <Badge>{t("hidden")}</Badge> : null}
                      </span>
                      <span className={cn("text-sm tabular-nums", balanceOf(account) === 0n ? "text-muted-foreground" : "font-medium")}>
                        {trial.data ? money(balanceOf(account), currency) : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </Card>

      {open ? (
        <AccountPanel
          key={open.id}
          businessId={businessId}
          account={open}
          accounts={all}
          balance={trial.data ? money(balanceOf(open), currency) : null}
          canPost={canPost}
          onClose={() => setOpenId(null)}
        />
      ) : null}
      {adding ? <NewAccountDialog businessId={businessId} accounts={all} onClose={() => setAdding(false)} onCreated={(id) => setOpenId(id)} /> : null}
    </div>
  );
};

// A panel from the right: what the account is, its balance, and the parts that can change.
const AccountPanel = ({
  businessId,
  account,
  accounts,
  balance,
  canPost,
  onClose,
}: {
  businessId: string;
  account: LedgerAccount;
  accounts: LedgerAccount[];
  balance: string | null;
  canPost: boolean;
  onClose: () => void;
}) => {
  const { t } = useTranslation(["ledger", "common"]);
  const { locale } = useFormatting();
  const update = useUpdateLedgerAccount(businessId);
  const [name, setName] = useState(account.name);
  const [nameBn, setNameBn] = useState(account.nameBn ?? "");
  const [flow, setFlow] = useState(account.cashFlowClass);
  const [parentId, setParentId] = useState(account.parentId ?? "");
  const parents = accounts.filter((item) => item.type === account.type && item.id !== account.id && item.isActive);
  const changed = name.trim() !== account.name || (nameBn.trim() || null) !== account.nameBn || flow !== account.cashFlowClass || (parentId || null) !== account.parentId;

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    update.mutate(
      { ledgerAccountId: account.id, name: name.trim(), nameBn: nameBn.trim() || null, cashFlowClass: flow, parentId: parentId || null },
      { onSuccess: () => toast.success(t("ledger:accountSaved")) },
    );
  };
  const toggle = () =>
    update.mutate({ ledgerAccountId: account.id, isActive: !account.isActive }, { onSuccess: () => toast.success(t("ledger:accountSaved")) });

  return (
    <Dialog.Root open onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay" />
        <Dialog.Content className="animate-chart-fade fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto border-l bg-surface shadow-xl outline-none">
          <div className="flex items-start justify-between gap-3 border-b p-5">
            <div className="min-w-0">
              <p className="font-mono text-xs text-muted-foreground">{account.code}</p>
              <Dialog.Title className="truncate text-lg font-semibold">{ledgerName(account, locale)}</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                {t(`ledger:typeOne_${account.type}`)} · {t(`ledger:normal_${account.normalBalance}`)}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label={t("common:close")}>
                <X />
              </Button>
            </Dialog.Close>
          </div>

          <div className="space-y-6 p-5">
            <div className="rounded-lg bg-muted/60 p-4">
              <p className="text-sm text-muted-foreground">{t("ledger:balanceToday")}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{balance ?? "—"}</p>
              <Link to={`?tab=journals&account=${account.id}`} onClick={onClose} className="mt-3 inline-flex items-center gap-1 text-sm font-medium hover:underline">
                {t("ledger:seeEntries")}
                <ArrowRight className="size-4" />
              </Link>
            </div>

            {canPost ? (
              <form onSubmit={save} className="space-y-4" noValidate>
                {update.isError ? <Alert tone="danger">{errorMessage(update.error)}</Alert> : null}
                <Field label={t("ledger:name")}>
                  <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} />
                </Field>
                <Field label={`${t("ledger:nameBn")} (${t("ledger:optional")})`}>
                  <Input value={nameBn} onChange={(event) => setNameBn(event.target.value)} maxLength={120} lang="bn" />
                </Field>
                <Field label={t("ledger:cashFlow")} hint={t("ledger:cashFlowHint")}>
                  <Select value={flow} onChange={(event) => setFlow(event.target.value as typeof flow)}>
                    {FLOWS.map((value) => (
                      <option key={value} value={value}>
                        {t(`ledger:flow_${value}`)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("ledger:parent")}>
                  <Select value={parentId} onChange={(event) => setParentId(event.target.value)}>
                    <option value="">{t("ledger:noParent")}</option>
                    {parents.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} · {ledgerName(item, locale)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <p className="text-xs text-muted-foreground">{t("ledger:codeFixed")}</p>
                <Button type="submit" disabled={!changed || !name.trim() || update.isPending} className="w-full">
                  {t("common:save")}
                </Button>
              </form>
            ) : null}

            {canPost ? (
              <div className="space-y-2 border-t pt-5">
                {account.isSystem ? (
                  <p className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Lock className="mt-0.5 size-4 shrink-0" />
                    {t("ledger:systemHint")}
                  </p>
                ) : (
                  <>
                    <Button variant="outline" className="w-full" onClick={toggle} disabled={update.isPending}>
                      {account.isActive ? t("ledger:hideAccount") : t("ledger:showAccount")}
                    </Button>
                    <p className="text-xs text-muted-foreground">{t("ledger:hideHint")}</p>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

const NewAccountDialog = ({ businessId, accounts, onClose, onCreated }: { businessId: string; accounts: LedgerAccount[]; onClose: () => void; onCreated: (id: string) => void }) => {
  const { t } = useTranslation(["ledger", "common"]);
  const create = useCreateLedgerAccount(businessId);
  const [type, setType] = useState<LedgerType>("EXPENSE");
  const [code, setCode] = useState(() => suggestCode(accounts, "EXPENSE"));
  const [name, setName] = useState("");
  const [nameBn, setNameBn] = useState("");
  const [flow, setFlow] = useState<(typeof FLOWS)[number]>("OPERATING");
  const [problem, setProblem] = useState<string | null>(null);

  const chooseType = (next: LedgerType) => {
    setType(next);
    setCode(suggestCode(accounts, next));
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{4,6}$/.test(code)) return setProblem(t("ledger:codeWrong"));
    if (!name.trim()) return setProblem(t("ledger:nameNeeded"));
    setProblem(null);
    create.mutate(
      { code, type, name: name.trim(), cashFlowClass: flow, ...(nameBn.trim() ? { nameBn: nameBn.trim() } : {}) },
      {
        onSuccess: (account) => {
          toast.success(t("ledger:accountAdded"));
          onClose();
          onCreated(account.id);
        },
      },
    );
  };

  return (
    <Modal open onOpenChange={(next) => !next && onClose()}>
      <ModalContent title={t("ledger:newAccount")} description={t("ledger:newAccountHint")}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {problem ? <Alert tone="danger">{problem}</Alert> : null}
          {create.isError ? <Alert tone="danger">{errorMessage(create.error)}</Alert> : null}
          <Field label={t("ledger:kind")} hint={t(`ledger:typeHint_${type}`)}>
            <Select value={type} onChange={(event) => chooseType(event.target.value as LedgerType)}>
              {LEDGER_TYPES.map((value) => (
                <option key={value} value={value}>
                  {t(`ledger:typeOne_${value}`)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-[7rem_1fr] gap-3">
            <Field label={t("ledger:code")}>
              <Input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" className="font-mono" />
            </Field>
            <Field label={t("ledger:name")}>
              <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} autoFocus />
            </Field>
          </div>
          <Field label={`${t("ledger:nameBn")} (${t("ledger:optional")})`}>
            <Input value={nameBn} onChange={(event) => setNameBn(event.target.value)} maxLength={120} lang="bn" />
          </Field>
          <Field label={t("ledger:cashFlow")} hint={t("ledger:cashFlowHint")}>
            <Select value={flow} onChange={(event) => setFlow(event.target.value as (typeof FLOWS)[number])}>
              {FLOWS.map((value) => (
                <option key={value} value={value}>
                  {t(`ledger:flow_${value}`)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose}>
              {t("common:cancel")}
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {t("ledger:newAccount")}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
};
