import {
  LocalStorageKey,
  removeLocalStorageItem,
  setLocalStorageItem
} from '@/helpers/storage';
import { CHAT_INPUT_MAX_HEIGHT_VH_DEFAULT } from '@/features/app/slice';
import { useCallback } from 'react';

const MAX_VH = 80;
const MIN_PX = 56; // matches min-h-14 on the compose container
const RESET_THRESHOLD_PX = 10;

type TChatInputDividerProps = {
  composeContainerRef: React.RefObject<HTMLDivElement | null>;
  scrollToBottom: () => void;
  isAtBottom: () => boolean;
};

const ChatInputDivider = ({
  composeContainerRef,
  scrollToBottom,
  isAtBottom
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
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);

      const onPointerMove = (moveEvent: PointerEvent) => {
        const deltaY = moveEvent.clientY - startY;
        const newHeightPx = Math.min(maxPx, startHeightPx - deltaY);

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
        const finalPx = Math.min(maxPx, startHeightPx - deltaY);

        if (finalPx <= MIN_PX + RESET_THRESHOLD_PX) {
          composeEl.style.height = '';
          composeEl.style.maxHeight = `${CHAT_INPUT_MAX_HEIGHT_VH_DEFAULT}vh`;
          removeLocalStorageItem(LocalStorageKey.CHAT_INPUT_MAX_HEIGHT_VH);
        } else {
          const finalVh = Math.round((finalPx / window.innerHeight) * 100);
          composeEl.style.height = `${finalPx}px`;
          composeEl.style.maxHeight = '';
          setLocalStorageItem(
            LocalStorageKey.CHAT_INPUT_MAX_HEIGHT_VH,
            String(finalVh)
          );
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
    [composeContainerRef, scrollToBottom, isAtBottom]
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