"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, message } from "@/lib/api";
import type { User } from "@/lib/types";
import { useHydrated } from "@/lib/use-hydrated";
import { Button } from "./ui";

export type AuthMode = "login" | "register" | "forgot-password" | "reset-password";

export function AuthForm({ mode, next, token }: { mode: AuthMode; next?: string; token?: string }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const login = mode === "login";
  const register = mode === "register";
  const forgot = mode === "forgot-password";
  const reset = mode === "reset-password";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setError("");
    setBusy(true);
    try {
      const result = await api<User>("/auth/" + mode, "POST", reset ? { ...data, token } : data);
      if (forgot || reset) {
        setNotice(forgot ? "If an account matches, we’ll send a reset link." : "Password changed. You can sign in now.");
        return;
      }
      if (result.cart_adjusted?.length) sessionStorage.setItem("deskly:cart-adjustment", result.cart_adjusted.join(", "));
      window.dispatchEvent(new Event("deskly:update"));
      const safe = next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\");
      router.push(safe && next ? next : result.role === "ADMIN" ? "/admin" : "/account");
      router.refresh();
    } catch (error) { setError(message(error)); }
    finally { setBusy(false); }
  }
  return <div className="panel">
    <form method="post" className="form-stack" onSubmit={submit}>
      {register && <label className="field">Full name<input name="name" autoComplete="name" minLength={2} maxLength={100} required/></label>}
      {!reset && <label className="field">Email address<input name="email" autoComplete="email" type="email" maxLength={254} required/></label>}
      {!forgot && <label className="field">Password<input type="password" name="password" autoComplete={login ? "current-password" : "new-password"} minLength={login ? 1 : 10} maxLength={128} required/></label>}
      {(register || reset) && <label className="field">Confirm password<input type="password" name="password_confirmation" autoComplete="new-password" minLength={10} maxLength={128} required/></label>}
      {error && <p className="alert" role="alert">{error}</p>}{notice && <p className="form-note" role="status">{notice}</p>}
      <Button disabled={!hydrated || busy || (reset && !token)}>{busy ? "Please wait…" : login ? "Sign in" : register ? "Create account" : forgot ? "Send reset link" : "Update password"}</Button>
    </form>
    <div className="button-row mt-4">{login ? <><Link className="inline-link" href="/register">Create an account</Link><Link className="inline-link" href="/forgot-password">Forgot password?</Link></> : <Link className="inline-link" href="/login">Back to sign in</Link>}</div>
  </div>;
}
