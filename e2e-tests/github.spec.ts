import { expect } from "@playwright/test";
import { test } from "./helpers/test_helper";

test("should connect to GitHub using device flow", async ({ po }) => {
  await po.setUp();
  await po.sendPrompt("tc=basic");

  await po.getTitleBarAppNameButton().click();

  await po.githubConnector.connect();

  // Wait for device flow to start and show the code
  await expect(po.page.locator("text=FAKE-CODE")).toBeVisible();

  // Verify the verification URI is displayed
  await expect(
    po.page.locator("text=https://github.com/login/device"),
  ).toBeVisible();

  // Verify success message
  await expect(
    po.page.locator("text=Successfully connected to GitHub!"),
  ).toBeVisible();

  // Verify the "Set up your GitHub repo" section appears
  await expect(po.githubConnector.getSetupYourGitHubRepoButton()).toBeVisible();
});

// test("should create a new GitHub repository", async ({ page }) => {
//   // Create a new app and connect to GitHub first
//   const { appId } = await helper.createApp("github-create-repo-test");

//   // Mock the GitHub authentication state
//   await page.evaluate(() => {
//     localStorage.setItem(
//       "dyad-settings",
//       JSON.stringify({
//         githubAccessToken: { value: "fake_access_token_12345" },
//       }),
//     );
//   });

//   await page.goto(`/app/${appId}`);
//   await page.waitForSelector('[data-testid="app-details"]', {
//     timeout: 10000,
//   });

//   // Expand the GitHub repo setup section
//   const expandButton = page.locator(
//     'button:has-text("Set up your GitHub repo")',
//   );
//   await expandButton.click();

//   // Verify "Create new repo" is selected by default
//   await expect(
//     page.getByRole("button", { name: "Create new repo" }),
//   ).toHaveClass(/bg-primary/);

//   // Enter repository name
//   const repoNameInput = page.getByLabel("Repository Name");
//   await repoNameInput.fill("test-new-repo");

//   // Wait for availability check
//   await page.waitForSelector("text=Repository name is available!", {
//     timeout: 5000,
//   });

//   // Click create repo button
//   const createButton = page.getByRole("button", { name: "Create Repo" });
//   await expect(createButton).toBeEnabled();
//   await createButton.click();

//   // Wait for success message
//   await page.waitForSelector("text=Repository created and linked!", {
//     timeout: 5000,
//   });
//   await expect(
//     page.locator("text=Repository created and linked!"),
//   ).toBeVisible();

//   // Verify that we now see the connected repo UI
//   await expect(page.locator("text=Connected to GitHub Repo:")).toBeVisible();
//   await expect(page.locator("text=testuser/test-new-repo")).toBeVisible();
// });

// test("should connect to existing GitHub repository", async ({ page }) => {
//   // Create a new app and connect to GitHub first
//   const { appId } = await helper.createApp("github-existing-repo-test");

//   // Mock the GitHub authentication state
//   await page.evaluate(() => {
//     localStorage.setItem(
//       "dyad-settings",
//       JSON.stringify({
//         githubAccessToken: { value: "fake_access_token_12345" },
//       }),
//     );
//   });

//   await page.goto(`/app/${appId}`);
//   await page.waitForSelector('[data-testid="app-details"]', {
//     timeout: 10000,
//   });

//   // Expand the GitHub repo setup section
//   const expandButton = page.locator(
//     'button:has-text("Set up your GitHub repo")',
//   );
//   await expandButton.click();

//   // Click "Connect to existing repo" tab
//   const existingRepoButton = page.getByRole("button", {
//     name: "Connect to existing repo",
//   });
//   await existingRepoButton.click();

//   // Select a repository from the dropdown
//   const repoSelect = page.getByLabel("Select Repository");
//   await repoSelect.click();

//   // Wait for repos to load and select one
//   await page.waitForSelector("text=testuser/existing-app", { timeout: 5000 });
//   await page.getByText("testuser/existing-app").click();

//   // Wait for branches to load
//   await page.waitForSelector("text=main", { timeout: 5000 });

//   // Verify branch is selected
//   const branchSelect = page.getByLabel("Branch");
//   await expect(branchSelect).toHaveValue("main");

//   // Click connect button
//   const connectButton = page.getByRole("button", { name: "Connect to Repo" });
//   await expect(connectButton).toBeEnabled();
//   await connectButton.click();

//   // Wait for success message
//   await page.waitForSelector("text=Connected to repository!", {
//     timeout: 5000,
//   });
//   await expect(page.locator("text=Connected to repository!")).toBeVisible();

//   // Verify that we now see the connected repo UI
//   await expect(page.locator("text=Connected to GitHub Repo:")).toBeVisible();
//   await expect(page.locator("text=testuser/existing-app")).toBeVisible();
// });

// test("should sync to GitHub repository", async ({ page }) => {
//   // Create a new app that's already connected to GitHub
//   const { appId } = await helper.createApp("github-sync-test");

//   // Mock the app as being connected to GitHub
//   await page.evaluate((appId) => {
//     localStorage.setItem(
//       "dyad-settings",
//       JSON.stringify({
//         githubAccessToken: { value: "fake_access_token_12345" },
//       }),
//     );
//     // Mock app state - this would normally come from the database
//     window.__mockAppState = {
//       [appId]: {
//         githubOrg: "testuser",
//         githubRepo: "existing-app",
//         githubBranch: "main",
//       },
//     };
//   }, appId);

