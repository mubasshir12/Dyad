// await page.locator('div').filter({ hasText: /^scaffold2$/ }).getByRole('button').click();
// await page.getByRole('textbox', { name: 'Enter new app name' }).click();
// await page.getByRole('textbox', { name: 'Enter new app name' }).fill('scaffold23');
// await page.getByRole('button', { name: 'Continue' }).click();
// await page.getByRole('button', { name: 'Recommended Rename app and' }).click();
// await page.locator('div').filter({ hasText: /^scaffold23$/ }).getByRole('button').click();
// await page.getByRole('textbox', { name: 'Enter new app name' }).fill('scaffold234');
// await page.getByRole('button', { name: 'Continue' }).click();
// await page.getByRole('button', { name: 'Rename app only The folder' }).click();
// await page.locator('div').filter({ hasText: /^\/Users\/will\/dyad-apps\/scaffold23$/ }).click();

import fs from "fs";
import { test } from "./helpers/test_helper";
import { expect } from "@playwright/test";

test("rename app (including folder)", async ({ po }) => {
  await po.setUp();
  await po.sendPrompt("hi");

  const appPath = await po.getCurrentAppPath();
  await po.getTitleBarAppNameButton().click();

  await po.clickAppDetailsRenameAppButton();
  await po.page
    .getByRole("textbox", { name: "Enter new app name" })
    .fill("new-app-name");
  await po.page.getByRole("button", { name: "Continue" }).click();
  await po.page
    .getByRole("button", { name: "Recommended Rename app and" })
    .click();

  await expect(async () => {
    expect(await po.getCurrentAppName()).toBe("new-app-name");
  }).toPass();

  expect(fs.existsSync(appPath)).toBe(false);
  const newAppPath = po.getAppPath({ appName: "new-app-name" });
  expect(fs.existsSync(newAppPath)).toBe(true);

  await expect(po.page.getByText(newAppPath)).toBeVisible();
});

test("rename app (without folder)", async ({ po }) => {
  await po.setUp();
  await po.sendPrompt("hi");

  const appPath = await po.getCurrentAppPath();
  await po.getTitleBarAppNameButton().click();

  await po.clickAppDetailsRenameAppButton();
  await po.page
    .getByRole("textbox", { name: "Enter new app name" })
    .fill("new-app-name");
  await po.page.getByRole("button", { name: "Continue" }).click();
  await po.page
    .getByRole("button", { name: "Rename app only The folder" })
    .click();

  await expect(async () => {
    expect(await po.getCurrentAppName()).toBe("new-app-name");
  }).toPass();

  expect(fs.existsSync(appPath)).toBe(true);
  await expect(po.page.getByText(appPath)).toBeVisible();
});
