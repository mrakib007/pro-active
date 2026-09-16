"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { useEffect, useState, type ReactNode } from "react";
import {
  useGetCurrentUserQuery,
  useLogoutMutation,
} from "../../lib/api/auth-api";
import { baseApi } from "../../lib/api/base-api";
import type { AppDispatch } from "../../lib/store";
import { WorkspaceCreator } from "../../components/workspace/workspace-creator";

function isUnauthorized(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 401
  );
}

type IconName =
  | "arrow-up-right"
  | "chevron-down"
  | "clock"
  | "file"
  | "home"
  | "inbox"
  | "plus"
  | "search"
  | "settings"
  | "stack"
  | "tasks";

function Icon({ name, className = "size-4" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, string> = {
    "arrow-up-right": "M7 17 17 7M9 7h8v8",
    "chevron-down": "m7 10 5 5 5-5",
    clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    file: "M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20V3.5ZM14 3.5V8h4M10 12h4M10 15h5",
    home: "m4 10 8-6 8 6v9.5a.5.5 0 0 1-.5.5h-5v-5h-5v5h-5a.5.5 0 0 1-.5-.5V10Z",
    inbox: "M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-12ZM4.5 14h4l1.2 2h4.6l1.2-2h4",
    plus: "M12 5v14M5 12h14",
    search: "m20 20-4.5-4.5M9.5 17a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z",
    settings: "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.42 1.42-.06-.06A1.7 1.7 0 0 0 16.44 18a1.7 1.7 0 0 0-1.03 1.57V20h-2v-.43A1.7 1.7 0 0 0 12.38 18a1.7 1.7 0 0 0-1.88.34l-.06.06-1.42-1.42.06-.06A1.7 1.7 0 0 0 9.42 15a1.7 1.7 0 0 0-1.57-1.03H7.4v-2h.45A1.7 1.7 0 0 0 9.42 11a1.7 1.7 0 0 0-.34-1.88l-.06-.06 1.42-1.42.06.06A1.7 1.7 0 0 0 12.38 8a1.7 1.7 0 0 0 1.03-1.57V6h2v.43A1.7 1.7 0 0 0 16.44 8a1.7 1.7 0 0 0 1.88-.34l.06-.06 1.42 1.42-.06.06A1.7 1.7 0 0 0 19.4 11a1.7 1.7 0 0 0 1.57 1.03H21.4v2h-.43A1.7 1.7 0 0 0 19.4 15Z",
    stack: "M12 3 4 7l8 4 8-4-8-4ZM4 12l8 4 8-4M4 17l8 4 8-4",
    tasks: "M5 5.5h14M5 12h14M5 18.5h14M2.5 5.5h.01M2.5 12h.01M2.5 18.5h.01",
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d={paths[name]}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function WorkspaceBrand() {
  return (
    <Link
      className="group inline-flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#d9d4c6]"
      href="/workspace"
    >
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-[7px] bg-[#20251f] text-[#f5f3ed] shadow-[0_5px_14px_-8px_rgba(20,25,20,0.7)]"
      >
        <span className="font-serif text-lg leading-none">P</span>
      </span>
      <span className="leading-none">
        <span className="block text-[14px] font-semibold tracking-[-0.03em] text-[#262823]">
          Pro-Active
        </span>
        <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.19em] text-[#8a8c84]">
          ProjectHub
        </span>
      </span>
    </Link>
  );
}

function WorkspaceMessage({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--paper)] px-6 py-10 text-[var(--ink)]">
      <section className="w-full max-w-lg rounded-[6px] border border-[var(--story-line-strong)] bg-[var(--story-surface)] p-8 text-center shadow-[0_24px_70px_-48px_rgba(41,67,51,0.65)]">
        <WorkspaceBrand />
        <div className="mt-12">{children}</div>
      </section>
    </main>
  );
}

const dayItems = [
  {
    title: "Review the onboarding flow",
    context: "Editorial launch",
    status: "In progress",
    statusClass: "bg-[#e7edf8] text-[#496589]",
    dotClass: "bg-[#5a78a4]",
  },
  {
    title: "Write release notes",
    context: "Product operations",
    status: "Next up",
    statusClass: "bg-[#f2eadb] text-[#8b6d3e]",
    dotClass: "bg-[#b58a4e]",
  },
  {
    title: "Schedule customer call",
    context: "Research sprint",
    status: "Tomorrow",
    statusClass: "bg-[#e4eee9] text-[#47705d]",
    dotClass: "bg-[#5d8b72]",
  },
];

const recentPages = [
  { title: "Editorial launch", detail: "Updated 18 minutes ago", icon: "file" as const },
  { title: "Team handbook", detail: "Updated yesterday", icon: "file" as const },
  { title: "Onboarding checklist", detail: "Updated Monday", icon: "file" as const },
];

export default function WorkspacePage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const {
    data: currentUserResponse,
    error,
    isError,
    isFetching,
    isLoading,
  } = useGetCurrentUserQuery(undefined, { skip: isSigningOut });
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    if (isUnauthorized(error)) {
      router.replace("/login");
    }
  }, [error, router]);

  useEffect(() => {
    if (!isSigningOut) return;

    let cancelled = false;

    async function revokeSession() {
      try {
        await logout().unwrap();

        if (cancelled) return;

        dispatch(baseApi.util.resetApiState());
        router.replace("/login");
      } catch {
        if (cancelled) return;

        setIsSigningOut(false);
        setLogoutError("We could not sign you out. Please try again.");
      }
    }

    void revokeSession();

    return () => {
      cancelled = true;
    };
  }, [dispatch, isSigningOut, logout, router]);

  if (isLoading || isFetching) {
    return (
      <WorkspaceMessage>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--story-brass)]">
          Checking your workspace
        </p>
        <p className="mt-4 font-serif text-2xl text-[var(--story-ink)]">
          Verifying your session…
        </p>
      </WorkspaceMessage>
    );
  }

  if (isUnauthorized(error)) {
    return (
      <WorkspaceMessage>
        <p className="font-serif text-2xl text-[var(--story-ink)]">
          Returning you to sign in…
        </p>
      </WorkspaceMessage>
    );
  }

  if (isError || !currentUserResponse) {
    return (
      <WorkspaceMessage>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--story-brass)]">
          Workspace unavailable
        </p>
        <h1 className="mt-4 font-serif text-3xl text-[var(--story-ink)]">
          We could not verify your session.
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--story-muted)]">
          Make sure the backend is running, then sign in again.
        </p>
        <Link
          className="mt-8 inline-flex rounded-[4px] bg-[var(--story-forest)] px-5 py-3 text-sm font-semibold text-[var(--story-paper)] transition hover:bg-[var(--story-ink)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--story-brass-soft)]"
          href="/login"
        >
          Return to sign in
        </Link>
      </WorkspaceMessage>
    );
  }

  const user = currentUserResponse.data.user;
  const nameParts = user.fullName.trim().split(/\s+/).filter(Boolean);
  const initials = nameParts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  function handleLogout() {
    setLogoutError(null);
    setIsSigningOut(true);
  }

  return (
    <main className="h-screen overflow-hidden bg-[#f7f7f5] text-[#262823]">
      <div className="flex h-full min-h-0">
        <aside
          aria-label="Workspace sidebar"
          className="hidden h-full w-[268px] shrink-0 flex-col border-r border-[#e5e5df] bg-[#f2f2ef] lg:flex"
        >
          <div className="border-b border-[#e5e5df] px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <WorkspaceBrand />
              <button
                aria-label="Open workspace switcher"
                className="grid size-8 place-items-center rounded-md text-[#777970] transition hover:bg-[#e8e8e3] hover:text-[#262823] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#d9d4c6]"
                type="button"
              >
                <Icon name="chevron-down" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <button
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[13px] text-[#777970] transition hover:bg-[#e8e8e3] hover:text-[#262823] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#d9d4c6]"
              type="button"
            >
              <Icon className="size-[15px]" name="search" />
              <span>Search</span>
              <kbd className="ml-auto rounded border border-[#deded8] bg-[#f7f7f5] px-1.5 py-0.5 text-[10px] text-[#a0a19a]">
                ⌘ K
              </kbd>
            </button>

            <nav aria-label="Workspace navigation" className="mt-6">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a0a19a]">
                Workspace
              </p>
              <div className="mt-2 space-y-0.5">
                <Link
                  className="flex items-center gap-3 rounded-md bg-[#e5e5df] px-3 py-2.5 text-[13px] font-medium text-[#262823]"
                  href="/workspace"
                >
                  <Icon className="size-[15px]" name="home" />
                  Home
                </Link>
                <Link
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] text-[#777970] transition hover:bg-[#e8e8e3] hover:text-[#262823]"
                  href="/workspace?view=inbox"
                >
                  <Icon className="size-[15px]" name="inbox" />
                  Inbox
                  <span className="ml-auto text-[11px] text-[#a0a19a]">2</span>
                </Link>
                <Link
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] text-[#777970] transition hover:bg-[#e8e8e3] hover:text-[#262823]"
                  href="/workspace?view=projects"
                >
                  <Icon className="size-[15px]" name="stack" />
                  Projects
                </Link>
                <Link
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] text-[#777970] transition hover:bg-[#e8e8e3] hover:text-[#262823]"
                  href="/workspace?view=tasks"
                >
                  <Icon className="size-[15px]" name="tasks" />
                  My tasks
                </Link>
              </div>
            </nav>

            <div className="mt-8">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a0a19a]">
                Favorites
              </p>
              <div className="mt-2 space-y-0.5">
                <Link
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] text-[#777970] transition hover:bg-[#e8e8e3] hover:text-[#262823]"
                  href="/workspace?view=editorial-launch"
                >
                  <span className="size-2 rounded-[2px] bg-[#ba8c4b]" />
                  Editorial launch
                </Link>
                <Link
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] text-[#777970] transition hover:bg-[#e8e8e3] hover:text-[#262823]"
                  href="/workspace?view=research-sprint"
                >
                  <span className="size-2 rounded-[2px] bg-[#6a86ad]" />
                  Research sprint
                </Link>
              </div>
            </div>

            <div className="mt-8">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a0a19a]">
                Private
              </p>
              <Link
                className="mt-2 flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] text-[#777970] transition hover:bg-[#e8e8e3] hover:text-[#262823]"
                href="/workspace?view=notes"
              >
                <Icon className="size-[15px]" name="file" />
                Untitled notes
              </Link>
            </div>
          </div>

          <div className="border-t border-[#e5e5df] p-3">
            <div className="flex items-center gap-3 rounded-md px-2 py-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#dfe6df] text-[11px] font-semibold text-[#47624e]">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium text-[#4c4e48]">
                  {user.fullName}
                </p>
                <p className="truncate text-[11px] text-[#969790]">{user.email}</p>
              </div>
              <Icon className="ml-auto size-4 shrink-0 text-[#a0a19a]" name="settings" />
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-h-16 shrink-0 items-center gap-4 border-b border-[#e5e5df] bg-[#fbfbf9] px-5 sm:px-8 lg:px-10">
            <div className="lg:hidden">
              <WorkspaceBrand />
            </div>
            <div className="hidden items-center gap-2 text-[13px] text-[#969790] lg:flex">
              <Link className="transition hover:text-[#262823]" href="/workspace">
                Home
              </Link>
              <span aria-hidden="true">/</span>
              <span className="text-[#4c4e48]">Overview</span>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <span className="hidden items-center gap-2 text-[11px] font-medium text-[#6e786f] sm:inline-flex">
                <span className="size-1.5 rounded-full bg-[#5d8b72]" />
                Session verified
              </span>
              <button
                className="inline-flex items-center gap-2 rounded-md bg-[#262823] px-3.5 py-2 text-[12px] font-medium text-white transition hover:bg-[#3c403a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#d9d4c6] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoggingOut || isSigningOut}
                onClick={handleLogout}
                type="button"
              >
                {isLoggingOut ? "Signing out…" : "Sign out"}
              </button>
              <div className="hidden items-center gap-2 border-l border-[#e5e5df] pl-3 sm:flex">
                <span className="grid size-8 place-items-center rounded-full bg-[#dfe6df] text-[11px] font-semibold text-[#47624e]">
                  {initials}
                </span>
                <span className="max-w-[180px] truncate text-[12px] text-[#777970]">{user.email}</span>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
              <section aria-labelledby="workspace-heading">
                <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#a0a19a]">
                      Wednesday, September 3, 2026
                    </p>
                    <h1
                      className="mt-3 text-[38px] font-semibold leading-[1.05] tracking-[-0.055em] text-[#262823] sm:text-5xl"
                      id="workspace-heading"
                    >
                      Good morning, {user.fullName}
                    </h1>
                    <p className="mt-4 max-w-xl text-[15px] leading-7 text-[#777970]">
                      A clear view of the work that needs your attention today.
                    </p>
                  </div>
                  <button
                    className="inline-flex w-fit items-center gap-2 rounded-md border border-[#d7d8d1] bg-[#fbfbf9] px-4 py-2.5 text-[13px] font-medium text-[#4c4e48] shadow-[0_2px_5px_-4px_rgba(30,35,30,0.35)] transition hover:border-[#bfc1b8] hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#d9d4c6]"
                    type="button"
                  >
                    <Icon className="size-[15px]" name="plus" />
                    New page
                  </button>
                </div>
              </section>

              {logoutError ? (
                <p
                  aria-live="polite"
                  className="mt-6 border border-[#e2c99f] bg-[#f8f0e2] px-4 py-3 text-sm font-medium text-[#795d32]"
                  role="status"
                >
                  {logoutError}
                </p>
              ) : null}

              <WorkspaceCreator />

              <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(290px,0.75fr)]">
                <section aria-labelledby="my-day-heading">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#a0a19a]">
                        Focus
                      </p>
                      <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.04em] text-[#262823]" id="my-day-heading">
                        My day
                      </h2>
                    </div>
                    <span className="rounded-full bg-[#e9e9e4] px-2.5 py-1 text-[11px] font-medium text-[#777970]">
                      3 open
                    </span>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-lg border border-[#e1e2dc] bg-[#fbfbf9]">
                    <ul>
                      {dayItems.map((item, index) => (
                        <li
                          className={`flex items-center gap-3 px-4 py-4 sm:px-5 ${index === dayItems.length - 1 ? "" : "border-b border-[#ebebe6]"}`}
                          key={item.title}
                        >
                          <button
                            aria-label={`Mark ${item.title} complete`}
                            className="grid size-5 shrink-0 place-items-center rounded-full border border-[#cfd2c8] transition hover:border-[#6e786f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#d9d4c6]"
                            type="button"
                          >
                            <span className={`size-2 rounded-full ${item.dotClass}`} />
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium text-[#3d403a]">
                              {item.title}
                            </p>
                            <p className="mt-1 truncate text-[11px] text-[#a0a19a]">{item.context}</p>
                          </div>
                          <span className={`hidden rounded-full px-2.5 py-1 text-[10px] font-medium sm:inline-flex ${item.statusClass}`}>
                            {item.status}
                          </span>
                          <Icon className="size-4 shrink-0 text-[#c1c3bc]" name="arrow-up-right" />
                        </li>
                      ))}
                    </ul>
                    <button
                      className="flex w-full items-center gap-2 border-t border-[#ebebe6] px-5 py-3 text-left text-[12px] font-medium text-[#8a8c84] transition hover:bg-[#f4f4f0] hover:text-[#4c4e48] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#d9d4c6]"
                      type="button"
                    >
                      <Icon className="size-[14px]" name="plus" />
                      Add a task
                    </button>
                  </div>
                </section>

                <section aria-labelledby="recent-pages-heading">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#a0a19a]">
                        Keep moving
                      </p>
                      <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.04em] text-[#262823]" id="recent-pages-heading">
                        Recent pages
                      </h2>
                    </div>
                    <Link className="text-[12px] text-[#8a8c84] transition hover:text-[#262823]" href="/workspace?view=recent">
                      See all
                    </Link>
                  </div>
                  <div className="mt-4 rounded-lg border border-[#e1e2dc] bg-[#fbfbf9] p-2">
                    {recentPages.map((page) => (
                      <Link
                        className="flex items-center gap-3 rounded-md px-3 py-3 transition hover:bg-[#f1f1ed]"
                        href={`/workspace?view=${page.title.toLowerCase().replaceAll(" ", "-")}`}
                        key={page.title}
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-[#f0f0eb] text-[#777970]">
                          <Icon className="size-[15px]" name={page.icon} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-[#4c4e48]">{page.title}</span>
                          <span className="mt-1 block text-[11px] text-[#a0a19a]">{page.detail}</span>
                        </span>
                        <Icon className="size-[14px] text-[#c1c3bc]" name="arrow-up-right" />
                      </Link>
                    ))}
                  </div>
                </section>
              </div>

              <section aria-labelledby="project-pulse-heading" className="mt-10">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#a0a19a]">
                    Across your workspaces
                  </p>
                  <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.04em] text-[#262823]" id="project-pulse-heading">
                    Project pulse
                  </h2>
                </div>

                <div className="mt-4 flex items-start gap-4 rounded-lg border border-[#e1e2dc] bg-[#fbfbf9] p-5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#f0f0eb] text-[#777970]">
                    <Icon className="size-[16px]" name="stack" />
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-[#4c4e48]">
                      Projects are now saved inside a workspace.
                    </p>
                    <p className="mt-1 text-[12px] leading-5 text-[#8a8c84]">
                      Use the Projects action in a workspace above to create
                      and manage its projects.
                    </p>
                  </div>
                </div>
              </section>

              <footer className="mt-12 flex items-center gap-2 border-t border-[#e5e5df] pt-5 text-[11px] text-[#a0a19a]">
                <Icon className="size-[14px]" name="clock" />
                <span>Last synced from your workspace session</span>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
