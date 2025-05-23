/**
 * Example Playwright script for Electron
 * showing/testing various API features
 * in both renderer and main processes
 */

import { expect, test } from "@playwright/test";
import {
  findLatestBuild,
  parseElectronApp,
  stubDialog,
} from "electron-playwright-helpers";
import { ElectronApplication, Page, _electron as electron } from "playwright";

let electronApp: ElectronApplication;

test.beforeAll(async () => {
  // find the latest build in the out directory
  const latestBuild = findLatestBuild();
  // parse the directory and find paths and other info
  const appInfo = parseElectronApp(latestBuild);
  // set the CI environment variable to true
  process.env.CI = "e2e";
  electronApp = await electron.launch({
    args: [
      appInfo.main,
      // Why no-sandbox?
      // To avoid this error on CI (Linux):
      //   pw:browser [pid=2743][err] [2743:0523/050346.234089:FATAL:setuid_sandbox_host.cc(163)] The SUID sandbox helper binary was found, but is not configured correctly. Rather than run without sandboxing I'm aborting now. You need to make sure that /home/runner/work/dyad/dyad/out/dyad-linux-x64/chrome-sandbox is owned by root and has mode 4755. +71ms
      "--no-sandbox",
    ],
    executablePath: appInfo.executable,
  });
  electronApp.on("window", async (page) => {
    const filename = page.url()?.split("/").pop();
    console.log(`Window opened: ${filename}`);

    // capture errors
    page.on("pageerror", (error) => {
      console.error(error);
    });
    // capture console messages
    page.on("console", (msg) => {
      console.log(msg.text());
    });
  });
});

test.afterAll(async () => {
  await electronApp.close();
});

let page: Page;

test("renders the first page", async () => {
  // Stub the dialog to not move to applications folder
  stubDialog(electronApp, "showMessageBox", {
    response: 1,
  });
  page = await electronApp.firstWindow();
  await page.waitForSelector("h1");
  const text = await page.$eval("h1", (el) => el.textContent);
  expect(text).toBe("Build your dream app");
});
