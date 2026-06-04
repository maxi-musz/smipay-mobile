import { View } from "react-native";
import type { ReactNode } from "react";

import { Text } from "@/components/ui/text";

type Props = {
  content: string;
  color: string;
  /** During streaming, skip list parsing so half-written markdown stays readable. */
  plain?: boolean;
};

type Block =
  | { type: "paragraph"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  const chunks = content.split(/\n{2,}/);

  for (const chunk of chunks) {
    const lines = chunk.split("\n");
    let paragraphLines: string[] = [];
    let listType: "ul" | "ol" | null = null;
    let listItems: string[] = [];

    const flushParagraph = () => {
      if (paragraphLines.length === 0) return;
      blocks.push({ type: "paragraph", text: paragraphLines.join("\n") });
      paragraphLines = [];
    };

    const flushList = () => {
      if (!listType || listItems.length === 0) return;
      blocks.push({ type: listType, items: [...listItems] });
      listType = null;
      listItems = [];
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const ul = /^[-*•]\s+(.+)/.exec(trimmed);
      const ol = /^\d+[.)]\s+(.+)/.exec(trimmed);

      if (ul) {
        flushParagraph();
        if (listType === "ol") flushList();
        listType = "ul";
        listItems.push(ul[1]!);
      } else if (ol) {
        flushParagraph();
        if (listType === "ul") flushList();
        listType = "ol";
        listItems.push(ol[1]!);
      } else {
        flushList();
        paragraphLines.push(trimmed);
      }
    }

    flushList();
    flushParagraph();
  }

  return blocks;
}

function InlineText({
  text,
  color,
  bold,
  italic,
}: {
  text: string;
  color: string;
  bold?: boolean;
  italic?: boolean;
}) {
  return (
    <Text
      style={{
        color,
        fontSize: 15,
        lineHeight: 22,
        fontWeight: bold ? "700" : "400",
        fontStyle: italic ? "italic" : "normal",
      }}
    >
      {text}
    </Text>
  );
}

function RichLine({ text, color }: { text: string; color: string }) {
  const pattern =
    /(\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*|_(.+?)_|`(.+?)`)/g;
  const parts: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(
        <InlineText key={key++} text={text.slice(last, match.index)} color={color} />,
      );
    }
    if (match[2] || match[3]) {
      parts.push(
        <InlineText key={key++} text={match[2] ?? match[3]!} color={color} bold />,
      );
    } else if (match[4] || match[5]) {
      parts.push(
        <InlineText
          key={key++}
          text={match[4] ?? match[5]!}
          color={color}
          italic
        />,
      );
    } else if (match[6]) {
      parts.push(
        <Text
          key={key++}
          style={{
            fontFamily: "Menlo",
            fontSize: 14,
            color,
            backgroundColor: "rgba(0,0,0,0.06)",
            paddingHorizontal: 4,
            borderRadius: 4,
          }}
        >
          {match[6]}
        </Text>,
      );
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(<InlineText key={key++} text={text.slice(last)} color={color} />);
  }

  if (parts.length === 0) {
    return <InlineText text={text} color={color} />;
  }

  return <Text style={{ fontSize: 15, lineHeight: 22 }}>{parts}</Text>;
}

export function MarkdownContent({ content, color, plain }: Props) {
  if (plain) {
    return (
      <Text style={{ color, fontSize: 15, lineHeight: 22 }}>{content}</Text>
    );
  }

  const blocks = parseBlocks(content.trim());
  if (blocks.length === 0) {
    return (
      <Text style={{ color, fontSize: 15, lineHeight: 22 }}>{content}</Text>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {blocks.map((block, i) => {
        if (block.type === "paragraph") {
          return <RichLine key={i} text={block.text} color={color} />;
        }

        return (
          <View key={i} style={{ gap: 6, paddingLeft: 2 }}>
            {block.items.map((item, j) => (
              <View
                key={j}
                style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}
              >
                <Text
                  style={{
                    color,
                    fontSize: 15,
                    lineHeight: 22,
                    minWidth: block.type === "ol" ? 22 : 14,
                    fontWeight: "600",
                  }}
                >
                  {block.type === "ol" ? `${j + 1}.` : "•"}
                </Text>
                <View style={{ flex: 1 }}>
                  <RichLine text={item} color={color} />
                </View>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}
