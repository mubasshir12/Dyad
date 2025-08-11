import { useSettings } from "@/hooks/useSettings";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function TransparentWindowSwitch() {
  const { settings, updateSettings } = useSettings();

  if (!settings) return null;

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="enable-transparent-window"
        checked={!!settings.enableTransparentWindow}
        onCheckedChange={(checked) => {
          updateSettings({ enableTransparentWindow: checked });
        }}
      />
      <Label htmlFor="enable-transparent-window">
        Transparente App-Fenster (5%)
      </Label>
    </div>
  );
}
