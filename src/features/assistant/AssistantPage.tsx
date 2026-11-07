import { Bot, MessageSquare, PanelLeft, PauseCircle, Plus, SendHorizontal } from "lucide-react";
import { Dialog } from "radix-ui";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { useAccess } from "@/features/businesses/api";
import { UpgradePrompt } from "@/features/billing/parts";
import { useCurrentBusiness } from "@/features/businesses/useCurrentBusiness";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { Permission } from "@/lib/permissions";
import { useFormatting } from "@/lib/preferences";
import { useAiStatus, useAsk, useConversation, useConversations, useProposals, type Conversation, type Message, type Proposal } from "./api";
import { AssistantAvatar, EmptyChat, GuardNote, MessageText, ProposalCard, Sources, TypingDots } from "./parts";

type Scope = "business" | "all";

// Questions about the money and work in your businesses, answered from the books, with sources.
// It can also draft a task or a transaction, which only happens once you confirm the card.
export const AssistantPage = () => {
  const { t } = useTranslation(["assistant", "shell"]);
  const businessId = useParams().businessId!;
  const access = useAccess(businessId);
  const status = useAiStatus();
  const { businesses } = useCurrentBusiness();
  const [params, setParams] = useSearchParams();
  const conversationId = params.get("c");
  const [scope, setScope] = useState<Scope>("business");
  const [chatsOpen, setChatsOpen] = useState(false);

  const open = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set("c", id);
    else next.delete("c");
    setParams(next, { replace: !id });
    setChatsOpen(false);
  };

  if (access.isLoading || status.isLoading) return <Spinner className="mt-16" />;
  if (!access.can(Permission.AI_USE))
    return (
      <Card>
        <EmptyState icon={Bot} title={t("noAccess")} body={t("noAccessHint")} />
      </Card>
    );
  // The assistant comes with the plan of the workspace that owns this business.
  if (access.plan && !access.plan.aiEnabled)
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("shell:assistant")}</h1>
        <UpgradePrompt title={t("planTitle")} body={t("planBody")} />
      </div>
    );
  if (status.data && !status.data.configured)
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("shell:assistant")}</h1>
        <Card>
          <EmptyState icon={Bot} title={t("notConfigured")} body={t("notConfiguredHint")} />
        </Card>
      </div>
    );

  // A platform admin can pause the assistant for everyone, for example while the AI service has trouble.
  if (status.data?.paused)
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("shell:assistant")}</h1>
        <Card data-testid="assistant-paused">
          <EmptyState icon={PauseCircle} title={t("pausedTitle")} body={t("pausedHint")} />
        </Card>
      </div>
    );

  const list = <ConversationList activeId={conversationId} onOpen={open} />;

  return (
    // The shell's header is 4rem, and its page padding is taken back so the chat fills the screen.
    <div className="-mx-4 -my-6 flex h-[calc(100dvh-4rem)] sm:-mx-6 lg:-my-8">
      <aside className="hidden w-72 shrink-0 flex-col border-r lg:flex">{list}</aside>
      <Dialog.Root open={chatsOpen} onOpenChange={setChatsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay" />
          <Dialog.Content className="animate-chart-fade fixed inset-y-0 left-0 z-50 flex w-80 max-w-[85vw] flex-col bg-surface shadow-xl outline-none">
            <Dialog.Title className="sr-only">{t("chats")}</Dialog.Title>
            <Dialog.Description className="sr-only">{t("chats")}</Dialog.Description>
            {list}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b px-4 py-3 sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("chats")} onClick={() => setChatsOpen(true)}>
            <PanelLeft />
          </Button>
          <h1 className="mr-auto text-lg font-semibold tracking-tight">{t("shell:assistant")}</h1>
          {businesses.length > 1 ? (
            <Segmented
              label={t("scope")}
              value={scope}
              onChange={setScope}
              options={[
                { value: "business", label: t("scopeBusiness") },
                { value: "all", label: t("scopeAll") },
              ]}
            />
          ) : null}
          {status.data ? <Allowance used={status.data.tokensUsedToday} limit={status.data.dailyTokenLimit} /> : null}
        </header>
        <Thread key={conversationId ?? "new"} businessId={businessId} conversationId={conversationId} scopeBusinessId={scope === "business" ? businessId : null} onStarted={open} />
      </section>
    </div>
  );
};

// How much of today's allowance has gone, as a thin bar.
const Allowance = ({ used, limit }: { used: number; limit: number }) => {
  const { t } = useTranslation("assistant");
  const { locale } = useFormatting();
  const share = limit > 0 ? Math.min(1, used / limit) : 0;
  const left = Math.round((1 - share) * 100);
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground" title={t("allowanceDetail", { used: used.toLocaleString(locale), limit: limit.toLocaleString(locale) })}>
      <span className="hidden sm:inline">{t("allowance")}</span>
      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted" role="meter" aria-label={t("allowance")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={left}>
        <span className={cn("block h-full rounded-full", share > 0.9 ? "bg-danger" : "bg-foreground")} style={{ width: `${Math.max(2, (1 - share) * 100)}%` }} />
      </span>
      <span className="tabular-nums">{t("percentLeft", { n: left.toLocaleString(locale) })}</span>
    </div>
  );
};

