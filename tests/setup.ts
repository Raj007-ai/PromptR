import { GlobalRegistrator } from "@happy-dom/global-registrator";
GlobalRegistrator.register();

import { expect, afterEach } from "bun:test";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
