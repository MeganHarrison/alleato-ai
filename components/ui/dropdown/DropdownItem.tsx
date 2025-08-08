"use client";

import * as React from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface DropdownItemProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuItem> {
  active?: boolean;
}

export function DropdownItem({
  className,
  active,
  children,
  ...props
}: DropdownItemProps) {
  return (
    <DropdownMenuItem
      className={cn(
        "cursor-pointer",
        active && "bg-accent text-accent-foreground",
        className
      )}
      {...props}
    >
      {children}
    </DropdownMenuItem>
  );
}