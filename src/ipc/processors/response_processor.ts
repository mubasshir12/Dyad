import { db } from "../../db";
import { chats, messages } from "../../db/schema";
import { and, eq } from "drizzle-orm";
import fs from "node:fs";
import { getDyadAppPath } from "../../paths/paths";
import path from "node:path";
import git from "isomorphic-git";

import { getGitAuthor } from "../utils/git_author";
import log from "electron-log";
import { executeAddDependency } from "./executeAddDependency";
import {
  deleteSupabaseFunction,
  deploySupabaseFunctions,
  executeSupabaseSql,
} from "../../supabase_admin/supabase_management_client";
import { isServerFunction } from "../../supabase_admin/supabase_utils";
import { SqlQuery } from "../../lib/schemas";

const readFile = fs.promises.readFile;
const logger = log.scope("response_processor");

export function getDyadWriteTags(fullResponse: string): {
  path: string;
  content: string;
  description?: string;
}[] {
  const dyadWriteRegex = /<dyad-write([^>]*)>([\s\S]*?)<\/dyad-write>/gi;
  const pathRegex = /path="([^"]+)"/;
  const descriptionRegex = /description="([^"]+)"/;

  let match;
  const tags: { path: string; content: string; description?: string }[] = [];

  while ((match = dyadWriteRegex.exec(fullResponse)) !== null) {
    const attributesString = match[1];
    let content = match[2].trim();

    const pathMatch = pathRegex.exec(attributesString);
    const descriptionMatch = descriptionRegex.exec(attributesString);

    if (pathMatch && pathMatch[1]) {
      const path = pathMatch[1];
      const description = descriptionMatch?.[1];

      const contentLines = content.split("\n");
      if (contentLines[0]?.startsWith("```")) {
        contentLines.shift();
      }
      if (contentLines[contentLines.length - 1]?.startsWith("```")) {
        contentLines.pop();
      }
      content = contentLines.join("\n");

      tags.push({ path, content, description });
    } else {
      logger.warn(
        "Found <dyad-write> tag without a valid 'path' attribute:",
        match[0],
      );
    }
  }
  return tags;
}

export function getDyadRenameTags(fullResponse: string): {
  from: string;
  to: string;
}[] {
  const dyadRenameRegex =
    /<dyad-rename from="([^"]+)" to="([^"]+)"[^>]*>([\s\S]*?)<\/dyad-rename>/g;
  let match;
  const tags: { from: string; to: string }[] = [];
  while ((match = dyadRenameRegex.exec(fullResponse)) !== null) {
    tags.push({ from: match[1], to: match[2] });
  }
  return tags;
}

export function getDyadDeleteTags(fullResponse: string): string[] {
  const dyadDeleteRegex =
    /<dyad-delete path="([^"]+)"[^>]*>([\s\S]*?)<\/dyad-delete>/g;
  let match;
  const paths: string[] = [];
  while ((match = dyadDeleteRegex.exec(fullResponse)) !== null) {
    paths.push(match[1]);
  }
  return paths;
}

export function getDyadAddDependencyTags(fullResponse: string): string[] {
  const dyadAddDependencyRegex =
    /<dyad-add-dependency packages="([^"]+)">[^<]*<\/dyad-add-dependency>/g;
  let match;
  const packages: string[] = [];
  while ((match = dyadAddDependencyRegex.exec(fullResponse)) !== null) {
    packages.push(...match[1].split(" "));
  }
  return packages;
}

export function getDyadChatSummaryTag(fullResponse: string): string | null {
  const dyadChatSummaryRegex =
    /<dyad-chat-summary>([\s\S]*?)<\/dyad-chat-summary>/g;
  const match = dyadChatSummaryRegex.exec(fullResponse);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

export function getDyadExecuteSqlTags(fullResponse: string): SqlQuery[] {
  const dyadExecuteSqlRegex =
    /<dyad-execute-sql([^>]*)>([\s\S]*?)<\/dyad-execute-sql>/g;
  const descriptionRegex = /description="([^"]+)"/;
  let match;
  const queries: { content: string; description?: string }[] = [];

  while ((match = dyadExecuteSqlRegex.exec(fullResponse)) !== null) {
    const attributesString = match[1] || "";
    let content = match[2].trim();
    const descriptionMatch = descriptionRegex.exec(attributesString);
    const description = descriptionMatch?.[1];

    // Handle markdown code blocks if present
    const contentLines = content.split("\n");
    if (contentLines[0]?.startsWith("```")) {
      contentLines.shift();
    }
    if (contentLines[contentLines.length - 1]?.startsWith("```")) {
      contentLines.pop();
    }
    content = contentLines.join("\n");

    queries.push({ content, description });
  }

  return queries;
}

