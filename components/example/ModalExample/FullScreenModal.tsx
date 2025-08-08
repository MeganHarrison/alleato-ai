"use client";
import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function FullScreenModal() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
        Full Screen Modal
      </h3>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>Open Full Screen Modal</Button>
        </DialogTrigger>
        <DialogContent className="max-w-full h-screen m-0 p-0">
          <div className="flex flex-col h-full">
            <DialogHeader className="p-6 border-b border-gray-200 dark:border-gray-800">
              <DialogTitle>Full Screen Modal</DialogTitle>
              <DialogDescription>
                This modal takes up the entire screen.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 p-6 overflow-y-auto">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This is a full-screen modal. You can add any content here that requires more space.
              </p>
              <div className="mt-4 space-y-4">
                {[...Array(20)].map((_, i) => (
                  <p key={i} className="text-sm text-gray-500 dark:text-gray-400">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                  </p>
                ))}
              </div>
            </div>
            <DialogFooter className="p-6 border-t border-gray-200 dark:border-gray-800">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button onClick={() => setOpen(false)}>Save Changes</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}