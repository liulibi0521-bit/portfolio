import { useEffect, useRef } from "react";
import type { Work } from "../data/site";
import { categories, isTall, siteFlags, workKicker } from "../data/site";

const catName = new Map(categories.map((c) => [c.id, c.name]));

/**
 * 轨道运动参数（都是稿子坐标，画布缩放由 scale() 换算掉）。
 * 这版不再用 CSS keyframes：要惯性就必须按帧算速度，keyframes 给不了。
 * 位移写的是 transform: translate3d 的小数值，亚像素照样平滑——
 * 以前一卡一卡的元凶是 scrollLeft 取整，不是主线程。
 */
const CRUISE = 55;
/** 按下后走过这几个像素才算拖动，不再当点击（画布坐标，非屏幕坐标） */
const DRAG_SLOP = 5;
/** 甩动速度上限，免得一甩冲出十几屏 */
const FLING_MAX = 3000;
/** 松手后速度回到巡航值的快慢（1/s）。
 *  1.9 时约 1.6 秒收住，手感像被刹住；1.2 时约 2.5 秒收住，惯性更足。 */
const RELAX = 1.2;
/**
 * 指针停住时的收敛快慢。用 RELAX 的话从 55px/s 收到 0 要 2.6 秒、还要再滑 75px，
 * 「指针经过就停」会变成「经过之后又滑了一会儿」；这一档约 1.4 秒收住、滑 20px，
 * 比急刹柔和，不会一放上去就钉死。
 */
const RELAX_STOP = 3;
/** 动态模糊：超出巡航速度的部分按这个系数糊起来 */
const BLUR_GAIN = 0.0032;
const BLUR_MAX = 5;

interface Props {
  works: Work[];
  onOpen: (id: string) => void;
}

/**
 * 作品封面轨道。规则（按他 2026-11-19 先后提的几条合起来）：
 *   · 一直自动向左巡航（55px/s）
 *   · 鼠标指针一进轨道 → 巡航停住、同时指针下那张封面放大；离开 → 立刻恢复
 *   · 可以拖 / 可以划，画面跟着手指走（往左划就往左走，不反向）
 *   · 滚轮同样横着滑：触控板听 deltaX，鼠标滚轮听 deltaY
 *   · 松手带惯性，甩多快滑多远，滑完自己接上巡航——不用点一下才动
 *   · 滑动过程中按速度加动态模糊
 *   · 单击任意封面直接进预览播成片
 * 「悬停停住」只认 pointerType === "mouse"：触屏上 hover 会粘住，正是他说的
 * 「划一次就停下来，得再点一下屏幕才动」。悬停也不再给拖动/滚轮开后门——
 * 他 11-19 最后一条把话说死了：指针经过就停，所以鼠标还停在轨道上时，
 * 甩出去的惯性滑一段就自然停下，移出轨道才重新巡航。
 */
