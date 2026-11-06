import { DropdownMenu as Menu } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;
export const DropdownMenuGroup = Menu.Group;

export const DropdownMenuContent = ({ className, sideOffset = 6, ...props }: ComponentProps<typeof Menu.Content>) => (
  <Menu.Portal>
    <Menu.Content
      sideOffset={sideOffset}
      className={cn("z-50 min-w-56 rounded-lg border bg-surface p-1 shadow-lg data-[state=open]:animate-in", className)}
      {...props}
    />
  </Menu.Portal>
);

export const DropdownMenuItem = ({ className, ...props }: ComponentProps<typeof Menu.Item>) => (
  <Menu.Item
    className={cn("flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm outline-none select-none data-[highlighted]:bg-muted data-[disabled]:opacity-50 [&_svg]:size-4", className)}
    {...props}
  />
);

export const DropdownMenuLabel = ({ className, ...props }: ComponentProps<typeof Menu.Label>) => (
  <Menu.Label className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)} {...props} />
);

export const DropdownMenuSeparator = ({ className, ...props }: ComponentProps<typeof Menu.Separator>) => (
  <Menu.Separator className={cn("my-1 h-px bg-border", className)} {...props} />
);
