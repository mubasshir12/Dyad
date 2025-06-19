import { test } from "./helpers/test_helper";

test("chat mode selector - default build mode", async ({ po }) => {
  await po.setUp();

  // The chat mode selector should be visible and default to "Build"
  const chatModeSelector = po.page.locator(
    '[data-testid="chat-mode-selector"]',
  );
  await chatModeSelector.waitFor({ state: "visible" });

  // Check that "Build" is selected by default
  await po.page.waitForSelector('text="Build"');

  // Send a prompt that would normally trigger code changes
  await po.sendPrompt("add a button component");
  await po.waitForChatCompletion();

  // In build mode, it should create code changes
  await po.snapshotMessages();
});

test("chat mode selector - switch to ask mode", async ({ po }) => {
  await po.setUp();

  // Find and click the chat mode selector
  const chatModeSelector = po.page.locator(
    '[data-testid="chat-mode-selector"]',
  );
  await chatModeSelector.waitFor({ state: "visible" });
  await chatModeSelector.click();

  // Select "Ask" mode
  await po.page.getByRole("option", { name: "Ask" }).click();

  // Verify "Ask" is now selected
  await po.page.waitForSelector('text="Ask"');

  // Send the same prompt
  await po.sendPrompt("add a button component");
  await po.waitForChatCompletion();

  // In ask mode, it should provide explanations without code changes
  await po.snapshotMessages();
});

test("chat mode selector - persistence across sessions", async ({ po }) => {
  await po.setUp();

  // Switch to Ask mode
  const chatModeSelector = po.page.locator(
    '[data-testid="chat-mode-selector"]',
  );
  await chatModeSelector.waitFor({ state: "visible" });
  await chatModeSelector.click();
  await po.page.getByRole("option", { name: "Ask" }).click();

  // Verify Ask is selected
  await po.page.waitForSelector('text="Ask"');

  // Navigate to a different tab and back to verify persistence
  await po.goToAppsTab();
  await po.goToChatTab();

  // Check that Ask mode is still selected
  await po.page.waitForSelector('text="Ask"');
});
