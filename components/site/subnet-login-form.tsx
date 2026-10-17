"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { subnetLoginAction, type SubnetFormState } from "@/app/subnet/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: SubnetFormState = {};

export function SubnetLoginForm() {
  const [state, action, pending] = useActionState(subnetLoginAction, initial);

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