const ConversationList = ({ activeId, onOpen }: { activeId: string | null; onOpen: (id: string | null) => void }) => {
  const { t } = useTranslation("assistant");
  const { locale, digitStyle } = useFormatting();
  const conversations = useConversations();
  const [now] = useState(() => Date.now());
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="p-3">
        <Button variant="outline" className="w-full justify-start" onClick={() => onOpen(null)}>
          <Plus />
          {t("newChat")}
        </Button>
      </div>
      <p className="px-4 pt-1 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("recent")}</p>
      <nav aria-label={t("chats")} className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {conversations.isLoading ? <Spinner className="mt-6" /> : null}
        {conversations.isSuccess && conversations.data.length === 0 ? <p className="px-2 py-4 text-sm text-muted-foreground">{t("noChats")}</p> : null}
        <ul className="space-y-0.5">
          {(conversations.data ?? []).map((conversation: Conversation) => (
            <li key={conversation.id}>
              <button
                type="button"
                onClick={() => onOpen(conversation.id)}
                aria-current={conversation.id === activeId ? "page" : undefined}
                className={cn("flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors", conversation.id === activeId ? "bg-muted font-medium" : "hover:bg-muted/60")}
              >
                <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{conversation.title || t("untitled")}</span>
                  <span className="block text-xs font-normal text-muted-foreground">{formatRelative(conversation.createdAt, locale, digitStyle, now)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {conversations.hasNextPage ? (
          <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => void conversations.fetchNextPage()} disabled={conversations.isFetchingNextPage}>
            {t("more")}
          </Button>
        ) : null}
      </nav>
    </div>
  );
};

const Thread = ({ businessId, conversationId, scopeBusinessId, onStarted }: { businessId: string; conversationId: string | null; scopeBusinessId: string | null; onStarted: (id: string) => void }) => {
  const { t } = useTranslation("assistant");
  const conversation = useConversation(conversationId);
  const proposals = useProposals();
  const ask = useAsk();
  const [draft, setDraft] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const byId = useMemo(() => new Map((proposals.data ?? []).map((proposal) => [proposal.id, proposal])), [proposals.data]);
  const messages = conversation.data?.messages ?? [];
  const prompts = [t("prompt1"), t("prompt2"), t("prompt3"), t("prompt4")];

  useLayoutEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length, asked, ask.isPending]);
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 180)}px`;
  }, [draft]);

  const send = (text: string) => {
    const message = text.trim();
    if (!message || ask.isPending) return;
    setAsked(message);
    setDraft("");
    ask.mutate(
      { message, conversationId, businessId: scopeBusinessId },
      {
        onSuccess: (answer) => {
          if (!conversationId) onStarted(answer.conversationId);
          else void conversation.refetch().then(() => setAsked(null));
        },
        onError: () => setDraft(message),
      },
    );
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    send(draft);
  };
  // The question shows straight away; it's replaced by the saved copy once the answer is in.
  const showAsked = asked && (ask.isPending || ask.isError || !messages.some((message) => message.role === "USER" && message.content === asked));

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6" aria-live="polite">
        <div className="mx-auto max-w-3xl space-y-6 py-6">
          {conversationId && conversation.isLoading ? <Spinner className="mt-12" /> : null}
          {conversation.isError ? <Alert tone="danger">{errorMessage(conversation.error)}</Alert> : null}
          {!conversationId && !asked ? <EmptyChat prompts={prompts} onPick={send} /> : null}
          {messages.map((message) => (
            <MessageView key={message.id} message={message} businessId={businessId} proposals={byId} />
          ))}
          {showAsked ? <UserBubble text={asked} /> : null}
          {ask.isPending ? <TypingDots /> : null}
          {ask.isError ? <Alert tone="danger">{errorMessage(ask.error)}</Alert> : null}
          <div ref={bottom} />
        </div>
      </div>
      <form onSubmit={submit} className="border-t bg-surface px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border bg-background p-2 shadow-xs transition-shadow focus-within:border-foreground focus-within:shadow-md">
          <textarea
            ref={box}
            rows={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                send(draft);
              }
            }}
            maxLength={4000}
            placeholder={t("placeholder")}
            aria-label={t("message")}
            className="max-h-44 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-base outline-none placeholder:text-muted-foreground"
          />
          <Button type="submit" size="icon" className="shrink-0 rounded-xl" disabled={!draft.trim() || ask.isPending} aria-label={t("send")}>
            <SendHorizontal />
          </Button>
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-muted-foreground">{t("footnote")}</p>
      </form>
    </>
  );
};

const UserBubble = ({ text }: { text: string }) => (
  <div className="animate-message-in flex justify-end" data-testid="user-message">
    <p className="max-w-[85%] rounded-2xl rounded-tr-sm bg-foreground px-4 py-2.5 whitespace-pre-wrap text-background">{text}</p>
  </div>
);

const MessageView = ({ message, businessId, proposals }: { message: Message; businessId: string; proposals: Map<string, Proposal> }) => {
  if (message.role === "USER") return <UserBubble text={message.content} />;
  const cards = message.sources.flatMap((source) => (source.proposalId && proposals.get(source.proposalId) ? [proposals.get(source.proposalId)!] : []));
  return (
    <div className="animate-message-in flex items-start gap-3" data-testid="assistant-message">
      <AssistantAvatar />
      <div className="min-w-0 flex-1 space-y-3 pt-1">
        <MessageText text={message.content} />
        {cards.map((proposal) => (
          <ProposalCard key={proposal.id} proposal={proposal} />
        ))}
        <Sources sources={message.sources} businessId={businessId} />
        <GuardNote status={message.guardStatus} />
      </div>
    </div>
  );
};
