"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { changePasswordAction, loginAction, type FormState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: FormState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus className="h-10" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Kata sandi</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required className="h-10" />
      </div>
      {state.error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-10">
        {pending && <LoaderCircle className="animate-spin" />}
        Masuk
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initial);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      form.current?.reset();
    }
  }, [state]);

  return (
    <form ref={form} action={action} className="flex max-w-sm flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="current">Kata sandi saat ini</Label>
        <Input id="current" name="current" type="password" autoComplete="current-password" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="next">Kata sandi baru</Label>
        <Input id="next" name="next" type="password" autoComplete="new-password" minLength={8} required />
        <p className="text-xs text-muted-foreground">Minimal 8 karakter.</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm">Ulangi kata sandi baru</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      {state.error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="w-fit">
        {pending && <LoaderCircle className="animate-spin" />}
        Perbarui kata sandi
      </Button>
    </form>
  );
}
