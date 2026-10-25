import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, HardHat, Loader2, Sprout, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { Field, PasswordInput } from "@/components/form-field";
import { KadLogo } from "@/components/kad-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  ROLES,
  ROLE_HOME,
  STATES,
  signUpSchema,
  usernameToEmail,
  type AppRole,
  type StateCode,
} from "@/lib/accounts";
import { createAccount } from "@/lib/accounts.functions";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — KAD" },
      { name: "description", content: "Sign in to KAD as a farmer, labourer or CRP." },
      { property: "og:title", content: "Sign in — KAD" },
      { property: "og:description", content: "Farmer, labour and CRP sign in for KAD." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

const ROLE_ICONS: Record<AppRole, LucideIcon> = {
  farmer: Sprout,
  labour: HardHat,
  crp: BadgeCheck,
};

const DEMO_ACCOUNTS: Record<AppRole, { username: string; password: string }> = {
  farmer: { username: "ramu", password: "kad12345" },
  labour: { username: "lakshmi", password: "kad12345" },
  crp: { username: "suresh", password: "kad12345" },
};

type Mode = "signin" | "signup";

const emptyForm = {
  username: "",
  password: "",
  fullName: "",
  phone: "",
  village: "",
  crpCode: "",
  stateCode: "AP" as StateCode,
};

function LoginPage() {
  const navigate = useNavigate();
  const { session, role: signedInRole, loading } = useAuth();
  const registerAccount = useServerFn(createAccount);

  const [role, setRole] = useState<AppRole>("farmer");
  const [mode, setMode] = useState<Mode>("signin");
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session && signedInRole) {
      navigate({ to: ROLE_HOME[signedInRole], replace: true });
    }
  }, [loading, session, signedInRole, navigate]);

  const update = (key: keyof typeof emptyForm) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  async function signIn(username: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    if (error || !data.user) throw new Error("Wrong username or password");

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .maybeSingle();
    const accountRole = roleRow?.role as AppRole | undefined;

    if (accountRole !== role) {
      await supabase.auth.signOut();
      const label = ROLES.find((item) => item.id === accountRole)?.label ?? "another role";
      throw new Error(`This account is registered as ${label}. Switch the tab above.`);
    }

    navigate({ to: ROLE_HOME[accountRole], replace: true });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signin") {
        if (!form.username || !form.password) {
          setErrors({
            username: form.username ? "" : "Enter your username",
            password: form.password ? "" : "Enter your password",
          });
          return;
        }
        await signIn(form.username, form.password);
        return;
      }

      const parsed = signUpSchema.safeParse({ ...form, role, crpCode: form.crpCode || undefined });
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          fieldErrors[String(issue.path[0])] ??= issue.message;
        }
        setErrors(fieldErrors);
        return;
      }

      await registerAccount({ data: parsed.data });
      toast.success("Account created. Welcome to KAD!");
      await signIn(parsed.data.username, parsed.data.password);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo() {
    setMode("signin");
    setErrors({});
    setForm({ ...emptyForm, ...DEMO_ACCOUNTS[role] });
  }

  const activeRole = ROLES.find((item) => item.id === role)!;

  return (
    <div className="flex min-h-dvh flex-col px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-safe">
      <KadLogo className="self-start text-4xl" />

      <h1 className="mt-8 text-3xl font-extrabold">
        {mode === "signin" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-1 text-muted-foreground">{activeRole.hint}</p>

      <div role="tablist" aria-label="I am a" className="mt-6 grid grid-cols-3 gap-2">
        {ROLES.map((item) => {
          const Icon = ROLE_ICONS[item.id];
          const selected = item.id === role;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                setRole(item.id);
                setErrors({});
              }}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-sm font-semibold transition-all",
                selected ? "bg-ink text-ink-foreground shadow-lift" : "bg-muted text-foreground hover:bg-secondary",
              )}
            >
              <Icon className="size-5" />
              {item.label}
              <span className={cn("text-[11px] font-medium", selected ? "opacity-70" : "text-muted-foreground")}>
                {item.labelTe}
              </span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        {mode === "signup" && (
          <Field label="Full name" error={errors.fullName}>
            {(id) => (
              <Input
                id={id}
                autoComplete="name"
                value={form.fullName}
                onChange={(e) => update("fullName")(e.target.value)}
                aria-invalid={Boolean(errors.fullName)}
                placeholder="e.g. Ramu Naidu"
              />
            )}
          </Field>
        )}

        <Field
          label={role === "crp" && mode === "signin" ? "CRP username" : "Username"}
          error={errors.username}
          hint={mode === "signup" ? "You'll use this to sign in" : undefined}
        >
          {(id) => (
            <Input
              id={id}
              autoComplete="username"
              autoCapitalize="none"
              value={form.username}
              onChange={(e) => update("username")(e.target.value)}
              aria-invalid={Boolean(errors.username)}
              placeholder="username"
            />
          )}
        </Field>

        <Field label="Password" error={errors.password}>
          {(id) => (
            <PasswordInput
              id={id}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={form.password}
              onChange={(e) => update("password")(e.target.value)}
              aria-invalid={Boolean(errors.password)}
              placeholder="••••••••"
            />
          )}
        </Field>

        {mode === "signup" && (
          <>
            <Field label="Mobile number" error={errors.phone}>
              {(id) => (
                <Input
                  id={id}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  value={form.phone}
                  onChange={(e) => update("phone")(e.target.value.replace(/\D/g, ""))}
                  aria-invalid={Boolean(errors.phone)}
                  placeholder="98765 43210"
                />
              )}
            </Field>

            {role === "crp" ? (
              <Field label="CRP ID from RySS" error={errors.crpCode} hint="Printed on your RySS ID card">
                {(id) => (
                  <Input
                    id={id}
                    autoCapitalize="characters"
                    value={form.crpCode}
                    onChange={(e) => update("crpCode")(e.target.value.toUpperCase())}
                    aria-invalid={Boolean(errors.crpCode)}
                    placeholder="RYSS-AP-1001"
                  />
                )}
              </Field>
            ) : (
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <Field label="Village" error={errors.village}>
                  {(id) => (
                    <Input
                      id={id}
                      value={form.village}
                      onChange={(e) => update("village")(e.target.value)}
                      aria-invalid={Boolean(errors.village)}
                      placeholder="e.g. Penamaluru"
                    />
                  )}
                </Field>
                <Field label="State">
                  {(id) => (
                    <div id={id} className="flex h-12 rounded-xl bg-muted p-1">
                      {STATES.map((state) => (
                        <button
                          key={state.code}
                          type="button"
                          title={state.name}
                          onClick={() => update("stateCode")(state.code)}
                          className={cn(
                            "rounded-lg px-3 text-sm font-semibold transition-colors",
                            form.stateCode === state.code
                              ? "bg-background shadow-soft"
                              : "text-muted-foreground",
                          )}
                        >
                          {state.code}
                        </button>
                      ))}
                    </div>
                  )}
                </Field>
              </div>
            )}
          </>
        )}

        <Button type="submit" variant="ink" size="xl" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" />}
          {mode === "signin" ? `Sign in as ${activeRole.label}` : "Create account"}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setErrors({});
        }}
        className="mt-5 text-center text-sm font-medium text-muted-foreground"
      >
        {mode === "signin" ? "New to KAD? " : "Already have an account? "}
        <span className="font-semibold text-primary">
          {mode === "signin" ? "Create account" : "Sign in"}
        </span>
      </button>

      <button
        type="button"
        onClick={fillDemo}
        className="mx-auto mt-auto mb-2 rounded-full bg-turmeric-soft px-4 py-2 text-xs font-semibold text-soil"
      >
        Try the demo {activeRole.label.toLowerCase()} account
      </button>
    </div>
  );
}
