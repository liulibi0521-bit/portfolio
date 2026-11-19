import { useEffect, type RefObject } from "react";

/**
 * 覆盖层里的「按住就能上下拖」滚动 + 松手惯性 + 按速度的轻微动态模糊。
 *
 * 他要求去掉总览右侧的滚动条，桌面端就没有拖拽目标了，用指针拖动补回滚动能力；
 * 触屏设备交给原生惯性滚动（拖动部分不接管，免得和手势打架）。
 * 拖动超过 5px 会吃掉紧随其后的 click，避免拖完顺手把卡片打开。
 *
 * 滚动动效走 rAF 速度模型，和首页封面轨道同一套写法：位移写 scrollTop，
 * 模糊量按当前滚动速度换算成 --ov-blur 交给 CSS。滚轮、键盘、触屏甩动都会发
 * scroll 事件，所以监视器对所有滚动方式都生效，惯性只给鼠标拖动补。
 */

const SAMPLE_MS = 110;      // 求手速的采样窗口，和封面轨道一致
const FLICK_MAX = 2400;     // 甩动初速上限（稿 px/s）
const DECAY = 3.4;          // 惯性衰减系数：每帧 v *= exp(-dt*DECAY)
const STOP_AT = 14;         // 低于这个速度就不写了，免得末帧抖动
const BLUR_ON = 300;        // 稿 px/s：慢速整理页面时不该糊
const BLUR_K = 0.0022;      // 速度 → 模糊像素
const BLUR_MAX = 2.2;       // 上限，他要的是「轻微」
const BLUR_STEP = 0.1;      // 变化超过这么多才写样式，省掉无谓的绘制层更新

export function useDragScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let dragging = false;
    let suppress = false;
    let clearTimer = 0;
    let fling = 0;
    let startY = 0;
    let startTop = 0;
    /** 屏幕像素 → 稿子像素。画布模式整页被 scale() 过，不换算就不跟手 */
    let scale = 1;
    const samples: { t: number; y: number }[] = [];
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    /* ---------- 滚动速度 → --ov-blur（所有滚动方式都管） ---------- */
    let raf = 0;
    let prevT = 0;
    let prevTop = 0;
    let vel = 0;
    let blur = 0;
    let movedAt = 0;

    /** 设计台「动效强度」0~1：关掉动效时既不甩也不糊 */
    const motionScale = () => {
      const v = Number.parseFloat(getComputedStyle(el).getPropertyValue("--site-motion"));
      return Number.isFinite(v) && v > 0 ? Math.min(v, 1) : 0;
    };

    const step = (t: number) => {
      const dt = Math.min(0.05, Math.max(0.008, (t - prevT) / 1000));
      prevT = t;

      /* 惯性：松手后接着推，靠边就断（scrollTop 写不动说明到头了） */
      if (fling !== 0 && !dragging) {
        const before = el.scrollTop;
        el.scrollTop = before + fling * dt;
        fling *= Math.exp(-dt * DECAY);
        if (Math.abs(fling) < STOP_AT || el.scrollTop === before) fling = 0;
      }

      const top = el.scrollTop;
      const inst = (top - prevTop) / dt;
      prevTop = top;
      if (Math.abs(inst) > 1) movedAt = t;
      vel += (inst - vel) * (1 - Math.exp(-dt * 14));

      const target =
        Math.abs(vel) > BLUR_ON
          ? Math.min(BLUR_MAX, (Math.abs(vel) - BLUR_ON) * BLUR_K) * motionScale()
          : 0;
      if (Math.abs(target - blur) > BLUR_STEP) {
        blur = target;
        if (blur < 0.06) {
          el.classList.remove("is-blurring");
          el.style.setProperty("--ov-blur", "0px");
        } else {
          el.classList.add("is-blurring");
          el.style.setProperty("--ov-blur", `${blur.toFixed(2)}px`);
        }
      }

      if (!dragging && fling === 0 && blur === 0 && Math.abs(vel) < 40 && t - movedAt > 140) {
        vel = 0;
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(step);
    };

    /** 任何滚动都叫醒监视器；睡着时靠它自己收尾 */
    const kick = () => {
      if (raf) return;
      prevT = performance.now();
      prevTop = el.scrollTop;
      movedAt = prevT;
      raf = requestAnimationFrame(step);
    };

    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      dragging = true;
      fling = 0;
      samples.length = 0;
      samples.push({ t: e.timeStamp, y: e.clientY });
      startY = e.clientY;
      startTop = el.scrollTop;
      // clientY 是屏幕像素、scrollTop 是稿子像素：1912 宽时 fit=1.33，
      // 直接相减会变成「手走 100、内容走 133」，窄窗口反过来又拖不动。
      const r = el.getBoundingClientRect();
      const k = r.width > 0 && el.offsetWidth > 0 ? r.width / el.offsetWidth : 1;
      scale = k > 0.05 ? k : 1;
      kick();
    };

    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dy = e.clientY - startY;
      if (!suppress && Math.abs(dy) < 5) return;
      suppress = true;
      el.classList.add("is-dragging");
      el.scrollTop = startTop - dy / scale;
      samples.push({ t: e.timeStamp, y: e.clientY });
      while (samples.length > 2 && e.timeStamp - samples[0].t > SAMPLE_MS) samples.shift();
    };

    const up = () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("is-dragging");
      const n = samples.length;
      if (n >= 2) {
        const a = samples[0];
        const b = samples[n - 1];
        const ms = b.t - a.t;
        if (ms > 12 && ms < 400) {
          // 屏幕 px/s → 稿 px/s（scrollTop 就是稿 px），再乘动效强度
          const v = (-(b.y - a.y) / scale) * (1000 / ms);
          fling = Math.max(-FLICK_MAX, Math.min(FLICK_MAX, v)) * motionScale();
        }
      }
      samples.length = 0;
      kick();
      // click 紧跟在 pointerup 之后；没等到它就把标记清掉，下次正常点击不受影响
      if (suppress) clearTimer = window.setTimeout(() => { suppress = false; }, 120);
    };

    const onClick = (e: MouseEvent) => {
      if (!suppress) return;
      e.preventDefault();
      e.stopPropagation();
      suppress = false;
    };

    /** 滚轮、触控板、键盘都会打断未走完的惯性 */
    const interrupt = () => {
      fling = 0;
      kick();
    };

    el.addEventListener("scroll", kick, { passive: true });
    el.addEventListener("wheel", interrupt, { passive: true });
    el.addEventListener("keydown", interrupt);

    if (fine) {
      el.addEventListener("pointerdown", down);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
      el.addEventListener("click", onClick, true);
    }

    return () => {
      window.clearTimeout(clearTimer);
      if (raf) cancelAnimationFrame(raf);
      el.style.removeProperty("--ov-blur");
      el.classList.remove("is-blurring");
      el.removeEventListener("scroll", kick);
      el.removeEventListener("wheel", interrupt);
      el.removeEventListener("keydown", interrupt);
      if (fine) {
        el.removeEventListener("pointerdown", down);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        el.removeEventListener("click", onClick, true);
      }
    };
  }, [ref]);
}
