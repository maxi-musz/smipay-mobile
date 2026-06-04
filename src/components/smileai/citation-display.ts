import type { SmileCitation } from "@/types/smileai";

const GENERIC_HEADINGS = new Set([
  "overview",
  "audience and surfaces",
  "eligibility and prerequisites",
  "step-by-step",
  "fees and limits",
  "troubleshooting",
  "related topics",
  "voice and tone",
  "see also",
  "limits, fees, and timing",
  "frequently asked questions",
  "rate a conversation",
]);

function isGenericHeading(heading: string): boolean {
  return GENERIC_HEADINGS.has(heading.trim().toLowerCase());
}

/** Strip KB ordering prefix (`16-referrals` → `referrals`). */
export function stripDocSlugPrefix(slug: string): string {
  return slug.replace(/^\d+-/, "");
}

/** Turn `security-and-fraud` into `Security and fraud`. */
export function humanizeSlug(slug: string): string {
  const bare = stripDocSlugPrefix(slug).replace(/-/g, " ").trim();
  if (!bare) return "Help article";
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

export function formatCitationTitle(citation: SmileCitation): string {
  const heading = citation.heading?.trim();
  if (heading && !isGenericHeading(heading)) {
    return heading;
  }
  return humanizeSlug(citation.doc_slug);
}

export function formatCitationTopic(citation: SmileCitation): string | null {
  const topic = humanizeSlug(citation.doc_slug);
  const title = formatCitationTitle(citation);
  if (title.toLowerCase() === topic.toLowerCase()) return null;
  return topic;
}

/** Drop KB chunks whose label would be useless in chat (e.g. "See also"). */
export function filterDisplayCitations(citations: SmileCitation[]): SmileCitation[] {
  const seen = new Set<string>();
  const out: SmileCitation[] = [];

  for (const c of citations) {
    const rawHeading = c.heading?.trim().toLowerCase() ?? "";
    if (rawHeading === "see also") continue;

    const title = formatCitationTitle(c).trim();
    if (!title || title.toLowerCase() === "help article") continue;

    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }

  return out;
}
