import { describe, it, expect, mock, spyOn, afterEach } from "bun:test";
import "../setup.ts";
import { render, fireEvent } from "@testing-library/react";
import { ShareModal } from "../../components/ShareModal.tsx";

describe("ShareModal", () => {
  afterEach(() => {
    mock.restore();
  });

  it("handles clipboard write errors gracefully", async () => {
    // Mock navigator.clipboard.writeText to throw an error
    const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});

    const writeTextMock = mock(() => Promise.reject(new Error("Clipboard error")));

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock,
      },
      writable: true
    });

    const { getByTitle } = render(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        promptText="Test prompt"
      />
    );

    // Find the copy button
    const copyButton = getByTitle("Copy Link");

    // Click the copy button
    fireEvent.click(copyButton);

    // Give the async handleCopyLink a moment to run and throw the error
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(writeTextMock).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to copy link", expect.any(Error));
  });
});
