import {
  DOMParser,
  Element,
  Node,
  NodeType,
  initParser,
} from "@b-fuze/deno-dom/wasm-noinit";
import { InlineKeyboard } from "grammy";
import { Fragment, type ReactNode } from "react";
import type { CommandConfig } from "../commands.ts";
import { DbContext } from "../kv/dbcontext.ts";
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

  const result = await fetchWord(ctx.db, palabra);

  if (!result) {
    await ctx.reply("No se ha encontrado la palabra");
    return;
  }

  const { word, acepciones, etimologia, url, sugerencias, more } = result;

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
        reply_markup: inline_keyboard,
      },
    );
    return;
  }

  let reply_markup;

  if (more.length) {
    reply_markup = new InlineKeyboard().text("Ver más", `rae-more ${palabra}`);
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
    reply_markup,
  });
}

const PAGE_SIZE = 10;

async function replyMore(
  ctx: AppContextType,
  page: number,
  palabra: string | undefined,
  messageMode: "create" | "edit",
) {
  if (!palabra) {
    await ctx.reply("Por favor, introduce una palabra");
    return;
  }

  const result = await fetchWord(ctx.db, palabra);

  if (!result) {
    await ctx.reply("No se ha encontrado la palabra");
    return;
  }

  const { more } = result;

  const pageCount = Math.ceil((more?.length ?? 0) / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const sliced = more?.slice(start, end);

  const inline_keyboard = new InlineKeyboard();

  if (page > 0) {
    inline_keyboard.text("⬅️", `rae-more-update ${page - 1} ${palabra}`);
  }

  if (page < pageCount - 1) {
    inline_keyboard.text("➡️", `rae-more-update ${page + 1} ${palabra}`);
  }

  const contenido = (
    <>
      {sliced?.map(({ title, acepciones }) => (
        <>
          <b>{title}</b>
          {acepciones.map((acepcion) => (
            <>
              {"\n"}
              {acepcion}
            </>
          ))}
          {"\n\n"}
        </>
      ))}
    </>
  );

  if (messageMode === "edit") {
    await ctx.callbackQuery?.message?.editText(ctx.renderReactText(contenido), {
      parse_mode: "HTML",
      reply_markup: inline_keyboard,
      link_preview_options: { is_disabled: true },
    });
  } else {
    await ctx.replyWithReact(contenido, {
      reply_to_message_id: ctx.callbackQuery?.message?.message_id,
      link_preview_options: { is_disabled: true },
      reply_markup: inline_keyboard,
    });
  }
  await ctx.answerCallbackQuery();
}
export const config: CommandConfig = {
  command: "rae",
  description: "Busca una palabra en la RAE",
  setup: (bot) => {
    bot.callbackQuery(/^rae-more-update (\d+) (.+)$/, async (ctx) => {
      const page = Number(ctx.match?.[1] ?? 0);
      const palabra = ctx.match?.[2];
      await replyMore(ctx, page, palabra, "edit");
    });

    bot.callbackQuery(/^rae-more (.+)$/, async (ctx) => {
      const palabra = ctx.match?.[1];
      await replyMore(ctx, 0, palabra, "create");
    });

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

async function fetchWord(db: DbContext, palabra: string) {
  const { url, html } = await db.rae.getWordHtml(palabra);
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
        },
      ),
    };
  }

  const etimologia = Array.from(
    resultados?.querySelector(".n2,.n3")?.childNodes ?? [],
    (child) => reformatNode(child),
  );

  const acepciones = Array.from(
    resultados?.querySelectorAll("[class^=j]") ?? [],
    (acepcion, index) => {
      const sinonimos = acepcion.nextElementSibling?.matches(".sin-header")
        ? acepcion.nextElementSibling
        : null;

      sinonimos?.querySelectorAll(".d").forEach((x) => {
        x.append(doc.createTextNode(" "));
      });

      return (
        <Fragment key={index}>
          {reformatNode(acepcion, {
            expandAbbreviations: false,
            italicSelectors: ["abbr.c", ".h"],
            boldSelectors: [".n_acep", ".u"],
          })}
          {acepcion.nextElementSibling?.matches(".sin-header") && (
            <Fragment>
              {"\n    "}
              {reformatNode(acepcion.nextElementSibling, {
                expandAbbreviations: false,
                boldSelectors: [".d"],
              })}
            </Fragment>
          )}
        </Fragment>
      );
    },
  );

  const more = Array.from(
    resultados?.querySelectorAll(".k5,.k6") ?? [],
    (node) => {
      const title = reformatNode(node);
      const acepciones = [];
      while (node.nextElementSibling && node.nextElementSibling.matches(".m")) {
        acepciones.push(
          reformatNode(node.nextElementSibling, {
            expandAbbreviations: false,
            italicSelectors: ["abbr.c", ".h"],
            boldSelectors: [".n_acep", ".u"],
          }),
        );
        node = node.nextElementSibling;
      }
      return { title, acepciones };
    },
  );

  return {
    url,
    word,
    etimologia,
    acepciones,
    more,
    hasMore: !!more.length,
  };
}

function reformatNode(
  node: Node,
  ops: {
    expandAbbreviations?: boolean;
    italicSelectors?: string[];
    boldSelectors?: string[];
    underlineSelectors?: string[];
  } = {},
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

  if (["B", "I", "EM", "STRONG", "U"].includes(node.nodeName)) {
    const TagName = node.nodeName.toLowerCase() as
      | "b"
      | "i"
      | "em"
      | "strong"
      | "u";

    return (
      <TagName>
        {Array.from(node.childNodes, (node) => reformatNode(node, ops))}
      </TagName>
    );
  }

  const element = node as Element;
  const isItalic = italicSelectors?.some((selector) =>
    element.matches(selector),
  );
  const isBold = boldSelectors?.some((selector) => element.matches(selector));
  const isUnderline = underlineSelectors?.some((selector) =>
    element.matches(selector),
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
