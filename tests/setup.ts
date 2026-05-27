import { expect, afterEach } from "bun:test";
import { cleanup } from "@testing-library/react";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Only register once
if (!globalThis.document) {
  GlobalRegistrator.register();
}

afterEach(() => {
  cleanup();
});
