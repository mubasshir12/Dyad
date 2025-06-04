import { test } from "./helpers/test_helper";

test("supabase - stale ui", async ({ po }) => {
  await po.setUp();
  await po.sendPrompt("tc=add-supabase");
  await po.snapshotMessages();

  await po.page.getByText("Set up supabase").click();
  // On app details page:
  await po.clickConnectSupabaseButton();
  await po.clickBackButton();

  // On chat page:
  await po.snapshotMessages();

  // Create a second app; do NOT integrate it with Supabase, and make sure UI is correct.
  await po.goToAppsTab();
  await po.sendPrompt("tc=add-supabase");
  await po.snapshotMessages();
});
