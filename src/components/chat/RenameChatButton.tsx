import { Edit3 } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface RenameChatButtonProps {
  onRename: () => void;
}

export function RenameChatButton({ onRename }: RenameChatButtonProps) {
  return (
    <DropdownMenuItem onClick={onRename} className="px-3 py-2">
      <Edit3 className="mr-2 h-4 w-4" />
      <span>Rename Chat</span>
    </DropdownMenuItem>
  );
}
