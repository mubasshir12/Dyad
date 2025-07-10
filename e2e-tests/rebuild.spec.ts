import { testSkipIfWindows, Timeout } from "./helpers/test_helper";
import { expect } from "@playwright/test";
import fs from "fs";
import path from "path";

testSkipIfWindows("rebuild app", async ({ po }) => {
  await po.setUp({ autoApprove: true });
  await po.sendPrompt("hi");
  await po.snapshotPreview();

  const currentAppPath = await po.getCurrentAppPath();
  const testPath = path.join(currentAppPath, "node_modules", "test.txt");
  fs.writeFileSync(testPath, "test");

  await po.clickRebuild();
  await expect(po.locateStartingAppPreview()).toBeVisible();
  await expect(po.locateStartingAppPreview()).not.toBeVisible({
    timeout: Timeout.LONG,
  });

  // Check that the file is removed with the rebuild
  expect(fs.existsSync(testPath)).toBe(false);
  await po.snapshotPreview();
});
