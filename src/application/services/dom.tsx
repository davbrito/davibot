import { type Cheerio } from "cheerio";
import type { AnyNode } from "domhandler";
import { Fragment, type ReactNode } from "react";

interface ReformatNodeOptions {
  expandAbbreviations?: boolean;
  italicSelectors?: string[];
  boldSelectors?: string[];
  underlineSelectors?: string[];
}

export function reformatNode(
  $el: Cheerio<AnyNode>,
  ops: ReformatNodeOptions = {},
): ReactNode {
  const {
    expandAbbreviations = true,
    italicSelectors,
    boldSelectors,
    underlineSelectors,
  } = ops;

  const raw = $el[0];
  if (!raw) return null;
  if (raw.type === "comment") return null;

  if (raw.type === "text") {
    return raw.data;
  }

  if (raw.type !== "tag") return null;

  // It's an element node (type === "tag", "script", "style", etc.)
  const tagName = $el.prop("tagName") as string | undefined;
  if (!tagName) return null;

  if (["B", "I", "EM", "STRONG", "U", "A"].includes(tagName)) {
    const TagName = tagName.toLowerCase() as
      | "b"
      | "i"
      | "em"
      | "strong"
      | "u"
      | "a";

    const props: Record<string, any> = {};
    if (TagName === "a") {
      props.href = $el.attr("href");
    }

    return (
      <TagName {...props}>{reformatNodeList($el.contents(), ops)}</TagName>
    );
  }

  const isItalic = italicSelectors?.some((selector) => $el.is(selector));
  const isBold = boldSelectors?.some((selector) => $el.is(selector));
  const isUnderline = underlineSelectors?.some((selector) => $el.is(selector));

  const result: ReactNode = (() => {
    if (tagName === "ABBR" && expandAbbreviations && $el.attr("title")) {
      return $el.attr("title");
    }
    return reformatNodeList($el.contents(), ops);
  })();

  const tags = [
    ["i", isItalic],
    ["b", isBold],
    ["u", isUnderline],
  ] as const;

  return tags.reduce<ReactNode>((acc, [Tag, use]): ReactNode => {
    if (use) return <Tag>{acc}</Tag>;
    return acc;
  }, result);
}

export function reformatNodeList(
  $els: Cheerio<AnyNode> | null | undefined,
  ops: ReformatNodeOptions = {},
): ReactNode {
  if (!$els || !$els.length) return null;

  const nodes: ReactNode[] = [];
  for (let i = 0; i < $els.length; i++) {
    nodes.push(<Fragment key={i}>{reformatNode($els.eq(i), ops)}</Fragment>);
  }
  return nodes;
}
