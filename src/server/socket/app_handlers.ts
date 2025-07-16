import { Socket } from 'socket.io';
import { runApp, stopApp, restartApp } from '../../ipc/handlers/app_handlers';
import { AppOutput } from '../../ipc/ipc_types';

// Store active app processes
const activeApps = new Map<number, { stop: () => void }>();

export async function handleAppRun(socket: Socket, data: { appId: number }) {
  const { appId } = data;
  
  try {
    // Create callbacks for app output
    const callbacks = {
      onOutput: (output: AppOutput) => {
        socket.emit('app:output', output);
      }
    };
    
    // Stop any existing app process
    const existingApp = activeApps.get(appId);
    if (existingApp) {
      existingApp.stop();
    }
    
    // Create a stop function
    let shouldStop = false;
    const stopFn = () => {
      shouldStop = true;
      activeApps.delete(appId);
    };
    
    // Store the app process
    activeApps.set(appId, { stop: stopFn });
    
    // Run the app
    await runApp({
      appId,
      callbacks
    });
    
    // If the app was stopped while running, we should clean up
    if (shouldStop) {
      await stopApp({ appId });
    }
  } catch (error) {
    console.error('Error running app:', error);
    socket.emit('app:output', {
      type: 'error',
      message: `Failed to run app: ${(error as Error).message}`,
      appId,
      timestamp: Date.now()
    });
    activeApps.delete(appId);
  }
}

export async function handleAppStop(socket: Socket, data: { appId: number }) {
  const { appId } = data;
  
  try {
    const app = activeApps.get(appId);
    if (app) {
      app.stop();
      await stopApp({ appId });
      socket.emit('app:output', {
        type: 'info',
        message: 'App stopped',
        appId,
        timestamp: Date.now()
      });
    }
  } catch (error) {
    console.error('Error stopping app:', error);
    socket.emit('app:output', {
      type: 'error',
      message: `Failed to stop app: ${(error as Error).message}`,
      appId,
      timestamp: Date.now()
    });
  }
}

export async function handleAppRestart(socket: Socket, data: { 
  appId: number;
  removeNodeModules?: boolean;
}) {
  const { appId, removeNodeModules } = data;
  
  try {
    // Create callbacks for app output
    const callbacks = {
      onOutput: (output: AppOutput) => {
        socket.emit('app:output', output);
      }
    };
    
    // Stop any existing app process
    const existingApp = activeApps.get(appId);
    if (existingApp) {
      existingApp.stop();
    }
    
    // Create a stop function
    let shouldStop = false;
    const stopFn = () => {
      shouldStop = true;
      activeApps.delete(appId);
    };
    
    // Store the app process
    activeApps.set(appId, { stop: stopFn });
    
    // Restart the app
    await restartApp({
      appId,
      removeNodeModules,
      callbacks
    });
    
    // If the app was stopped while restarting, we should clean up
    if (shouldStop) {
      await stopApp({ appId });
    }
  } catch (error) {
    console.error('Error restarting app:', error);
    socket.emit('app:output', {
      type: 'error',
      message: `Failed to restart app: ${(error as Error).message}`,
      appId,
      timestamp: Date.now()
    });
    activeApps.delete(appId);
  }
} 