import { useMemo, useState, type ReactNode } from "react";
import {
  Linking,
  Platform,
  ScrollView,
  useWindowDimensions,
  View,
} from "react-native";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";

type Props = {
  content: string;
  color: string;
  /**
   * Kept for API compatibility with the streaming bubble. Markdown is now
   * rendered in both cases; the parser is defensive to half-written input.
   */
  plain?: boolean;
};

type Align = "left" | "center" | "right";

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "code"; code: string }
  | { type: "blockquote"; lines: string[] }
  | { type: "hr" }
  | { type: "table"; header: string[]; align: Align[]; rows: string[][] }
  | { type: "list"; items: { text: string; depth: number; marker: string }[] };

const MONO = Platform.OS === "ios" ? "Menlo" : "monospace";

// ─── Parsing ──────────────────────────────────────────────────────────────

/** A GFM table separator row, e.g. `|---|:--:|--:|` or `--- | ---`. */
function isSeparatorRow(line: string): boolean {
  const t = line.trim();
  if (!t.includes("-")) return false;
  return /^\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?$/.test(t);
}

/** Split a table row into trimmed cells, tolerating optional edge pipes. */
function splitRow(line: string): string[] {
  let t = line.trim();
  if (t.startsWith("|")) t = t.slice(1);
  if (t.endsWith("|")) t = t.slice(0, -1);
  return t.split("|").map((c) => c.trim());
}

function cellAlign(sep: string): Align {
  const s = sep.trim();
  const left = s.startsWith(":");
  const right = s.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  return "left";
}

