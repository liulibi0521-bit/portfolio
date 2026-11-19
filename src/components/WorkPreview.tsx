import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Overlay from "./Overlay";
import { IconChevronRight, IconPause, IconPlay, IconVolume, IconVolumeMute, IconFullscreen, IconFullscreenExit } from "./Icons";
import { categories, isTall, reelSrc, works, type Work } from "../data/site";

const catName = new Map(categories.map((c) => [c.id, c.name]));

interface Props {
  work: Work;
  onClose: () => void;
  onNavigate: (id: string) => void;
}

function mmss(seconds: number) {
  if (!Number.isFinite(seconds)) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/** 控件停手多久收回（毫秒） */
const HUD_IDLE = 2600;

interface BarProps {
  /** pv__hudbar（进度）/ pv__vol（音量） */
  kind: string;
  label: string;
  /** 0..1 */
  value: number;
  /** 方向键一次走多少（同样是 0..1） */
  step: number;
  valueText: string;
  onValue: (v: number) => void;
  onEnd?: () => void;
}

/**
 * 进度条与音量条共用一套：点哪到哪、按住能拖、方向键能微调。
 * 位置用 getBoundingClientRect 换算——clientX 和 rect 都是屏幕像素，
 * 画布模式的 transform: scale() 自动抵消，不需要再量缩放比。
 */
function Bar({ kind, label, value, step, valueText, onValue, onEnd }: BarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  // 拖动期间父组件会不停重渲染，用 ref 拿最新的回调，别把窗口监听器里的闭包跑旧
  const latest = useRef({ onValue, onEnd });
  latest.current = { onValue, onEnd };

  const ratioAt = (clientX: number) => {
    const el = ref.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return r.width ? clamp01((clientX - r.left) / r.width) : 0;
  };

  const commit = useCallback((v: number) => latest.current.onValue(clamp01(v)), []);

  /**
   * 窗口级监听在 pointerdown 里同步挂上，不等 effect 里的 dragging 生效：
   * 同一帧内按下又抬起（很快地点一下、合成指针）时 effect 还没跑，pointerup 没人接，
   * 进度条就会永远卡在 scrub 位置、看着像播放停了。
   */
  const detach = useRef<(() => void) | null>(null);

  const endDrag = useCallback(() => {
    detach.current?.();
    detach.current = null;
    setDragging(false);
    latest.current.onEnd?.();
  }, []);

  useEffect(
    () => () => {
      detach.current?.();
      detach.current = null;
    },
    []
  );

  return (
    <div
      ref={ref}
      className={`pv__bar ${kind}${dragging ? " is-drag" : ""}`}
      style={{ ["--p" as string]: `${Math.round(value * 1000) / 10}%` }}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      aria-valuetext={valueText}
      onPointerDown={(e) => {
        e.preventDefault();
        // preventDefault 把原生 focus 也一起挡掉了：不手动聚焦的话，
        // 点完进度条再按 ←/→ 会被当成「切换作品」，而不是微调进度。
        e.currentTarget.focus({ preventScroll: true });
        // 先定位，再试着捕获指针：内嵌面板里捕获可能抛错，不能让它把整件事带崩
        commit(ratioAt(e.clientX));
        setDragging(true);
        const move = (ev: PointerEvent) => commit(ratioAt(ev.clientX));
        const up = () => endDrag();
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", up);
        detach.current = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          window.removeEventListener("pointercancel", up);
        };
        try {
          e.currentTarget.setPointerCapture?.(e.pointerId);
        } catch {
          /* 拿不到捕获也没关系，上面已经挂了窗口级监听 */
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") commit(value - step);
        else if (e.key === "ArrowRight" || e.key === "ArrowUp") commit(value + step);
        else if (e.key === "Home") commit(0);
        else if (e.key === "End") commit(1);
        else return;
        // 键盘定位没有「松手」这一下，得自己收尾，否则 scrub 一直挂着、
        // 进度条和时间码会永远停在这一格（视频其实还在播）。
        latest.current.onEnd?.();
        // 焦点在滑条上时方向键归滑条，不要顺手去切换作品
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <i />
      <b />
    </div>
  );
}

export default function WorkPreview({ work, onClose, onNavigate }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(true);
  const [ratio, setRatio] = useState(0);
  const [time, setTime] = useState(0);
  const [total, setTotal] = useState(0);
  /** 拖动进度条时的目标位置：视频自己的 timeupdate 慢半拍，先用它跟手 */
  const [scrub, setScrub] = useState<number | null>(null);
  /** 自动播放只能静音起步，用户碰过音量条才放开声音 */
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(true);
  /** 首帧还没解码出来时给个「加载中」，别让人以为这是一张静帧 */
  const [stalled, setStalled] = useState(true);
  /** 是不是他自己按停的：不是的话，元数据一到就替他接着播 */
  const userPaused = useRef(false);
  /** 全屏状态 */
  const [fullscreen, setFullscreen] = useState(false);
  /**
   * 控件条平时收起来，鼠标一动才出现（和视频网站一样）。
   * 暂停 / 缓冲 / 拖进度 / 指针停在控件上 / 焦点在控件里时不收，免得「看不到也点不到」。
   */
  const [hudOn, setHudOn] = useState(true);
  const [hudHover, setHudHover] = useState(false);
  const hudRef = useRef<HTMLDivElement>(null);
  /** 触屏没有 hover：一动就藏会让人找不到控件，这类设备干脆常显 */
  const [canHover] = useState(() =>
    typeof window === "undefined"
      ? true
      : window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );
  /** 移动端全屏模式：触屏设备上所有视频都用抖音式布局 */
  const isMobileFs = !canHover;
  /** 滑动提示可见性 */
  const [swipeHint, setSwipeHint] = useState<"up" | "down" | null>(null);
  const touchStartY = useRef<number | null>(null);
  const movedAt = useRef(0);
  /**
   * 最近一次操作是不是键盘。键盘聚焦进来的控件不能藏（看不见就没法用），
   * 鼠标点过滑条之后焦点会留在里面，那种情况照常收起来。
   */
  const kbMode = useRef(false);

  /** 成片只在本地预览时从 素材/ 直读；打包后为空，预览层自动退回封面静帧 */
  const video = reelSrc(work);
  /** 竖屏成片或竖版海报：不裁切，完整显示 */
  const tall = isTall(video ? work.reelSize : work.coverSize);
  /**
   * 舞台按这个比例定高（常规商用画幅：16:9 / 9:16 / 16:10），
   * 元数据一到就用视频自身的真实宽高覆盖，site.ts 里填错也不会留下黑边。
   */
  const [arFromMeta, setArFromMeta] = useState<string | null>(null);
  const declared = video && work.reelSize ? work.reelSize : work.coverSize;
  const ar = arFromMeta ?? `${declared.w} / ${declared.h}`;
  const specs = work.specs.filter((s) => s.value);

  /** 内嵌预览面板可能拦自动播放：失败就退回「按播放」的状态，界面上会有播放键 */
  const tryPlay = useCallback((v: HTMLVideoElement | null) => {
    if (!v) return;
    const p = v.play();
    if (p && typeof p.catch === "function") p.catch(() => setPlaying(false));
    else setPlaying(true);
  }, []);

  useEffect(() => {
    setPlaying(true);
    setRatio(0);
    setTime(0);
    setTotal(0);
    setScrub(null);
    setStalled(true);
    setArFromMeta(null);
    userPaused.current = false;
    const v = videoRef.current;
    if (!v) return;
    tryPlay(v);
  }, [work.id, tryPlay]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.volume = volume;
  }, [volume]);

  const index = works.findIndex((w) => w.id === work.id);
  const prev = works[(index - 1 + works.length) % works.length];
  const next = works[(index + 1) % works.length];

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      userPaused.current = false;
      tryPlay(v);
    } else {
      userPaused.current = true;
      v.pause();
      setPlaying(false);
    }
  };

  const duration = total || work.seconds || 0;

  const seek = (r: number) => {
    setScrub(r);
    // ratio 也一起写上：键盘定位后 scrub 立刻收尾，画面位置才不会先跳回旧值
    setRatio(r);
    const v = videoRef.current;
    if (v && Number.isFinite(v.duration) && v.duration > 0) {
      v.currentTime = r * v.duration;
      setTime(v.currentTime);
    }
  };

  const silent = muted || volume <= 0.001;

  /** 这些状态本身就该让控件一直露着（跟指针在哪无关） */
  const hudSticky = !video || !playing || stalled || scrub !== null;
  const hudHold = hudSticky || hudHover;

  const showHud = useCallback(() => {
    movedAt.current = Date.now();
    setHudOn(true);
  }, []);

  // 换片时重新亮一下，别沿用上一件作品的闲置计时
  useEffect(() => {
    movedAt.current = Date.now();
    setHudOn(true);
  }, [work.id]);

  useEffect(() => {
    if (hudHold) {
      setHudOn(true);
      return;
    }
    // 起表时重置：暂停了很久再点播放，别拿旧时间戳立刻判成「已经闲置」
    movedAt.current = Date.now();
    const id = window.setInterval(() => {
      // 键盘用户聚焦在控件里就当成还在操作
      if (kbMode.current && hudRef.current?.contains(document.activeElement)) {
        movedAt.current = Date.now();
        setHudOn(true);
        return;
      }
      if (Date.now() - movedAt.current >= HUD_IDLE) setHudOn(false);
    }, 250);
    return () => window.clearInterval(id);
  }, [hudHold]);

  // 键盘用户看不到鼠标：按键（含 Tab）也把控件叫出来，否则 Tab 会落到透明控件里
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") return;
      kbMode.current = true;
      showHud();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showHud]);

  /**
   * 指针在画面里动就露面，并记下是不是停在控件条上。
   * 用 pointermove + closest 判断，不依赖 pointerenter：合成/嵌套场景里它不一定发得出来。
   */
  const onStageMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    kbMode.current = false;
    showHud();
    setHudHover(!!(e.target as Element).closest?.(".pv__hud"));
  };

  const onStageLeave = () => {
    setHudHover(false);
    if (hudSticky) return;
    // 指针离开了，键盘的「保持可见」就不作数了（否则下一拍又把它叫回来）
    kbMode.current = false;
    // 指针离开画面就立刻收，不用再等闲置计时
    movedAt.current = 0;
    setHudOn(false);
  };

  /** 抖音式上下划：上划下一件，下划上一件 */
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;
    // 超过 50px 才算一次有效滑动
    if (Math.abs(deltaY) < 50) return;
    if (deltaY < 0) {
      // 上划 → 下一件
      setSwipeHint("up");
      setTimeout(() => setSwipeHint(null), 400);
      onNavigate(next.id);
    } else {
      // 下划 → 上一件
      setSwipeHint("down");
      setTimeout(() => setSwipeHint(null), 400);
      onNavigate(prev.id);
    }
  };

  const toggleMute = () => {
    if (silent) {
      setMuted(false);
      if (volume <= 0.02) setVolume(0.6);
    } else {
      setMuted(true);
    }
  };

  const setVol = (r: number) => {
    setVolume(r);
    setMuted(r <= 0.001);
  };

  const toggleFullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen().catch(() => {});
    }
  };

  // 监听全屏状态变化（用户按 Esc 退出也要同步）
  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // 提示文案里写了「← / → 切换作品」，这里把它真的做出来
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('[role="slider"], input, textarea, select')) return;
      e.preventDefault();
      onNavigate(e.key === "ArrowLeft" ? prev.id : next.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev.id, next.id, onNavigate]);

  const hud = (
    <div className="pv__hud" ref={hudRef}>
      {video ? (
        <>
          <button className="icon-btn" onClick={toggle} aria-label={playing ? "暂停" : "播放"}>
            {playing ? <IconPause size={15} /> : <IconPlay size={15} />}
          </button>
          <Bar
            kind="pv__hudbar"
            label="播放进度"
            value={scrub ?? ratio}
            step={duration ? 5 / duration : 0.02}
            valueText={`${mmss(scrub === null ? time : scrub * duration)} / ${mmss(duration)}`}
            onValue={seek}
            onEnd={() => setScrub(null)}
          />
          <span className="pv__hudtime mono">
            {mmss(scrub === null ? time : scrub * duration)} / {mmss(duration)}
          </span>
          <button className="icon-btn" onClick={toggleMute} aria-label={silent ? "取消静音" : "静音"}>
            {silent ? <IconVolumeMute size={15} /> : <IconVolume size={15} />}
          </button>
          <Bar
            kind="pv__vol"
            label="音量"
            value={volume}
            step={0.05}
            valueText={`${Math.round(volume * 100)}%${silent ? " · 已静音" : ""}`}
            onValue={setVol}
          />
          <button className="icon-btn" onClick={toggleFullscreen} aria-label={fullscreen ? "退出全屏" : "全屏"}>
            {fullscreen ? <IconFullscreenExit size={15} /> : <IconFullscreen size={15} />}
          </button>
        </>
      ) : (
        <>
          <span className="pv__hudtime">静帧预览</span>
          <span className="pv__bar pv__hudbar" style={{ ["--p" as string]: "100%" }}>
            <i style={{ opacity: 0.35 }} />
          </span>
          <span className="pv__hudtime mono">{work.duration}</span>
        </>
      )}
      <span className="pv__nav">
        <button className="icon-btn" onClick={() => onNavigate(prev.id)} aria-label={`上一件：${prev.title}`}>
          <IconChevronRight size={15} style={{ transform: "rotate(180deg)" }} />
        </button>
        <button className="icon-btn" onClick={() => onNavigate(next.id)} aria-label={`下一件：${next.title}`}>
          <IconChevronRight size={15} />
        </button>
      </span>
    </div>
  );

  return (
    <Overlay titleId="preview-title" label="作品预览" onClose={onClose} bare mobileFs={isMobileFs}>
      <div className={`pv${isMobileFs ? " pv--mobile-fs" : ""}`}>
        {/* 移动端全屏模式：文字信息放在视频上方黑边区，不挡画面 */}
        {isMobileFs && (
          <div className="pv__overlay-info">
            <h2 className="pv__overlay-title">{work.title}</h2>
            <div className="pv__overlay-meta">
              <span>{catName.get(work.category)}</span>
              {work.duration && <span className="chip">{work.duration}</span>}
              {work.reelSize && <span className="chip">{work.reelSize.w}×{work.reelSize.h}</span>}
            </div>
          </div>
        )}

        <div
          ref={stageRef}
          className="pv__stage"
          data-fit={tall ? "contain" : "cover"}
          data-clickable={video ? "1" : undefined}
          data-hud={video ? (hudOn ? "on" : "off") : "on"}
          style={{ ["--poster" as string]: `url("${work.cover}")`, ["--ar" as string]: ar }}
          onPointerMove={video ? onStageMove : undefined}
          onPointerLeave={video ? onStageLeave : undefined}
          onTouchStart={isMobileFs ? onTouchStart : undefined}
          onTouchEnd={isMobileFs ? onTouchEnd : undefined}
          onPointerDown={(e) => {
            // 画面本身也能点：自动播放被内嵌面板拦掉时，按一下就直接播，不用再去找播放键
            if (!video) return;
            if ((e.target as HTMLElement).closest(".pv__hud, .pv__bigplay")) return;
            // 触屏点一下也叫出控件，否则 2.6 秒后藏起来就找不到入口了
            showHud();
            toggle();
          }}
        >
          {video ? (
            <video
              ref={videoRef}
              src={video}
              poster={work.cover}
              autoPlay
              muted={muted}
              loop
              playsInline
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                setTotal(v.duration || 0);
                if (v.videoWidth > 0 && v.videoHeight > 0) {
                  setArFromMeta(`${v.videoWidth} / ${v.videoHeight}`);
                }
              }}
              onLoadedData={(e) => {
                setStalled(false);
                // 元数据/首帧到位时，如果刚才自动播放被拦了且他没自己按停，替他补一次
                if (!userPaused.current && e.currentTarget.paused) tryPlay(e.currentTarget);
              }}
              onPlaying={() => {
                setStalled(false);
                setPlaying(true);
              }}
              onWaiting={() => setStalled(true)}
              onSeeked={() => setStalled(false)}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                setTime(v.currentTime);
                setRatio(v.duration ? v.currentTime / v.duration : 0);
              }}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />
          ) : (
            <img className="pv__still" src={work.cover} alt={`${work.title} 画面`} decoding="async" />
          )}

          {video && !playing && (
            <button
              type="button"
              className="pv__bigplay"
              onClick={toggle}
              aria-label={`播放 ${work.title}`}
            >
              <IconPlay size={22} />
            </button>
          )}
          {video && playing && stalled && (
            <span className="pv__loading mono" role="status">
              画面加载中…
            </span>
          )}
          {hud}

          {/* 滑动提示箭头 */}
          {isMobileFs && swipeHint && (
            <div className="pv__swipe-hint" data-visible="1">
              {swipeHint === "up" ? "↑" : "↓"}
            </div>
          )}
        </div>

        {/* 桌面端：右侧/下方文字栏 */}
        {!isMobileFs && (
          <aside className="pv__text">
          <div>
            <p className="pv__en">
              {[catName.get(work.category), work.year].filter(Boolean).join(" · ")}
            </p>
            <h2 className="pv__title" id="preview-title">{work.title}</h2>
            {work.titleEn && (
              <p className="pv__en" style={{ color: "var(--label-tertiary)", marginTop: 6 }}>
                {work.titleEn}
              </p>
            )}
          </div>

          {work.summary && <p className="pv__p">{work.summary}</p>}
          {work.detail && <p className="pv__p">{work.detail}</p>}

          {(specs.length > 0 || work.role) && (
            <dl className="pv__specs">
              {specs.map((s) => (
                <div className="pv__spec" key={s.label}>
                  <dt>{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
              {work.role && (
                <div className="pv__spec">
                  <dt>分工</dt>
                  <dd>{work.role}</dd>
                </div>
              )}
            </dl>
          )}

          {work.tags && work.tags.length > 0 && (
            <span className="feat__tags">
              {work.tags.map((t) => (
                <span className="chip" key={t}>{t}</span>
              ))}
            </span>
          )}

          <p className="pv__hint" style={{ marginTop: "auto" }}>
            ← / → 切换作品 · Esc 关闭
          </p>
        </aside>
        )}
      </div>
    </Overlay>
  );
}
