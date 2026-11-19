import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 16, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconDownload = (p: P) => (
  <Svg {...p}>
    <path d="M12 3.5v10.5" />
    <path d="m7.5 10 4.5 4.5L16.5 10" />
    <path d="M4.5 17.5v1.2a1.8 1.8 0 0 0 1.8 1.8h11.4a1.8 1.8 0 0 0 1.8-1.8v-1.2" />
  </Svg>
);

export const IconMail = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="3" />
    <path d="m4.5 8.5 7.5 5 7.5-5" />
  </Svg>
);

export const IconArrowUpRight = (p: P) => (
  <Svg {...p}>
    <path d="M7.5 16.5 16.5 7.5" />
    <path d="M8.6 7.5h7.9v7.9" />
  </Svg>
);

export const IconChevronRight = (p: P) => (
  <Svg {...p}>
    <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
  </Svg>
);

export const IconPlay = (p: P) => (
  <Svg {...p} strokeWidth={1.4}>
    <path d="M8.4 6.9v10.2c0 .6.65.97 1.16.65l8.1-5.1a.77.77 0 0 0 0-1.3l-8.1-5.1a.77.77 0 0 0-1.16.65Z" />
  </Svg>
);

export const IconPause = (p: P) => (
  <Svg {...p}>
    <path d="M9.2 5.5v13M14.8 5.5v13" />
  </Svg>
);

export const IconClose = (p: P) => (
  <Svg {...p}>
    <path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" />
  </Svg>
);

export const IconVolume = (p: P) => (
  <Svg {...p}>
    <path d="M4 9.6h3.3L11.6 6v12L7.3 14.4H4z" />
    <path d="M15.2 9.6a3.6 3.6 0 0 1 0 4.8" />
    <path d="M17.9 7.2a7 7 0 0 1 0 9.6" />
  </Svg>
);

export const IconVolumeMute = (p: P) => (
  <Svg {...p}>
    <path d="M4 9.6h3.3L11.6 6v12L7.3 14.4H4z" />
    <path d="m15.4 9.8 4.6 4.4M20 9.8l-4.6 4.4" />
  </Svg>
);

export const IconGrid = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="4" width="7" height="7" rx="2" />
    <rect x="13" y="4" width="7" height="7" rx="2" />
    <rect x="4" y="13" width="7" height="7" rx="2" />
    <rect x="13" y="13" width="7" height="7" rx="2" />
  </Svg>
);

export const IconCamera = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 8.2A1.7 1.7 0 0 1 5.2 6.5h6.3a1.7 1.7 0 0 1 1.7 1.7v9.6a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7Z" />
    <path d="m13.5 11 5-3v11l-5-3" />
  </Svg>
);

export const IconCube = (p: P) => (
  <Svg {...p}>
    <path d="M12 3.6 20 8v8l-8 4.4L4 16V8Z" />
    <path d="M12 12.2 20 8M12 12.2 4 8M12 12.2v8.2" />
  </Svg>
);

export const IconSpark = (p: P) => (
  <Svg {...p}>
    <path d="M12 3.5c.9 4.3 2.3 5.7 6.6 6.6-4.3.9-5.7 2.3-6.6 6.6-.9-4.3-2.3-5.7-6.6-6.6 4.3-.9 5.7-2.3 6.6-6.6Z" />
    <path d="M18 16.5c.4 1.9 1 2.5 2.9 2.9-1.9.4-2.5 1-2.9 2.9" transform="translate(-1 -2) scale(.8)" />
  </Svg>
);

export const IconLayers = (p: P) => (
  <Svg {...p}>
    <path d="m12 4 8 4.2-8 4.2-8-4.2Z" />
    <path d="m4 13.4 8 4.2 8-4.2" />
  </Svg>
);

export const IconFrame = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M8.5 4v16M15.5 4v16M4 8.5h16M4 15.5h16" />
  </Svg>
);

export const IconFullscreen = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 8.5V5.2a1.7 1.7 0 0 1 1.7-1.7h3.3" />
    <path d="M20.5 8.5V5.2a1.7 1.7 0 0 0-1.7-1.7h-3.3" />
    <path d="M3.5 15.5v3.3a1.7 1.7 0 0 0 1.7 1.7h3.3" />
    <path d="M20.5 15.5v3.3a1.7 1.7 0 0 1-1.7 1.7h-3.3" />
  </Svg>
);

export const IconFullscreenExit = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 5.2h3.3v3.3" />
    <path d="M20.5 5.2h-3.3v3.3" />
    <path d="M3.5 18.8h3.3v-3.3" />
    <path d="M20.5 18.8h-3.3v-3.3" />
  </Svg>
);