export function getDyadCommandTags(fullResponse: string): string[] {
  const dyadCommandRegex =
    /<dyad-command type="([^"]+)"[^>]*><\/dyad-command>/g;
  let match;
  const commands: string[] = [];

  while ((match = dyadCommandRegex.exec(fullResponse)) !== null) {
    commands.push(match[1]);
  }

  return commands;
}

interface Output {
  message: string;
  error: unknown;
}

function getFunctionNameFromPath(input: string): string {
  return path.basename(path.extname(input) ? path.dirname(input) : input);
}

async function readFileFromFunctionPath(input: string): Promise<string> {
  // Sometimes, the path given is a directory, sometimes it's the file itself.
  if (path.extname(input) === "") {
    return readFile(path.join(input, "index.ts"), "utf8");
  }
  return readFile(input, "utf8");
}

export async function processFullResponseActions(
  fullResponse: string,
  // Allow chatId and messageId to be special values (e.g., -1) to skip DB operations
  chatId: number, 
  {
    chatSummary,
    messageId,
  }: { chatSummary: string | undefined; messageId: number },
  // New optional parameter to control behavior, especially for website_generator
  options?: {
    appPathOverride?: string; // Allows using a custom path like buildDirectory
    skipDbOperations?: boolean; // General flag to skip DB writes
    skipSupabaseOperations?: boolean; // Flag to skip Supabase specific ops
  }
): Promise<{
  updatedFiles?: boolean;
  error?: string;
  extraFiles?: string[];
  extraFilesError?: string;
}> {
  logger.log("processFullResponseActions for chatId", chatId, "messageId", messageId, "options", options);

  const effectiveAppPath = options?.appPathOverride || (chatId !== -1 ? await (async () => {
    const chatWithApp = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
      with: { app: true },
    });
    if (!chatWithApp || !chatWithApp.app) {
      logger.error(`No app found for chat ID: ${chatId} (and no appPathOverride provided)`);
      // This path should not be taken if appPathOverride is correctly supplied by website_generator
      throw new Error(`App path determination failed for chatId: ${chatId}`);
    }
    return getDyadAppPath(chatWithApp.app.path);
  })() : '');

  if (!effectiveAppPath && !options?.appPathOverride) {
    // This case should ideally be prevented by caller logic
    logger.error("effectiveAppPath could not be determined and was not overridden.");
    return { error: "Application path could not be determined." };
  }
  
  const supabaseProjectId = chatId !== -1 && !options?.skipSupabaseOperations ? await (async () => {
    const chatWithApp = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
      with: { app: true },
    });
    return chatWithApp?.app?.supabaseProjectId;
  })() : undefined;
  const writtenFiles: string[] = [];
  const renamedFiles: string[] = [];
  const deletedFiles: string[] = [];
  let hasChanges = false;

  const warnings: Output[] = [];
  const errors: Output[] = [];

  try {
    // Extract all tags
    const dyadWriteTags = getDyadWriteTags(fullResponse);
    const dyadRenameTags = getDyadRenameTags(fullResponse);
    const dyadDeletePaths = getDyadDeleteTags(fullResponse);
    const dyadAddDependencyPackages = getDyadAddDependencyTags(fullResponse);
    const dyadExecuteSqlQueries = supabaseProjectId
      ? getDyadExecuteSqlTags(fullResponse)
      : [];

    // Retrieve message only if we are not skipping DB operations and messageId is valid
    const message = (!options?.skipDbOperations && messageId !== -1) ? await db.query.messages.findFirst({
      where: and(
        eq(messages.id, messageId),
        eq(messages.role, "assistant"),
        eq(messages.chatId, chatId),
      ),
    }) : { id: -1, content: fullResponse, approvalState: null, commitHash: null }; // Mock message if DB ops are skipped

    if (!message && !options?.skipDbOperations) { // Only error if we expected a message
      logger.error(`No message found for ID: ${messageId} and DB operations not skipped.`);
      return { error: `Message with ID ${messageId} not found.`};
    }
    
    const skipDbUpdateForDependencies = options?.skipDbOperations || messageId === -1;

    // Handle SQL execution tags
    if (supabaseProjectId && dyadExecuteSqlQueries.length > 0) {
      for (const query of dyadExecuteSqlQueries) {
        try {
          await executeSupabaseSql({
            supabaseProjectId: supabaseProjectId,
            query: query.content,
          });
        } catch (error) {
          errors.push({
            message: `Failed to execute SQL query: ${query.content}`,
            error: error,
          });
        }
      }
      logger.log(`Executed ${dyadExecuteSqlQueries.length} SQL queries`);
    }

    // Handle add dependency tags
    if (dyadAddDependencyPackages.length > 0) {
      try {
        await executeAddDependency({
          packages: dyadAddDependencyPackages,
          // Provide a valid-looking message object even if DB ops are skipped,
          // as executeAddDependency might use its structure (e.g. message.content)
          message: message || { id: -1, content: fullResponse, approvalState: 'approved', commitHash: null, chatId: -1, role: 'assistant', createdAt: new Date() },
          appPath: effectiveAppPath,
          skipDbUpdate: skipDbUpdateForDependencies,
        });
      } catch (error) {
        errors.push({
          message: `Failed to add dependencies: ${dyadAddDependencyPackages.join(
            ", ",
          )}`,
          error: error,
        });
      }
      writtenFiles.push("package.json");
      const pnpmFilename = "pnpm-lock.yaml";
      if (fs.existsSync(path.join(effectiveAppPath, pnpmFilename))) {
        writtenFiles.push(pnpmFilename);
      }
      const packageLockFilename = "package-lock.json";
      if (fs.existsSync(path.join(effectiveAppPath, packageLockFilename))) {
        writtenFiles.push(packageLockFilename);
      }
    }

    // Process all file writes
    for (const tag of dyadWriteTags) {
      const filePath = tag.path;
      const content = tag.content;
      const fullFilePath = path.join(effectiveAppPath, filePath);

      // Ensure directory exists
      const dirPath = path.dirname(fullFilePath);
      fs.mkdirSync(dirPath, { recursive: true });

      // Write file content
      fs.writeFileSync(fullFilePath, content);
      logger.log(`Successfully wrote file: ${fullFilePath}`);
      writtenFiles.push(filePath);
      if (supabaseProjectId && isServerFunction(filePath)) {
        try {
          await deploySupabaseFunctions({
            supabaseProjectId: supabaseProjectId,
            functionName: path.basename(path.dirname(filePath)),
            content: content,
          });
        } catch (error) {
          errors.push({
            message: `Failed to deploy Supabase function: ${filePath}`,
            error: error,
          });
        }
      }
    }

    // Process all file renames
    for (const tag of dyadRenameTags) {
      const fromPath = path.join(effectiveAppPath, tag.from);
      const toPath = path.join(effectiveAppPath, tag.to);

      // Ensure target directory exists
      const dirPath = path.dirname(toPath);
      fs.mkdirSync(dirPath, { recursive: true });

      // Rename the file
      if (fs.existsSync(fromPath)) {
        fs.renameSync(fromPath, toPath);
        logger.log(`Successfully renamed file: ${fromPath} -> ${toPath}`);
        renamedFiles.push(tag.to);

        // Add the new file and remove the old one from git
        await git.add({
          fs,
          dir: effectiveAppPath,
          filepath: tag.to,
        });
        try {
          await git.remove({
            fs,
            dir: effectiveAppPath,
            filepath: tag.from,
          });
        } catch (error) {
          logger.warn(`Failed to git remove old file ${tag.from}:`, error);
        }
      } else {
        logger.warn(`Source file for rename does not exist: ${fromPath}`);
      }
      if (supabaseProjectId && isServerFunction(tag.from)) {
        try {
          await deleteSupabaseFunction({
            supabaseProjectId: supabaseProjectId,
            functionName: getFunctionNameFromPath(tag.from),
          });
        } catch (error) {
          warnings.push({
            message: `Failed to delete Supabase function: ${tag.from} as part of renaming ${tag.from} to ${tag.to}`,
            error: error,
          });
        }
      }
      if (supabaseProjectId && isServerFunction(tag.to)) {
        try {
          await deploySupabaseFunctions({
            supabaseProjectId: supabaseProjectId,
            functionName: getFunctionNameFromPath(tag.to),
            content: await readFileFromFunctionPath(toPath),
          });
        } catch (error) {
          errors.push({
            message: `Failed to deploy Supabase function: ${tag.to} as part of renaming ${tag.from} to ${tag.to}`,
            error: error,
          });
        }
      }
    }

    // Process all file deletions
    for (const filePath of dyadDeletePaths) {
      const fullFilePath = path.join(effectiveAppPath, filePath);

      if (fs.existsSync(fullFilePath)) {
        if (fs.lstatSync(fullFilePath).isDirectory()) {
          fs.rmdirSync(fullFilePath, { recursive: true });
        } else {
          fs.unlinkSync(fullFilePath);
        }
        logger.log(`Successfully deleted file: ${fullFilePath}`);
        deletedFiles.push(filePath);

        try {
          await git.remove({
            fs,
            dir: effectiveAppPath,
            filepath: filePath,
          });
        } catch (error) {
          logger.warn(`Failed to git remove deleted file ${filePath}:`, error);
        }
      } else {
        logger.warn(`File to delete does not exist: ${fullFilePath}`);
      }
      if (supabaseProjectId && isServerFunction(filePath)) {
        try {
          await deleteSupabaseFunction({
            supabaseProjectId: supabaseProjectId,
            functionName: getFunctionNameFromPath(filePath),
          });
        } catch (error) {
          errors.push({
            message: `Failed to delete Supabase function: ${filePath}`,
            error: error,
          });
        }
      }
    }

    // If we have any file changes, commit them all at once
    hasChanges =
      writtenFiles.length > 0 ||
      renamedFiles.length > 0 ||
      deletedFiles.length > 0 ||
      dyadAddDependencyPackages.length > 0 ||
      dyadExecuteSqlQueries.length > 0;

    let uncommittedFiles: string[] = [];
    let extraFilesError: string | undefined;

    if (hasChanges) {
      // Stage all written files
      for (const file of writtenFiles) {
        await git.add({
          fs,
          dir: effectiveAppPath,
          filepath: file,
        });
      }

      // Create commit with details of all changes
      const changes = [];
      if (writtenFiles.length > 0)
        changes.push(`wrote ${writtenFiles.length} file(s)`);
      if (renamedFiles.length > 0)
        changes.push(`renamed ${renamedFiles.length} file(s)`);
      if (deletedFiles.length > 0)
        changes.push(`deleted ${deletedFiles.length} file(s)`);
      if (dyadAddDependencyPackages.length > 0)
        changes.push(
          `added ${dyadAddDependencyPackages.join(", ")} package(s)`,
        );
      if (supabaseProjectId && dyadExecuteSqlQueries.length > 0)
        changes.push(`executed ${dyadExecuteSqlQueries.length} SQL queries`);

      let commitMessageText = chatSummary
        ? `[dyad] ${chatSummary} - ${changes.join(", ")}`
        : `[dyad] ${changes.join(", ")}`;
      
      let commitHash = await git.commit({
        fs,
        dir: effectiveAppPath,
        message: commitMessageText,
        author: await getGitAuthor(), // Ensure getGitAuthor doesn't rely on DB if skipDbOperations
      });
      logger.log(`Successfully committed changes: ${changes.join(", ")} in ${effectiveAppPath}`);

      // Check for any uncommitted changes after the commit
      const statusMatrix = await git.statusMatrix({ fs, dir: effectiveAppPath });
      uncommittedFiles = statusMatrix
        .filter((row) => row[1] !== 1 || row[2] !== 1 || row[3] !== 1)
        .map((row) => row[0]);

      if (uncommittedFiles.length > 0) {
        await git.add({
          fs,
          dir: effectiveAppPath,
          filepath: ".",
        });
        try {
          commitHash = await git.commit({
            fs,
            dir: effectiveAppPath,
            message: commitMessageText + " + extra files edited outside of Dyad",
            author: await getGitAuthor(),
            amend: true,
          });
          logger.log(
            `Amend commit with changes outside of dyad: ${uncommittedFiles.join(", ")}`,
          );
        } catch (error) {
          logger.error(
            `Failed to amend commit with changes outside of dyad: ${uncommittedFiles.join(", ")}`, error
          );
          extraFilesError = (error as any).toString();
        }
      }

      if (!options?.skipDbOperations && messageId !== -1) {
        await db
          .update(messages)
          .set({ commitHash: commitHash })
          .where(eq(messages.id, messageId));
      }
    }
    
    if (!options?.skipDbOperations && messageId !== -1) {
      logger.log("Marking message as approved: hasChanges", hasChanges, "messageId", messageId);
      await db
        .update(messages)
        .set({ approvalState: "approved" })
        .where(eq(messages.id, messageId));
    }

    return {
      updatedFiles: hasChanges,
      extraFiles: uncommittedFiles.length > 0 ? uncommittedFiles : undefined,
      extraFilesError,
    };
  } catch (error: unknown) {
    logger.error("Error processing files:", error);
    return { error: (error as any).toString() };
  } finally {
    if (!options?.skipDbOperations && messageId !== -1) {
      const appendedContent = `
      ${warnings
        .map(
          (warning) =>
            `<dyad-output type="warning" message="${warning.message}">${warning.error}</dyad-output>`,
        )
        .join("\n")}
      ${errors
        .map(
          (error) =>
            `<dyad-output type="error" message="${error.message}">${error.error}</dyad-output>`,
        )
        .join("\n")}
      `;
      if (appendedContent.trim().length > 0) { // Check if there's actual content to append
        // Fetch current content first to append, as 'fullResponse' might not be the latest
        const currentMessage = await db.query.messages.findFirst({ where: eq(messages.id, messageId) });
        const baseContent = currentMessage ? currentMessage.content : fullResponse;

        await db
          .update(messages)
          .set({
            content: baseContent + "\n\n" + appendedContent,
          })
          .where(eq(messages.id, messageId));
      }
    }
  }
}
