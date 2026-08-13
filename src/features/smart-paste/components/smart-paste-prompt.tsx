import { SmartPasteInline } from "./smart-paste-inline";
import { SmartPastePromptModal } from "./smart-paste-prompt-modal";
import type { SmartPasteApi } from "../hooks/use-smart-paste";

export interface SmartPastePromptProps {
  paste: SmartPasteApi;
  /** Dialog headline, e.g. "Use this meter number?". */
  title?: string;
  /** Inline offer wording, e.g. "Paste a meter number". */
  manualPrompt?: string;
  /** Applied to the inline strip only. */
  className?: string;
}

/**
 * Place directly after the input. A classified number opens the dialog; the
 * offer and any error render inline. The dialog is a `Modal`, so its position
 * in the tree doesn't matter.
 */
export function SmartPastePrompt({
  paste,
  title,
  manualPrompt,
  className,
}: SmartPastePromptProps) {
  return (
    <>
      <SmartPastePromptModal paste={paste} title={title} />
      <SmartPasteInline
        paste={paste}
        manualPrompt={manualPrompt}
        className={className}
      />
    </>
  );
}
