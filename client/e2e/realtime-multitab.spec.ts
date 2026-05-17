import { execFileSync } from "node:child_process";
import path from "node:path";

import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type Page,
} from "@playwright/test";

const apiUrl =
  process.env.PLAYWRIGHT_API_URL ??
  "http://localhost:5000";

type SeedData = {
  conversationName: string;
  password: string;
  users: {
    email: string;
    username: string;
  }[];
};

function runSeed() {
  const serverDir = path.resolve(
    __dirname,
    "../../server"
  );
  const tsxCli = path.join(
    serverDir,
    "node_modules",
    "tsx",
    "dist",
    "cli.mjs"
  );
  const output = execFileSync(
    process.execPath,
    [
      tsxCli,
      "src/scripts/seed-realtime-validation.ts",
    ],
    {
      cwd: serverDir,
      encoding: "utf8",
      env: process.env,
    }
  );

  return JSON.parse(output) as SeedData;
}

async function login(
  request: APIRequestContext,
  email: string,
  password: string
) {
  const response = await request.post(
    `${apiUrl}/auth/login`,
    {
      data: {
        email,
        password,
      },
    }
  );

  expect(response.ok()).toBeTruthy();

  const body =
    (await response.json()) as {
      token: string;
    };

  return body.token;
}

async function openAuthedChat(
  browser: Browser,
  token: string,
  conversationName: string
) {
  const context =
    await browser.newContext();

  await context.addInitScript(
    ({ authToken }) => {
      window.localStorage.setItem(
        "flexchat_token",
        authToken
      );
    },
    {
      authToken: token,
    }
  );

  const page = await context.newPage();

  await page.goto("/chat");
  const conversationSearch = page
    .locator(
      'input[placeholder="Search conversations..."]:visible'
    )
    .first();

  await expect(conversationSearch).toBeVisible({
    timeout: 20_000,
  });

  await conversationSearch.fill(conversationName);
  await page
    .locator(
      `:text-is("${conversationName}"):visible`
    )
    .first()
    .click();
  await expect(
    page.getByPlaceholder("Write a message...")
  ).toBeVisible();

  return {
    context,
    page,
  };
}

async function sendMessage(
  page: Page,
  message: string
) {
  const composer =
    page.getByPlaceholder("Write a message...");

  await composer.fill(message);
  await composer.press("Enter");
}

function messageBubbles(
  page: Page,
  message: string
) {
  return page
    .locator("p.whitespace-pre-wrap")
    .filter({
      hasText: message,
    });
}

async function expectSingleMessage(
  page: Page,
  message: string
) {
  await expect(
    messageBubbles(page, message)
  ).toHaveCount(1, {
    timeout: 20_000,
  });
}

test("authenticated multi-tab realtime flow stays ordered and duplicate-free", async ({
  browser,
  request,
}) => {
  const seed = runSeed();
  const [alice, bob] = seed.users;
  const [aliceToken, bobToken] =
    await Promise.all([
      login(
        request,
        alice.email,
        seed.password
      ),
      login(
        request,
        bob.email,
        seed.password
      ),
    ]);
  const aliceChat =
    await openAuthedChat(
      browser,
      aliceToken,
      seed.conversationName
    );
  const bobChat =
    await openAuthedChat(
      browser,
      bobToken,
      seed.conversationName
    );

  const firstMessage =
    `phase3b first ${Date.now()}`;
  await sendMessage(
    aliceChat.page,
    firstMessage
  );
  await expectSingleMessage(
    aliceChat.page,
    firstMessage
  );
  await expectSingleMessage(
    bobChat.page,
    firstMessage
  );

  const missedWhileOffline =
    `phase3b wake ${Date.now()}`;
  await bobChat.context.setOffline(true);
  await sendMessage(
    aliceChat.page,
    missedWhileOffline
  );
  await expectSingleMessage(
    aliceChat.page,
    missedWhileOffline
  );
  await bobChat.context.setOffline(false);
  await expectSingleMessage(
    bobChat.page,
    missedWhileOffline
  );

  const optimisticOffline =
    `phase3b offline send ${Date.now()}`;
  await aliceChat.context.setOffline(true);
  await sendMessage(
    aliceChat.page,
    optimisticOffline
  );
  await expectSingleMessage(
    aliceChat.page,
    optimisticOffline
  );
  await aliceChat.context.setOffline(false);
  await expectSingleMessage(
    bobChat.page,
    optimisticOffline
  );
  await expectSingleMessage(
    aliceChat.page,
    optimisticOffline
  );

  await aliceChat.context.close();
  await bobChat.context.close();
});

test("logout synchronizes across same-user tabs", async ({
  browser,
  request,
}) => {
  const seed = runSeed();
  const [alice] = seed.users;
  const aliceToken = await login(
    request,
    alice.email,
    seed.password
  );
  const aliceChat =
    await openAuthedChat(
      browser,
      aliceToken,
      seed.conversationName
    );
  const secondTab =
    await aliceChat.context.newPage();

  await secondTab.goto("/chat");
  await expect(
    secondTab.getByPlaceholder(
      "Write a message..."
    )
  ).toBeVisible({
    timeout: 20_000,
  });

  await aliceChat.page
    .locator(
      'button[aria-label="Logout"]:visible'
    )
    .first()
    .click();

  await expect(aliceChat.page).toHaveURL(
    /\/auth$/,
    {
      timeout: 20_000,
    }
  );
  await expect(secondTab).toHaveURL(
    /\/auth$/,
    {
      timeout: 20_000,
    }
  );

  await aliceChat.context.close();
});
