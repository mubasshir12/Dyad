import { test } from "./helpers/test_helper";

test("write to index, approve, check preview", async ({ po }) => {
  await po.setUp();
  await po.sendPrompt("tc=write-index");
  await po.snapshotMessages();
  await po.approveProposal();

  // Should be slightly different from above, because it will say "approved"
  await po.snapshotMessages();

  await po.expectPreviewToBeVisible();
  await po.snapshotPreview();
});
