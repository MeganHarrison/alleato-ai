"use client";

import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({ code, language = 'typescript', filename, showLineNumbers = false }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split('\n');

  return (
    <div className="relative group">
      {filename && (
        <div className="bg-muted px-4 py-2 rounded-t-lg border border-b-0 text-sm text-muted-foreground">
          {filename}
        </div>
      )}
      <div className={`relative bg-muted/50 rounded-lg border ${filename ? 'rounded-t-none' : ''}`}>
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
        <pre className="overflow-x-auto p-4">
          <code className={`language-${language}`}>
            {showLineNumbers ? (
              <div className="flex">
                <div className="flex flex-col text-muted-foreground text-sm mr-4">
                  {lines.map((_, i) => (
                    <span key={i} className="text-right">
                      {i + 1}
                    </span>
                  ))}
                </div>
                <div>{code}</div>
              </div>
            ) : (
              code
            )}
          </code>
        </pre>
      </div>
    </div>
  );
}