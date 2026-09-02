import Link from "next/link";
import { AuthForm } from "../../components/auth/auth-form";
import { AuthShell } from "../../components/auth/auth-shell";

export default function SignupPage() {
  return (
    <AuthShell
      description="Create a focused home for the work your team is carrying. We’ll start with the essentials and grow it deliberately."
      eyebrow="Start with clarity"
      footer={
        <>
          Already have an account?{" "}
          <Link
            className="font-semibold text-[var(--accent)] underline decoration-[var(--accent-line)] decoration-2 underline-offset-4 transition hover:text-[var(--accent-strong)] hover:decoration-[var(--accent)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-soft)]"
            href="/login"
          >
            Sign in instead
          </Link>
        </>
      }
      title="Give your work a home."
    >
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
