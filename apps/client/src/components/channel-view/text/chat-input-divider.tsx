import {
  type LocalStorageKey,
  removeLocalStorageItem,
  setLocalStorageItem
} from '@/helpers/storage';
import { useCallback } from 'react';

const MAX_VH = 80;
const MIN_PX = 56;
const RESET_THRESHOLD_PX = 10;

type TChatInputDividerProps = {
  composeContainerRef: React.RefObject<HTMLDivElement | null>;
  scrollToBottom: () => void;
  isAtBottom: () => boolean;
  storageKey: LocalStorageKey;
  defaultMaxHeightVh: number;
};

// measure the minimum useful height: everything in the compose that isn't
// the tiptap editor (file cards, reply bar, buttons, etc.) plus one line
// of the editor. no DOM mutation, no layout change.
const measureMinHeight = (composeEl: HTMLDivElement): number => {
  const scrollRow = composeEl.querySelector(
    '.compose-scroll-row'
  ) as HTMLElement | null;
  const tiptapWrapper = composeEl.querySelector(
    '[data-compose-tiptap]'
  ) as HTMLElement | null;
  const proseMirror = composeEl.querySelector('.ProseMirror') as HTMLElement | null;

  if (!scrollRow || !tiptapWrapper || !proseMirror) return MIN_PX;

  // sum up the heights of all siblings before the tiptap wrapper in the
  // flex column -- these are the file cards, reply bar, uploading indicator
  const flexCol = tiptapWrapper.parentElement;
  let nonEditorHeight = 0;
  if (flexCol) {
    for (const child of Array.from(flexCol.children)) {
      if (child === tiptapWrapper) break;
      nonEditorHeight += (child as HTMLElement).offsetHeight;
    }
  }

  // one line of the editor from computed style
  const cs = window.getComputedStyle(proseMirror);
  const lh = parseFloat(cs.lineHeight);
  const fs = parseFloat(cs.fontSize);
  const oneLineHeight =
    (Number.isNaN(lh) ? (Number.isNaN(fs) ? 24 : fs * 1.2) : lh) +
    parseFloat(cs.paddingTop || '0') +
    parseFloat(cs.paddingBottom || '0');

  // overhead = typing indicator + safe-area (compose height minus scroll-row height)
  const overhead = composeEl.getBoundingClientRect().height - scrollRow.clientHeight;

  return Math.max(MIN_PX, nonEditorHeight + oneLineHeight + overhead);
};

const isEditorEmpty = (composeEl: HTMLDivElement): boolean => {
  const editor = composeEl.querySelector('.ProseMirror') as HTMLElement | null;
  if (!editor) return true;
  return (
    (editor.textContent ?? '').trim().length === 0 &&
    !editor.querySelector('img')
  );
};

const ChatInputDivider = ({
  composeContainerRef,
  scrollToBottom,
  isAtBottom,
  storageKey,
  defaultMaxHeightVh
}: TChatInputDividerProps) => {
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();

      const composeEl = composeContainerRef.current;

      if (!composeEl) return;

      const wasAtBottom = isAtBottom();
      const startY = e.clientY;
      const startHeight = composeEl.style.height;
      const startMaxHeight = composeEl.style.maxHeight;
      const startHeightPx = composeEl.getBoundingClientRect().height;
      const maxPx = (MAX_VH / 100) * window.innerHeight;
      const minPx = measureMinHeight(composeEl);
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);

      const onPointerMove = (moveEvent: PointerEvent) => {
        const deltaY = moveEvent.clientY - startY;
        const newHeightPx = Math.max(
          minPx,
          Math.min(maxPx, startHeightPx - deltaY)
        );

        composeEl.style.height = `${newHeightPx}px`;

        if (wasAtBottom) {
          scrollToBottom();
        }
      };

      const finish = (upEvent: PointerEvent) => {
        target.removeEventListener('pointermove', onPointerMove);
        target.removeEventListener('pointerup', finish);
        target.removeEventListener('pointercancel', onPointerCancel);

        const deltaY = upEvent.clientY - startY;
        const finalPx = Math.max(
          minPx,
          Math.min(maxPx, startHeightPx - deltaY)
        );

        composeEl.style.height = `${finalPx}px`;

        if (finalPx <= minPx + RESET_THRESHOLD_PX && isEditorEmpty(composeEl)) {
          composeEl.style.height = '';
          composeEl.style.maxHeight = `${defaultMaxHeightVh}vh`;
          removeLocalStorageItem(storageKey);
        } else {
          composeEl.style.maxHeight = '';
          const finalVh = Math.round((finalPx / window.innerHeight) * 100);
          setLocalStorageItem(storageKey, String(finalVh));
        }

        if (wasAtBottom) {
          scrollToBottom();
        }
      };

      const onPointerCancel = () => {
        target.removeEventListener('pointermove', onPointerMove);
        target.removeEventListener('pointerup', finish);
        target.removeEventListener('pointercancel', onPointerCancel);

        composeEl.style.height = startHeight;
        composeEl.style.maxHeight = startMaxHeight;
      };

      target.addEventListener('pointermove', onPointerMove);
      target.addEventListener('pointerup', finish);
      target.addEventListener('pointercancel', onPointerCancel);
    },
    [
      composeContainerRef,
      scrollToBottom,
      isAtBottom,
      storageKey,
      defaultMaxHeightVh
    ]
  );

  return (
    <div
      onPointerDown={onPointerDown}
      className="group relative h-0 shrink-0 overflow-visible cursor-row-resize select-none z-10"
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize chat input"
    >
      <div className="absolute inset-x-0 top-0 h-px w-full bg-border transition-all origin-top group-hover:scale-y-[4] group-hover:bg-primary/50 group-active:scale-y-[4] group-active:bg-primary" />
      <div className="absolute inset-x-0 -top-0.5 h-4" />
    </div>
  );
};

export { ChatInputDivider };
