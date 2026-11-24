import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, LogIn, ShieldCheck } from "lucide-react";

import { BrandMark } from "@/components/domain/BrandMark";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input } from "@/components/ui/input";
import { useSession } from "@/lib/auth/SessionProvider";
import { ApiError, messageOf } from "@/lib/api/client";
import { useTheme } from "@/lib/theme/ThemeProvider";

const schema = z.object({
  email: z.string().min(1, "Enter your email address").email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  remember: z.boolean(),
});
type LoginValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { login, status } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { resolved } = useTheme();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const next = safeNext(params.get("next"));

  React.useEffect(() => {
    document.title = "Sign in · HMS";
  }, []);

  React.useEffect(() => {
    if (status === "authenticated") navigate(next, { replace: true });
  }, [status, navigate, next]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: true },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await login(values.email.trim(), values.password, values.remember ? "Web browser" : undefined);
      navigate(next, { replace: true });
    } catch (error) {
      setServerError(
        error instanceof ApiError && error.status === 401
          ? "That email and password do not match. Check them and try again."
          : messageOf(error, "We could not sign you in. Please try again."),
      );
    }
  });

  return (
    <main className="flex min-h-dvh flex-col lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel: gradient is allowed here (guide §2.2). */}
      <section className="relative flex flex-col justify-between overflow-hidden px-6 py-8 text-white sm:px-10 lg:px-14 lg:py-12">
        <div aria-hidden className="gradient-brand absolute inset-0" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(24rem 24rem at 82% 12%, rgba(255,255,255,.22), transparent 65%), radial-gradient(20rem 20rem at 12% 92%, rgba(7,67,62,.45), transparent 60%)",
          }}
        />
        <div aria-hidden className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full border border-white/20" />
        <div aria-hidden className="pointer-events-none absolute -right-10 top-1/3 h-44 w-44 rounded-full border border-white/20" />

        <div className="relative flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-white/15 ring-1 ring-inset ring-white/30">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-h3 font-semibold tracking-tight">HMS</span>
        </div>

        <div className="relative mt-10 max-w-[38ch] lg:mt-0">
          <h1 className="text-display">Calm, precise care from registration to close.</h1>
          <p className="mt-4 max-w-[42ch] text-[0.9375rem] leading-relaxed text-white/85">
            One clinical workspace for patients, visits, vitals and documents. Built to stay out of
            the way when you are with a patient.
          </p>
          <ul className="mt-8 hidden space-y-2.5 text-small text-white/85 sm:block">
            {["Patient records with version-safe edits", "Visit notes, vitals and images in one place", "Permission-aware by role"].map(
              (item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <ShieldCheck aria-hidden className="h-4 w-4 shrink-0 text-white/70" />
                  {item}
                </li>
              ),
            )}
          </ul>
        </div>

        <p className="relative mt-10 hidden text-small font-normal text-white/60 lg:block">
          Hospital Management System
        </p>
      </section>

      <section className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8 lg:py-12">
        <div className="w-full max-w-[420px]">
          <div className="mb-7 lg:hidden">
            <BrandMark />
          </div>
          <h2 className="text-h1 text-ink">Sign in</h2>
          <p className="mt-1.5 text-[0.9375rem] text-muted">
            Use your hospital account to continue.
          </p>

          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4" aria-describedby={serverError ? "login-error" : undefined}>
            <div id="login-error">
              <FormError message={serverError} />
            </div>

            <Field label="Email" htmlFor="email" error={errors.email?.message} required>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                placeholder="you@hospital.example"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
            </Field>

            <Field label="Password" htmlFor="password" error={errors.password?.message} required>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Your password"
                  className="pr-11"
                  aria-invalid={Boolean(errors.password)}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-faint hover:text-ink"
                >
                  {showPassword ? (
                    <EyeOff aria-hidden className="h-4 w-4" />
                  ) : (
                    <Eye aria-hidden className="h-4 w-4" />
                  )}
                </button>
              </div>
            </Field>

            <Checkbox label="Remember this device" {...register("remember")} />

            <Button type="submit" size="lg" className="w-full" loading={isSubmitting} leadingIcon={<LogIn className="h-4 w-4" />}>
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-small font-normal text-faint">
            Trouble signing in? Contact your hospital administrator.
          </p>
        </div>
      </section>
      <span className="sr-only" data-theme={resolved} />
    </main>
  );
}

/** Only same-app paths are accepted as a post-login destination. */
function safeNext(value: string | null): string {
  if (!value) return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}
