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
  if (tone === "teal") return "bg-[var(--story-forest)]";
  if (tone === "indigo") return "bg-[var(--story-brass)]";
  return "bg-[var(--story-line-strong)]";
}

function BrandMark() {
  return (
    <span
      aria-hidden="true"
      className="relative grid size-10 shrink-0 place-items-center rounded-[5px] border border-[var(--story-brass)] bg-[var(--story-forest)] shadow-[0_10px_20px_-12px_rgba(23,31,27,0.7)]"
    >
      <span className="font-serif text-lg leading-none text-[var(--story-brass)]">P</span>
    </span>
  );
}

function BrandLink({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      className="group inline-flex items-center gap-3 rounded-[5px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--story-brass-soft)]"
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
    <main className="relative min-h-screen overflow-hidden bg-[var(--paper)] text-[var(--ink)] lg:h-screen lg:max-h-screen lg:overflow-hidden">
      <div className="relative mx-auto grid min-h-screen max-w-[1680px] lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
        <section
          aria-label="Pro-Active introduction"
          className="relative hidden min-h-screen flex-col gap-10 justify-between overflow-hidden border-r border-[var(--story-line)] bg-[var(--story-paper)] px-8 py-8 lg:flex lg:h-full lg:min-h-0 xl:px-14 xl:py-10"
        >
          <header className="relative flex shrink-0 items-center justify-between gap-6">
            <BrandLink />
            <span className="border-y border-[var(--story-line-strong)] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--story-muted)]">
              ProjectHub · 01
            </span>
          </header>

          <div className="relative shrink-0 max-w-3xl">
            <p className="mb-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--story-brass)]">
              <span aria-hidden="true" className="h-px w-10 bg-[var(--story-brass)]" />
              A considered workspace
            </p>
            <h1 className="max-w-2xl font-serif text-6xl font-normal leading-[0.94] tracking-[-0.055em] text-[var(--story-ink)] xl:text-8xl">
              Make work feel{" "}
              <span className="text-[var(--story-forest)]">
                findable.
              </span>
            </h1>
            <div aria-hidden="true" className="mt-6 h-px w-16 bg-[var(--story-brass)]" />
            <p className="mt-6 max-w-lg font-serif text-base leading-7 text-[var(--story-muted)] xl:text-lg">
              A calm home for teams to plan, decide, and move projects forward—without losing the thread.
            </p>

            <div className="relative mt-10 max-w-[720px]">
              <article className="relative overflow-hidden rounded-[6px] border border-[var(--story-line-strong)] bg-[var(--story-surface)] shadow-[0_26px_70px_-46px_rgba(41,67,51,0.7)]">
                <div className="flex items-center justify-between border-b border-[var(--story-line)] px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-8 place-items-center rounded-[4px] bg-[var(--story-brass-soft)] font-serif text-sm font-bold text-[var(--story-forest)]">
                      E
                    </span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--story-muted)]">
                        Workspace overview
                      </p>
                      <p className="mt-0.5 font-serif text-sm font-semibold tracking-[-0.02em] text-[var(--story-ink)]">
                        Editorial launch
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-2 border-l-2 border-[var(--story-brass)] pl-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--story-forest)]">
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--story-forest)]" />
                    On track
                  </span>
                </div>

                <div className="grid md:grid-cols-[168px_minmax(0,1fr)]">
                  <aside className="hidden border-r border-[var(--story-line)] bg-[var(--story-surface-muted)] p-4 md:block">
                    <p className="px-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--story-muted)]">
                      Navigate
                    </p>
                    <div className="mt-4 space-y-1 text-xs font-semibold text-[var(--story-muted)]">
                      <div className="flex items-center gap-2 border-l-2 border-[var(--story-brass)] bg-white/45 px-2.5 py-2 text-[var(--story-ink)]">
                        <span className="size-1.5 rounded-full bg-[var(--story-forest)]" />
                        Overview
                      </div>
                      <div className="flex items-center gap-2 px-2.5 py-2">
                        <span className="size-1.5 rounded-full bg-[var(--story-line-strong)]" />
                        Projects
                      </div>
                      <div className="flex items-center gap-2 px-2.5 py-2">
                        <span className="size-1.5 rounded-full bg-[var(--story-line-strong)]" />
                        Decisions
                      </div>
                    </div>
                    <div className="mt-10 border-t border-[var(--story-line)] pt-4">
                      <p className="px-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--story-muted)]">
                        Your week
                      </p>
                      <div className="mt-3 flex items-center gap-2 px-2 text-xs font-semibold text-[var(--story-ink)]">
                        <span className="grid size-6 place-items-center rounded-[4px] bg-[var(--story-brass-soft)] font-serif text-[10px] text-[var(--story-forest)]">
                          12
                        </span>
                        Open items
                      </div>
                    </div>
                  </aside>

                  <div className="p-5 sm:p-6">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold text-[var(--story-muted)]">This week</p>
                        <p className="mt-1 font-serif text-2xl font-semibold tracking-[-0.06em] text-[var(--story-ink)]">
                          Keep the signal.
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-[var(--story-brass)]">82% complete</span>
                    </div>
                    <div className="mt-4 h-1 overflow-hidden bg-[var(--story-line)]">
                      <div className="h-full w-[82%] bg-[var(--story-forest)]" />
                    </div>

                    <div className="mt-6 divide-y divide-[var(--story-line)] border border-[var(--story-line)] bg-white/45 px-4">
                      {workItems.map((item) => (
                        <div className="flex items-center justify-between gap-4 py-3.5" key={item.label}>
                          <div className="flex min-w-0 items-center gap-3">
                            <span aria-hidden="true" className={"size-2 shrink-0 rounded-full " + dotClass(item.tone)} />
                            <span className="truncate text-xs font-semibold text-[var(--story-ink)]">{item.label}</span>
                          </div>
                          <span className="shrink-0 text-[10px] font-semibold text-[var(--story-muted)]">{item.state}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 flex items-center justify-between rounded-[4px] bg-[var(--story-forest)] px-4 py-3 text-[var(--story-paper)]">
                      <div className="flex items-center gap-3">
                        <span className="grid size-7 place-items-center rounded-[3px] border border-white/10 text-xs text-[var(--story-brass)]">✦</span>
                        <span className="text-xs font-medium text-[var(--story-paper)]/80">One clear next step</span>
                      </div>
                      <span className="text-sm text-[var(--story-brass)]">→</span>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <footer className="relative flex shrink-0 items-center justify-between gap-6 text-xs font-medium text-[var(--story-muted)]">
            <span>Built for thoughtful teams.</span>
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[var(--story-brass)]" />
              Your workspace, in focus
            </span>
          </footer>
        </section>

        <section className="relative flex min-h-screen w-full items-center justify-center px-6 py-8 sm:px-10 lg:h-full lg:min-h-0 lg:px-14 xl:px-20">
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
              Local learning build · Session-backed sign in
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
