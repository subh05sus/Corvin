"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { revokeApiKey } from "@/app/actions/keys";

export function RevokeKeyButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Revoke this key? Any process still using it will lose access.")) {
      return;
    }
    startTransition(async () => {
      await revokeApiKey(id);
    });
  }

  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={handleClick}>
      {pending ? "Revoking…" : "Revoke"}
    </Button>
  );
}
