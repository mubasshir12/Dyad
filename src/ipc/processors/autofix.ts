import * as fs from "node:fs";
import * as path from "node:path";
import {
  getDyadWriteTags,
  getDyadRenameTags,
  getDyadDeleteTags,
} from "./response_processor";
import { safeJoin } from "../utils/path_utils";
import { ProblemReport } from "../ipc_types";
import { Problem } from "../ipc_types";
import { logger } from "../handlers/app_upgrade_handlers";

function loadLocalTypeScript(appPath: string): typeof import("typescript") {
  try {
    // Try to load TypeScript from the project's node_modules
    const tsPath = path.join(appPath, "node_modules", "typescript");
    return require(tsPath);
  } catch (error) {
    throw new Error(
      `Failed to load TypeScript from ${appPath} because of ${error}`,
    );
  }
}

export async function generateProblemReport({
  fullResponse,
  appPath,
}: {
  fullResponse: string;
  appPath: string;
}): Promise<ProblemReport> {
  // Load the local TypeScript version from the app's node_modules
  const ts = loadLocalTypeScript(appPath);

  // Parse all file changes from the response
  const writeTags = getDyadWriteTags(fullResponse);
  const renameTags = getDyadRenameTags(fullResponse);
  const deletePaths = getDyadDeleteTags(fullResponse);

  // Create virtual file system
  const virtualFiles = new Map<string, string>();
  const deletedFiles = new Set<string>();

  // Process deletions
  for (const deletePath of deletePaths) {
    const normalizedPath = path.resolve(appPath, deletePath);
    deletedFiles.add(normalizedPath);
  }

  // Process renames (delete old, create new)
  for (const rename of renameTags) {
    const fromPath = path.resolve(appPath, rename.from);
    const toPath = path.resolve(appPath, rename.to);

    deletedFiles.add(fromPath);

    // If the source file exists, read its content for the new location
    try {
      if (fs.existsSync(safeJoin(appPath, rename.from))) {
        const content = await fs.promises.readFile(
          safeJoin(appPath, rename.from),
          "utf8",
        );
        virtualFiles.set(toPath, content);
      }
    } catch (error) {
      logger.error(
        "Error reading file for virtual file system (rename)",
        error,
      );
      // If we can't read the source file, we'll let TypeScript handle the missing file
    }
  }

  // Process writes
  for (const writeTag of writeTags) {
    const filePath = path.resolve(appPath, writeTag.path);
    virtualFiles.set(filePath, writeTag.content);
  }

  // Find TypeScript config - throw error if not found
  const tsconfigPath = findTypeScriptConfig(appPath);

  // Create TypeScript program with virtual file system
  const result = await runTypeScriptCheck(
    ts,
    appPath,
    tsconfigPath,
    virtualFiles,
    deletedFiles,
  );

  return result;
}

function findTypeScriptConfig(appPath: string): string {
  const possibleConfigs = [
    "tsconfig.json",
    "tsconfig.app.json",
    "jsconfig.json",
  ];

  for (const config of possibleConfigs) {
    const configPath = path.join(appPath, config);
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }

  throw new Error(
    `No TypeScript configuration file found in ${appPath}. Expected one of: ${possibleConfigs.join(", ")}`,
  );
}

