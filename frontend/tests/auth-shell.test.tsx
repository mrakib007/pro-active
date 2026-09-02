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
});