function parseBlocks(src: string): Block[] {
  const lines = (src ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let i = 0;

  const flushPara = () => {
    if (para.length > 0) {
      blocks.push({ type: "paragraph", text: para.join("\n") });
      para = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Fenced code block (```lang … ``` — also handles a stream that hasn't
    // closed the fence yet by consuming to the end).
    const fence = /^(```|~~~)/.exec(trimmed);
    if (fence) {
      flushPara();
      const marker = fence[1];
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== marker) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // consume the closing fence
      blocks.push({ type: "code", code: codeLines.join("\n") });
      continue;
    }

    if (!trimmed) {
      flushPara();
      i++;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushPara();
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2].trim() });
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushPara();
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      flushPara();
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "blockquote", lines: quote });
      continue;
    }

    // Table: a pipe row immediately followed by a separator row.
    if (
      trimmed.includes("|") &&
      i + 1 < lines.length &&
      isSeparatorRow(lines[i + 1])
    ) {
      flushPara();
      const header = splitRow(trimmed);
      const align = splitRow(lines[i + 1]).map(cellAlign);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().includes("|")) {
        if (isSeparatorRow(lines[i])) {
          i++;
          continue;
        }
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push({ type: "table", header, align, rows });
      continue;
    }

    // Lists (ordered / unordered, one level of nesting via indentation).
    const listItem = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line);
    if (listItem) {
      flushPara();
      const items: { text: string; depth: number; marker: string }[] = [];
      while (i < lines.length) {
        const m = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(lines[i]);
        if (!m) {
          // An indented continuation line belongs to the previous item.
          if (items.length > 0 && lines[i].trim() && /^\s+/.test(lines[i])) {
            items[items.length - 1].text += ` ${lines[i].trim()}`;
            i++;
            continue;
          }
          break;
        }
        const indent = m[1].replace(/\t/g, "  ").length;
        const depth = Math.min(2, Math.floor(indent / 2));
        const num = /^(\d+)[.)]/.exec(m[2]);
        items.push({ text: m[3], depth, marker: num ? `${num[1]}.` : "•" });
        i++;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    para.push(trimmed);
    i++;
  }

  flushPara();
  return blocks;
}

// ─── Inline rendering ───────────────────────────────────────────────────────

const INLINE =
  /(\*\*([^*]+?)\*\*|__([^_]+?)__|~~([^~]+?)~~|\*([^*]+?)\*|_([^_]+?)_|`([^`]+?)`|\[([^\]]+)\]\(([^)\s]+)\))/g;

function renderInline(
  text: string,
  opts: { color: string; isDark: boolean; size?: number; weight?: "400" | "700" },
): ReactNode {
  const { color, isDark, size = 15, weight = "400" } = opts;
  const lineHeight = size + 7;
  const codeBg = isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)";
  const linkColor = isDark ? "#93C5FD" : "#1D4ED8";
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  INLINE.lastIndex = 0;
  while ((match = INLINE.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(
        <Text key={key++} style={{ color, fontSize: size, fontWeight: weight, lineHeight }}>
          {text.slice(last, match.index)}
        </Text>,
      );
    }
    if (match[2] || match[3]) {
      parts.push(
        <Text key={key++} style={{ color, fontSize: size, fontWeight: "700", lineHeight }}>
          {match[2] ?? match[3]}
        </Text>,
      );
    } else if (match[4]) {
      parts.push(
        <Text
          key={key++}
          style={{ color, fontSize: size, fontWeight: weight, lineHeight, textDecorationLine: "line-through" }}
        >
          {match[4]}
        </Text>,
      );
    } else if (match[5] || match[6]) {
      parts.push(
        <Text key={key++} style={{ color, fontSize: size, fontWeight: weight, lineHeight, fontStyle: "italic" }}>
          {match[5] ?? match[6]}
        </Text>,
      );
    } else if (match[7]) {
      parts.push(
        <Text
          key={key++}
          style={{ fontFamily: MONO, fontSize: size - 1, color, backgroundColor: codeBg, lineHeight }}
        >
          {` ${match[7]} `}
        </Text>,
      );
    } else if (match[8] && match[9]) {
      const url = match[9];
      parts.push(
        <Text
          key={key++}
          onPress={() => Linking.openURL(url).catch(() => undefined)}
          style={{ color: linkColor, fontSize: size, fontWeight: weight, lineHeight, textDecorationLine: "underline" }}
        >
          {match[8]}
        </Text>,
      );
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(
      <Text key={key++} style={{ color, fontSize: size, fontWeight: weight, lineHeight }}>
        {text.slice(last)}
      </Text>,
    );
  }

  return (
    <Text style={{ fontSize: size, lineHeight }}>
      {parts.length > 0 ? parts : text}
    </Text>
  );
}

// ─── Block components ───────────────────────────────────────────────────────

const COL_WIDTH = 128;
const HEADING_SIZE: Record<number, number> = { 1: 20, 2: 18, 3: 17, 4: 16, 5: 15, 6: 15 };

function alignItems(a: Align): "flex-start" | "center" | "flex-end" {
  if (a === "center") return "center";
  if (a === "right") return "flex-end";
  return "flex-start";
}

function TableBlock({
  block,
  color,
  isDark,
  available,
}: {
  block: Extract<Block, { type: "table" }>;
  color: string;
  isDark: boolean;
  available: number;
}) {
  // A horizontal ScrollView nested in the vertical message list must be given a
  // definite size, or it (a) stretches to fill the scroll area — a huge empty
  // gap after the message — and (b) never scrolls, clipping the far columns.
  // Measure the table and pin the viewport: height = content, width =
  // min(content, available) so wide tables scroll left/right.
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const border = isDark ? "#334155" : "#CBD5E1";
  const headBg = isDark ? "#0F172A" : "#E2E8F0";
  const altBg = isDark ? "rgba(255,255,255,0.035)" : "rgba(15,23,42,0.03)";
  const cols = block.header.length;
  const viewport = size
    ? { width: Math.min(size.w, available), height: size.h }
    : undefined;

  return (
    <View style={{ width: "100%", marginVertical: 2 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        style={viewport}
        contentContainerStyle={{ flexGrow: 0 }}
      >
        <View
          onLayout={(e) => {
            const w = Math.ceil(e.nativeEvent.layout.width);
            const h = Math.ceil(e.nativeEvent.layout.height);
            if (w > 0 && h > 0) {
              setSize((prev) =>
                prev && prev.w === w && prev.h === h ? prev : { w, h },
              );
            }
          }}
          style={{
            borderWidth: 1,
            borderColor: border,
            borderRadius: 8,
            overflow: "hidden",
            alignSelf: "flex-start",
          }}
        >
        <View style={{ flexDirection: "row", backgroundColor: headBg }}>
          {block.header.map((cell, c) => (
            <View
              key={c}
              style={{
                width: COL_WIDTH,
                padding: 8,
                borderRightWidth: c < cols - 1 ? 1 : 0,
                borderColor: border,
                alignItems: alignItems(block.align[c] ?? "left"),
              }}
            >
              <Text style={{ color, fontWeight: "700", fontSize: 13, lineHeight: 18 }}>{cell}</Text>
            </View>
          ))}
        </View>
        {block.rows.map((row, r) => (
          <View
            key={r}
            style={{
              flexDirection: "row",
              backgroundColor: r % 2 === 1 ? altBg : "transparent",
              borderTopWidth: 1,
              borderColor: border,
            }}
          >
            {block.header.map((_, c) => (
              <View
                key={c}
                style={{
                  width: COL_WIDTH,
                  padding: 8,
                  borderRightWidth: c < cols - 1 ? 1 : 0,
                  borderColor: border,
                  alignItems: alignItems(block.align[c] ?? "left"),
                }}
              >
                {renderInline(row[c] ?? "", { color, isDark, size: 13 })}
              </View>
            ))}
          </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function CodeBlock({
  code,
  isDark,
  available,
}: {
  code: string;
  isDark: boolean;
  available: number;
}) {
  // Same nested-ScrollView trap as the table — measure and pin the viewport so
  // long lines scroll horizontally instead of clipping or expanding.
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const codeBg = isDark ? "#0B1220" : "#0F172A";
  const viewport = size
    ? { width: Math.min(size.w, available - 20), height: size.h }
    : undefined;
  return (
    <View style={{ width: "100%", borderRadius: 8, backgroundColor: codeBg, padding: 10 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        style={viewport}
        contentContainerStyle={{ flexGrow: 0 }}
      >
        <Text
          onLayout={(e) => {
            const w = Math.ceil(e.nativeEvent.layout.width);
            const h = Math.ceil(e.nativeEvent.layout.height);
            if (w > 0 && h > 0) {
              setSize((prev) =>
                prev && prev.w === w && prev.h === h ? prev : { w, h },
              );
            }
          }}
          style={{ fontFamily: MONO, fontSize: 13, color: "#E2E8F0", lineHeight: 19 }}
        >
          {code}
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function MarkdownContent({ content, color }: Props) {
  const { isDark } = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();
  const blocks = useMemo(() => parseBlocks((content ?? "").trim()), [content]);

  // Widest a table/code viewport can be inside an assistant bubble: the chat
  // list is inset by px-4 (32) and the bubble is capped at 88% with ~14px of
  // padding each side. Anything wider than this scrolls horizontally.
  const available = Math.max(200, Math.floor((screenWidth - 32) * 0.88) - 30);

  if (blocks.length === 0) {
    return <Text style={{ color, fontSize: 15, lineHeight: 22 }}>{content}</Text>;
  }

  const quoteColor = isDark ? "#94A3B8" : "#475569";
  const quoteBar = isDark ? "#475569" : "#CBD5E1";
  const hrColor = isDark ? "#334155" : "#E2E8F0";

  return (
    <View style={{ gap: 8 }}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading":
            return (
              <View key={i} style={{ marginTop: i === 0 ? 0 : 2 }}>
                {renderInline(block.text, {
                  color,
                  isDark,
                  size: HEADING_SIZE[block.level] ?? 15,
                  weight: "700",
                })}
              </View>
            );

          case "paragraph":
            return <View key={i}>{renderInline(block.text, { color, isDark })}</View>;

          case "code":
            return (
              <CodeBlock
                key={i}
                code={block.code}
                isDark={isDark}
                available={available}
              />
            );

          case "blockquote":
            return (
              <View
                key={i}
                style={{ borderLeftWidth: 3, borderLeftColor: quoteBar, paddingLeft: 10, gap: 2 }}
              >
                {block.lines.map((l, k) => (
                  <View key={k}>{renderInline(l, { color: quoteColor, isDark })}</View>
                ))}
              </View>
            );

          case "hr":
            return <View key={i} style={{ height: 1, backgroundColor: hrColor, marginVertical: 2 }} />;

          case "table":
            return (
              <TableBlock
                key={i}
                block={block}
                color={color}
                isDark={isDark}
                available={available}
              />
            );

          case "list":
            return (
              <View key={i} style={{ gap: 6 }}>
                {block.items.map((item, j) => (
                  <View
                    key={j}
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 8,
                      paddingLeft: 2 + item.depth * 16,
                    }}
                  >
                    <Text
                      style={{
                        color,
                        fontSize: 15,
                        lineHeight: 22,
                        minWidth: item.marker === "•" ? 12 : 20,
                        fontWeight: "600",
                      }}
                    >
                      {item.marker}
                    </Text>
                    <View style={{ flex: 1 }}>{renderInline(item.text, { color, isDark })}</View>
                  </View>
                ))}
              </View>
            );

          default:
            return null;
        }
      })}
    </View>
  );
}
