import type { paths } from "@/api/schema";
import { api, unwrap } from "@/lib/api";
import type { Data } from "@/lib/api-types";
import { queryKeys, useAction, useApiPages, useApiQuery } from "@/lib/query";

type Get<P extends keyof paths> = paths[P] extends { get: { responses: { 200: infer R } } } ? Data<R> : never;
type Post<P extends keyof paths> = paths[P] extends { post: { responses: { 200: infer R } } } ? Data<R> : never;

export type AiStatus = Get<"/api/v1/ai/status">;
export type Conversation = Get<"/api/v1/ai/conversations">["items"][number];
export type ConversationDetail = Get<"/api/v1/ai/conversations/{conversationId}">;
export type Message = ConversationDetail["messages"][number];
export type Source = Message["sources"][number];
export type Answer = Post<"/api/v1/ai/chat">;
export type Proposal = Answer["proposals"][number];

export const useAiStatus = () => useApiQuery(queryKeys.assistantItem("status"), () => api.GET("/api/v1/ai/status"), { staleTime: 30_000 });

export const useConversations = () =>
  useApiPages(queryKeys.assistantItem("conversations"), (cursor) => api.GET("/api/v1/ai/conversations", { params: { query: { cursor, limit: 30 } } }));

export const useConversation = (conversationId: string | null) =>
  useApiQuery(
    queryKeys.assistantItem("conversation", conversationId ?? ""),
    () => api.GET("/api/v1/ai/conversations/{conversationId}", { params: { path: { conversationId: conversationId! } } }),
    { enabled: Boolean(conversationId) },
  );

// Every suggestion the assistant made, so a card in an old conversation still shows whether it was confirmed.
export const useProposals = () =>
  useApiPages(queryKeys.assistantItem("proposals"), (cursor) => api.GET("/api/v1/ai/proposals", { params: { query: { cursor, limit: 100 } } }));

export const useAsk = () =>
  useAction(
    ({ message, conversationId, businessId }: { message: string; conversationId: string | null; businessId: string | null }) =>
      unwrap(api.POST("/api/v1/ai/chat", { body: { message, ...(conversationId ? { conversationId } : {}), ...(businessId ? { businessId } : {}) } })),
    { invalidates: [queryKeys.assistant] },
  );

// Confirming writes the task or transaction, so those screens load again too.
export const useDecideProposal = () =>
  useAction(
    async ({ proposal, accept, postNow = false }: { proposal: Proposal; accept: boolean; postNow?: boolean }) => {
      const params = { params: { path: { proposalId: proposal.id } } };
      if (accept) return unwrap(api.POST("/api/v1/ai/proposals/{proposalId}/confirm", { ...params, body: { postNow } }));
      return unwrap(api.POST("/api/v1/ai/proposals/{proposalId}/reject", params));
    },
    { invalidates: [queryKeys.assistant] },
  );
