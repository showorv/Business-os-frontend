import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Modal, ModalContent } from "@/components/ui/sheet";
import { useCreateBudget, type BudgetSummary } from "@/features/analytics/api";
import { useCategories } from "@/features/finance/api";
import { categoryName } from "@/features/finance/names";
import { currentLocale } from "@/i18n";
import { errorMessage } from "@/lib/errors";
import { parseMoney } from "@/lib/money";

interface BudgetDialogProps {
  businessId: string;
  currency: string;
  // Suggested months: normally the rest of this financial year.
  startMonth: string;
  endMonth: string;
  onClose: () => void;
  onCreated: (budget: BudgetSummary) => void;
}

// A budget is a name, a run of months, and an amount for each expense category to watch. Categories
// left empty aren't part of it.
export const BudgetDialog = ({ businessId, currency, startMonth, endMonth, onClose, onCreated }: BudgetDialogProps) => {
  const { t } = useTranslation(["budgets", "common", "validation"]);
  const categories = useCategories(businessId);
  const create = useCreateBudget(businessId);
  const [name, setName] = useState("");
  const [from, setFrom] = useState(startMonth);
  const [to, setTo] = useState(endMonth);
  const [alertPercent, setAlertPercent] = useState("80");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const locale = currentLocale();
  const expenseCategories = (categories.data ?? [])
    .filter((category) => category.type === "EXPENSE" && category.isActive)
    .sort((a, b) => categoryName(a, locale).localeCompare(categoryName(b, locale)));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setProblem(t("budgets:nameNeeded"));
    if (!from || !to || from > to) return setProblem(t("budgets:monthsWrong"));
    const percent = Number(alertPercent);
    if (!Number.isInteger(percent) || percent < 1 || percent > 100) return setProblem(t("budgets:alertWrong"));
    const lines = [];
    for (const category of expenseCategories) {
      const text = amounts[category.id]?.trim();
      if (!text) continue;
      const amountMinor = parseMoney(text, currency);
      if (amountMinor === null || amountMinor === "0") return setProblem(t("budgets:amountWrong", { name: categoryName(category, locale) }));
      lines.push({ categoryId: category.id, amountMinor, alertPercent: percent });
    }
    if (lines.length === 0) return setProblem(t("budgets:linesNeeded"));
    setProblem(null);
    create.mutate(
      { name: name.trim(), startMonth: from, endMonth: to, lines },
      {
        onSuccess: (budget) => {
          toast.success(t("budgets:created"));
          onCreated(budget);
        },
      },
    );
  };

  return (
    <Modal open onOpenChange={(open) => !open && onClose()}>
      <ModalContent title={t("budgets:newBudget")} description={t("budgets:newBudgetHint")} className="max-w-xl">
        <form onSubmit={submit} className="space-y-4" noValidate>
          {problem ? <Alert tone="danger">{problem}</Alert> : null}
          {create.isError ? <Alert tone="danger">{errorMessage(create.error)}</Alert> : null}
          <Field label={t("budgets:name")}>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("budgets:namePlaceholder")} maxLength={120} autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("budgets:fromMonth")}>
              <Input type="month" value={from} onChange={(event) => setFrom(event.target.value)} />
            </Field>
            <Field label={t("budgets:toMonth")}>
              <Input type="month" value={to} onChange={(event) => setTo(event.target.value)} />
            </Field>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">{t("budgets:limits")}</p>
            <p className="mb-2 text-sm text-muted-foreground">{t("budgets:limitsHint")}</p>
            <ul className="max-h-64 divide-y overflow-y-auto rounded-md border">
              {expenseCategories.map((category) => (
                <li key={category.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm">{categoryName(category, locale)}</span>
                  <MoneyInput
                    currency={currency}
                    placeholder="—"
                    aria-label={t("budgets:limitFor", { name: categoryName(category, locale) })}
                    value={amounts[category.id] ?? ""}
                    onChange={(event) => setAmounts((current) => ({ ...current, [category.id]: event.target.value }))}
                    className="h-9 w-40"
                  />
                </li>
              ))}
            </ul>
          </div>
          <Field label={t("budgets:alertAt")} hint={t("budgets:alertAtHint")}>
            <Input type="number" min={1} max={100} value={alertPercent} onChange={(event) => setAlertPercent(event.target.value)} className="w-28" />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose}>
              {t("common:cancel")}
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {t("budgets:create")}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
};
