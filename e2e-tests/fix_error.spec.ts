import { test } from "./helpers/test_helper";

test("fix error with AI", async ({ po }) => {
  await po.setUp({ autoApprove: true });
  await po.sendPrompt("tc=create-error");

  await po.snapshotPreviewErrorBanner();

  await po.page.getByText("Error Line 6 error", { exact: true }).click();
  await po.snapshotPreviewErrorBanner();

  await po.clickFixErrorWithAI();
  await po.waitForChatCompletion();
  await po.snapshotMessages();

  await po.locatePreviewErrorBanner().waitFor({ state: "hidden" });
  await po.snapshotPreview();
});
