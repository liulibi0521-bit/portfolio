import { useEffect, useRef, type ReactNode } from "react";
import { IconClose } from "./Icons";
import { useDragScroll } from "../hooks/useDragScroll";

/** 覆盖层栈：Esc 只关闭最上层，避免同时收起总览与预览。 */
const stack: number[] = [];
let seq = 0;

interface Props {
  titleId: string;
  label: string;
  onClose: () => void;
  children: ReactNode;
  /** 标题行左侧内容；传入 head 时渲染带标题的头部 */
  head?: ReactNode;
  /** true 时不加内边距，用于 3/4 视频的预览布局 */
  bare?: boolean;
  /** true 时面板铺满视口，用于移动端竖屏视频的全屏预览 */
  mobileFs?: boolean;
}

export default function Overlay({ titleId, label, onClose, children, head, bare, mobileFs }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  // 总览的滚动条按他的要求隐藏了，桌面端改用「按住上下拖」补回滚动能力
  useDragScroll(bodyRef);

  useEffect(() => {
    const id = ++seq;
    stack.push(id);
    const prev = document.activeElement as HTMLElement | null;
    rootRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      const top = stack[stack.length - 1] === id;
      if (e.key === "Escape") {
        if (!top) return;
        e.preventDefault();
        onClose();
        return;
      }
      // aria-modal 的弹层不能让人 Tab 到背后被盖住的首页控件上去
      if (e.key !== "Tab" || !top) return;
      const root = rootRef.current;
      if (!root) return;
      const items = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((n) => !n.hasAttribute("disabled") && n.tabIndex >= 0 && n.getClientRects().length > 0);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const inside = !!active && root.contains(active);
      if (e.shiftKey ? !inside || active === first : !inside || active === last) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus({ preventScroll: true });
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      const i = stack.indexOf(id);
      if (i >= 0) stack.splice(i, 1);
      prev?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  return (
    <div
      className="sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      ref={rootRef}
      tabIndex={-1}
    >
      <button type="button" className="sheet__scrim" aria-label={`关闭${label}`} onClick={onClose} />
      <div className={`sheet__panel${bare ? " sheet__panel--bare" : ""}${mobileFs ? " sheet__panel--mobile-fs" : ""}`}>
        {head ? (
          <>
            <div className="sheet__grab" />
            <header className="sheet__head">
              {head}
              <button className="btn sheet__close" onClick={onClose}>
                <IconClose size={15} />
                关闭
              </button>
            </header>
            <div className="sheet__body" ref={bodyRef}>
              {children}
            </div>
          </>
        ) : (
          <>
            <button
              className="icon-btn sheet__floatclose"
              onClick={onClose}
              aria-label={`关闭${label}`}
            >
              <IconClose size={17} />
            </button>
            {children}
          </>
        )}
      </div>
    </div>
  );
}
