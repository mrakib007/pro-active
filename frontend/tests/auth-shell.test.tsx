import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { AuthShell } from "../components/auth/auth-shell";

describe("AuthShell", () => {
  test("keeps the desktop intro header separated from its content", () => {
    render(
      <AuthShell
        description="A description"
        eyebrow="Welcome"
        footer={<span>Footer</span>}
        title="A title"
      >
        <div>Form</div>
      </AuthShell>,
    );

    const story = screen.getByRole("region", {
      name: "Pro-Active introduction",
    });
    const header = story.querySelector("header");
    const intro = header?.nextElementSibling;

    expect(header).toHaveClass("shrink-0");
    expect(intro).toHaveClass("shrink-0");
    expect(story).toHaveClass("gap-10");
    expect(intro).not.toHaveClass("-mt-2");
    expect(intro).not.toHaveClass("xl:-mt-10");
  });

  test("uses a restrained editorial treatment for the story panel", () => {
    render(
      <AuthShell
        description="A description"
        eyebrow="Welcome"
        footer={<span>Footer</span>}
        title="A title"
      >
        <div>Form</div>
      </AuthShell>,
    );

    const story = screen.getByRole("region", {
      name: "Pro-Active introduction",
    });
    const heading = screen.getByRole("heading", {level: 1});
    const highlightedWord = screen.getByText("findable.", {exact: true});

    expect(story).toHaveClass("bg-[var(--story-paper)]");
    expect(heading).toHaveClass("font-serif", "font-normal");
    expect(highlightedWord).toHaveClass("text-[var(--story-forest)]");
    expect(heading.querySelector("svg")).not.toBeInTheDocument();
  });

  test("keeps the desktop auth canvas at the viewport height", () => {
    render(
      <AuthShell
        description="A description"
        eyebrow="Welcome"
        footer={<span>Footer</span>}
        title="A title"
      >
        <div>Form</div>
      </AuthShell>,
    );

    const canvas = screen.getByRole("main");
    const columns = canvas.firstElementChild;
    const story = screen.getByRole("region", {
      name: "Pro-Active introduction",
    });
    const formPanel = story.nextElementSibling;

    expect(canvas).toHaveClass("lg:h-screen", "lg:max-h-screen", "lg:overflow-hidden");
    expect(columns).toHaveClass("lg:h-full", "lg:min-h-0");
    expect(story).toHaveClass("lg:h-full", "lg:min-h-0");
    expect(formPanel).toHaveClass("lg:h-full", "lg:min-h-0");
  });
});
