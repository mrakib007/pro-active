import Link from "next/link";
import { AuthForm } from "../../components/auth/auth-form";
import { AuthShell } from "../../components/auth/auth-shell";

export default function LoginPage() {
  return (
    <AuthShell
      description="Sign in to pick up where you left off. Your projects, decisions, and next steps are waiting in one calm place."
      eyebrow="Welcome back"
      footer={
        <>
          New to Pro-Active?{" "}
          <Link
            className="font-semibold text-[var(--accent)] underline decoration-[var(--accent-line)] decoration-2 underline-offset-4 transition hover:text-[var(--accent-strong)] hover:decoration-[var(--accent)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-soft)]"
            href="/signup"
          >
            Create your workspace
          </Link>
        </>
      }
      title="Return to your flow."
    >
      <AuthForm mode="login" />
    </AuthShell>
  );
}
