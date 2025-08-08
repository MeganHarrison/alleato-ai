"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  fullscreen?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  children,
  className,
  fullscreen = false,
}: ModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent
          className={cn(
            "bg-white dark:bg-gray-900",
            fullscreen
              ? "max-w-full w-full h-screen m-0 rounded-none"
              : "max-w-2xl",
            className
          )}
        >
          {children}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}