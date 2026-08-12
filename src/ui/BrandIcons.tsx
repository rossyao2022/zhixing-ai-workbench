import type { ReactNode } from "react";

type IconProps = {
  className?: string;
  size?: number;
};

function StrokeIcon({
  children,
  className,
  size = 24,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <g
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </g>
    </svg>
  );
}

export function BrandMark({ className = "", size = 38 }: IconProps) {
  return (
    <svg
      className={`brand-symbol ${className}`}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="知行 AI"
    >
      <rect width="40" height="40" rx="13" fill="url(#brand-bg)" />
      <path
        d="M9.5 14.8c4.3-.8 7.8.4 10.5 3.4 2.7-3 6.2-4.2 10.5-3.4v12.8c-4.3-.8-7.8.3-10.5 3.2-2.7-2.9-6.2-4-10.5-3.2V14.8Z"
        fill="rgba(255,255,255,.13)"
        stroke="white"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M20 18.2v12.4M12.8 18.4c2.5-.1 4.4.6 5.7 2.1M27.2 18.4c-2.5-.1-4.4.6-5.7 2.1"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M27.8 8.8v4.8M25.4 11.2h4.8"
        stroke="var(--green-100)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="20" cy="12.5" r="1.7" fill="var(--green-50)" />
      <defs>
        <linearGradient
          id="brand-bg"
          x1="4"
          y1="3"
          x2="36"
          y2="38"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--green-600)" />
          <stop offset="1" stopColor="var(--green-950)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export type ProductIconKind =
  | "ai-design"
  | "ai-commerce"
  | "ai-writing"
  | "class-helper"
  | "ai-drama"
  | "package";

export function ProductIcon({
  kind,
  tone,
  size = "md",
}: {
  kind: ProductIconKind | string;
  tone?: string;
  size?: "sm" | "md" | "lg";
}) {
  const normalized: ProductIconKind = kind.includes("设计")
    ? "ai-design"
    : kind.includes("电商")
      ? "ai-commerce"
      : kind.includes("写作")
        ? "ai-writing"
        : kind.includes("课堂")
          ? "class-helper"
          : kind.includes("漫剧")
            ? "ai-drama"
            : (kind as ProductIconKind);
  return (
    <span className={`product-icon ${tone ?? productTone(normalized)} ${size}`}>
      <ProductGlyph kind={normalized} />
    </span>
  );
}

function productTone(kind: ProductIconKind) {
  return (
    (
      {
        "ai-design": "purple",
        "ai-commerce": "orange",
        "ai-writing": "blue",
        "class-helper": "green",
        "ai-drama": "rose",
        package: "green",
      } as const
    )[kind] ?? "green"
  );
}

function ProductGlyph({ kind }: { kind: ProductIconKind }) {
  if (kind === "ai-design")
    return (
      <StrokeIcon>
        <rect x="4" y="5" width="16" height="14" rx="3" />
        <path d="M8 15.5 11 12l2.3 2.4 2.2-2.3L19 16M16.5 7.8v3M15 9.3h3" />
        <circle cx="9" cy="9.2" r="1.2" />
      </StrokeIcon>
    );
  if (kind === "ai-commerce")
    return (
      <StrokeIcon>
        <path d="M5 9.5h14l-1 10H6l-1-10ZM8 9.5V7.8a4 4 0 0 1 8 0v1.7" />
        <path d="M9 14h6M12 12v4" />
      </StrokeIcon>
    );
  if (kind === "ai-writing")
    return (
      <StrokeIcon>
        <path d="M6 4.5h8l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V6a1.5 1.5 0 0 1 1.5-1.5Z" />
        <path d="M14 4.5V9h4M7.5 13h7M7.5 16.5h5" />
      </StrokeIcon>
    );
  if (kind === "class-helper")
    return (
      <StrokeIcon>
        <path d="M4.5 6.5c3.2-.7 5.7.1 7.5 2.2 1.8-2.1 4.3-2.9 7.5-2.2v11c-3.2-.7-5.7.1-7.5 2.1-1.8-2-4.3-2.8-7.5-2.1v-11Z" />
        <path d="M12 8.7v10.7M16.5 3.5v3M15 5h3" />
      </StrokeIcon>
    );
  if (kind === "ai-drama")
    return (
      <StrokeIcon>
        <rect x="4" y="8" width="16" height="11.5" rx="2.5" />
        <path d="m5 8 2-3.5h4L9 8m4 0 2-3.5h4L17 8" />
        <path d="m10.2 12.2 4.3 2.3-4.3 2.3v-4.6Z" />
      </StrokeIcon>
    );
  return (
    <StrokeIcon>
      <path d="m4.5 9 7.5-4 7.5 4-7.5 4-7.5-4Z" />
      <path d="M6.5 11.2v5.2L12 19l5.5-2.6v-5.2M12 13v6" />
      <path d="m16.5 6.6 1.2-2.1 1.2 2.1" />
    </StrokeIcon>
  );
}

export function WorkIcon({
  kind,
  tone = "green",
}: {
  kind: string;
  tone?: string;
}) {
  return (
    <span className={`work-symbol ${tone}`}>
      <WorkGlyph kind={kind} />
    </span>
  );
}

function WorkGlyph({ kind }: { kind: string }) {
  if (kind === "website")
    return (
      <StrokeIcon>
        <rect x="3.5" y="5" width="17" height="14" rx="3" />
        <path d="M3.5 9h17M7 7h.01M10 7h.01M7 13h4v3H7M14 13h3M14 16h3" />
      </StrokeIcon>
    );
  if (kind === "ppt")
    return (
      <StrokeIcon>
        <path d="M5 4.5h14v11H5zM9 19.5h6M12 15.5v4" />
        <path d="m8.5 12 2.2-2.4 1.7 1.7 2.8-3" />
      </StrokeIcon>
    );
  if (kind === "research")
    return (
      <StrokeIcon>
        <circle cx="10.5" cy="10.5" r="5.5" />
        <path d="m15 15 5 5M8 11l2-2 2 2 2.5-3" />
      </StrokeIcon>
    );
  if (kind === "manual")
    return (
      <StrokeIcon>
        <path d="M5 5.5h5.5c1 0 1.5.5 1.5 1.5v12c0-1.2-1-2-2.2-2H5V5.5ZM19 5.5h-5.5c-1 0-1.5.5-1.5 1.5v12c0-1.2 1-2 2.2-2H19V5.5Z" />
      </StrokeIcon>
    );
  if (kind === "market")
    return (
      <StrokeIcon>
        <path d="M5 19V9M10 19V5M15 19v-7M20 19V8" />
        <path d="m4 9 5-4 5 4 6-5" />
      </StrokeIcon>
    );
  if (kind === "mail")
    return (
      <StrokeIcon>
        <rect x="3.5" y="5.5" width="17" height="13" rx="3" />
        <path d="m5 8 7 5 7-5" />
      </StrokeIcon>
    );
  if (kind === "archive")
    return (
      <StrokeIcon>
        <path d="M4 7h16v13H4zM3 4h18v4H3zM9 12h6" />
      </StrokeIcon>
    );
  return (
    <StrokeIcon>
      <path d="M8 6h8M6 10h12M8 14h8M10 18h4" />
    </StrokeIcon>
  );
}

export function CourseGlyph({ kind }: { kind: string }) {
  const map: Record<string, ProductIconKind> = {
    design: "ai-design",
    commerce: "ai-commerce",
    drama: "ai-drama",
    writing: "ai-writing",
    reading: "class-helper",
    business: "package",
  };
  return (
    <span className="course-glyph">
      <ProductGlyph kind={map[kind] ?? "class-helper"} />
    </span>
  );
}

export function SourceGlyph({ kind }: { kind: string }) {
  return (
    <StrokeIcon>
      {kind === "feishu" ? (
        <>
          <path d="m12 4 3.2 3.2L12 10.4 8.8 7.2 12 4Z" />
          <path d="m16.8 8.8 3.2 3.2-3.2 3.2-3.2-3.2 3.2-3.2Z" />
          <path d="m12 13.6 3.2 3.2L12 20l-3.2-3.2 3.2-3.2Z" />
          <path d="M7.2 8.8 10.4 12l-3.2 3.2L4 12l3.2-3.2Z" />
        </>
      ) : kind === "ima" ? (
        <>
          <path d="M4.5 6.5c3.2-.7 5.7.1 7.5 2.2 1.8-2.1 4.3-2.9 7.5-2.2v11c-3.2-.7-5.7.1-7.5 2.1-1.8-2-4.3-2.8-7.5-2.1v-11Z" />
          <path d="M12 8.7v10.7M16.5 3.5v3M15 5h3" />
        </>
      ) : kind === "custom" ? (
        <>
          <ellipse cx="10" cy="7" rx="5.5" ry="2.5" />
          <path d="M4.5 7v5c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V7M4.5 12v4.5C4.5 18 7 19 10 19c1.2 0 2.3-.2 3.2-.5" />
          <path d="M18 13v6M15 16h6" />
        </>
      ) : kind === "wps" ? (
        <>
          <path d="M5 5h14l-2.5 14h-9L5 5Z" />
          <path d="m8 9 2 6 2-6 2 6 2-6" />
        </>
      ) : kind === "github" ? (
        <>
          <path d="M7 4.5v5a3 3 0 0 0 3 3h4a3 3 0 0 1 3 3v4" />
          <circle cx="7" cy="4.5" r="1.5" />
          <circle cx="17" cy="19.5" r="1.5" />
        </>
      ) : kind === "gitee" ? (
        <>
          <path d="M8 5h8l3 3v8l-3 3H8l-3-3V8l3-3Z" />
          <path d="m9 10-3 2 3 2M15 10l3 2-3 2M13 8l-2 8" />
        </>
      ) : kind === "local" ? (
        <>
          <path d="M5 5h5l2 2h7v12H5z" />
          <path d="M8 15h8" />
        </>
      ) : kind === "terminal" ? (
        <>
          <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
          <path d="m7 9 3 3-3 3M12 15h5" />
        </>
      ) : kind === "files" ? (
        <>
          <path d="M6 3.5h9l3 3V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1-1.5Z" />
          <path d="M15 3.5V7h3M8 12h7M8 15.5h5" />
        </>
      ) : kind === "ide" ? (
        <>
          <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
          <path d="m9 9-3 3 3 3M15 9l3 3-3 3M13 7l-2 10" />
        </>
      ) : kind === "browser" ? (
        <>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4M8 11h6M11 8v6" />
        </>
      ) : (
        <>
          <rect x="3.5" y="5.5" width="17" height="13" rx="3" />
          <path d="m5 8 7 5 7-5" />
        </>
      )}
    </StrokeIcon>
  );
}

export function NavGlyph({ name }: { name: string }) {
  const simple: Record<string, ReactNode> = {
    today: (
      <>
        <path d="M4 11.5 12 5l8 6.5" />
        <path d="M6.5 10.5v9h11v-9M10 19.5v-5h4v5" />
      </>
    ),
    learning: (
      <>
        <path d="M4.5 7c3.2-.7 5.7.1 7.5 2.2C13.8 7.1 16.3 6.3 19.5 7v11c-3.2-.7-5.7.1-7.5 2.1-1.8-2-4.3-2.8-7.5-2.1V7Z" />
        <path d="M12 9.2v10.7" />
      </>
    ),
    courses: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),
    market: (
      <>
        <path d="M5 9h14l-1 11H6L5 9ZM8 9V7a4 4 0 0 1 8 0v2" />
      </>
    ),
    tools: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="2" />
        <rect x="14" y="4" width="6" height="6" rx="2" />
        <rect x="4" y="14" width="6" height="6" rx="2" />
        <path d="M17 14v6M14 17h6" />
      </>
    ),
    rights: (
      <>
        <path d="m4.5 9 7.5-4 7.5 4-7.5 4-7.5-4Z" />
        <path d="M6.5 11.2v5.2L12 19l5.5-2.6v-5.2" />
      </>
    ),
    work: (
      <>
        <rect x="4" y="7" width="16" height="12" rx="3" />
        <path d="M9 7V5h6v2M4 12h16M10 12v2h4v-2" />
      </>
    ),
    activity: (
      <>
        <path d="M3 12h4l2-5 4 10 2-5h6" />
      </>
    ),
    sources: (
      <>
        <ellipse cx="12" cy="6" rx="7" ry="3" />
        <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.5 1.5M16.5 16.5 18 18M18 6l-1.5 1.5M7.5 16.5 6 18" />
      </>
    ),
    overview: (
      <>
        <path d="M4 13h6V4H4v9ZM14 20h6v-9h-6v9ZM4 20h6v-3H4v3ZM14 7h6V4h-6v3Z" />
      </>
    ),
    students: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19c.4-3.5 2.2-5.5 5.5-5.5s5.1 2 5.5 5.5M16 7.5c2.6.1 4 1.6 4.5 4M16.5 14c2.3.5 3.6 2.2 4 5" />
      </>
    ),
    classes: (
      <>
        <path d="M3.5 8 12 4l8.5 4-8.5 4-8.5-4Z" />
        <path d="M6.5 10v5c3.4 2.2 7.6 2.2 11 0v-5M20.5 8v6" />
      </>
    ),
    batch: (
      <>
        <path d="M5 3.5h10l4 4V20H5V3.5Z" />
        <path d="M15 3.5V8h4M8 12h8M8 16h4" />
      </>
    ),
    usage: (
      <>
        <path d="M3 12h4l2-5 4 10 2-5h6" />
      </>
    ),
    logs: (
      <>
        <path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4" />
      </>
    ),
    organization: (
      <>
        <path d="M12 4v5M6 20v-5h12v5M6 15v-3h12v3" />
        <circle cx="12" cy="4" r="2" />
        <circle cx="6" cy="20" r="2" />
        <circle cx="18" cy="20" r="2" />
      </>
    ),
    ledger: (
      <>
        <rect x="4" y="5" width="16" height="14" rx="3" />
        <path d="M4 9h16M8 14h3M15 14h1" />
      </>
    ),
    reconcile: (
      <>
        <path d="M7 4h10v4H7zM5 7h14v13H5zM8 12h8M8 16h5" />
      </>
    ),
    permissions: (
      <>
        <circle cx="9" cy="11" r="4" />
        <path d="m12 14 3 3h2v2h2v-2l-4-4M9 9h.01" />
      </>
    ),
  };
  return <StrokeIcon>{simple[name] ?? simple.overview}</StrokeIcon>;
}
