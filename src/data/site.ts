/**
 * 站点内容集中在此文件，改这里即可，无需动组件。
 *
 * 内容来源：素材/黎杰丰2610简历.pdf + 素材/ 里的作品文件（2026-11-19 起）
 *   ✅ 真实：姓名、专业与院校、三段实习、个人优势、30+ 部 AI 漫剧 / 千万级热度 /
 *      带教 20+ 名新人 / 期望城市广州 / 邮箱
 *   ✅ 真实：10 件作品的标题、归类与封面，全部取自 素材/影视|AIGC|三维动画/；
 *      时长与分辨率是用 <video> 实测成片得到的，不是估的。
 *   ⚠️ 待补充：每件作品的 titleEn / year / role / summary / detail / tags
 *      ——素材里没有这些信息，所以留空（界面会自动隐藏，不编造）。
 *      他逐条发文案过来时，往对应条目里填即可。
 *   🚫 简历里有、但刻意没有放上公开页面：手机号（爬虫采集风险）。
 *      需要的话在 contacts 里自行加一行。
 */

export type CategoryId = "film" | "ai" | "3d";

export interface Category {
  id: CategoryId;
  name: string;
  en: string;
  blurb: string;
}

/** 像素尺寸：用来决定竖版图/竖屏视频是「完整显示 + 模糊衬底」还是「裁切铺满」。 */
export interface Size {
  w: number;
  h: number;
}

export interface Work {
  id: string;
  title: string;
  /** 英文标题：素材里没有，留空则界面不显示 */
  titleEn?: string;
  category: CategoryId;
  /** 年份：素材里没有，留空则界面不显示 */
  year?: string;
  /** 封面图：public/ 下的相对路径 */
  cover: string;
  /** 封面实际像素（由 素材/ 原图处理而来） */
  coverSize: Size;
  /**
   * 成片在 素材/ 下的相对路径，例如 "影视/信息流案例.mp4"。
   * 本地预览走 /@fs/ 直读；生产环境用 bilibili 字段。
   */
  reel?: string;
  /**
   * B 站视频 BV 号，例如 "BV1xx411c7mD"。
   * 生产环境预览用这个嵌 B 站播放器；留空则显示封面静帧。
   */
  bilibili?: string;
  /** 成片分辨率与时长（实测） */
  reelSize?: Size;
  seconds?: number;
  duration: string;
  role?: string;
  summary?: string;
  detail?: string;
  specs: { label: string; value: string }[];
  tags?: string[];
  featured?: boolean;
}

/** 素材原始文件所在目录（只给本地预览用，不会被打包）。 */
export const MATERIALS_ROOT = "P:/Documents/Qwer/素材";

/**
 * 成片 → 浏览器可播的 URL。
 *
 * 本地预览走 Vite 开发服务器的 /@fs/ 直读 素材/ 目录（支持 Range，可拖动进度）。
 * 生产环境用 B 站嵌入（work.bilibili 填 BV 号）；没填则返回空，预览层退回封面静帧。
 */
export function reelSrc(work: Work): string {
  if (work.bilibili) {
    return `//player.bilibili.com/player.html?bvid=${work.bilibili}&high_quality=1&danmaku=0`;
  }
  if (!work.reel || !import.meta.env.DEV) return "";
  return `/@fs/${MATERIALS_ROOT}/${encodeURI(work.reel)}`;
}

/** 判断是否为 B 站嵌入源 */
export function isBilibili(work: Work): boolean {
  return !!work.bilibili;
}

/** 竖版图 / 竖屏视频：不裁切，完整显示 */
export function isTall(size?: Size): boolean {
  return !!size && size.w / size.h < 1.25;
}

/** 卡片次级说明：有年份/英文名就用，没有就退回实测的时长与分辨率。 */
export function workKicker(work: Work): string {
  const named = [work.year, work.titleEn].filter(Boolean).join(" · ");
  if (named) return named;
  return [work.duration, formatOf(work)].filter(Boolean).join(" · ");
}

/** 只有分辨率：总览卡片右侧已经单独显示时长，那里就不必重复。 */
export function formatOf(work: Work): string {
  return work.reelSize ? `${work.reelSize.w}×${work.reelSize.h}` : "";
}

export const siteFlags = {
  /** true 时在首页轨道与作品总览显示「示例内容」提示；作品已换成真实素材，故为 false */
  sampleWorks: false,
  /** true 时在页脚显示「内容待补充」提示 */
  sampleNotice: false,
};

