/**
 * Notification utilities for Dyad chat responses
 */

import { showSuccess } from "./toast";

export interface NotificationOptions {
  visual?: boolean;
  sound?: boolean;
  message?: string;
}

/**
 * Show notification when chat response is completed
 */
export function showResponseCompleted(options: NotificationOptions = {}) {
  const {
    visual = true,
    sound = true,
    message = "Response completed",
  } = options;

  // Visual notification (toast)
  if (visual) {
    showSuccess(message);
  }

  // Audio notification
  if (sound) {
    playNotificationSound();
  }
}

/**
 * Play a subtle notification sound
 */
function playNotificationSound() {
  try {
    // Using Web Audio API for a subtle notification sound
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.debug("Web Audio API not available");
      return;
    }

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Create a pleasant notification tone
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Higher pitch, more pleasant
    oscillator.type = "sine";

    // Gentle fade in/out
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(
      0.05,
      audioContext.currentTime + 0.05,
    );
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.3,
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);

    // Clean up
    setTimeout(() => {
      audioContext.close();
    }, 500);
  } catch (error) {
    // Silently fail if audio is not available
    console.debug("Audio notification failed:", error);
  }
}

/**
 * Alternative: Use system notification sound (simpler, more reliable)
 */
export function playSystemNotification() {
  try {
    // Create a very short, high-pitched beep
    const audio = new Audio(
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBjmO0+LIeCEEJHjM8N1xIggSeN7aqXMEA1t09Sy0",
    );
    audio.volume = 0.1;
    audio.play().catch(() => {
      // Ignore errors - notification is optional
    });
  } catch (error) {
    console.debug("System notification failed:", error);
  }
}
