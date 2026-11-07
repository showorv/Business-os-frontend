import i18n from "@/i18n";
import { ApiError } from "./api";

// The words for an API error, in the reader's language. The backend only ever sends a code.
export const errorMessage = (error: unknown) => {
  if (!(error instanceof ApiError)) return i18n.t("errors:NETWORK_ERROR");
  const values = { ...error.params, minutes: Math.ceil(Number(error.params.retryAfterSeconds ?? 60) / 60) };
  // One code, a sentence per limit: "Free allows 1 business", "...3 people", "...500 MB".
  // A coupon says why it can't be used: expired, used up, for another plan...
  const code =
    error.code === "PLAN_LIMIT" && typeof error.params.limit === "string"
      ? `PLAN_LIMIT_${error.params.limit}`
      : error.code === "COUPON_INVALID" && typeof error.params.reason === "string"
        ? `COUPON_INVALID_${error.params.reason}`
        : error.code;
  return i18n.t(`errors:${code}`, { ...values, count: Number(error.params.max ?? 0), defaultValue: i18n.t("errors:UNKNOWN") });
};
