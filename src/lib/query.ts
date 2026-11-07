import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryKey, type UseQueryOptions } from "@tanstack/react-query";
import { useCallback } from "react";
import { unwrap, unwrapPage, type ApiCall, type PagedCall } from "./api";

// The one place TanStack Query is wired up. Feature files describe *what* to load or send, and
// these helpers handle unwrapping the response, errors and refreshing the lists that changed.

// Every cached list has its name here, so a screen that changes data can say which lists to reload.
// Keys inside one business start with ["businesses", id], so reloading ["businesses"] reloads them all.
export const queryKeys = {
  sessions: ["sessions"],
  roles: ["roles"],
  businesses: ["businesses"],
  business: (businessId: string) => ["businesses", businessId],
  members: (businessId: string) => ["businesses", businessId, "members"],
  invitations: (businessId: string) => ["businesses", businessId, "invitations"],
  accounts: (businessId: string) => ["businesses", businessId, "accounts"],
  categories: (businessId: string) => ["businesses", businessId, "categories"],
  // Every transaction list and transaction in a business, whatever the filters.
  transactions: (businessId: string) => ["businesses", businessId, "transactions"],
  transactionList: (businessId: string, filters: string) => ["businesses", businessId, "transactions", "list", filters],
  transaction: (businessId: string, transactionId: string) => ["businesses", businessId, "transactions", transactionId],
  // Everything worked out from the books: dashboard, reports, budgets, goals. Posting money reloads all of it.
  figures: (businessId: string) => ["businesses", businessId, "figures"],
  figure: (businessId: string, name: string, params = "") => ["businesses", businessId, "figures", name, params],
  exports: (businessId: string) => ["businesses", businessId, "exports"],
  // The books underneath: chart of accounts, journals, months and reconciliations. Posting money reloads it.
  ledger: (businessId: string) => ["businesses", businessId, "ledger"],
  ledgerItem: (businessId: string, name: string, params = "") => ["businesses", businessId, "ledger", name, params],
  // Tasks, reminders and the calendar.
  tasks: (businessId: string) => ["businesses", businessId, "tasks"],
  taskItem: (businessId: string, name: string, params = "") => ["businesses", businessId, "tasks", name, params],
  // Repeating transactions and salaries.
  schedules: (businessId: string) => ["businesses", businessId, "schedules"],
  scheduleItem: (businessId: string, name: string, params = "") => ["businesses", businessId, "schedules", name, params],
  // This person's notifications, across every business.
  notifications: ["notifications"],
  notificationItem: (name: string, params = "") => ["notifications", name, params],
  // Bank statements: imports, the review inbox, rules and saved file formats.
  statements: (businessId: string) => ["businesses", businessId, "statements"],
  statementItem: (businessId: string, name: string, params = "") => ["businesses", businessId, "statements", name, params],
  // The all-businesses view, across every business this person can read.
  consolidated: (params = "") => ["consolidated", params],
} as const satisfies Record<string, QueryKey | ((...ids: string[]) => QueryKey)>;

type QueryExtras<T> = Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">;

// Loads data from one API call and keeps it cached under `key`.
//   useApiQuery(queryKeys.businesses, () => api.GET("/api/v1/businesses"))
export const useApiQuery = <T>(key: QueryKey, request: () => ApiCall<T>, extras?: QueryExtras<T>) =>
  useQuery({ queryKey: key, queryFn: () => unwrap(request()), ...extras });

// A long list loaded a page at a time. `data` is every row loaded so far; `fetchNextPage()` loads more
// and `hasNextPage` says whether there is more.
//   useApiPages(queryKeys.transactions(id, filters), (cursor) => api.GET(".../transactions", { params: { query: { cursor } } }))
export const useApiPages = <T>(key: QueryKey, request: (cursor: string | undefined) => PagedCall<T>) =>
  useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => unwrapPage(request(pageParam)),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    select: (data) => data.pages.flatMap((page) => page.items),
  });

interface ActionOptions<TInput, TResult> {
  // Lists to reload once the action succeeds, e.g. [queryKeys.businesses].
  invalidates?: QueryKey[];
  onSuccess?: (result: TResult, input: TInput) => unknown;
  // Runs whether the action worked or not, e.g. signing out locally even if the server is unreachable.
  onSettled?: () => unknown;
}

// Any action that changes something: a form submit, a button press. `run` does the work.
export const useAction = <TInput = void, TResult = unknown>(run: (input: TInput) => Promise<TResult>, options: ActionOptions<TInput, TResult> = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: async (result, input) => {
      await options.onSuccess?.(result, input);
      await Promise.all((options.invalidates ?? []).map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
    onSettled: options.onSettled,
  });
};

// The common case: an action that is exactly one API call.
//   useApiMutation((body: NewBusiness) => api.POST("/api/v1/businesses", { body }), { invalidates: [queryKeys.businesses] })
export const useApiMutation = <TInput = void, TResult = unknown>(request: (input: TInput) => ApiCall<TResult>, options?: ActionOptions<TInput, TResult>) =>
  useAction((input: TInput) => unwrap(request(input)), options);

// Marks cached data as stale so screens showing it load it again, for changes that arrive from
// outside a mutation (for example a live notification).
//   const reload = useReload(); reload(queryKeys.notifications)
export const useReload = () => {
  const queryClient = useQueryClient();
  return useCallback((queryKey: QueryKey) => queryClient.invalidateQueries({ queryKey }), [queryClient]);
};
