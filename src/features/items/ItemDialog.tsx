import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Modal, ModalContent } from "@/components/ui/sheet";
import { useCategories } from "@/features/finance/api";
import { categoryName } from "@/features/finance/names";
import { rateLabel, VAT_RATES } from "@/features/invoices/vat";
import { currentLocale } from "@/i18n";
import { errorMessage } from "@/lib/errors";
import { minorToInput, parseMoney } from "@/lib/money";
import { useCreateItem, useUpdateItem, type Item } from "./api";

interface ItemDialogProps {
  businessId: string;
  currency: string;
  // An item to edit. Without one, the dialog adds a new one.
  item?: Item;
  // The VAT rate a new item starts with.
  defaultVatRateBp: number;
  onClose: () => void;
}

const TEXT = ["name", "code", "unit", "description"] as const;
const UNITS = ["pcs", "kg", "g", "litre", "metre", "gaj", "box", "dozen", "hour", "day", "month"];

export const ItemDialog = ({ businessId, currency, item, defaultVatRateBp, onClose }: ItemDialogProps) => {
  const { t } = useTranslation(["items", "common", "invoices"]);
  const categories = useCategories(businessId);
  const create = useCreateItem(businessId);
  const update = useUpdateItem(businessId);
  const [draft, setDraft] = useState({
    ...(Object.fromEntries(TEXT.map((field) => [field, item?.[field] ?? ""])) as Record<(typeof TEXT)[number], string>),
    salePrice: item?.salePriceMinor ? minorToInput(item.salePriceMinor, currency) : "",
    purchasePrice: item?.purchasePriceMinor ? minorToInput(item.purchasePriceMinor, currency) : "",
    vatRate: String(item?.vatRateBp ?? defaultVatRateBp),
    incomeCategoryId: item?.incomeCategoryId ?? "",
    expenseCategoryId: item?.expenseCategoryId ?? "",
  });
  const [tried, setTried] = useState(false);
  type Key = keyof typeof draft;
  const set = (field: Key, value: string) => setDraft((current) => ({ ...current, [field]: value }));
  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  // An empty price box means "not sold" or "not bought"; anything else must be an amount.
  const price = (text: string) => (text.trim() ? parseMoney(text, currency) : null);
  const badSale = draft.salePrice.trim() !== "" && price(draft.salePrice) === null;
  const badPurchase = draft.purchasePrice.trim() !== "" && price(draft.purchasePrice) === null;
  const usable = (type: "INCOME" | "EXPENSE", current: string) => (categories.data ?? []).filter((category) => category.type === type && (category.isActive || category.id === current));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (!draft.name.trim() || badSale || badPurchase) return;
    const body = {
      name: draft.name.trim(),
      code: draft.code.trim() || null,
      unit: draft.unit.trim() || null,
      description: draft.description.trim() || null,
      salePriceMinor: price(draft.salePrice),
      purchasePriceMinor: price(draft.purchasePrice),
      vatRateBp: Number(draft.vatRate),
      incomeCategoryId: draft.incomeCategoryId || null,
      expenseCategoryId: draft.expenseCategoryId || null,
    };
    if (item) {
      update.mutate({ itemId: item.id, ...body }, { onSuccess: () => (toast.success(t("common:saved")), onClose()) });
    } else {
      const filled = Object.fromEntries(Object.entries(body).filter(([, value]) => value !== null)) as typeof body;
      create.mutate(filled, { onSuccess: (created) => (toast.success(t("added", { name: created.name })), onClose()) });
    }
  };

  const archive = (isActive: boolean) =>
    update.mutate({ itemId: item!.id, isActive }, { onSuccess: () => (toast.success(isActive ? t("restored") : t("archivedToast")), onClose()) });

  const optional = (key: string) => `${t(key)} (${t("common:optional")})`;

  return (
    <Modal open onOpenChange={(open) => !open && onClose()}>
      <ModalContent title={item ? t("edit") : t("add")} className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <form onSubmit={submit} className="space-y-4" data-testid="item-form" noValidate>
          {error ? <Alert tone="danger">{errorMessage(error)}</Alert> : null}
          <Field label={t("name")} hint={t("nameHint")} error={tried && !draft.name.trim() ? t("needName") : undefined}>
            <Input autoFocus maxLength={120} value={draft.name} onChange={(event) => set("name", event.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={optional("unit")} hint={t("unitHint")}>
              <Input maxLength={20} list="item-units" value={draft.unit} onChange={(event) => set("unit", event.target.value)} />
            </Field>
            <Field label={optional("code")}>
              <Input maxLength={40} value={draft.code} onChange={(event) => set("code", event.target.value)} />
            </Field>
          </div>
          <datalist id="item-units">
            {UNITS.map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={optional("salePrice")} hint={t("salePriceHint")} error={tried && badSale ? t("invoices:needPrice") : undefined}>
              <MoneyInput currency={currency} value={draft.salePrice} onChange={(event) => set("salePrice", event.target.value)} />
            </Field>
            <Field label={optional("purchasePrice")} hint={t("purchasePriceHint")} error={tried && badPurchase ? t("invoices:needPrice") : undefined}>
              <MoneyInput currency={currency} value={draft.purchasePrice} onChange={(event) => set("purchasePrice", event.target.value)} />
            </Field>
          </div>
          <Field label={t("invoices:vatRate")} hint={t("vatHint")}>
            <Select value={draft.vatRate} onChange={(event) => set("vatRate", event.target.value)}>
              {VAT_RATES.map((rate) => (
                <option key={rate} value={String(rate)}>
                  {rateLabel(rate)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={optional("incomeCategory")}>
              <Select value={draft.incomeCategoryId} onChange={(event) => set("incomeCategoryId", event.target.value)}>
                <option value="">{t("invoices:choose")}</option>
                {usable("INCOME", draft.incomeCategoryId).map((category) => (
                  <option key={category.id} value={category.id}>
                    {categoryName(category, currentLocale())}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={optional("expenseCategory")}>
              <Select value={draft.expenseCategoryId} onChange={(event) => set("expenseCategoryId", event.target.value)}>
                <option value="">{t("invoices:choose")}</option>
                {usable("EXPENSE", draft.expenseCategoryId).map((category) => (
                  <option key={category.id} value={category.id}>
                    {categoryName(category, currentLocale())}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={optional("description")}>
            <Input maxLength={300} value={draft.description} onChange={(event) => set("description", event.target.value)} />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            {item ? (
              <Button type="button" variant="ghost" className="sm:mr-auto" disabled={pending} onClick={() => archive(!item.isActive)}>
                {item.isActive ? t("archive") : t("restore")}
              </Button>
            ) : null}
            <div className="flex flex-col-reverse gap-2 sm:ml-auto sm:flex-row">
              <Button type="button" variant="outline" onClick={onClose}>
                {t("common:cancel")}
              </Button>
              <Button type="submit" disabled={pending}>
                {item ? t("common:save") : t("add")}
              </Button>
            </div>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
};
