import { useMemo, useState } from "react";
import { Link, redirect, useNavigate, useSearchParams } from "react-router";
import type { Route } from "./+types/login";
import { ArrowRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { auth } from "@/lib/auth/server";
import { authClient } from "@/lib/auth/client";
import {
  isCaptchaError,
  useAuthTurnstile,
} from "@/lib/auth/use-auth-turnstile";
import { appContext } from "@/lib/util/app-context";
import { DemoButton } from "@/components/account/DemoButton";
import { LogoMark } from "@/components/ui/LogoMark";

export async function loader({ request, context }: Route.LoaderArgs) {
  const { env } = context.get(appContext);
  try {
    const session = await auth(env, new URL(request.url).origin).api.getSession(
      {
        headers: request.headers,
      },
    );
    if (session) throw redirect("/app");
  } catch (error) {
    if (error instanceof Response) throw error;
  }
  return null;
}

function Field({
  label,
  labelAccessory,
  name,
  type,
  autoComplete,
  placeholder,
}: {
  label: string;
  labelAccessory?: React.ReactNode;
  name: string;
  type: "text" | "email" | "password";
  autoComplete: string;
  placeholder: string;
}) {
  return (
    <div className="grid gap-2 text-sm text-ink">
      <span className="flex items-center justify-between gap-4">
        <label htmlFor={name}>{label}</label>
        {labelAccessory}
      </span>
      <input
        id={name}
        className="ui-input"
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
      />
    </div>
  );
}

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(
    null,
  );
  const { captchaWidget, captchaHeaders, resetCaptcha } = useAuthTurnstile();
  // 自分のアカウントの欄は畳んでおく。ログインが要るページから来たときは開く
  const [ownAccountOpen, setOwnAccountOpen] = useState(() => searchParams.has("callbackUrl"));

  const callbackUrl = useMemo(() => {
    const value = searchParams.get("callbackUrl");
    // ブラウザは \ を / と読み、タブや改行を捨てるので、それらを含む値は外部への移動になりうる
    return value && /^\/(?![/\\])[^\\\p{Cc}]*$/u.test(value) ? value : "/app";
  }, [searchParams]);
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    try {
      const fetchOptions = { headers: await captchaHeaders() };
      if (mode === "signup") {
        const name = String(formData.get("name") || "").trim();
        const { error } = await authClient.signUp.email({
          name,
          email,
          password,
          callbackURL: callbackUrl,
          fetchOptions,
        });
        if (error) {
          toast.error(
            isCaptchaError(error)
              ? t("auth.captchaFailed")
              : error.message || t("auth.login.signupError"),
          );
          return;
        }
        setVerificationEmail(email);
        setMode("login");
        return;
      } else {
        const { error } = await authClient.signIn.email({
          email,
          password,
          callbackURL: callbackUrl,
          fetchOptions,
        });
        if (error) {
          if (isCaptchaError(error)) {
            toast.error(t("auth.captchaFailed"));
            return;
          }
          if (error.code === "EMAIL_NOT_VERIFIED") {
            setVerificationEmail(email);
            toast.error(t("auth.login.emailNotVerified"));
            return;
          }
          toast.error(t("auth.login.invalidCredentials"));
          return;
        }
      }

      // 同じタブで前にログインしていた人のデータを見せない
      queryClient.clear();
      navigate(callbackUrl, { replace: true });
    } catch (error) {
      console.error(error);
      toast.error(t("auth.login.loginError"));
    } finally {
      resetCaptcha();
      setIsLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    if (!verificationEmail || isResending) return;
    setIsResending(true);
    try {
      const { error } = await authClient.sendVerificationEmail({
        email: verificationEmail,
        callbackURL: callbackUrl,
      });
      if (error) {
        toast.error(error.message || t("auth.login.resendError"));
        return;
      }
    } catch (error) {
      console.error(error);
      toast.error(t("auth.login.resendError"));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-dvh bg-canvas font-sans text-ink antialiased">
      <header className="fixed inset-x-0 top-0 z-20 h-16">
        <div className="ui-container flex h-16 items-center">
          <Link to="/" className="flex items-center gap-1">
            <LogoMark />
            <span className="text-lg font-bold tracking-tight">
              Letterpay
            </span>
          </Link>
        </div>
      </header>
      <main
        className="relative min-h-dvh overflow-hidden"
        style={{
          backgroundImage:
            "radial-gradient(120% 110% at 45% 100%, color-mix(in srgb, var(--color-brand) 30%, var(--color-canvas)) 0%, color-mix(in srgb, var(--color-brand) 12%, var(--color-canvas)) 40%, var(--color-canvas) 100%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.2' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="ui-container relative grid min-h-dvh items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:py-16">
          <section className="text-ink">
            <h1 className="text-4xl leading-[1.04] font-semibold tracking-[-0.045em] sm:text-5xl lg:text-6xl">
              {t("auth.login.heroTitleLine1")}
              <br />
              {t("auth.login.heroTitleLine2")}
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-ink-soft sm:text-lg">
              {t("auth.login.heroDescription")}
            </p>
          </section>
          <section className="ui-card p-6">
            <DemoButton className="ui-button-primary w-full" />
            <details
              className="mt-5"
              open={ownAccountOpen || verificationEmail !== null}
              onToggle={(event) => setOwnAccountOpen(event.currentTarget.open)}
            >
              <summary className="cursor-pointer text-sm text-ink-mute hover:text-ink">{t("auth.login.ownAccount")}</summary>
            <div className="ui-tabs mt-4">
              <button
                className="ui-tab"
                type="button"
                aria-pressed={mode === "login"}
                onClick={() => setMode("login")}
              >
                {t("auth.login.loginTab")}
              </button>
              <button
                className="ui-tab"
                type="button"
                aria-pressed={mode === "signup"}
                onClick={() => setMode("signup")}
              >
                {t("auth.login.signupTab")}
              </button>
            </div>
            <form className="mt-6 grid gap-5" onSubmit={handleSubmit}>
              {verificationEmail && (
                <div className="text-sm">
                  <p className="font-semibold text-ink">
                    {t("auth.login.verificationEmailSent")}
                  </p>
                  <p className="mt-1 break-all leading-6 text-ink-mute">
                    {t("auth.login.verificationEmailDescription", {
                      email: verificationEmail,
                    })}
                  </p>
                  <button
                    className="mt-2 font-semibold text-brand-ink hover:underline disabled:cursor-wait disabled:opacity-50"
                    type="button"
                    disabled={isResending}
                    onClick={() => void resendVerificationEmail()}
                  >
                    {isResending
                      ? t("auth.login.resending")
                      : t("auth.login.resendVerification")}
                  </button>
                </div>
              )}
              {mode === "signup" && (
                <Field
                  label={t("auth.login.nameLabel")}
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder={t("auth.login.namePlaceholder")}
                />
              )}
              <Field
                label={t("common.email")}
                name="email"
                type="email"
                autoComplete="email"
                placeholder={t("auth.login.emailPlaceholder")}
              />
              <Field
                label={t("auth.login.passwordLabel")}
                labelAccessory={
                  mode === "login" ? (
                    <Link
                      className="font-semibold text-brand-ink hover:underline"
                      to={`/forgot-password?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                    >
                      {t("auth.login.forgotPasswordLink")}
                    </Link>
                  ) : undefined
                }
                name="password"
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                placeholder={t("auth.login.passwordPlaceholder")}
              />

              <button
                className="ui-button-secondary mt-1 w-full"
                type="submit"
                disabled={isLoading}
              >
                {isLoading
                  ? t("auth.processing")
                  : mode === "login"
                    ? t("auth.login.loginTab")
                    : t("auth.login.createAccount")}
                <ArrowRight className="h-4 w-4 transition-transform" />
              </button>
              {captchaWidget}
            </form>
            </details>
          </section>
        </div>
      </main>
    </div>
  );
}
