import i18n from "@/i18n";
import { ApiError } from "./api";

// The words for an API error, in the reader's language. The backend only ever sends a code.
export const errorMessage = (error: unknown) => {
  if (!(error instanceof ApiError)) return i18n.t("errors:NETWORK_ERROR");
  const values = { ...error.params, minutes: Math.ceil(Number(error.params.retryAfterSeconds ?? 60) / 60) };
  return i18n.t(`errors:${error.code}`, { ...values, defaultValue: i18n.t("errors:UNKNOWN") });
};
