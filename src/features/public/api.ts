import { api } from "@/lib/api";
import { queryKeys, useApiQuery } from "@/lib/query";

// The free trial a new sign-up gets, and whether sign-ups are open. Set by the platform admin.
export const useSignupInfo = () => useApiQuery(queryKeys.signupInfo, () => api.GET("/api/v1/platform/signup"), { staleTime: 5 * 60_000 });
