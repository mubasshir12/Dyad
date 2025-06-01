import { test } from "./helpers/test_helper";

// This is useful to make sure the messages are being sent correctly.
test("attach image", async ({ po }) => {
  await po.setUp();

  await po
    .getHomeChatInputContainer()
    .locator("input[type='file']")
    .setInputFiles("e2e-tests/fixtures/images/logo.png");
  await po.sendPrompt("[dump]");
  await po.snapshotServerDump({ onlyLastMessage: true });
});
