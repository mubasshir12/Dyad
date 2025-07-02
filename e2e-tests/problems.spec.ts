import { test } from "./helpers/test_helper";

test("problems auto-fix", async ({ po }) => {
  await po.setUp();
  await po.importApp("minimal");
  await po.runPnpmInstall();

  await po.sendPrompt("tc=create-ts-errors");

  await po.snapshotServerDump("all-messages", { dumpIndex: -2 });
  await po.snapshotServerDump("all-messages", { dumpIndex: -1 });

  await po.snapshotMessages({ replaceDumpPath: true });
});
