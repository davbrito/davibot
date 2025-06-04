import { DOMParser, Element, initParser } from "@b-fuze/deno-dom/wasm-noinit";
import { InlineKeyboard } from "grammy";
import { Fragment } from "react";
import type { CommandConfig } from "../../commands.ts";
import { DbContext } from "../../kv/dbcontext.ts";
import { AppContextType } from "../../main.tsx";
import { reformatNode, reformatNodeList } from "./dom.tsx";
import {
  createInlineKeyboardPagination,
  makeKeyboardCallbackQuery,
  readKeyboardCallbackQuery,
} from "./keyboard.ts";

export const config: CommandConfig = {
  command: "rae",
  description: "Busca una palabra en la RAE",
  setup: (bot) => {
    bot.callbackQuery(/^rae-more (.+)$/, async (ctx) => {
      const { palabra, acepcion, pagina, edit } = readKeyboardCallbackQuery(
        ctx.match[1] || ""
      );

      await replyMore(ctx, acepcion, pagina, palabra, edit);
      await ctx.answerCallbackQuery();
    });

    bot.callbackQuery(/^rae (.+)$/, async (ctx) => {
      const { palabra, acepcion, edit } = readKeyboardCallbackQuery(
        ctx.match[1] || ""
      );
      await replyWithWord(ctx, palabra, acepcion, edit);
      await ctx.answerCallbackQuery();
    });
    bot.command("rae", async (ctx) => {
      const palabra = ctx.match;
      await replyWithWord(ctx, palabra, 0, false);
    });
  },
};

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

async function replyWithWord(
  ctx: AppContextType,
  palabra: string | undefined,
  acepcionIndex: number,
  edit: boolean
) {
  if (!palabra) {
    await ctx.reply("Por favor, introduce una palabra");
    return;
  }

  const result = await fetchWord({
    db: ctx.db,
    palabra,
    botUserName: ctx.me.username,
    acepcionIndex,
  });

  if (!result) {
    await ctx.reply("No se ha encontrado la palabra");
    return;
  }

  const {
    word,
    definiciones: definiciones,
    etimologia,
    url,
    sugerencias,
    more,
    acepciones,
  } = result;

  if (sugerencias) {
    const inline_keyboard = new InlineKeyboard();

    for (const { word, label } of sugerencias) {
      inline_keyboard.text(
        label,
        makeKeyboardCallbackQuery("rae", { palabra: word!, acepcion: 0 })
      );
    }

    await ctx.replyWithReact(
      <>
        No se ha encontrado la palabra <b>{palabra}</b>. Quizás quieras buscar:
      </>,
      {
        reply_to_message_id: ctx.message?.message_id,
        reply_markup: inline_keyboard,
      }
    );
    return;
  }

  let reply_markup: InlineKeyboard | undefined;

  if (acepciones.length > 1) {
    reply_markup ??= new InlineKeyboard();
    reply_markup.row();
    acepciones.forEach((acepcion, index) => {
      reply_markup!.text(
        `${acepcion}${index === acepcionIndex ? " ✅" : ""}`,
        makeKeyboardCallbackQuery("rae", {
          acepcion: index,
          palabra: palabra,
          edit: true,
        })
      );
    });
  }

  if (more.length) {
    reply_markup ??= new InlineKeyboard();
    reply_markup.row();
    reply_markup = reply_markup.text(
      "Ver más",
      makeKeyboardCallbackQuery("rae-more", {
        acepcion: acepcionIndex,
        palabra,
      })
    );
  }

  const contenido = (
    <>
      <b>{word}</b>
      {etimologia ? (
        <>
          {"\n\n"}
          {etimologia}
        </>
      ) : null}
      {definiciones.map((acepcion) => (
        <>
          {"\n\n"}
          {acepcion}
        </>
      ))}

      {"\n\n"}
      <a href={url}>Fuente: RAE</a>
    </>
  );

  if (edit) {
    if (ctx.callbackQuery?.message) {
      await ctx.editMessageTextWithReact(ctx.callbackQuery.message, contenido, {
        link_preview_options: {
          is_disabled: true,
        },
        reply_markup,
      });
    }
  } else {
    await ctx.replyWithReact(contenido, {
      reply_to_message_id: ctx.message?.message_id,
      link_preview_options: {
        is_disabled: true,
      },
      reply_markup,
    });
  }
}

const PAGE_SIZE = 10;

