import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useMoney } from "@/features/businesses/useMoney";
import { cn } from "@/lib/cn";
import { fromBanglaDigits } from "@/lib/money";
import { AGING_BUCKETS, type AgingBucket, type InvoiceKind, type InvoiceStatus } from "./api";

// Invoices live at /invoices and bills at /bills; everything else about them is shared.
export const KIND_PATH: Record<InvoiceKind, string> = { SALE: "invoices", BILL: "bills" };

export const StatusBadge = ({ status, overdue }: { status: InvoiceStatus; overdue?: boolean }) => {
  const { t } = useTranslation("invoices");
  if (overdue) return <Badge className="bg-foreground text-background">{t("overdue")}</Badge>;
  const style: Record<InvoiceStatus, string> = {
    DRAFT: "border border-dashed bg-transparent",
    ISSUED: "border bg-transparent text-foreground",
    PARTIALLY_PAID: "border bg-transparent text-foreground",
    PAID: "bg-muted text-foreground",
    VOID: "bg-transparent line-through",
  };
  return <Badge className={style[status]}>{t(`status_${status}`)}</Badge>;
};

export const Stat = ({ label, value, note, testId }: { label: string; value: string; note?: string; testId?: string }) => (
  <Card>
    <CardContent>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums" data-testid={testId}>
        {value}
      </p>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
    </CardContent>
  </Card>
);

// quantity × unit price in paisa, rounded half up, the same sum the server does.
// Null while either box doesn't hold a number yet.
export const lineAmount = (quantity: string, unitPriceMinor: string | null) => {
  const match = /^(\d{1,9})(?:\.(\d{1,3}))?$/.exec(fromBanglaDigits(quantity.trim()));
  if (!match || unitPriceMinor === null) return null;
  const milli = BigInt(match[1]!) * 1000n + BigInt((match[2] ?? "").padEnd(3, "0"));
  return (milli * BigInt(unitPriceMinor) + 500n) / 1000n;
};

// Older debts get darker shades, so the part that needs chasing stands out. The amounts are
// written out beside it, so nothing depends on telling greys apart.
const SHADE: Record<AgingBucket, string> = {
  current: "var(--chart-5)",
  days1to30: "var(--chart-4)",
  days31to60: "var(--chart-3)",
  days61to90: "var(--chart-2)",
  over90: "var(--chart-1)",
};

export const AgingBar = ({ amounts, currency }: { amounts: Record<AgingBucket, string>; currency: string }) => {
  const { t } = useTranslation("invoices");
  const money = useMoney();
  const [active, setActive] = useState<AgingBucket | null>(null);
  const total = AGING_BUCKETS.reduce((sum, bucket) => sum + Number(amounts[bucket]), 0);
  return (
    <div className="space-y-4">
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label={t("agingChart")}>
        {total > 0 ? (
          AGING_BUCKETS.filter((bucket) => amounts[bucket] !== "0").map((bucket) => (
            <div
              key={bucket}
              className={cn("h-full transition-opacity first:rounded-l-full last:rounded-r-full", active && active !== bucket && "opacity-30")}
              style={{ width: `${(Number(amounts[bucket]) / total) * 100}%`, background: SHADE[bucket] }}
              onPointerEnter={() => setActive(bucket)}
              onPointerLeave={() => setActive(null)}
              title={`${t(`bucket_${bucket}`)}: ${money(amounts[bucket], currency)}`}
            />
          ))
        ) : (
          <div className="h-full w-full bg-chart-track" />
        )}
      </div>
      <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-5">
        {AGING_BUCKETS.map((bucket) => (
          <li
            key={bucket}
            onPointerEnter={() => setActive(bucket)}
            onPointerLeave={() => setActive(null)}
            className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors lg:flex-col lg:items-start lg:gap-0.5", active === bucket && "bg-muted")}
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="size-2.5 shrink-0 rounded-full ring-1 ring-border" style={{ background: SHADE[bucket] }} />
              {t(`bucket_${bucket}`)}
            </span>
            <span className="ml-auto font-medium tabular-nums lg:ml-0" data-testid={`aging-${bucket}`}>
              {money(amounts[bucket], currency)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
