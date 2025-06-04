import { Element, Node, NodeType } from "@b-fuze/deno-dom/wasm-noinit";
import { Fragment, ReactNode } from "react";

export function reformatNode(
  node: Node,
  ops: {
    expandAbbreviations?: boolean;
    italicSelectors?: string[];
    boldSelectors?: string[];
    underlineSelectors?: string[];
  } = {}
): ReactNode {
  const {
    expandAbbreviations = true,
    italicSelectors,
    boldSelectors,
    underlineSelectors,
  } = ops;

  if (node.nodeType === NodeType.COMMENT_NODE) return null;

  if (node.nodeType === NodeType.TEXT_NODE) {
    return node.textContent;
  }

  if (node.nodeType !== NodeType.ELEMENT_NODE) return null;
  const element = node as Element;

  if (["B", "I", "EM", "STRONG", "U", "A"].includes(element.nodeName)) {
    const TagName = element.nodeName.toLowerCase() as
      | "b"
      | "i"
      | "em"
      | "strong"
      | "u"
      | "a";

    const props: Record<string, any> = {};
    if (TagName === "a") {
      props.href = element.getAttribute("href");
    }

    return (
      <TagName {...props}>
        {Array.from(node.childNodes, (node, index) => (
          <Fragment key={index}>{reformatNode(node, ops)}</Fragment>
        ))}
      </TagName>
    );
  }

  const isItalic = italicSelectors?.some((selector) =>
    element.matches(selector)
  );
  const isBold = boldSelectors?.some((selector) => element.matches(selector));
  const isUnderline = underlineSelectors?.some((selector) =>
    element.matches(selector)
  );

  const result: ReactNode = (() => {
    if (node.nodeName === "ABBR") {
      if (!expandAbbreviations) {
        return Array.from(node.childNodes, (node) => reformatNode(node, ops));
      }
      return (
        (node as Element).getAttribute("title") ??
        Array.from(node.childNodes, (node) => reformatNode(node, ops))
      );
    }
    return Array.from(node.childNodes, (node) => reformatNode(node, ops));
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
