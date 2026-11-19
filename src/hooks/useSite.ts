import { useEffect, useLayoutEffect, useState } from "react";

/** 设计画布的稿宽：整页按这个宽度排版，再等比缩放到窗口宽度。 */
export const CANVAS_W = 1440;

/**
 * 设计画布模式：整页固定按 1440 宽的稿子排版，
 * 用 `--fit = 窗口宽度 / 1440` 等比缩放，所以任何窗口大小都能看到完整版面，
 * 缩放只是放大镜，不会切掉右边、也不会换成窄屏排版。
 * 画布高度 = 窗口高度 / fit，因此高度方向始终刚好铺满，不留黑边。
 * 触屏设备、窗口不足 1100px（再缩字就太小了）、以及宽度 900px 以下
 * （那里本来就该换成移动端顶栏/胶囊布局）都不启用，仍走响应式排版。
 */
export function useFitCanvas() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (min-width: 1100px) and (min-height: 380px)"
    );

    const off = () => {
      root.removeAttribute("data-canvas");
      root.removeAttribute("data-canvas-h");
      root.style.removeProperty("--fit");
      root.style.removeProperty("--vh");
    };

    const apply = () => {
      if (!mq.matches) {
        off();
        return;
      }
      const fit = window.innerWidth / CANVAS_W;
      // 内置预览面板可能给出 0 尺寸，此时保持上一次的值，别把页面缩成 0
      if (!(fit > 0.05)) return;
      const canvasH = window.innerHeight / fit;
      // 稿子坐标下首页最矮也要 ~516（xs 档：顶栏留白 + 标题 + 简介 + 封面轨道）。
      // 比这还矮就放弃画布、退回可滚动的响应式排版，别把封面裁掉半截。
      if (canvasH < 522) {
        off();
        return;
      }
      root.style.setProperty("--fit", String(fit));
      // 高度用 JS 量的真实窗口高：某些内嵌/缩放环境里 100dvh 会比窗口矮一大截，
      // 画布按 dvh 算就铺不满（下半屏露底色、轨道被裁）。--vh 只给画布尺寸用。
      root.style.setProperty("--vh", `${window.innerHeight}px`);
      root.setAttribute("data-canvas", "1");
      // 画布等效高度（稿子坐标）：决定首页要不要收起简介/缩小封面。
      // 阈值按实测封面轨道下沿定：md 约需 806、sm 约需 649、xs 约需 516（含安全余量）。
      root.setAttribute(
        "data-canvas-h",
        canvasH <= 640 ? "xs" : canvasH <= 845 ? "sm" : "md"
      );
    };

    apply();
    window.addEventListener("resize", apply, { passive: true });
    window.addEventListener("orientationchange", apply);
    mq.addEventListener("change", apply);
    return () => {
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      mq.removeEventListener("change", apply);
    };
  }, []);
}

/** 页面滚动后顶栏变为更实底的材质。 */
export function useScrolled(threshold = 40) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

/** 覆盖层打开时锁定背景滚动。 */
export function useBodyLock(locked: boolean) {
  useEffect(() => {
    document.body.classList.toggle("is-locked", locked);
    return () => document.body.classList.remove("is-locked");
  }, [locked]);
}
