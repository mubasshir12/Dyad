import { test } from "./helpers/test_helper";

test("chat mode selector - default build mode", async ({ po }) => {
  await po.setUp({ autoApprove: true });
  await po.importApp("minimal");

  // await po.selectChatMode("build");
  await po.sendPrompt("[dump] hi");
  await po.waitForChatCompletion();

  await po.snapshotMessages();
  await po.snapshotServerDump("all-messages");
});

test("chat mode selector - ask mode", async ({ po }) => {
  await po.setUp({ autoApprove: true });
  await po.importApp("minimal");

  await po.selectChatMode("ask");
  await po.sendPrompt("[dump] hi");
  await po.waitForChatCompletion();

  await po.snapshotMessages();
  await po.snapshotServerDump("all-messages");
});
