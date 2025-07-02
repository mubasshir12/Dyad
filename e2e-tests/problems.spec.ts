import { test } from "./helpers/test_helper";
import { expect } from "@playwright/test";

test("problems auto-fix - enabled", async ({ po }) => {
  await po.setUp();
  await po.importApp("minimal");
  await po.runPnpmInstall();

  await po.sendPrompt("tc=create-ts-errors");

  await po.snapshotServerDump("all-messages", { dumpIndex: -2 });
  await po.snapshotServerDump("all-messages", { dumpIndex: -1 });

  await po.snapshotMessages({ replaceDumpPath: true });
});

test.only("problems auto-fix - gives up after 2 attempts", async ({ po }) => {
  await po.setUp();
  await po.importApp("minimal");
  await po.runPnpmInstall();

  await po.sendPrompt("tc=create-unfixable-ts-errors");

  await po.snapshotServerDump("all-messages", { dumpIndex: -2 });
  await po.snapshotServerDump("all-messages", { dumpIndex: -1 });

  await po.page.getByTestId("problem-summary").last().click();
  await expect(
    po.page.getByTestId("problem-summary").last(),
  ).toMatchAriaSnapshot();
  await po.snapshotMessages({ replaceDumpPath: true });
});

test("problems auto-fix - disabled", async ({ po }) => {
  await po.setUp({ disableAutoFixProblems: true });
  await po.importApp("minimal");
  await po.runPnpmInstall();

  await po.sendPrompt("tc=create-ts-errors");

  await po.snapshotMessages();
});
