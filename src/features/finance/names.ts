import type { Locale } from "@/i18n";
import type { Category } from "./api";

// A category's name in the reader's language: the Bangla name when there is one and Bangla is on.
export const categoryName = (category: Pick<Category, "name" | "nameBn"> | undefined, locale: Locale) =>
  category ? (locale === "bn-BD" && category.nameBn ? category.nameBn : category.name) : "";
