import { Paperclip, Send, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAppSelector } from "@/app/store";
import { openDocument } from "@/features/finance/api";
import { cn } from "@/lib/cn";
import { formatDateTime, formatRelative } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { useFormatting } from "@/lib/preferences";
import { ALLOWED_MOVES, PRIORITIES, useAddComment, useComments, useTask, useUpdateTask, type TaskDetail, type TaskPriority, type TaskStatus } from "./api";
import { Avatar, fromLocalInput, PriorityBadge, toLocalInput, useMemberNames } from "./parts";

// One task: its details to change, and the conversation about it.
export const TaskPanel = ({ businessId, taskId, canWrite, onClose }: { businessId: string; taskId: string; canWrite: boolean; onClose: () => void }) => {
  const { t } = useTranslation(["tasks", "common"]);
  const task = useTask(businessId, taskId);

  return (
    <Dialog.Root open onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay" />
        <Dialog.Content className="animate-chart-fade fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col overflow-y-auto border-l bg-surface shadow-xl outline-none">
          <div className="flex items-center justify-between gap-2 border-b px-5 py-3">
            <Dialog.Description className="text-sm text-muted-foreground">{t("tasks:task")}</Dialog.Description>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label={t("common:close")}>
                <X />
              </Button>
            </Dialog.Close>
          </div>
          {task.isError ? (
            <div className="p-5">
              <Dialog.Title className="sr-only">{t("tasks:task")}</Dialog.Title>
              <Alert tone="danger">{errorMessage(task.error)}</Alert>
            </div>
          ) : null}
          {task.isLoading ? <Spinner className="mt-16" /> : null}
          {task.data ? <Details businessId={businessId} task={task.data} canWrite={canWrite} /> : null}
          {task.data ? <Comments businessId={businessId} taskId={taskId} canWrite={canWrite} /> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

const Details = ({ businessId, task, canWrite }: { businessId: string; task: TaskDetail; canWrite: boolean }) => {
  const { t } = useTranslation(["tasks", "common"]);
  const { locale, digitStyle } = useFormatting();
  const update = useUpdateTask(businessId);
  const { members, nameOf } = useMemberNames(businessId);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [due, setDue] = useState(toLocalInput(task.dueAt));
  const changed =
    title.trim() !== task.title ||
    (description.trim() || null) !== task.description ||
    (assigneeId || null) !== task.assigneeId ||
    priority !== task.priority ||
    fromLocalInput(due) !== (task.dueAt ? new Date(task.dueAt).toISOString() : null);

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    update.mutate(
      { taskId: task.id, title: title.trim(), description: description.trim() || null, assigneeId: assigneeId || null, priority, dueAt: fromLocalInput(due) },
      { onSuccess: () => toast.success(t("tasks:taskSaved")) },
    );
  };
  const move = (status: TaskStatus) =>
    update.mutate({ taskId: task.id, status }, { onSuccess: () => toast.success(t("tasks:movedTo", { status: t(`tasks:status_${status}`) })), onError: (error) => toast.error(errorMessage(error)) });

  return (
    <div className="space-y-5 border-b p-5">
      <div>
        <Dialog.Title className={cn("text-xl leading-snug font-semibold break-words", (task.status === "DONE" || task.status === "CANCELLED") && "text-muted-foreground line-through")}>{task.title}</Dialog.Title>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <PriorityBadge priority={task.priority} />
          {task.dueAt ? <span className={cn(task.isOverdue && "font-medium text-danger")}>{t("tasks:dueOn", { when: formatDateTime(task.dueAt, locale, digitStyle) })}</span> : null}
          <span>{t("tasks:createdBy", { name: nameOf(task.createdBy) || "—", when: formatRelative(task.createdAt, locale, digitStyle) })}</span>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">{t("tasks:status")}</p>
        <div role="group" aria-label={t("tasks:status")} className="flex flex-wrap gap-1.5">
          {[task.status, ...ALLOWED_MOVES[task.status]].map((status) => {
            const current = status === task.status;
            return (
              <button
                key={status}
                type="button"
                disabled={!canWrite || current || update.isPending}
                aria-pressed={current}
                onClick={() => move(status)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                  current ? "border-foreground bg-foreground text-background" : "hover:bg-muted disabled:opacity-50",
                )}
              >
                {t(`tasks:status_${status}`)}
              </button>
            );
          })}
        </div>
        {task.completedAt ? <p className="mt-2 text-xs text-muted-foreground">{t("tasks:completedOn", { when: formatDateTime(task.completedAt, locale, digitStyle) })}</p> : null}
      </div>

      {canWrite ? (
        <form onSubmit={save} className="space-y-4" noValidate>
          {update.isError ? <Alert tone="danger">{errorMessage(update.error)}</Alert> : null}
          <Field label={t("tasks:title")}>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} />
          </Field>
          <Field label={t("tasks:description")}>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={5000}
              rows={3}
              className="w-full rounded-md border bg-surface px-3 py-2 text-sm outline-none focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-foreground/10"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("tasks:assignee")}>
              <Select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
                <option value="">{t("tasks:nobody")}</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name || member.email}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("tasks:priority")}>
              <Select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
                {PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {t(`tasks:priority_${value}`)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={t("tasks:due")} hint={t("tasks:dueHint")}>
            <Input type="datetime-local" value={due} onChange={(event) => setDue(event.target.value)} />
          </Field>
          <Button type="submit" className="w-full" disabled={!changed || !title.trim() || update.isPending}>
            {t("common:save")}
          </Button>
        </form>
      ) : task.description ? (
        <p className="text-sm whitespace-pre-wrap">{task.description}</p>
      ) : null}

      {task.attachments.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">{t("tasks:attachments")}</p>
          <ul className="space-y-1">
            {task.attachments.map((attachment, index) => (
              <li key={attachment.documentId}>
                <button type="button" onClick={() => void openDocument(businessId, attachment.documentId)} className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline">
                  <Paperclip className="size-4" />
                  {t("tasks:attachmentN", { n: index + 1 })}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

const Comments = ({ businessId, taskId, canWrite }: { businessId: string; taskId: string; canWrite: boolean }) => {
  const { t } = useTranslation("tasks");
  const { locale, digitStyle } = useFormatting();
  const me = useAppSelector((state) => state.auth.user);
  const comments = useComments(businessId, taskId);
  const add = useAddComment(businessId, taskId);
  const { nameOf } = useMemberNames(businessId);
  const [text, setText] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    add.mutate(text.trim(), { onSuccess: () => setText("") });
  };

  return (
    <section className="flex flex-1 flex-col p-5" aria-labelledby="comments-heading">
      <h3 id="comments-heading" className="text-sm font-semibold">
        {t("comments")}
        {comments.data?.length ? <span className="ml-1.5 font-normal text-muted-foreground">{comments.data.length.toLocaleString(locale)}</span> : null}
      </h3>
      {comments.isLoading ? <Spinner className="mt-6" /> : null}
      {comments.data && comments.data.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{t("noComments")}</p> : null}
      <ol className="mt-3 flex-1 space-y-4">
        {(comments.data ?? []).map((comment) => {
          const name = comment.authorId === me?.id ? (me?.name ?? "") : nameOf(comment.authorId);
          return (
            <li key={comment.id} className="flex gap-3">
              <Avatar name={name} className="size-8 text-xs" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">{name || "—"}</span>{" "}
                  <span className="text-xs text-muted-foreground">{formatRelative(comment.createdAt, locale, digitStyle)}</span>
                </p>
                <p className="mt-0.5 text-sm whitespace-pre-wrap break-words">{comment.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
      {canWrite ? (
        <form onSubmit={submit} className="sticky bottom-0 -mx-5 -mb-5 mt-4 flex items-end gap-2 border-t bg-surface p-4">
          <textarea
            aria-label={t("writeComment")}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit(event);
            }}
            maxLength={5000}
            rows={2}
            placeholder={t("writeComment")}
            className="min-h-10 flex-1 resize-none rounded-md border bg-surface px-3 py-2 text-sm outline-none focus-visible:border-foreground"
          />
          <Button type="submit" size="icon" aria-label={t("sendComment")} disabled={!text.trim() || add.isPending}>
            <Send />
          </Button>
        </form>
      ) : null}
      {add.isError ? <Alert tone="danger" className="mt-2">{errorMessage(add.error)}</Alert> : null}
    </section>
  );
};
