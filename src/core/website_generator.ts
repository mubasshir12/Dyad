import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';
import { execSync, spawn, ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import log from 'electron-log'; // Assuming electron-log can be imported directly

import { processFullResponseActions } from '../ipc/processors/response_processor';
// For execPromise, we can define it locally or import if it's made common
const execPromise = promisify(execSync); // Note: execSync is not async, exec is. This should be promisify(exec) from 'node:child_process'

// Define a local execPromise based on child_process.exec for async operations
const execAsync = promisify(require('node:child_process').exec);


// Fixed author for git commits in this module
const gitAuthor = {
  name: "[dyad-builder]",
  email: "builder@dyad.sh",
};

export async function generateAndHostWebsite(buildId: string, userId: string, requirement: string): Promise<{ localUrl: string; buildDirectory: string; error?: string; devServerPid?: number }> {
  const logger = log.scope('website_generator');
  const buildDirectory = path.join(os.tmpdir(), 'dyad_builds', buildId);
  let devServerProcess: ChildProcess | null = null;

  try {
    logger.info(`Starting website generation for buildId: ${buildId}, userId: ${userId} in ${buildDirectory}`);
    
    // 1. Setup Build Environment
    const dyadBuildsDir = path.join(os.tmpdir(), 'dyad_builds');
    if (!fs.existsSync(dyadBuildsDir)) {
      fs.mkdirSync(dyadBuildsDir, { recursive: true });
    }

    if (fs.existsSync(buildDirectory)) {
      logger.info(`Cleaning up existing directory: ${buildDirectory}`);
      fs.rmSync(buildDirectory, { recursive: true, force: true });
    }
    fs.mkdirSync(buildDirectory, { recursive: true });
    
    // Resolve scaffold path from project root. __dirname here would be inside src/core or dist/core.
    // Assuming the script runs from a context where './scaffold' is valid from CWD, or adjust.
    // For Electron, paths can be tricky. A robust way is to use app.getAppPath() if in main process,
    // or determine relative to a known root. For now, assuming process.cwd() is project root.
    const projectRoot = process.cwd(); // This might be /app in the sandbox
    const scaffoldPath = path.join(projectRoot, 'scaffold'); 
    
    if (!fs.existsSync(scaffoldPath)) {
        logger.error(`Scaffold path not found: ${scaffoldPath}. CWD: ${process.cwd()}`);
        // Try relative to __dirname, assuming dist/main/main.js structure
        const alternativeScaffoldPath = path.resolve(__dirname, '../../../scaffold'); // Adjust based on actual bundle structure
        if(fs.existsSync(alternativeScaffoldPath)) {
            logger.info(`Found scaffold at alternative path: ${alternativeScaffoldPath}`);
            fs.cpSync(alternativeScaffoldPath, buildDirectory, { recursive: true });
        } else {
            logger.error(`Alternative scaffold path also not found: ${alternativeScaffoldPath}`);
            throw new Error(`Scaffold directory not found at ${scaffoldPath} or ${alternativeScaffoldPath}`);
        }
    } else {
        logger.info(`Copying scaffold from ${scaffoldPath} to ${buildDirectory}`);
        fs.cpSync(scaffoldPath, buildDirectory, { recursive: true });
    }


    logger.info(`Initializing git repo in ${buildDirectory}`);
    execSync('git init', { cwd: buildDirectory, stdio: 'pipe' });
    execSync('git add .', { cwd: buildDirectory, stdio: 'pipe' });
    execSync(`git -c user.name="${gitAuthor.name}" -c user.email="${gitAuthor.email}" commit -m "Initial scaffold commit" --author="${gitAuthor.name} <${gitAuthor.email}>"`, { cwd: buildDirectory, stdio: 'pipe' });
    
    logger.info(`Installing base dependencies in ${buildDirectory} using pnpm`);
    // Using execSync for pnpm install as it's a setup step.
    // Consider making this async with execAsync if it takes too long and blocks.
    execSync('pnpm install', { cwd: buildDirectory, stdio: 'inherit' }); // stdio: 'inherit' for live output

    // 2. LLM Interaction & Code Modification
    logger.info(`Processing LLM response for requirement: "${requirement}"`);
    const mockLLMResponse = `<dyad-write path="src/App.tsx">
import './App.css';
function App() {
  // Requirement: ${requirement.replace(/"/g, '\\"').replace(/'/g, "\\'").replace(/\n/g, '\\n')}
  // BuildID: ${buildId}
  return (
    <>
      <h1>Website for: ${requirement.replace(/'/g, "\\'").replace(/\n/g, '\\n')} (${buildId})</h1>
      <p>User ID: ${userId}</p>
      <p>This is a generated website.</p>
    </>
  );
}
export default App;
</dyad-write>
<dyad-add-dependency packages="lucide-react"></dyad-add-dependency>
`;
    
    const chatSummary = `Automated website generation for buildId: ${buildId}`;
    // Using -1 for chatId and messageId to trigger conditional logic in processFullResponseActions
    // and skip DB writes related to chat/messages tables.
    const processingResult = await processFullResponseActions(
      mockLLMResponse,
      -1, // dummy chatId
      { chatSummary, messageId: -1 }, // dummy messageId
      { 
        appPathOverride: buildDirectory, 
        skipDbOperations: true, 
        skipSupabaseOperations: true 
      }
    );

    if (processingResult.error) {
      logger.error(`Error processing LLM response actions: ${processingResult.error}`);
      throw new Error(`Failed to process LLM actions: ${processingResult.error}`);
    }
    logger.info(`LLM response actions processed. Updated files: ${!!processingResult.updatedFiles}`);
    if (processingResult.updatedFiles) { // If processFullResponseActions handled the commit, this might not be needed or should amend.
         // processFullResponseActions already handles commit if changes are made.
        logger.info("Changes from LLM response were committed by processFullResponseActions.");
    }


    // 3. Start Dev Server
    logger.info(`Starting pnpm dev server in ${buildDirectory}`);
    // Ensure pnpm is available or use npx pnpm
    // detached: false is default, but being explicit. shell: true can help with pathing for pnpm.
    devServerProcess = spawn('pnpm', ['dev'], { cwd: buildDirectory, stdio: 'pipe', shell: true }); 
    
    let localUrl = '';
    const portPromise = new Promise<string>((resolve, reject) => {
      if (!devServerProcess) {
        return reject(new Error("Dev server process not initialized."));
      }

      devServerProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        logger.info(`[pnpm dev stdout]: ${output}`);
        // Vite's output for local server. Other scaffolds might differ.
        const urlMatch = output.match(/Local:\s+(http:\/\/localhost:\d+)/) || output.match(/Network:\s+(http:\/\/localhost:\d+)/); 
        if (urlMatch && urlMatch[1]) {
          if (!localUrl) { // Resolve only once
            localUrl = urlMatch[1];
            logger.info(`Captured dev server URL: ${localUrl}`);
            resolve(localUrl);
          }
        }
      });

      devServerProcess.stderr?.on('data', (data: Buffer) => {
        logger.error(`[pnpm dev stderr]: ${data.toString()}`);
      });

      devServerProcess.on('error', (error) => {
        logger.error('Failed to start pnpm dev server process:', error);
        reject(new Error(`Failed to start dev server: ${error.message}`));
      });
      
      devServerProcess.on('exit', (code, signal) => {
        if (!localUrl) { // If exited before URL was captured
          logger.error(`pnpm dev process exited with code ${code}, signal ${signal} before URL was captured.`);
          reject(new Error(`pnpm dev process exited with code ${code}, signal ${signal}`));
        }
      });
    });

    localUrl = await portPromise; 
    const serverPid = devServerProcess.pid;
    logger.info(`Dev server started. PID: ${serverPid}, URL: ${localUrl}`);
    
    // Note: PID should be stored in DB in a future task.
    // The devServerProcess object itself should not be returned as it's not serializable.

    return { localUrl, buildDirectory, devServerPid: serverPid };

  } catch (error: any) {
    logger.error(`Error in generateAndHostWebsite for buildId ${buildId}:`, error);
    // Cleanup: kill dev server if it started
    if (devServerProcess && devServerProcess.pid && !devServerProcess.killed) {
        logger.info(`Attempting to kill dev server process ${devServerProcess.pid} due to error.`);
        process.kill(devServerProcess.pid, 'SIGTERM'); // or 'SIGKILL'
    }
    return { localUrl: '', buildDirectory, error: error.message || String(error), devServerPid: devServerProcess?.pid };
  }
}

// Example basic usage (for testing, not part of the module's export)
/*
async function test() {
  const buildId = `test-${Date.now()}`;
  const userId = 'test-user';
  const requirement = 'A simple counter app with a button';
  const result = await generateAndHostWebsite(buildId, userId, requirement);
  console.log('Test Result:', result);

  // To stop the server after test:
  if (result.devServerPid) {
    console.log(`Killing server with PID: ${result.devServerPid}`);
    try {
      process.kill(result.devServerPid);
    } catch (e) {
      console.error("Failed to kill process", e);
    }
  }
}
// test();
*/
