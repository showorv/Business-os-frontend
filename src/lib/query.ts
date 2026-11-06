import { useMutation, useQuery, useQueryClient, type QueryKey, type UseQueryOptions } from "@tanstack/react-query";
import { unwrap, type ApiCall } from "./api";

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
} as const satisfies Record<string, QueryKey | ((...ids: string[]) => QueryKey)>;

type QueryExtras<T> = Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">;

// Loads data from one API call and keeps it cached under `key`.
//   useApiQuery(queryKeys.businesses, () => api.GET("/api/v1/businesses"))
export const useApiQuery = <T>(key: QueryKey, request: () => ApiCall<T>, extras?: QueryExtras<T>) =>
  useQuery({ queryKey: key, queryFn: () => unwrap(request()), ...extras });

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
