import { ModelPicker } from "./ModelPicker";
import { ProModeSelector } from "./ProModeSelector";

export function ChatControls() {
  return (
    <div className="pb-2 flex gap-2">
      <ModelPicker />
      <ProModeSelector />
    </div>
  );
}
