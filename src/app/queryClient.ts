import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // A refusal won't change by asking again. A dropped connection might.
      retry: (failures, error) => !(error instanceof ApiError && error.status < 500) && failures < 2,
      refetchOnWindowFocus: false,
    },
  },
});

// What anyone may see, signed in or not: the plans, the free trial and the announcement.
const PUBLIC = new Set(["plans", "signup-info", "announcement"]);

// On signing out, forgets everything that belonged to the person, and keeps what is public. Clearing it
// all would also drop a public page's request still on its way, and leave that page loading for ever.
export const forgetPrivateData = () => queryClient.removeQueries({ predicate: (query) => !PUBLIC.has(String(query.queryKey[0])) });
