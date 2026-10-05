import { test as base, expect } from '@playwright/test';

type TestFixtures = { cleanDb: void };

export const test = base.extend<TestFixtures>({
  cleanDb: [
    async ({ request }, use) => {
      // Setup: reset and seed e2e-prefixed data
      const res = await request.post('/api/test/seed');
      if (!res.ok()) { console.log(res.status(), await res.text()); } expect(res.ok(), 'seed endpoint must succeed').toBeTruthy();

      await use();

      // Teardown: runs even when the test fails
      await request.post('/api/test/cleanup');
    },
    { auto: true },
  ],
});

export { expect };
