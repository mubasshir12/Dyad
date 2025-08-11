import { test, Timeout } from "./helpers/test_helper";
import { expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const MINIMAL_APP = "minimal-with-ai-rules";

test("problems auto-fix - enabled", async ({ po }) => {
  await po.setUp({ enableAutoFixProblems: true });
  await po.importApp(MINIMAL_APP);
  await po.expectPreviewIframeIsVisible();

  await po.sendPrompt("tc=create-ts-errors");

  await po.snapshotServerDump("all-messages", { dumpIndex: -2 });
  await po.snapshotServerDump("all-messages", { dumpIndex: -1 });

  await po.snapshotMessages({ replaceDumpPath: true });
});

test("problems auto-fix - gives up after 2 attempts", async ({ po }) => {
  await po.setUp({ enableAutoFixProblems: true });
  await po.importApp(MINIMAL_APP);
  await po.expectPreviewIframeIsVisible();

  await po.sendPrompt("tc=create-unfixable-ts-errors");

  await po.snapshotServerDump("all-messages", { dumpIndex: -2 });
  await po.snapshotServerDump("all-messages", { dumpIndex: -1 });

  await po.page.getByTestId("problem-summary").last().click();
  await expect(
    po.page.getByTestId("problem-summary").last(),
  ).toMatchAriaSnapshot();
  await po.snapshotMessages({ replaceDumpPath: true });
});

test("problems auto-fix - complex delete-rename-write", async ({ po }) => {
  await po.setUp({ enableAutoFixProblems: true });
  await po.importApp(MINIMAL_APP);
  await po.expectPreviewIframeIsVisible();

  await po.sendPrompt("tc=create-ts-errors-complex");

  await po.snapshotServerDump("all-messages", { dumpIndex: -2 });
  await po.snapshotServerDump("all-messages", { dumpIndex: -1 });

  await po.snapshotMessages({ replaceDumpPath: true });
});

test("problems auto-fix - disabled", async ({ po }) => {
  await po.setUp({ enableAutoFixProblems: false });
  await po.importApp(MINIMAL_APP);
  await po.expectPreviewIframeIsVisible();

  await po.sendPrompt("tc=create-ts-errors");

  await po.snapshotMessages();
});

test("problems - fix all", async ({ po }) => {
  await po.setUp({ enableAutoFixProblems: true });
  await po.importApp(MINIMAL_APP);
  const appPath = await po.getCurrentAppPath();
  const badFilePath = path.join(appPath, "src", "bad-file.tsx");
  fs.writeFileSync(
    badFilePath,
    `const App = () => <div>Minimal imported app</div>;
nonExistentFunction1();
nonExistentFunction2();
nonExistentFunction3();

export default App;
`,
  );
  await po.runPnpmInstall();

  await po.sendPrompt("tc=create-ts-errors");
  await po.selectPreviewMode("problems");
  await po.clickFixAllProblems();

  await po.snapshotServerDump("last-message");
  await po.snapshotMessages({ replaceDumpPath: true });
});

test("problems - manual edit (react/vite)", async ({ po }) => {
  await po.setUp({ enableAutoFixProblems: true });
  await po.sendPrompt("tc=1");

  const appPath = await po.getCurrentAppPath();
  const badFilePath = path.join(appPath, "src", "bad-file.tsx");
  const appFilePath = path.join(appPath, "src", "App.tsx");

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

  // Ensure App.tsx exists before rechecking problems
  if (!fs.existsSync(appFilePath)) {
    fs.writeFileSync(
      appFilePath,
      `const App = () => <div>Minimal imported app</div>;\nexport default App;\n`,
    );
  }

  // Wait for file system changes to be detected and UI to update
  await po.page.waitForTimeout(2000);

  await po.clickRecheckProblems();
  await expect(po.page.getByTestId("problem-summary")).toHaveCount(0, {
    timeout: Timeout.LONG,
  });
  await po.snapshotProblemsPane();
});

test("problems - manual edit (next.js)", async ({ po }) => {
  await po.setUp({ enableAutoFixProblems: true });
  await po.goToHubAndSelectTemplate("Next.js Template");
  await po.sendPrompt("tc=1");

  const appPath = await po.getCurrentAppPath();
  const badFilePath = path.join(appPath, "src", "bad-file.tsx");
  const appFilePath = path.join(appPath, "src", "App.tsx");

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

  // Ensure App.tsx exists before rechecking problems
  if (!fs.existsSync(appFilePath)) {
    fs.writeFileSync(
      appFilePath,
      `const App = () => <div>Minimal imported app</div>;\nexport default App;\n`,
    );
  }

  // Wait for file system changes to be detected and UI to update
  await po.page.waitForTimeout(2000);

  await po.clickRecheckProblems();
  await po.snapshotProblemsPane();
});
