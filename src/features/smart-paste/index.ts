/**
 * Clipboard-aware number entry, wired per entry screen.
 *
 * A screen declares what its field holds via `accepts`, so the detector only
 * answers that question — no guessing which product the user came to buy.
 *
 *   const paste = useSmartPaste({ surface: "field", accepts: ["phone"], … });
 *   <SmartPastePrompt paste={paste} />
 *   <Keypad leftKey={useSmartPasteKey({ paste })} … />
 *
 * `scripts/verify-smart-paste.ts` pins the detector's behaviour.
 */

export {
  SmartPastePrompt,
  type SmartPastePromptProps,
} from "./components/smart-paste-prompt";
export {
  SmartPastePromptModal,
  type SmartPastePromptModalProps,
} from "./components/smart-paste-prompt-modal";
export {
  SmartPasteInline,
  type SmartPasteInlineProps,
} from "./components/smart-paste-inline";
export {
  PasteAffordance,
  type PasteAffordanceProps,
} from "./components/paste-affordance";

export {
  useSmartPaste,
  type SmartPasteApi,
  type UseSmartPasteOptions,
} from "./hooks/use-smart-paste";
export {
  useSmartPasteKey,
  type UseSmartPasteKeyOptions,
} from "./hooks/use-smart-paste-key";

export {
  detectAmount,
  pickCandidate,
  resolveClipboardText,
  scanClipboardText,
  toNgMobile,
  SURFACE_MIN_CONFIDENCE,
} from "./lib/detect";
export {
  CAN_DETECT_SILENTLY,
  invalidateClipboardCache,
} from "./lib/clipboard-source";
export { resetSmartPasteMemory } from "./lib/suggestion-memory";

export type {
  SmartPasteCandidate,
  SmartPasteKind,
  SmartPasteScan,
} from "./lib/types";
