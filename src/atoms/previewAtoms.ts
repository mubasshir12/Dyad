import { atom } from "jotai";

export type ComponentSelection = {
  id: string;
  name: string;
  relativePath: string;
  lineNumber: number;
  columnNumber: number;
};

export const selectedComponentPreviewAtom = atom<ComponentSelection | null>(
  null,
);