export const profile = {
  name: "黎杰丰",
  nameEn: "LI JIEFENG",
  role: "数字媒体艺术 · AI 漫剧 / 影视制作",
  roleEn: "DIGITAL MEDIA ART",
  initials: "LF",
  /**
   * 顶栏品牌位头像。由 素材/黎杰丰头像.png（2036×2036）裁脸部方形（x480 y250 边长1300）
   * 缩到 240×240 JPEG q90（25KB）生成；换头像时把新图放回 素材/ 同名文件，重跑裁图脚本即可。
   */
  avatar: "/work/avatar.jpg",
  /** 求职定位：面向招聘方，不写成接稿报价 */
  availability: "2026 届毕业生 · 可到岗",
  seeking: ["AI 漫剧制作", "影视后期 / 剪辑", "动态视觉设计", "内容运营"],
  city: "广州（期望城市）· 籍贯云浮",
  /** 示例个人介绍，待替换 */
  introShort:
    "把实拍影像、三维流程与 AI 生成接在同一条管线上的数字媒体艺术设计师。",
  intro:
    "我是黎杰丰，数字媒体艺术专业 2026 届毕业生，现在在广州找工作。学校里我学的是摄影、视听语言、三维动画和后期剪辑这一整套；实习里我把它们用在了真实的生产线上——在稻谷娱加做 AI 漫剧制作组长，累计参与制作 30 余部 AI 短剧，其中多部做到千万级平台热度，同时负责建立和迭代部门的 AI 漫剧制作 SOP，带教 20 多名新人实习生，还参与过校企合作实务课程的授课。之前在燧石文化传媒做新媒体运营主管，独立跑通账号定位、内容框架和拍摄剪辑的完整流程；更早的一段在云浮市融媒体中心做摄影摄像，从机位、布光到调色和剪辑都在现场完成。我不只是会出画面，也知道一条内容怎样被稳定地、可复用地做出来。",
  /** 简历中的联系方式：刻意不放手机号 */
  contacts: [
    {
      label: "邮箱",
      value: "liulibi0521@gmail.com",
      href: "mailto:liulibi0521@gmail.com",
    },
    { label: "期望城市", value: "广州", href: "#contact" },
    { label: "到岗状态", value: "2026 届毕业 · 可全职到岗", href: "#contact" },
  ],
  /** 简历下载：点击下载而非在线预览 */
  resume: {
    href: "/resume/LiJiefeng-Resume.pdf",
    downloadName: "黎杰丰-简历.pdf",
    note: "PDF · 163 KB",
  },
  /**
   * 首页背景视频：把成片放进 public/media/ 后填路径，例如 "/media/reel.mp4"。
   * 留空则使用程序生成的光场动态背景。
   */
  heroVideo: "" as string,
};

/** 三类命名沿用 素材/ 里的文件夹：影视 / AIGC / 三维动画 */
export const categories: Category[] = [
  {
    id: "film",
    name: "影视",
    en: "Film & Moving Image",
    blurb: "广告案例、信息流与微短剧：从策划、现场执行到调色剪辑的完整链路。",
  },
  {
    id: "ai",
    name: "AIGC",
    en: "Generative / AIGC",
    blurb: "AI 漫剧生产与生成式流程建设：素材筛选、分镜调整、画面统筹到成片。",
  },
  {
    id: "3d",
    name: "三维动画",
    en: "3D & Compositing",
    blurb: "传统三维制作流程、角色与场景设计、图像处理与后期合成。",
  },
];

/* --------------------------------------------------------------------------
 * 10 件真实作品，标题与归类来自 素材/ 的文件名与文件夹。
 * 时长、分辨率由成片实测。文案（summary / detail / role）素材里没有，
 * 因此留空、界面不显示；他逐条补过来时往对应条目里填。
 * ------------------------------------------------------------------------ */