//   await page.goto(`/app/${appId}`);
//   await page.waitForSelector('[data-testid="app-details"]', {
//     timeout: 10000,
//   });

//   // Should see the connected GitHub repo UI
//   await expect(page.locator("text=Connected to GitHub Repo:")).toBeVisible();
//   await expect(page.locator("text=testuser/existing-app")).toBeVisible();

//   // Click sync button
//   const syncButton = page.getByRole("button", { name: "Sync to GitHub" });
//   await expect(syncButton).toBeVisible();
//   await syncButton.click();

//   // Wait for sync to complete
//   await page.waitForSelector("text=Successfully pushed to GitHub!", {
//     timeout: 10000,
//   });
//   await expect(
//     page.locator("text=Successfully pushed to GitHub!"),
//   ).toBeVisible();
// });

// test("should disconnect from GitHub repository", async ({ page }) => {
//   // Create a new app that's already connected to GitHub
//   const { appId } = await helper.createApp("github-disconnect-test");

//   // Mock the app as being connected to GitHub
//   await page.evaluate((appId) => {
//     localStorage.setItem(
//       "dyad-settings",
//       JSON.stringify({
//         githubAccessToken: { value: "fake_access_token_12345" },
//       }),
//     );
//     window.__mockAppState = {
//       [appId]: {
//         githubOrg: "testuser",
//         githubRepo: "existing-app",
//         githubBranch: "main",
//       },
//     };
//   }, appId);

//   await page.goto(`/app/${appId}`);
//   await page.waitForSelector('[data-testid="app-details"]', {
//     timeout: 10000,
//   });

//   // Should see the connected GitHub repo UI
//   await expect(page.locator("text=Connected to GitHub Repo:")).toBeVisible();

//   // Click disconnect button
//   const disconnectButton = page.getByRole("button", {
//     name: "Disconnect from repo",
//   });
//   await expect(disconnectButton).toBeVisible();
//   await disconnectButton.click();

//   // Should go back to the unconnected state
//   await expect(page.locator("text=Set up your GitHub repo")).toBeVisible();
//   await expect(
//     page.locator("text=Connected to GitHub Repo:"),
//   ).not.toBeVisible();
// });

// test("should handle repository name conflicts", async ({ page }) => {
//   // Create a new app and connect to GitHub first
//   const { appId } = await helper.createApp("github-conflict-test");

//   // Mock the GitHub authentication state
//   await page.evaluate(() => {
//     localStorage.setItem(
//       "dyad-settings",
//       JSON.stringify({
//         githubAccessToken: { value: "fake_access_token_12345" },
//       }),
//     );
//   });

//   await page.goto(`/app/${appId}`);
//   await page.waitForSelector('[data-testid="app-details"]', {
//     timeout: 10000,
//   });

//   // Expand the GitHub repo setup section
//   const expandButton = page.locator(
//     'button:has-text("Set up your GitHub repo")',
//   );
//   await expandButton.click();

//   // Try to create a repo with a name that already exists
//   const repoNameInput = page.getByLabel("Repository Name");
//   await repoNameInput.fill("existing-app"); // This should conflict with our mock data

//   // Wait for availability check to show conflict
//   await page.waitForSelector("text=Repository already exists", {
//     timeout: 5000,
//   });
//   await expect(page.locator("text=Repository already exists")).toBeVisible();

//   // Create repo button should be disabled
//   const createButton = page.getByRole("button", { name: "Create Repo" });
//   await expect(createButton).toBeDisabled();
// });

// test("should handle custom branch names", async ({ page }) => {
//   // Create a new app and connect to GitHub first
//   const { appId } = await helper.createApp("github-custom-branch-test");

//   // Mock the GitHub authentication state
//   await page.evaluate(() => {
//     localStorage.setItem(
//       "dyad-settings",
//       JSON.stringify({
//         githubAccessToken: { value: "fake_access_token_12345" },
//       }),
//     );
//   });

//   await page.goto(`/app/${appId}`);
//   await page.waitForSelector('[data-testid="app-details"]', {
//     timeout: 10000,
//   });

//   // Expand the GitHub repo setup section
//   const expandButton = page.locator(
//     'button:has-text("Set up your GitHub repo")',
//   );
//   await expandButton.click();

//   // Switch to existing repo mode
//   const existingRepoButton = page.getByRole("button", {
//     name: "Connect to existing repo",
//   });
//   await existingRepoButton.click();

//   // Select a repository
//   const repoSelect = page.getByLabel("Select Repository");
//   await repoSelect.click();
//   await page.waitForSelector("text=testuser/existing-app", { timeout: 5000 });
//   await page.getByText("testuser/existing-app").click();

//   // Wait for branches to load
//   await page.waitForSelector("text=main", { timeout: 5000 });

//   // Click on branch dropdown to show custom option
//   const branchSelect = page.getByLabel("Branch");
//   await branchSelect.click();

//   // Select custom branch option
//   await page.getByText("✏️ Type custom branch name").click();

//   // Enter custom branch name
//   const customBranchInput = page.getByPlaceholder(
//     "Enter branch name (e.g., feature/new-feature)",
//   );
//   await customBranchInput.fill("feature/custom-branch");

//   // Connect button should be enabled
//   const connectButton = page.getByRole("button", { name: "Connect to Repo" });
//   await expect(connectButton).toBeEnabled();
//   await connectButton.click();

//   // Wait for success
//   await page.waitForSelector("text=Connected to repository!", {
//     timeout: 5000,
//   });
//   await expect(page.locator("text=Connected to repository!")).toBeVisible();
// });