export default function CoverRail({ works, onOpen }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const state = useRef({
    /** 一份作品的周期长度（稿子坐标 px） */
    shift: 0,
    /** 当前位置（稿子坐标 px，恒在 (-周期, 0]） */
    x: 0,
    /** 当前速度（稿子坐标 px/s，负数 = 向左） */
    v: -CRUISE,
    /** 此刻糊多少 px，只在变化够大时写进样式 */
    blur: -1,
    dragging: false,
    pointerId: -1,
    /** 指针捕获是否已生效（没捕获过就别去 release，白抛异常） */
    captured: false,
    startClientX: 0,
    startX: 0,
    moved: 0,
    lastClientX: 0,
    lastT: 0,
    wheelT: 0,
    samples: [] as { t: number; v: number }[],
    /** 屏幕 px → 稿子 px */
    scale: 1,
    /** 鼠标指针此刻在轨道范围内 → 巡航停住（只认 mouse，触屏/笔没有真悬停） */
    hover: false,
    focus: false,
  });

  useEffect(() => {
    const track = trackRef.current;
    const line = lineRef.current;
    if (!track || !line) return;
    const s = state.current;

    const reduced = () =>
      typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

    /** 速度每次现读：设计工作台里改「动效强度」不触发 resize */
    const cruise = () => {
      if (reduced()) return 0;
      const m =
        Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--site-motion")
        ) || 1;
      return CRUISE * m;
    };

    /**
     * 周期长度 = 第 N+1 张封面相对第 1 张的 offsetLeft，正好是「一份作品 + 一份间距」。
     * 直接取一半宽度会少算一个 gap，循环点就会抖一下。
     */
    const measure = () => {
      const first = line.children[0] as HTMLElement | undefined;
      const after = line.children[works.length] as HTMLElement | undefined;
      if (!first || !after) return;
      const shift = after.offsetLeft - first.offsetLeft;
      if (!(shift > 0)) return;
      s.shift = shift;
      s.x = normalize(s.x);
      if (import.meta.env.DEV) diagnose();
    };

    /** 位移永远落在 (-周期, 0]，这样往任一边拖都能无缝接上。 */
    function normalize(x: number) {
      const h = s.shift;
      if (!(h > 0)) return 0;
      let v = x % h;
      if (v > 0) v -= h;
      return v;
    }

    /** 轨道为什么没在动，一眼能看出卡在哪个条件上（只有 DEV 打包进来） */
    function diagnose() {
      if (!import.meta.env.DEV) return;
      track!.setAttribute(
        "data-rail",
        `shift=${s.shift.toFixed(0)}px x=${s.x.toFixed(1)} v=${s.v.toFixed(0)}px/s ` +
          `cruise=${cruise().toFixed(0)} blur=${s.blur.toFixed(2)}` +
          ` hover=${s.hover ? 1 : 0} focus=${s.focus ? 1 : 0} drag=${s.dragging ? 1 : 0}`
      );
    }
    if (import.meta.env.DEV) (window as unknown as { __rail?: typeof s }).__rail = s;

    /** 指针在轨道上、或键盘正聚焦在封面上 → 停住；拖动时由 pointermove 说话 */
    const paused = () => s.hover || s.focus;

    let raf = 0;
    let last = performance.now();
    let lastTransform = "";
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000) || 0;
      last = now;
      const c = cruise();
      if (!s.dragging) {
        const stop = paused();
        const target = stop ? 0 : -c;
        // 指数靠拢：甩出去的初速度慢慢衰减回巡航；指针停住那一档要干脆得多
        const relax = stop ? RELAX_STOP : RELAX;
        s.v += (target - s.v) * (1 - Math.exp(-dt * relax));
        if (Math.abs(s.v - target) < 0.4) s.v = target;
        s.x = normalize(s.x + s.v * dt);
      }
      // 值没变就不写 DOM，避免每帧白触发一次样式重算
      const nextTransform = `translate3d(${s.x.toFixed(2)}px, 0, 0)`;
      if (nextTransform !== lastTransform) {
        lastTransform = nextTransform;
        line.style.transform = nextTransform;
      }
      const blur = Math.min(BLUR_MAX, Math.max(0, (Math.abs(s.v) - c) * BLUR_GAIN));
      if (Math.abs(blur - s.blur) > 0.06) {
        s.blur = blur;
        line.style.setProperty("--rail-blur", `${blur.toFixed(2)}px`);
        if (import.meta.env.DEV) diagnose();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // 后台标签页暂停 rAF 循环，切回来时重置时间戳避免 dt 爆炸
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(line);
    // 画布缩放、字号变化都会改变周期长度
    window.addEventListener("resize", measure, { passive: true });
    const t = window.setTimeout(measure, 600); // 字体加载完再量一次
    // 设计工作台调「动效强度」只改 CSS 变量、不触发 resize，监听根元素属性变化重算
    const mo =
      typeof MutationObserver !== "undefined" ? new MutationObserver(measure) : null;
    mo?.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });

    /* ------------------------------- 拖动 / 滑动 ------------------------------ */

    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const r = track.getBoundingClientRect();
      s.scale = r.width && track.offsetWidth ? r.width / track.offsetWidth : 1;
      s.dragging = true;
      s.pointerId = e.pointerId;
      s.captured = false;
      s.startClientX = e.clientX;
      s.startX = s.x;
      s.moved = 0;
      s.lastClientX = e.clientX;
      s.lastT = e.timeStamp;
      s.samples = [];
      // 不在这里 setPointerCapture：捕获会把后续指针事件全部重定向到 track，
      // 按钮收不到 pointerup → 浏览器不生成 click → 封面永远点不开。
      // 捕获移到 move 里确认拖动（超阈值）后再做，普通点击不走捕获。
      if (import.meta.env.DEV) diagnose();
    };

    const move = (e: PointerEvent) => {
      if (!s.dragging || e.pointerId !== s.pointerId) return;
      const dScreen = e.clientX - s.startClientX;
      // 用画布坐标判断是否超阈值：screen / scale = canvas 位移，
      // 这样缩放不会把 clientX 的抖动放大，普通点击不会误判成拖动。
      const dCanvas = Math.abs(dScreen) / (s.scale > 0.05 ? s.scale : 1);
      s.moved = Math.max(s.moved, dCanvas);
      // 过了阈值才算「他在拖」：此刻才做指针捕获 + 加 is-dragging 类
      if (s.moved > DRAG_SLOP) {
        if (!track.classList.contains("is-dragging")) {
          track.classList.add("is-dragging");
          try {
            track.setPointerCapture(e.pointerId);
            s.captured = true;
          } catch {
            /* 内嵌面板拿不到捕获，靠 window 级监听兜底 */
          }
        }
      }
      // 往左划就往左走：手指位移和轨道位移同号
      const dx = dScreen / (s.scale > 0.05 ? s.scale : 1);
      s.x = normalize(s.startX + dx);
      const nextTransform = `translate3d(${s.x.toFixed(2)}px, 0, 0)`;
      if (nextTransform !== lastTransform) {
        lastTransform = nextTransform;
        line.style.transform = nextTransform;
      }

      const dt = e.timeStamp - s.lastT;
      if (dt > 8) {
        const inst = ((e.clientX - s.lastClientX) / dt / (s.scale > 0.05 ? s.scale : 1)) * 1000;
        s.samples.push({ t: e.timeStamp, v: inst });
        if (s.samples.length > 8) s.samples.shift();
        s.lastClientX = e.clientX;
        s.lastT = e.timeStamp;
        s.v = s.v * 0.55 + inst * 0.45; // 只用来驱动模糊，别抖
      }
    };

    const up = (e: PointerEvent) => {
      if (!s.dragging || (e.pointerId !== undefined && e.pointerId !== s.pointerId)) return;
      s.dragging = false;
      track.classList.remove("is-dragging");
      if (s.captured) {
        try {
          track.releasePointerCapture(s.pointerId);
        } catch {
          /* 捕获已失效（比如元素被移除），忽略 */
        }
        s.captured = false;
      }
      s.pointerId = -1;
      // 用最近 150ms 的采样求出手速，作为惯性初速度（窗口太窄会低估甩速）
      const recent = s.samples.filter((p) => e.timeStamp - p.t <= 150);
      if (recent.length) {
        const weighted = recent.reduce((a, p) => a + p.v, 0) / recent.length;
        s.v = Math.max(-FLING_MAX, Math.min(FLING_MAX, weighted));
      } else {
        s.v = 0;
      }
      s.samples = [];
      if (import.meta.env.DEV) diagnose();
    };

    // 拖到轨道外面松手、被系统打断，都要收尾
    track.addEventListener("pointerdown", down);
    // move 挂窗口级：拿到指针捕获时事件照样冒泡上来；拿不到捕获（内嵌面板会抛）时，
    // 拖出轨道范围也继续跟手——只挂 track 的话，指针一出轨道就断在半路。
    window.addEventListener("pointermove", move);
    track.addEventListener("pointerup", up);
    track.addEventListener("pointercancel", up);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);

    /* ------------------------------- 鼠标滚轮 ------------------------------- */

    const wheel = (e: WheelEvent) => {
      // 触控板横向手势听 deltaX，鼠标滚轮听 deltaY，谁大用谁
      const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : -e.deltaY;
      if (!raw) return;
      e.preventDefault();
      const r = track.getBoundingClientRect();
      const k = r.width && track.offsetWidth ? r.width / track.offsetWidth : 1;
      const d = raw / k;
      // 滚轮往哪边滚，画面就往哪边去：触控板向右 = 内容向右，鼠标滚轮向下 = 内容向左
      s.x = normalize(s.x + d);
      const nextTransform = `translate3d(${s.x.toFixed(2)}px, 0, 0)`;
      if (nextTransform !== lastTransform) {
        lastTransform = nextTransform;
        line.style.transform = nextTransform;
      }
      const now = e.timeStamp || performance.now();
      // 首次滚轮 wheelT 为 0 时跳过速度计算，避免 dt 巨大把速度压成 0
      if (s.wheelT > 0) {
        const dt = Math.max(0.016, (now - s.wheelT) / 1000);
        s.v = Math.max(-FLING_MAX, Math.min(FLING_MAX, s.v * 0.4 + (d / dt) * 0.6));
      }
      s.wheelT = now;
      if (import.meta.env.DEV) diagnose();
    };
    track.addEventListener("wheel", wheel, { passive: false });

    /* --------------------------- 悬停 / 键盘焦点停走 -------------------------- */

    const enter = (e: PointerEvent) => {
      // 触屏、笔没有真正的悬停，别把「停住」粘在手指上
      if (e.pointerType === "mouse") s.hover = true;
      if (import.meta.env.DEV) diagnose();
    };
    // HMR / 刷新后指针本来就停在轨道里，pointerenter 不会再补一次，靠首个 move 认回来
    const moveHover = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && !s.hover) enter(e);
    };
    const leave = () => {
      s.hover = false;
      if (import.meta.env.DEV) diagnose();
    };
    const focusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      let vis = true;
      try {
        vis = !!el?.matches?.(":focus-visible");
      } catch {
        vis = true;
      }
      s.focus = vis;
      if (import.meta.env.DEV) diagnose();
    };
    const focusOut = () => {
      s.focus = false;
    };
    track.addEventListener("pointerenter", enter);
    track.addEventListener("pointermove", moveHover);
    track.addEventListener("pointerleave", leave);
    track.addEventListener("focusin", focusIn);
    track.addEventListener("focusout", focusOut);

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      mo?.disconnect();
      window.clearTimeout(t);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", measure);
      track.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      track.removeEventListener("pointerup", up);
      track.removeEventListener("pointercancel", up);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      track.removeEventListener("wheel", wheel);
      track.removeEventListener("pointerenter", enter);
      track.removeEventListener("pointermove", moveHover);
      track.removeEventListener("pointerleave", leave);
      track.removeEventListener("focusin", focusIn);
      track.removeEventListener("focusout", focusOut);
    };
  }, [works.length]);

  const items = [...works, ...works];

  return (
    <div className="rail">
      <div className="rail__head">
        <p className="rail__hint">可拖拽 / 滑动 · 点击进入预览</p>
        <p className="rail__hint">
          {siteFlags.sampleWorks && <span className="sample-chip">示例内容</span>}
          Selected Works · {works.length}
        </p>
      </div>
      <div ref={trackRef} className="rail__track" aria-label="作品封面轨道">
        <div className="rail__line" ref={lineRef}>
          {items.map((w, i) => {
            const kicker = workKicker(w);
            return (
              <button
                key={`${w.id}-${i}`}
                type="button"
                className="cover"
                data-fit={isTall(w.coverSize) ? "contain" : "cover"}
                style={{ ["--poster" as string]: `url("${w.cover}")` }}
                aria-label={`预览作品 ${w.title}`}
                aria-hidden={i >= works.length}
                tabIndex={i >= works.length ? -1 : 0}
                onClick={() => {
                  // 拖过就不算点：手滑出去几像素不该顺手弹一个预览出来
                  if (state.current.moved > DRAG_SLOP) return;
                  onOpen(w.id);
                }}
              >
                <img
                  src={w.cover}
                  alt={`${w.title} 封面`}
                  loading={i < 4 ? "eager" : "lazy"}
                  decoding="async"
                />
                <span className="cover__meta">
                  <span>
                    {kicker && <span className="cover__sub">{kicker}</span>}
                    <span className="cover__title">{w.title}</span>
                  </span>
                  <span className={`cover__badge tag--${w.category}`}>{catName.get(w.category)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
