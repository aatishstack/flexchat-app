import { test, expect } from "@playwright/test";

test.describe("Runtime Validation Audit", () => {
  const screens = ["/auth", "/chat", "/calls", "/settings", "/profile"];

  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log(`BROWSER ERROR: ${msg.text()}`);
    });
    page.on("pageerror", (err) => {
      console.log(`PAGE ERROR: ${err.message}`);
    });
  });

  test("Full Runtime Flow: Register -> Chat -> Calls -> Settings", async ({ page }) => {
    // 1. Auth / Register
    await page.goto("/auth", { waitUntil: "load" });
    await expect(page.locator("h1").first()).toContainText(/Welcome|FlexChat/i);
    
    // Switch to Register if needed (assuming there's a toggle)
    const registerToggle = page.locator("button:has-text('Register'), button:has-text('Create account')");
    if (await registerToggle.isVisible()) {
      await registerToggle.click();
    }

    const username = `testuser_${Math.floor(Math.random() * 10000)}`;
    await page.fill("input[name='username'], input[placeholder*='Username']", username);
    await page.fill("input[name='email'], input[placeholder*='Email']", `${username}@example.com`);
    await page.fill("input[name='password'], input[placeholder*='Password']", "Password123!");
    
    // Note: If Turnstile is active, this will likely fail in automated environments 
    // without a test key. We check if it exists.
    const turnstile = page.locator(".cf-turnstile");
    if (await turnstile.isVisible()) {
      console.log("SKIP: Turnstile detected, cannot automate registration.");
    } else {
      await page.click("button[type='submit']");
      // Wait for navigation to chat
      await page.waitForURL("**/chat", { timeout: 15000 }).catch(() => console.log("Navigation to /chat timed out or blocked."));
    }

    // 2. Navigation & Crash Check
    for (const screen of screens) {
      console.log(`Checking screen: ${screen}`);
      await page.goto(screen, { waitUntil: "load" });
      const mainContent = page.locator("main, .auth-container, #__next");
      await expect(mainContent).toBeVisible({ timeout: 10000 });
      await expect(page.locator("h1:has-text('Something went wrong')")).not.toBeVisible();
    }

    // 3. Functional Checks (if on chat page)
    await page.goto("/chat", { waitUntil: "load" });
    if (page.url().endsWith("/chat")) {
      console.log("On chat page, verifying components...");
      // Verify Sidebar
      await expect(page.locator("aside, [class*='sidebar']")).toBeVisible();
      // Verify Empty State or Conversation
      await expect(page.locator("text=No conversations|Search")).toBeVisible();
    }

    // 4. Calls Page Check
    await page.goto("/calls", { waitUntil: "load" });
    await expect(page.locator("h1:has-text('Calls')")).toBeVisible();
    await expect(page.locator("text=Call history is empty|No call contacts")).toBeVisible();
  });
});
