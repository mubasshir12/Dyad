import { Socket } from 'socket.io';
import { handleChatMessage } from '../../ipc/handlers/chat_handlers';
import { ChatProblemsEvent, ComponentSelection, Message } from '../../ipc/ipc_types';

// Store active chat streams
const activeStreams = new Map<number, { cancel: () => void }>();

export async function handleChatStream(socket: Socket, data: {
  prompt: string;
  chatId: number;
  redo?: boolean;
  selectedComponent: ComponentSelection | null;
}) {
  const { prompt, chatId, redo, selectedComponent } = data;
  
  try {
    // Create a cancellation function
    let isCancelled = false;
    const cancelFn = () => {
      isCancelled = true;
      activeStreams.delete(chatId);
    };
    
    // Store the stream
    activeStreams.set(chatId, { cancel: cancelFn });
    
    // Set up callbacks for the stream
    const callbacks = {
      onUpdate: (messages: Message[]) => {
        if (!isCancelled) {
          socket.emit('chat:response:chunk', { chatId, messages });
        }
      },
      onEnd: (response: any) => {
        if (!isCancelled) {
          socket.emit('chat:response:end', { ...response, chatId });
          activeStreams.delete(chatId);
        }
      },
      onError: (error: string) => {
        if (!isCancelled) {
          socket.emit('chat:response:error', error);
          activeStreams.delete(chatId);
        }
      },
      onProblems: (problems: ChatProblemsEvent) => {
        if (!isCancelled) {
          socket.emit('chat:problems', problems);
        }
      }
    };
    
    // Call the original IPC handler
    await handleChatMessage({
      prompt,
      chatId,
      redo,
      selectedComponent,
      callbacks
    });
  } catch (error) {
    console.error('Error in chat stream:', error);
    socket.emit('chat:response:error', (error as Error).message);
    activeStreams.delete(chatId);
  }
}

export function handleChatCancel(socket: Socket, data: { chatId: number }) {
  const { chatId } = data;
  
  const stream = activeStreams.get(chatId);
  if (stream) {
    stream.cancel();
    socket.emit('chat:response:end', { 
      chatId, 
      cancelled: true,
      messages: [] 
    });
  }
} 