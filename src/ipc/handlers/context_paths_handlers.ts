import { db } from "@/db";
import { apps } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  ContextPathsSchema,
  ContextPathResult,
  ContextPath,
} from "@/lib/schemas";
import { estimateTokens } from "../utils/token_utils";
import { createLoggedHandler } from "./safe_handle";
import log from "electron-log";
import { getDyadAppPath } from "@/paths/paths";
import { extractCodebase } from "@/utils/codebase";
import { validateContextPaths } from "../utils/context_paths_utils";

const logger = log.scope("context_paths_handlers");
const handle = createLoggedHandler(logger);

export function registerContextPathsHandlers() {
  handle(
    "get-context-paths",
    async (_, { appId }: { appId: number }): Promise<ContextPathResult[]> => {
      z.object({ appId: z.number() }).parse({ appId });

      const app = await db.query.apps.findFirst({
        where: eq(apps.id, appId),
      });

      if (!app) {
        throw new Error("App not found");
      }

      if (!app.path) {
        throw new Error("App path not set");
      }
      const appPath = getDyadAppPath(app.path);

      const results: ContextPathResult[] = [];
      for (const contextPath of validateContextPaths(app.contextPaths)) {
        const { formattedOutput, files } = await extractCodebase({
          appPath,
          contextPaths: [contextPath],
        });
        const totalTokens = estimateTokens(formattedOutput);

        results.push({
          ...contextPath,
          files: files.length,
          tokens: totalTokens,
        });
      }
      return results;
    },
  );

  handle(
    "set-context-paths",
    async (
      _,
      { appId, contextPaths }: { appId: number; contextPaths: ContextPath[] },
    ) => {
      const schema = z.object({
        appId: z.number(),
        contextPaths: ContextPathsSchema,
      });
      schema.parse({ appId, contextPaths });

      await db.update(apps).set({ contextPaths }).where(eq(apps.id, appId));

      return { success: true };
    },
  );
}