async function replyMore(
  ctx: AppContextType,
  acepcionIndex: number,
  page: number,
  palabra: string | undefined,
  isEdit: boolean
) {
  if (!palabra) {
    await ctx.reply("Por favor, introduce una palabra");
    return;
  }

  const result = await fetchWord({
    db: ctx.db,
    palabra,
    botUserName: ctx.me.username,
    acepcionIndex,
  });

  if (!result) {
    await ctx.reply("No se ha encontrado la palabra");
    return;
  }

  const { more } = result;

  const pageCount = Math.ceil((more?.length ?? 0) / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const sliced = more?.slice(start, end);

  const inline_keyboard = createInlineKeyboardPagination(
    acepcionIndex,
    page,
    palabra,
    pageCount
  );

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

      {pageCount > 1 && (
        <i>
          {page + 1}/{pageCount}
        </i>
      )}
    </>
  );

  if (isEdit) {
    if (ctx.callbackQuery?.message) {
      await ctx.editMessageTextWithReact(ctx.callbackQuery.message, contenido, {
        parse_mode: "HTML",
        reply_markup: inline_keyboard,
        link_preview_options: { is_disabled: true },
      });
    }
  } else {
    await ctx.replyWithReact(contenido, {
      reply_to_message_id: ctx.callbackQuery?.message?.message_id,
      link_preview_options: { is_disabled: true },
      reply_markup: inline_keyboard,
    });
  }
}
const ETIMOLOGY_SELECTOR = ".n2,.n3";
const DEFINITION_ITEM_FOOTER_SELECTOR = ".c-definitions__item-footer";
const TITLE_SELECTOR = ".c-page-header__title";
const ACEPTION_SELECTOR = ".o-main__article";

async function fetchWord({
  db,
  palabra,
  botUserName,
  acepcionIndex,
}: {
  db: DbContext;
  palabra: string;
  botUserName: string;
  acepcionIndex: number;
}) {
  const { url, html } = await db.rae.getWordHtml(palabra);
  const parser = await getParser();
  const doc = parser.parseFromString(html, "text/html");

  if (!doc) return null;

  const resultados = doc.getElementById("resultados");

  const acepciones = Array.from(
    resultados?.querySelectorAll(ACEPTION_SELECTOR) ?? []
  );

  const acepcion = acepciones[acepcionIndex] || acepciones[0];
  const word = acepcion?.querySelector(TITLE_SELECTOR)?.textContent;

  if (!acepcion || !word) {
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

  const definiciones = Array.from(
    acepcion.querySelectorAll("[class^=j]"),
    (acepcion, index) => {
      const itemFooter = acepcion.querySelector(
        DEFINITION_ITEM_FOOTER_SELECTOR
      );
      itemFooter?.remove();
      itemFooter?.querySelectorAll(".c-word-list").forEach((node, index) => {
        if (index) itemFooter?.insertBefore(doc.createTextNode("\n    "), node);
        else itemFooter?.insertBefore(doc.createTextNode("    "), node);
      });

      itemFooter?.querySelectorAll(".d").forEach((x) => {
        x.append(doc.createTextNode(" "));
      });

      itemFooter?.querySelectorAll(".sin").forEach((x) => {
        const a = doc.createElement("a");
        const url = `https://t.me/${encodeURIComponent(
          botUserName
        )}?text=${encodeURIComponent(`/rae ${x.textContent}`)}`;
        a.setAttribute("href", url);

        x.replaceWith(a);
        a.appendChild(x);
      });

      return (
        <Fragment key={index}>
          {reformatNode(acepcion, {
            expandAbbreviations: false,
            italicSelectors: ["abbr.c", ".h"],
            boldSelectors: [".n_acep", ".u"],
          })}
          {itemFooter && (
            <Fragment>
              {"\n"}
              {reformatNode(itemFooter, {
                expandAbbreviations: false,
              })}
            </Fragment>
          )}
        </Fragment>
      );
    }
  );

  const more = Array.from(
    acepcion.querySelectorAll(".k5,.k6") ?? [],
    (node) => {
      const title = reformatNode(node);
      const acepciones = [];

      for (const x of node.nextElementSibling?.querySelectorAll(".m") ?? []) {
        acepciones.push(
          reformatNode(x, {
            expandAbbreviations: false,
            italicSelectors: ["abbr.c", ".h"],
            boldSelectors: [".n_acep", ".u"],
          })
        );
      }
      return { title, acepciones };
    }
  );

  return {
    url,
    word,
    etimologia: reformatNodeList(
      acepcion.querySelector(ETIMOLOGY_SELECTOR)?.childNodes
    ),
    definiciones: definiciones,
    more,
    hasMore: !!more.length,
    acepciones: acepciones.map(
      (acepcion) => acepcion.querySelector(TITLE_SELECTOR)?.textContent ?? ""
    ),
  };
}
