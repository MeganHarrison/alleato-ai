"use client";

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DropdownProps {
  children: React.ReactNode;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
}

export function Dropdown({
  children,
  trigger,
  open,
  onOpenChange,
  align = "end",
  side = "bottom",
}: DropdownProps) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      {trigger && <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>}
      <DropdownMenuContent align={align} side={side}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}