/** Pure logic. No React, no DOM — every export here is directly testable. */
export { findConnections, findRichAnchors, createCorpus } from "./connections";
export type { Connection, ConnectionOptions } from "./connections";
export {
  num,
  rupees,
  longDate,
  clockTime,
  hourLabel,
  shiftHours,
  peak,
  peakIndex,
  KIND_LABEL,
  KIND_COLOR,
} from "./format";
export { toCSV, downloadCSV } from "./exportReceipts";
export { BRIEF_TAXONOMY } from "./format";
