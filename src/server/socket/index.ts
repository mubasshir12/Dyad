import { Server, Socket } from 'socket.io';
import { handleChatStream, handleChatCancel } from './chat_handlers';
import { handleAppRun, handleAppStop, handleAppRestart } from './app_handlers';

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);
    
    // Chat handlers
    socket.on('chat:stream', (data) => {
      handleChatStream(socket, data);
    });
    
    socket.on('chat:cancel', (data) => {
      handleChatCancel(socket, data);
    });
    
    // App handlers
    socket.on('app:run', (data) => {
      handleAppRun(socket, data);
    });
    
    socket.on('app:stop', (data) => {
      handleAppStop(socket, data);
    });
    
    socket.on('app:restart', (data) => {
      handleAppRestart(socket, data);
    });
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
} 