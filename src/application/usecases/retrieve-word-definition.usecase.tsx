import { DbContext } from "$infrastructure/kv/dbcontext.ts";
import { DOMParser, Element, initParser } from "@b-fuze/deno-dom/wasm-noinit";
import { Fragment } from "react";
import { reformatNode, reformatNodeList } from "../services/dom.tsx";

const ETIMOLOGY_SELECTOR = ".n2,.n3";
const DEFINITION_ITEM_FOOTER_SELECTOR = ".c-definitions__item-footer";
const TITLE_SELECTOR = ".c-page-header__title";
const ACEPTION_SELECTOR = ".o-main__article";

export async function retrieveWordDefinitionUsecase({
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
    resultados?.querySelectorAll(ACEPTION_SELECTOR) ?? [],
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
        },
      ),
    };
  }

  const definiciones = Array.from(
    acepcion.querySelectorAll("[class^=j]"),
    (acepcion, index) => {
      const itemFooter = acepcion.querySelector(
        DEFINITION_ITEM_FOOTER_SELECTOR,
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
          botUserName,
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
    },
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
          }),
        );
      }
      return { title, acepciones };
    },
  );

  return {
    url,
    word,
    etimologia: reformatNodeList(
      acepcion.querySelector(ETIMOLOGY_SELECTOR)?.childNodes,
    ),
    definiciones: definiciones,
    more,
    hasMore: !!more.length,
    acepciones: acepciones.map(
      (acepcion) => acepcion.querySelector(TITLE_SELECTOR)?.textContent ?? "",
    ),
  };
}

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
