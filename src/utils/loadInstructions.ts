// src/shared/utils/loadInstructions.ts
import fs from 'fs';
import path from 'path';

export function loadPromptInstructions(): string {
  const instructionsPath = path.resolve(process.cwd(), 'prompt-instructions.md');

  try {
    return fs.readFileSync(instructionsPath, 'utf-8');
  } catch (err) {
    console.warn('prompt-instructions.md not found or unreadable.');
    return '';
  }
}
