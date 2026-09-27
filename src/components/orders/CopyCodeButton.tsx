"use client";

import { useState } from "react";
import { Button } from "@/components/ui/design-system";

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      leftIcon={
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-12a2 2 0 00-2-2h-2M12 5v12M12 5a2 2 0 014 0v12a2 2 0 01-4 0" />
        </svg>
      }
    >
      {copied ? "Copiado" : "Copiar"}
    </Button>
  );
}