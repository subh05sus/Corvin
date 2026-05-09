"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createApiKey } from "@/app/actions/keys";

export function NewKeyDialog() {
  const [open, setOpen] = useState(false);
  const [issued, setIssued] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await createApiKey(formData);
        setIssued(res.key);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create key");
      }
    });
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setIssued(null);
      setError(null);
      formRef.current?.reset();
    }
    setOpen(next);
  }

  async function handleCopy() {
    if (issued) {
      await navigator.clipboard.writeText(issued);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button>New API key</Button>} />
      <DialogContent>
        {!issued ? (
          <>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                Give your key a name so you can recognise it later.
              </DialogDescription>
            </DialogHeader>
            <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="my laptop"
                  required
                  maxLength={100}
                  autoFocus
                />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Creating…" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Save your API key</DialogTitle>
              <DialogDescription>
                This is the only time you will see the full key. Copy it now and store it
                somewhere safe.
              </DialogDescription>
            </DialogHeader>
            <code className="bg-muted block break-all rounded-md px-3 py-2 font-mono text-sm">
              {issued}
            </code>
            <DialogFooter>
              <Button variant="outline" onClick={handleCopy}>
                Copy
              </Button>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
