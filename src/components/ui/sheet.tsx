import { Dialog } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

// A panel that slides in from the side. Used for the menu on narrow screens.
export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

export const SheetContent = ({ className, children, title, ...props }: ComponentProps<typeof Dialog.Content> & { title: string; children: ReactNode }) => (
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay" />
    <Dialog.Content className={cn("fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-surface shadow-xl outline-none", className)} {...props}>
      <Dialog.Title className="sr-only">{title}</Dialog.Title>
      <Dialog.Description className="sr-only">{title}</Dialog.Description>
      {children}
    </Dialog.Content>
  </Dialog.Portal>
);

export const Modal = Dialog.Root;

export const ModalContent = ({ className, children, title, description, ...props }: ComponentProps<typeof Dialog.Content> & { title: string; description?: string; children: ReactNode }) => (
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay" />
    <Dialog.Content
      className={cn("fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-surface p-6 shadow-xl outline-none", className)}
      {...props}
    >
      <Dialog.Title className="text-base font-semibold">{title}</Dialog.Title>
      {description ? <Dialog.Description className="mt-1 text-sm text-muted-foreground">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
      <div className="mt-4">{children}</div>
    </Dialog.Content>
  </Dialog.Portal>
);
