import { InlineKeyboard } from "grammy";
import {
  DOMParser,
  Element,
  Node,
  NodeType,
  initParser,
} from "@b-fuze/deno-dom/wasm-noinit";
import type { ReactNode } from "react";
import type { CommandConfig } from "../commands.ts";
import { AppContextType } from "../main.tsx";

const getParser = (() => {
  let parser: DOMParser | undefined;
  return async function getParser() {
    if (!parser) {
      await initParser();
      parser = new DOMParser();
    }
    return parser;
  };
})();

async function replyWithWord(ctx: AppContextType, palabra: string | undefined) {
  if (!palabra) {
    await ctx.reply("Por favor, introduce una palabra");
    return;
  }

  const result = await fetchWord(palabra);

  if (!result) {
    await ctx.reply("No se ha encontrado la palabra");
    return;
  }

  const { word, acepciones, etimologia, url, sugerencias } = result;

  if (sugerencias) {
    const inline_keyboard = new InlineKeyboard();

    for (const { word, label } of sugerencias) {
      inline_keyboard.text(label, `rae ${word}`).row();
    }
    await ctx.replyWithReact(
      <>
        No se ha encontrado la palabra <b>{palabra}</b>. Quizás quieras buscar:
      </>,
      {
        reply_to_message_id: ctx.message?.message_id,
        reply_markup: {
          inline_keyboard: inline_keyboard.inline_keyboard,
        },
      }
    );
    return;
  }

  const contenido = (
    <>
      <b>{word}</b>
      {"\n\n"}
      {etimologia && <>{etimologia}</>}
      {acepciones.map((acepcion) => (
        <>
          {"\n\n"}
          {acepcion}
        </>
      ))}

      {"\n\n"}
      <a href={url}>Fuente: RAE</a>
    </>
  );

  await ctx.replyWithReact(contenido, {
    reply_to_message_id: ctx.message?.message_id,
    link_preview_options: {
      is_disabled: true,
    },
  });
}

export const config: CommandConfig = {
  command: "rae",
  description: "Busca una palabra en la RAE",
  setup: (bot) => {
    bot.callbackQuery(/^rae (.+)$/, async (ctx) => {
      const palabra = ctx.match?.[1];
      await replyWithWord(ctx, palabra);
    });
    bot.command("rae", async (ctx) => {
      const palabra = ctx.match;
      await replyWithWord(ctx, palabra);
    });
  },
};

async function fetchWord(palabra: string) {
  const url = `https://dle.rae.es/${encodeURI(palabra)}`;
  const response = await fetch(url);
  const html = await response.text();
  const parser = await getParser();
  const doc = parser.parseFromString(html, "text/html");

  if (!doc) return null;

  const resultados = doc.getElementById("resultados");
  const word = resultados?.querySelector("article > header.f")?.textContent;

  if (!word) {
    const itemList = doc.querySelector(".item-list");
    if (!itemList) return null;

    return {
      sugerencias: Array.from(
        itemList.querySelectorAll(".n1"),
        (sugerencia) => {
          const link = (sugerencia as Element).querySelector("a");
          const word = link?.getAttribute("href")?.replace("/", "");
          return {
            word: word,
            label: sugerencia.textContent,
          };
        }
      ),
    };
  }

  const etimologia = Array.from(
    resultados?.querySelector(".n2,.n3")?.childNodes ?? [],
    (child) => reformatNode(child)
  );

  const acepciones = Array.from(
    resultados?.querySelectorAll("[class^=j]") ?? [],
    (acepcion) =>
      reformatNode(acepcion, {
        expandAbbreviations: false,
        italicSelectors: ["abbr.c", ".h"],
        boldSelectors: [".n_acep", ".u"],
      })
  );

  return {
    url,
    word,
    etimologia,
    acepciones,
  };
}

function reformatNode(
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

  if (!(node instanceof Element)) return null;

  if (["B", "I", "EM", "STRONG"].includes(node.nodeName)) {
    const TagName = node.nodeName.toLowerCase() as "b" | "i" | "em" | "strong";

    return (
      <TagName>
        {Array.from(node.childNodes, (node) => reformatNode(node, ops))}
      </TagName>
    );
  }

  const element = node as Element;
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

  return (
    [isItalic && "i", isBold && "b", isUnderline && "u"] as const
  ).reduce<ReactNode>((acc, Tag): ReactNode => {
    if (Tag) {
      return <Tag>{acc}</Tag>;
    }
    return acc;
  }, result);
}
