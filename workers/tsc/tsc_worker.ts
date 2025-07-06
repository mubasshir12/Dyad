import * as fs from "node:fs";
import * as path from "node:path";
import { parentPort } from "node:worker_threads";

import {
  Problem,
  ProblemReport,
  SyncVirtualFileSystem,
  WorkerInput,
  WorkerOutput,
} from "../../shared/tsc_types";
import { SyncVirtualFileSystemImpl } from "../../shared/VirtualFileSystem";

function loadLocalTypeScript(appPath: string): typeof import("typescript") {
  try {
    // Try to load TypeScript from the project's node_modules
    const requirePath = require.resolve("typescript", { paths: [appPath] });
    const ts = require(requirePath);
    return ts;
  } catch (error) {
    throw new Error(
      `Failed to load TypeScript from ${appPath} because of ${error}`,
    );
  }
}

function findTypeScriptConfig(appPath: string): string {
  const possibleConfigs = [
    // For vite applications, we want to check tsconfig.app.json, since it's the
    // most important one (client-side app).
    // The tsconfig.json in vite apps is a project reference and doesn't
    // actually check anything unless you do "--build" which requires a complex
    // programmatic approach
    "tsconfig.app.json",
    // For Next.js applications, it typically has a single tsconfig.json file
    "tsconfig.json",
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
  vfs: SyncVirtualFileSystem,
): Promise<ProblemReport> {
  return runSingleProject(ts, appPath, tsconfigPath, vfs);
}

async function runSingleProject(
  ts: typeof import("typescript"),
  appPath: string,
  tsconfigPath: string,
  vfs: SyncVirtualFileSystem,
): Promise<ProblemReport> {
  // Use the idiomatic way to parse TypeScript config
  const parsedCommandLine = ts.getParsedCommandLineOfConfigFile(
    tsconfigPath,
    undefined, // No additional options
    {
      // Custom system object that can handle our virtual files
      ...ts.sys,
      fileExists: (fileName: string) => vfs.fileExists(fileName),
      readFile: (fileName: string) => vfs.readFile(fileName),
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
  const virtualTsFiles = vfs
    .getVirtualFiles()
    .map((file) => path.resolve(appPath, file.path))
    .filter(isTypeScriptFile);

  // Remove deleted files from rootNames
  const deletedFiles = vfs
    .getDeletedFiles()
    .map((file) => path.resolve(appPath, file));
  rootNames = rootNames.filter((fileName) => {
    const resolvedPath = path.resolve(fileName);
    return !deletedFiles.includes(resolvedPath);
  });

  for (const virtualFile of virtualTsFiles) {
    if (!rootNames.includes(virtualFile)) {
      rootNames.push(virtualFile);
    }
  }

  // Create custom compiler host
  const host = createVirtualCompilerHost(
    ts,
    appPath,
    vfs,
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
      file: normalizePath(path.relative(appPath, diagnostic.file.fileName)),
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
  vfs: SyncVirtualFileSystem,
  compilerOptions: import("typescript").CompilerOptions,
): import("typescript").CompilerHost {
  const host = ts.createCompilerHost(compilerOptions);

  // Override file reading to use virtual files
  host.readFile = (fileName: string) => {
    return vfs.readFile(fileName);
  };

  // Override file existence check
  host.fileExists = (fileName: string) => {
    return vfs.fileExists(fileName);
  };

  return host;
}

function isTypeScriptFile(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return [".ts", ".tsx", ".js", ".jsx"].includes(ext);
}

async function processTypeScriptCheck(
  input: WorkerInput,
): Promise<WorkerOutput> {
  try {
    const { appPath, virtualChanges } = input;
    const vfs = new SyncVirtualFileSystemImpl(appPath, {
      fileExists: (fileName: string) => ts.sys.fileExists(fileName),
      readFile: (fileName: string) => ts.sys.readFile(fileName),
    });
    vfs.applyResponseChanges(virtualChanges);
    console.error("*******************vfs", vfs);

    // Load the local TypeScript version from the app's node_modules
    const ts = loadLocalTypeScript(appPath);

    // Find TypeScript config - throw error if not found
    const tsconfigPath = findTypeScriptConfig(appPath);

    // Create TypeScript program with virtual file system
    const result = await runTypeScriptCheck(ts, appPath, tsconfigPath, vfs);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Handle messages from main thread
parentPort?.on("message", async (input: WorkerInput) => {
  const output = await processTypeScriptCheck(input);
  parentPort?.postMessage(output);
});

/**
 * Normalize the path to use forward slashes instead of backslashes.
 * This is important to prevent weird Git issues, particularly on Windows.
 * @param path Source path.
 * @returns Normalized path.
 */
function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}
