import { Eye, EyeOff, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { currentLocale } from "@/i18n";
import { errorMessage } from "@/lib/errors";
import { useCategories, useCreateCategory, useUpdateCategory, type Category } from "../api";
import { categoryName } from "../names";

type CategoryType = "INCOME" | "EXPENSE";

// What money comes in for and goes out on. Each business starts with a set for its type; more can be
// added. A category is hidden rather than deleted, because past transactions still use it.
export const CategoriesCard = ({ businessId, canWrite }: { businessId: string; canWrite: boolean }) => {
  const { t } = useTranslation("finance");
  const categories = useCategories(businessId);
  const list = categories.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("categories")}</CardTitle>
        <CardDescription>{t("categoriesHint")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        {categories.isLoading ? <Spinner /> : null}
        {categories.isError ? <Alert tone="danger">{errorMessage(categories.error)}</Alert> : null}
        {categories.isSuccess
          ? (["INCOME", "EXPENSE"] as const).map((type) => (
              <CategoryColumn key={type} businessId={businessId} type={type} categories={list.filter((item) => item.type === type)} canWrite={canWrite} />
            ))
          : null}
      </CardContent>
    </Card>
  );
};

const CategoryColumn = ({ businessId, type, categories, canWrite }: { businessId: string; type: CategoryType; categories: Category[]; canWrite: boolean }) => {
  const { t } = useTranslation("finance");
  const locale = currentLocale();
  const create = useCreateCategory(businessId);
  const update = useUpdateCategory(businessId);
  const [name, setName] = useState("");
  const sorted = [...categories].sort((a, b) => Number(b.isActive) - Number(a.isActive) || categoryName(a, locale).localeCompare(categoryName(b, locale)));

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    create.mutate({ type, name: name.trim() }, { onSuccess: () => setName("") });
  };

  const toggle = (category: Category) =>
    update.mutate({ categoryId: category.id, isActive: !category.isActive }, { onError: (error) => toast.error(errorMessage(error)) });

  return (
    <section aria-labelledby={`categories-${type}`}>
      <h3 id={`categories-${type}`} className="mb-2 text-sm font-semibold">
        {t(`categoryType_${type}`)}
      </h3>
      <ul className="divide-y rounded-md border">
        {sorted.map((category) => (
          <li key={category.id} className="flex items-center gap-2 px-3 py-2 text-sm">
            <span className={`min-w-0 flex-1 truncate ${category.isActive ? "" : "text-muted-foreground line-through"}`}>{categoryName(category, locale)}</span>
            {!category.isActive ? <Badge>{t("hidden")}</Badge> : null}
            {canWrite ? (
              <Button
                variant="ghost"
                size="sm"
                className="size-8 px-0"
                onClick={() => toggle(category)}
                aria-label={category.isActive ? t("hideCategory", { name: categoryName(category, locale) }) : t("showCategory", { name: categoryName(category, locale) })}
              >
                {category.isActive ? <EyeOff /> : <Eye />}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {canWrite ? (
        <form onSubmit={add} className="mt-2 flex gap-2">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("newCategory")} aria-label={t(`newCategoryFor_${type}`)} maxLength={120} />
          <Button type="submit" variant="outline" size="icon" className="shrink-0" disabled={create.isPending || !name.trim()} aria-label={t(`addCategoryFor_${type}`)}>
            <Plus />
          </Button>
        </form>
      ) : null}
      {create.isError ? (
        <Alert tone="danger" className="mt-2">
          {errorMessage(create.error)}
        </Alert>
      ) : null}
    </section>
  );
};
