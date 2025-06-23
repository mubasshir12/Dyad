import React, { useState, useRef } from "react";

export function useAttachments() {
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setAttachments((attachments) => [...attachments, ...files]);
      // Clear the input value so the same file can be selected again
      e.target.value = "";
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
      setAttachments((attachments) => [...attachments, ...files]);
    }
  };

  const clearAttachments = () => {
    setAttachments([]);
  };

  const addAttachments = (files: File[]) => {
    setAttachments((attachments) => [...attachments, ...files]);
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const items = Array.from(clipboardData.items);
    const imageItems = items.filter((item) => item.type.startsWith("image/"));

    if (imageItems.length > 0) {
      e.preventDefault(); // Prevent default paste behavior for images

      const imageFiles: File[] = [];

      for (const item of imageItems) {
        const file = item.getAsFile();
        if (file) {
          // Create a more descriptive filename with timestamp
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const extension = file.type.split("/")[1] || "png";
          const newFile = new File(
            [file],
            `pasted-image-${timestamp}.${extension}`,
            {
              type: file.type,
            },
          );
          imageFiles.push(newFile);
        }
      }

      if (imageFiles.length > 0) {
        addAttachments(imageFiles);
        // Show a brief toast or indication that image was pasted
        console.log(`Pasted ${imageFiles.length} image(s) from clipboard`);
      }
    }
  };

  return {
    attachments,
    fileInputRef,
    isDraggingOver,
    handleAttachmentClick,
    handleFileChange,
    removeAttachment,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    clearAttachments,
    handlePaste,
  };
}
