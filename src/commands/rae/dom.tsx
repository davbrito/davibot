import { Element, Node, NodeType } from "@b-fuze/deno-dom/wasm-noinit";
import { Fragment, ReactNode } from "react";

interface ReformatNodeOptions {
  expandAbbreviations?: boolean;
  italicSelectors?: string[];
  boldSelectors?: string[];
  underlineSelectors?: string[];
}

export function reformatNode(
  node: Node,
  ops: ReformatNodeOptions = {}
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
      <TagName {...props}>{reformatNodeList(node.childNodes, ops)}</TagName>
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
    if (
      element.nodeName === "ABBR" &&
      expandAbbreviations &&
      element.getAttribute("title")
    ) {
      return element.getAttribute("title");
    }
    return reformatNodeList(element.childNodes, ops);
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
  nodes: Iterable<Node> | null | undefined,
  ops: ReformatNodeOptions = {}
): ReactNode {
  if (!nodes) return null;

  return Array.from(nodes, (node, index) => (
    <Fragment key={index}>{reformatNode(node, ops)}</Fragment>
  ));
}
