import { test } from "./helpers/test_helper";
import { expect } from "@playwright/test";
import fs from "fs";
import path from "path";

test("problems auto-fix - enabled", async ({ po }) => {
  await po.setUp();
  await po.importApp("minimal");
  await po.runPnpmInstall();

  await po.sendPrompt("tc=create-ts-errors");

  await po.snapshotServerDump("all-messages", { dumpIndex: -2 });
  await po.snapshotServerDump("all-messages", { dumpIndex: -1 });

  await po.snapshotMessages({ replaceDumpPath: true });
});

test("problems auto-fix - gives up after 2 attempts", async ({ po }) => {
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

test.only("problems - manual edit (react/vite)", async ({ po }) => {
  await po.setUp();
  await po.sendPrompt("tc=1");

  const appPath = await po.getCurrentAppPath();
  const badFilePath = path.join(appPath, "src", "bad-file.tsx");
  fs.writeFileSync(
    badFilePath,
    `const App = () => <div>Minimal imported app</div>;
nonExistentFunction();    

export default App;
`,
  );
  await po.runPnpmInstall();
  await po.clickTogglePreviewPanel();

  await po.selectPreviewMode("problems");
  await po.clickRecheckProblems();
  await po.snapshotProblemsPane();

  fs.unlinkSync(badFilePath);

  await po.clickRecheckProblems();
  await po.snapshotProblemsPane();
});

test.only("problems - manual edit (next.js)", async ({ po }) => {
  await po.setUp();
  await po.selectHubTemplate("Next.js Template");
  await po.sendPrompt("tc=1");

  const appPath = await po.getCurrentAppPath();
  const badFilePath = path.join(appPath, "src", "bad-file.tsx");
  fs.writeFileSync(
    badFilePath,
    `const App = () => <div>Minimal imported app</div>;
  nonExistentFunction();    
  
  export default App;
  `,
  );
  await po.runPnpmInstall();
  await po.clickTogglePreviewPanel();

  await po.selectPreviewMode("problems");
  await po.clickRecheckProblems();
  await po.snapshotProblemsPane();

  fs.unlinkSync(badFilePath);

  await po.clickRecheckProblems();
  await po.snapshotProblemsPane();
});
