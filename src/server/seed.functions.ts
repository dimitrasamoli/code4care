import { createServerFn } from "@tanstack/react-start";

export const seedDemoAccounts = createServerFn({ method: "POST" }).handler(
  async () => {
    return {
      created: [],
      skipped: [],
      ok: true,
      message: "Demo seed disabled locally",
    };
  },
);
