import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

const workItems = [
  { label: "Define release notes", state: "Done", tone: "teal" },
  { label: "Review onboarding flow", state: "In review", tone: "indigo" },
  { label: "Schedule customer call", state: "Tomorrow", tone: "sand" },
];

function dotClass(tone: string) {
  if (tone === "teal") return "bg-[var(--teal)]";
  if (tone === "indigo") return "bg-[var(--accent)]";
  return "bg-[#d6a35c]";
}

function BrandMark() {
  return (
    <span
      aria-hidden="true"
      className="relative grid size-10 shrink-0 place-items-center rounded-[14px] bg-[var(--ink)] shadow-[0_10px_20px_-12px_rgba(23,31,27,0.9)]"
    >
      <span className="absolute h-5 w-1.5 -translate-x-1.5 rounded-full bg-[var(--accent)]" />
      <span className="absolute h-2.5 w-1.5 translate-x-1.5 -translate-y-1.5 rounded-full bg-[var(--teal)]" />
      <span className="absolute h-2.5 w-1.5 translate-x-1.5 translate-y-1.5 rounded-full bg-white/80" />
    </span>
  );
}

function BrandLink({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      className="group inline-flex items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-soft)]"
      href="/"
    >
      <BrandMark />
      <span className="leading-none">
        <span className="block text-[15px] font-bold tracking-[-0.03em] text-[var(--ink)]">
          Pro-Active
        </span>
        {!compact ? (
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            ProjectHub
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
      <div aria-hidden="true" className="auth-grid pointer-events-none absolute inset-0" />

      <div className="relative mx-auto grid min-h-screen max-w-[1680px] lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
        <section
          aria-label="Pro-Active introduction"
          className="relative hidden min-h-screen flex-col gap-10 justify-between overflow-hidden border-r border-[var(--line)] px-8 py-8 lg:flex xl:px-14 xl:py-10"
        >
          <div aria-hidden="true" className="auth-orbit absolute -right-40 top-24 size-[520px] rounded-full" />

          <header className="relative flex shrink-0 items-center justify-between gap-6">
            <BrandLink />
            <span className="rounded-full border border-[var(--line)] bg-white/50 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] backdrop-blur">
              Workspace OS
            </span>
          </header>

          <div className="relative shrink-0 max-w-3xl">
            <p className="mb-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
              <span aria-hidden="true" className="h-px w-8 bg-[var(--accent)]" />
              Less noise. More momentum.
            </p>
            <h1 className="max-w-2xl text-6xl font-semibold leading-[0.95] tracking-[-0.075em] text-[var(--ink)] xl:text-8xl">
              Make work feel{" "}
              <span className="relative whitespace-nowrap text-[var(--accent)]">
                findable.
                <svg
                  aria-hidden="true"
                  className="absolute -bottom-3 left-0 h-3 w-full overflow-visible text-[var(--teal)]"
                  fill="none"
                  viewBox="0 0 220 12"
                >
                  <path
                    d="M2 8.5C47 2.5 164 1.5 218 6"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="3"
                  />
                </svg>
              </span>
            </h1>
            <p className="mt-9 max-w-lg text-base leading-7 text-[var(--muted)] xl:text-lg">
              A calm home for teams to plan, decide, and move projects forward—without losing the thread.
            </p>

            <div className="relative mt-12 max-w-[720px]">
              <div aria-hidden="true" className="absolute -inset-3 rounded-[32px] border border-[var(--line)] bg-white/20" />
              <article className="relative overflow-hidden rounded-[27px] border border-[var(--line-strong)] bg-[#fcfcf9] shadow-[0_30px_80px_-44px_rgba(24,33,27,0.7)]">
                <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-8 place-items-center rounded-xl bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent)]">
                      E
                    </span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
                        Workspace overview
                      </p>
                      <p className="mt-0.5 text-sm font-semibold tracking-[-0.02em] text-[var(--ink)]">
                        Editorial launch
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#e9f4ed] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#27734f]">
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-[#45a875]" />
                    On track
                  </span>
                </div>

                <div className="grid md:grid-cols-[168px_minmax(0,1fr)]">
                  <aside className="hidden border-r border-[var(--line)] bg-[var(--surface-muted)] p-4 md:block">
                    <p className="px-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
                      Navigate
                    </p>
                    <div className="mt-4 space-y-1 text-xs font-semibold text-[var(--muted)]">
                      <div className="flex items-center gap-2 rounded-xl bg-white px-2.5 py-2 text-[var(--ink)] shadow-sm">
                        <span className="size-1.5 rounded-full bg-[var(--accent)]" />
                        Overview
                      </div>
                      <div className="flex items-center gap-2 px-2.5 py-2">
                        <span className="size-1.5 rounded-full bg-[var(--line-strong)]" />
                        Projects
                      </div>
                      <div className="flex items-center gap-2 px-2.5 py-2">
                        <span className="size-1.5 rounded-full bg-[var(--line-strong)]" />
                        Decisions
                      </div>
                    </div>
                    <div className="mt-10 border-t border-[var(--line)] pt-4">
                      <p className="px-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
                        Your week
                      </p>
                      <div className="mt-3 flex items-center gap-2 px-2 text-xs font-semibold text-[var(--ink)]">
                        <span className="grid size-6 place-items-center rounded-lg bg-[var(--teal-soft)] text-[10px] text-[var(--teal)]">
                          12
                        </span>
                        Open items
                      </div>
                    </div>
                  </aside>

                  <div className="p-5 sm:p-6">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold text-[var(--muted)]">This week</p>
                        <p className="mt-1 text-2xl font-semibold tracking-[-0.06em] text-[var(--ink)]">
                          Keep the signal.
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-[var(--accent)]">82% complete</span>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                      <div className="h-full w-[82%] rounded-full bg-[var(--accent)]" />
                    </div>

                    <div className="mt-6 divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-white/70 px-4">
                      {workItems.map((item) => (
                        <div className="flex items-center justify-between gap-4 py-3.5" key={item.label}>
                          <div className="flex min-w-0 items-center gap-3">
                            <span aria-hidden="true" className={"size-2 shrink-0 rounded-full " + dotClass(item.tone)} />
                            <span className="truncate text-xs font-semibold text-[var(--ink)]">{item.label}</span>
                          </div>
                          <span className="shrink-0 text-[10px] font-semibold text-[var(--muted)]">{item.state}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 flex items-center justify-between rounded-2xl bg-[var(--ink)] px-4 py-3 text-white">
                      <div className="flex items-center gap-3">
                        <span className="grid size-7 place-items-center rounded-lg bg-white/10 text-xs">✦</span>
                        <span className="text-xs font-medium text-white/80">One clear next step</span>
                      </div>
                      <span className="text-sm text-[var(--teal)]">→</span>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <footer className="relative flex shrink-0 items-center justify-between gap-6 text-xs font-medium text-[var(--muted)]">
            <span>Built for thoughtful teams.</span>
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[var(--teal)]" />
              Your workspace, in focus
            </span>
          </footer>
        </section>

        <section className="relative flex min-h-screen w-full items-center justify-center px-6 py-8 sm:px-10 lg:px-14 xl:px-20">
          <div className="w-full max-w-[470px]">
            <div className="mb-14 flex items-center justify-between lg:hidden">
              <BrandLink compact />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
                ProjectHub
              </span>
            </div>

            <div className="mb-9">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">{eyebrow}</p>
              <h2 className="text-4xl font-semibold leading-[1.04] tracking-[-0.065em] text-[var(--ink)] sm:text-5xl">
                {title}
              </h2>
              <p className="mt-5 max-w-md text-[15px] leading-7 text-[var(--muted)]">{description}</p>
            </div>

            <div className="rounded-[28px] border border-[var(--line)] bg-white/55 p-5 shadow-[0_24px_60px_-48px_rgba(24,33,27,0.65)] backdrop-blur sm:p-7">
              {children}
            </div>

            <div className="mt-7 text-center text-sm text-[var(--muted)]">{footer}</div>
            <p className="mt-12 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]/70">
              Local learning build · Authentication is not connected
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
