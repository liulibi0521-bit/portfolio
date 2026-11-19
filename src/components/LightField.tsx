import { useEffect, useRef } from "react";

/**
 * Hero 背景：程序生成的光场动画（可当作 showreel 视频到位前的替身）。
 * 在 src/data/site.ts 里把 profile.heroVideo 填成视频路径，即自动切换为 <video>。
 */
export default function LightField({ videoSrc }: { videoSrc?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || videoSrc) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const root = getComputedStyle(document.documentElement);
    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");

    /**
     * 光场本来就是糊开的渐变，不需要按设备像素去画。
     * 实测（1440×898 画布、blur(48px)、每帧 3 团光 + 5 条光带）：
     *   dpr 1   → 每帧 126~133ms
     *   dpr 1.6 → 每帧 370ms
     * 主线程被它整块占住，封面轨道的 rAF 只能挤在缝里走，整页一起掉帧。
     * 所以固定用 480 宽的 backing store（模糊半径同比缩到 16px），再让 CSS 拉满：
     * 画面是同一团柔光，肉眼分不出，每帧只要 ~10ms。
     */
    const FIELD_W = 480;

    let w = 0;
    let h = 0;
    /** 稿子像素 → backing store 像素；模糊半径和光带粗细都要乘它 */
    let k = 1;

    const ribbons = [
      { y: 0.28, amp: 0.1, len: 1.1, sp: 0.00013, thick: 190, hue: "#0a84ff", a: 0.3 },
      { y: 0.52, amp: 0.14, len: 0.72, sp: -0.00009, thick: 150, hue: "#64d2ff", a: 0.24 },
      { y: 0.7, amp: 0.08, len: 1.4, sp: 0.00007, thick: 210, hue: "#5e5ce6", a: 0.26 },
      { y: 0.42, amp: 0.2, len: 0.5, sp: -0.00016, thick: 90, hue: "#ff375f", a: 0.14 },
      { y: 0.82, amp: 0.11, len: 0.95, sp: 0.00011, thick: 120, hue: "#0a84ff", a: 0.2 },
    ];

    const blobs = [
      { x: 0.22, y: 0.3, r: 0.55, hue: "#0a84ff", a: 0.16, sp: 0.00021 },
      { x: 0.74, y: 0.62, r: 0.48, hue: "#5e5ce6", a: 0.14, sp: -0.00017 },
      { x: 0.5, y: 0.88, r: 0.6, hue: "#64d2ff", a: 0.1, sp: 0.00013 },
    ];

    const resize = () => {
      const cw = canvas.clientWidth || 1;
      const ch = canvas.clientHeight || 1;
      k = Math.min(1, FIELD_W / cw);
      w = Math.max(1, Math.round(cw * k));
      h = Math.max(1, Math.round(ch * k));
      canvas.width = w;
      canvas.height = h;
      // 几何一律按 backing store 像素算，模糊半径才不会跟着 transform 二次缩放
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    };

    const draw = (t: number) => {
      // 每次现读：设计工作台改「动效强度」不触发 resize
      const motion = Math.max(
        0.2,
        Number.parseFloat(root.getPropertyValue("--site-motion")) || 1
      );
      const tm = t * motion;
      const bg = root.getPropertyValue("--site-bg").trim() || "#08090c";
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      ctx.filter = `blur(${(48 * k).toFixed(2)}px)`;

      const drift = (tm * 0.000012) % 1;

      for (const b of blobs) {
        const cx = (b.x + Math.sin(tm * b.sp) * 0.1) * w;
        const cy = (b.y + Math.cos(tm * b.sp * 0.8) * 0.08) * h;
        const rad = b.r * Math.max(w, h) * 0.55;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, b.hue);
        g.addColorStop(1, "transparent");
        ctx.globalAlpha = b.a;
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      for (const rb of ribbons) {
        ctx.beginPath();
        const steps = 26;
        for (let i = 0; i <= steps; i += 1) {
          const px = (i / steps) * w;
          const phase = tm * rb.sp + drift * Math.PI * 2;
          const py =
            (rb.y +
              Math.sin((i / steps) * Math.PI * 2 * rb.len + phase) * rb.amp +
              Math.sin((i / steps) * Math.PI * 4 * rb.len - phase * 1.4) *
                rb.amp *
                0.35) *
            h;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, "transparent");
        grad.addColorStop(0.35, rb.hue);
        grad.addColorStop(0.68, rb.hue);
        grad.addColorStop(1, "transparent");
        ctx.strokeStyle = grad;
        ctx.lineWidth = rb.thick * k;
        ctx.globalAlpha = rb.a;
        ctx.stroke();
      }

      ctx.filter = "none";
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || reduceMq.matches) return;
      if (t - last < 33) return; // 约 30fps，交给 blur 做柔化
      last = t;
      // 弹层盖住了整个背景，这时候再画就是白烧 CPU（还要和成片解码抢主线程）
      if (document.body.classList.contains("is-locked")) return;
      draw(t);
    };

    if (reduceMq.matches) {
      draw(1200);
    } else {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [videoSrc]);

  return (
    <div ref={wrapRef} className="hero__media">
      {videoSrc ? (
        <video
          className="hero__video"
          src={videoSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      ) : (
        <canvas ref={canvasRef} className="hero__canvas" aria-hidden="true" />
      )}
    </div>
  );
}