export const works: Work[] = [
  {
    id: "ad-nice",
    bilibili: "BV17Zse6ZEmu",
    title: "《大胃王争霸赛》纳爱斯广告案例",
    category: "film",
    cover: "/work/ad-nice.jpg",
    coverSize: { w: 1440, h: 900 },
    reel: "影视/《大胃王争霸赛》--纳爱斯广告案例 .mp4", // 注意：文件名 .mp4 前有一个空格
    reelSize: { w: 1280, h: 720 },
    seconds: 60,
    duration: "01'00\"",
    specs: [
      { label: "归类", value: "影视 · 广告案例" },
      { label: "时长", value: "01'00\"" },
      { label: "分辨率", value: "1280×720" },
      { label: "画幅", value: "横屏 16:9" },
    ],
  },
  {
    id: "feed",
    bilibili: "BV17Zse6ZEqY",
    title: "信息流案例",
    category: "film",
    cover: "/work/feed.jpg",
    coverSize: { w: 1440, h: 900 }, // 竖版海报已合成成 16:10（模糊衬底烘进图里）
    reel: "影视/信息流案例.mp4",
    reelSize: { w: 720, h: 1280 },
    seconds: 56,
    duration: "00'56\"",
    specs: [
      { label: "归类", value: "影视 · 信息流" },
      { label: "时长", value: "00'56\"" },
      { label: "分辨率", value: "720×1280" },
      { label: "画幅", value: "竖屏 9:16" },
    ],
  },
  {
    id: "series",
    bilibili: "BV17Zse6ZEad",
    title: "微短剧案例",
    category: "film",
    cover: "/work/series.jpg",
    coverSize: { w: 1440, h: 900 },
    reel: "影视/微短剧案例.mp4",
    reelSize: { w: 1280, h: 720 },
    seconds: 101,
    duration: "01'41\"",
    specs: [
      { label: "归类", value: "影视 · 微短剧" },
      { label: "时长", value: "01'41\"" },
      { label: "分辨率", value: "1280×720" },
      { label: "画幅", value: "横屏 16:9" },
    ],
  },
  {
    id: "fenwei",
    bilibili: "BV17Zse6ZEYc",
    title: "《粉味人间》美食纪录片",
    category: "film",
    cover: "/work/fenwei.jpg",
    coverSize: { w: 1440, h: 900 },
    reel: "影视/粉味人间--美食纪录片.mp4",
    reelSize: { w: 1920, h: 1080 },
    seconds: 176,
    duration: "02'56\"",
    specs: [
      { label: "归类", value: "影视 · 纪录片" },
      { label: "时长", value: "02'56\"" },
      { label: "分辨率", value: "1920×1080" },
      { label: "画幅", value: "横屏 16:9" },
    ],
  },
  {
    id: "bingfu",
    bilibili: "BV1wDse6eENW",
    title: "《全球兵符》",
    category: "ai",
    cover: "/work/bingfu.jpg",
    coverSize: { w: 1440, h: 900 }, // 同上：竖版海报已合成成 16:10
    reel: "AIGC/《全球兵符》.mp4",
    reelSize: { w: 854, h: 480 },
    seconds: 287,
    duration: "04'47\"",
    specs: [
      { label: "归类", value: "AIGC · AI 漫剧" },
      { label: "时长", value: "04'47\"" },
      { label: "分辨率", value: "854×480" },
      { label: "画幅", value: "横屏 16:9" },
    ],
  },
  {
    id: "cat",
    bilibili: "BV17Zse6ZEtQ",
    title: "《末日小猫》",
    category: "ai",
    cover: "/work/cat.jpg",
    coverSize: { w: 1440, h: 900 }, // 同上：竖版海报已合成成 16:10
    reel: "AIGC/《末日小猫》.mp4",
    reelSize: { w: 480, h: 854 },
    seconds: 164,
    duration: "02'44\"",
    specs: [
      { label: "归类", value: "AIGC · AI 漫剧" },
      { label: "时长", value: "02'44\"" },
      { label: "分辨率", value: "480×854" },
      { label: "画幅", value: "竖屏 9:16" },
    ],
  },
  {
    id: "renxia",
    bilibili: "BV1qZse6ZEvc",
    title: "赛博任侠",
    category: "ai",
    cover: "/work/renxia.jpg",
    coverSize: { w: 1440, h: 900 },
    reel: "AIGC/赛博任侠.mp4",
    reelSize: { w: 1280, h: 720 },
    seconds: 138,
    duration: "02'18\"",
    specs: [
      { label: "归类", value: "AIGC · AI 漫剧" },
      { label: "时长", value: "02'18\"" },
      { label: "分辨率", value: "1280×720" },
      { label: "画幅", value: "横屏 16:9" },
    ],
  },
  {
    id: "ae",
    bilibili: "BV17Zse6ZE2X",
    title: "AE 动画 K 帧案例",
    category: "3d",
    cover: "/work/ae.jpg",
    coverSize: { w: 1440, h: 900 },
    reel: "三维动画/AE动画.mp4",
    reelSize: { w: 1920, h: 1080 },
    seconds: 15,
    duration: "00'15\"",
    specs: [
      { label: "归类", value: "三维动画 · AE 动画" },
      { label: "时长", value: "00'15\"" },
      { label: "分辨率", value: "1920×1080" },
      { label: "画幅", value: "横屏 16:9" },
    ],
  },
  {
    id: "vfx",
    bilibili: "BV17Zse6ZEYf",
    title: "VFX 特效案例",
    category: "3d",
    cover: "/work/vfx.jpg",
    coverSize: { w: 1440, h: 900 },
    reel: "三维动画/VFX特效案例.mp4",
    reelSize: { w: 1920, h: 1080 },
    seconds: 4,
    duration: "00'04\"",
    specs: [
      { label: "归类", value: "三维动画 · 特效合成" },
      { label: "时长", value: "00'04\"" },
      { label: "分辨率", value: "1920×1080" },
      { label: "画幅", value: "横屏 16:9" },
    ],
  },
  {
    id: "deep",
    bilibili: "BV17Zse6ZEb7",
    title: "《头文字deep》",
    category: "3d",
    cover: "/work/deep.jpg",
    coverSize: { w: 1440, h: 900 },
    reel: "三维动画/《头文字deep》.mp4",
    reelSize: { w: 1280, h: 720 },
    seconds: 67,
    duration: "01'07\"",
    specs: [
      { label: "归类", value: "三维动画" },
      { label: "时长", value: "01'07\"" },
      { label: "分辨率", value: "1280×720" },
      { label: "画幅", value: "横屏 16:9" },
    ],
  },
];

export const worksById = new Map(works.map((w) => [w.id, w]));