async function runTypeScriptCheck(
  ts: typeof import("typescript"),
  appPath: string,
  tsconfigPath: string,
  virtualFiles: Map<string, string>,
  deletedFiles: Set<string>,
): Promise<ProblemReport> {
  // Use the idiomatic way to parse TypeScript config
  const parsedCommandLine = ts.getParsedCommandLineOfConfigFile(
    tsconfigPath,
    undefined, // No additional options
    {
      // Custom system object that can handle our virtual files
      ...ts.sys,
      fileExists: (fileName: string) => {
        const resolvedPath = path.resolve(fileName);
        if (deletedFiles.has(resolvedPath)) return false;
        if (virtualFiles.has(resolvedPath)) return true;
        return ts.sys.fileExists(fileName);
      },
      readFile: (fileName: string) => {
        const resolvedPath = path.resolve(fileName);
        if (deletedFiles.has(resolvedPath)) return undefined;
        if (virtualFiles.has(resolvedPath))
          return virtualFiles.get(resolvedPath);
        return ts.sys.readFile(fileName);
      },
      onUnRecoverableConfigFileDiagnostic: (
        diagnostic: import("typescript").Diagnostic,
      ) => {
        throw new Error(
          `TypeScript config error: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`,
        );
      },
    },
  );

  if (!parsedCommandLine) {
    throw new Error(`Failed to parse TypeScript config: ${tsconfigPath}`);
  }

  let rootNames = parsedCommandLine.fileNames;

  // Add any virtual files that aren't already included
  const virtualTsFiles = Array.from(virtualFiles.keys()).filter(
    isTypeScriptFile,
  );
  for (const virtualFile of virtualTsFiles) {
    if (!rootNames.includes(virtualFile)) {
      rootNames.push(virtualFile);
    }
  }

  // Remove deleted files from rootNames
  rootNames = rootNames.filter((fileName) => {
    const resolvedPath = path.resolve(fileName);
    return !deletedFiles.has(resolvedPath);
  });

  // Create custom compiler host
  const host = createVirtualCompilerHost(
    ts,
    appPath,
    virtualFiles,
    deletedFiles,
    parsedCommandLine.options,
  );

  // Create TypeScript program - this is the idiomatic way
  const program = ts.createProgram(rootNames, parsedCommandLine.options, host);

  // Get diagnostics
  const diagnostics = [
    ...program.getSyntacticDiagnostics(),
    ...program.getSemanticDiagnostics(),
    ...program.getGlobalDiagnostics(),
  ];

  // Convert diagnostics to our format
  const problems: Problem[] = [];

  for (const diagnostic of diagnostics) {
    if (!diagnostic.file) continue;

    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
      diagnostic.start!,
    );
    const message = ts.flattenDiagnosticMessageText(
      diagnostic.messageText,
      "\n",
    );

    if (diagnostic.category !== ts.DiagnosticCategory.Error) {
      continue;
    }

    problems.push({
      file: path.relative(appPath, diagnostic.file.fileName),
      line: line + 1, // Convert to 1-based
      column: character + 1, // Convert to 1-based
      message,
      code: diagnostic.code,
    });
  }

  return {
    problems,
  };
}

function createVirtualCompilerHost(
  ts: typeof import("typescript"),
  appPath: string,
  virtualFiles: Map<string, string>,
  deletedFiles: Set<string>,
  compilerOptions: import("typescript").CompilerOptions,
): import("typescript").CompilerHost {
  const host = ts.createCompilerHost(compilerOptions);

  // Override file reading to use virtual files
  const originalReadFile = host.readFile;
  host.readFile = (fileName: string) => {
    const resolvedPath = path.resolve(fileName);

    // Check if file is deleted
    if (deletedFiles.has(resolvedPath)) {
      return undefined;
    }

    // Check virtual files first
    if (virtualFiles.has(resolvedPath)) {
      return virtualFiles.get(resolvedPath);
    }

    // Fall back to actual file system
    return originalReadFile(fileName);
  };

  // Override file existence check
  const originalFileExists = host.fileExists;
  host.fileExists = (fileName: string) => {
    const resolvedPath = path.resolve(fileName);

    // Check if file is deleted
    if (deletedFiles.has(resolvedPath)) {
      return false;
    }

    // Check virtual files first
    if (virtualFiles.has(resolvedPath)) {
      return true;
    }

    // Fall back to actual file system
    return originalFileExists(fileName);
  };

  return host;
}

function isTypeScriptFile(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return [".ts", ".tsx", ".js", ".jsx"].includes(ext);
}
