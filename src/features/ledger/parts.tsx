import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import type { Locale } from "@/i18n";
import { cn } from "@/lib/cn";
import { LEDGER_TYPES, type JournalKind, type LedgerAccount, type LedgerType } from "./api";

// An account's name in the reader's language: the Bangla name when there is one and Bangla is on.
export const ledgerName = (account: { name: string; nameBn: string | null } | undefined, locale: Locale) =>
  account ? (locale === "bn-BD" && account.nameBn ? account.nameBn : account.name) : "";

// The first digit of a code says its kind; new accounts are suggested inside that block.
const BLOCK: Record<LedgerType, number> = { ASSET: 1000, LIABILITY: 2000, EQUITY: 3000, REVENUE: 4000, EXPENSE: 6000 };

// The next round number after the highest code of this kind, or the first free one if the block is full.
export const suggestCode = (accounts: LedgerAccount[], type: LedgerType) => {
  const start = BLOCK[type];
  const end = type === "EXPENSE" ? 7999 : start + 999;
  const used = new Set(accounts.map((account) => account.code));
  const inBlock = accounts.map((account) => Number(account.code)).filter((code) => code >= start && code <= end && code < 7000);
  const highest = inBlock.length > 0 ? Math.max(...inBlock) : start;
  for (let code = Math.ceil((highest + 1) / 10) * 10; code <= end; code += 10) if (!used.has(String(code))) return String(code);
  for (let code = start; code <= end; code++) if (!used.has(String(code))) return String(code);
  return "";
};

// Manual and adjusting entries look the same as the rest; system-made kinds get an outline so they read as "automatic".
export const KindBadge = ({ kind, className }: { kind: JournalKind; className?: string }) => {
  const { t } = useTranslation("ledger");
  const automatic = kind === "OPENING" || kind === "CLOSING" || kind === "REVERSAL";
  return <Badge className={cn(automatic && "border border-border bg-transparent", className)}>{t(`kind_${kind}`)}</Badge>;
};

// A select of every usable account, grouped by kind and ordered by code.
export const AccountSelect = ({
  accounts,
  value,
  onChange,
  locale,
  placeholder,
  includeHidden = false,
  className,
  ...rest
}: {
  accounts: LedgerAccount[];
  value: string;
  onChange: (value: string) => void;
  locale: Locale;
  placeholder: string;
  includeHidden?: boolean;
  className?: string;
  "aria-label"?: string;
  id?: string;
}) => {
  const { t } = useTranslation("ledger");
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)} className={className} {...rest}>
      <option value="">{placeholder}</option>
      {LEDGER_TYPES.map((type) => {
        const group = accounts.filter((account) => account.type === type && (includeHidden || account.isActive));
        if (group.length === 0) return null;
        return (
          <optgroup key={type} label={t(`type_${type}`)}>
            {group.map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} · {ledgerName(account, locale)}
              </option>
            ))}
          </optgroup>
        );
      })}
    </Select>
  );
};

// Pill tabs, the same look as the reports page.
export const PillTabs = <T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) => (
  <div role="tablist" aria-label={label} className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        role="tab"
        aria-selected={value === option.value}
        onClick={() => onChange(option.value)}
        className={cn(
          "rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
          value === option.value ? "border-foreground bg-foreground text-background" : "hover:bg-muted",
        )}
      >
        {option.label}
      </button>
    ))}
  </div>
);
