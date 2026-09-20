/** Layout, paging and motion constants shared across the interface. */

/** Archive results rendered per page. */
export const ARCHIVE_PAGE_SIZE = 60;

/** Suggested constellation anchors offered to the reader. */
export const SUGGESTED_ANCHOR_COUNT = 5;

/** Breakpoints, mirroring the Tailwind scale so JS and CSS agree. */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

/** Timezone offsets offered on the clock dial. The archive itself is UTC. */
export const TIMEZONE_PRESETS = [
  { offset: 0, label: "UTC", place: "as recorded" },
  { offset: -5, label: "UTC−5", place: "US east coast" },
  { offset: -8, label: "UTC−8", place: "US west coast" },
  { offset: 1, label: "UTC+1", place: "Spain, central Europe" },
  { offset: 5, label: "UTC+5½", place: "India" },
] as const;

/** Sections listed in the masthead, in document order. */
export const NAV_SECTIONS = [
  { id: "dig", label: "The dig" },
  { id: "chapters", label: "Chapters" },
  { id: "clock", label: "The clock" },
  { id: "constellation", label: "Connections" },
  { id: "crowd", label: "The crowd" },
  { id: "archive", label: "Archive" },
] as const;

/** localStorage key for the colour-scheme override. */
export const THEME_STORAGE_KEY = "midnight-ledger:theme";

/** Grace period before a silent IntersectionObserver is declared broken. */
export const OBSERVER_HEALTH_GRACE_MS = 1200;
