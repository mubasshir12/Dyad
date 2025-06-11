// await page.getByTestId('preview-pick-element-button').click();
// await page.getByRole('button', { name: 'Deselect component' }).click();
// await page.locator('[data-testid="preview-iframe-element"]').contentFrame().getByRole('heading', { name: 'Launch Your Next Project' }).click();
import { expect } from "@playwright/test";
import { test } from "./helpers/test_helper";

test("select component", async ({ po }) => {
  await po.setUp();
  await po.sendPrompt("tc=basic");
  await po.clickTogglePreviewPanel();
  await po.clickPreviewPickElement();

  await po
    .getPreviewIframeElement()
    .contentFrame()
    .getByRole("heading", { name: "Welcome to Your Blank App" })
    .click();

  await po.snapshotPreview();
  await po.snapshotSelectedComponentDisplay();

  await po.sendPrompt("[dump] make it smaller");
  await po.snapshotPreview();
  await expect(po.getSelectedComponentDisplay()).not.toBeVisible();

  await po.snapshotServerDump("all-messages");

  // Send one more prompt to make sure it's a normal message.
  await po.sendPrompt("[dump] tc=basic");
  await po.snapshotServerDump("last-message");
});

test("deselect component", async ({ po }) => {
  await po.setUp();
  await po.sendPrompt("tc=basic");
  await po.clickTogglePreviewPanel();
  await po.clickPreviewPickElement();

  await po
    .getPreviewIframeElement()
    .contentFrame()
    .getByRole("heading", { name: "Welcome to Your Blank App" })
    .click();

  await po.snapshotPreview();
  await po.snapshotSelectedComponentDisplay();

  // Deselect the component and make sure the state has reverted
  await po.clickDeselectComponent();

  await po.snapshotPreview();
  await expect(po.getSelectedComponentDisplay()).not.toBeVisible();

  // Send one more prompt to make sure it's a normal message.
  await po.sendPrompt("[dump] tc=basic");
  await po.snapshotServerDump("last-message");
});
