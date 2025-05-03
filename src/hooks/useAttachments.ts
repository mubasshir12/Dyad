import { useState, useRef } from "react";

export function useAttachments() {
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);

      // Check for large files (over 1MB)
      const hasLargeFiles = files.some((file) => file.size > 1024 * 1024);

      if (hasLargeFiles) {
        setIsUploading(true);
        // Use a small timeout to simulate processing of large files
        setTimeout(() => {
          setAttachments([...attachments, ...files]);
          setIsUploading(false);
        }, 500);
      } else {
        setAttachments([...attachments, ...files]);
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);

      // Check for large files (over 1MB)
      const hasLargeFiles = files.some((file) => file.size > 1024 * 1024);

      if (hasLargeFiles) {
        setIsUploading(true);
        // Use a small timeout to simulate processing of large files
        setTimeout(() => {
          setAttachments([...attachments, ...files]);
          setIsUploading(false);
        }, 500);
      } else {
        setAttachments([...attachments, ...files]);
      }
    }
  };

  const clearAttachments = () => {
    setAttachments([]);
  };

  return {
    attachments,
    fileInputRef,
    isDraggingOver,
    isUploading,
    handleAttachmentClick,
    handleFileChange,
    removeAttachment,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    clearAttachments,
  };
}
