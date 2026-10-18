import type { DbContext } from "$infrastructure/kv/dbcontext.ts";
import * as cheerio from "cheerio";
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
  const $ = cheerio.load(html);

  const $resultados = $("#resultados");

  const $acepciones = $resultados.find(ACEPTION_SELECTOR);

  const $acepcion = $acepciones.eq(acepcionIndex).length
    ? $acepciones.eq(acepcionIndex)
    : $acepciones.first();
  const word = $acepcion.find(TITLE_SELECTOR).text();

  if (!$acepcion.length || !word) {
    const $itemList = $(".item-list");
    if (!$itemList.length) return null;

    return {
      sugerencias: $itemList
        .find(".n1")
        .toArray()
        .map((sugerencia) => {
          const $sugerencia = $(sugerencia);
          const link = $sugerencia.find("a");
          const word = link.attr("href")?.replace("/", "");
          return {
            word,
            label: $sugerencia.text(),
          };
        }),
    };
  }

  const definiciones: React.ReactNode[] = [];
  $acepcion.find("[class^=j]").each((index, defEl) => {
    const $defEl = $(defEl);
    const $itemFooter = $defEl.find(DEFINITION_ITEM_FOOTER_SELECTOR);
    $itemFooter.remove();

    const $wordList = $itemFooter.find(".c-word-list");
    $wordList.each((i, node) => {
      const $node = $(node);
      if (i === 0) {
        $node.before("    ");
      } else {
        $node.before("\n    ");
      }
    });

    $itemFooter.find(".d").each((_i, x) => {
      $(x).append(" ");
    });

    $itemFooter.find(".sin").each((_i, x) => {
      const $x = $(x);
      const linkUrl = `https://t.me/${encodeURIComponent(
        botUserName,
      )}?text=${encodeURIComponent(`/rae ${$x.text()}`)}`;
      const $a = $(`<a href="${linkUrl}"></a>`);
      $x.replaceWith($a);
      $a.append($x);
    });

    definiciones.push(
      <Fragment key={index}>
        {reformatNode($defEl, {
          expandAbbreviations: false,
          italicSelectors: ["abbr.c", ".h"],
          boldSelectors: [".n_acep", ".u"],
        })}
        {$itemFooter.length > 0 && (
          <Fragment>
            {"\n"}
            {reformatNode($itemFooter, {
              expandAbbreviations: false,
            })}
          </Fragment>
        )}
      </Fragment>,
    );
  });

  const more = $acepcion
    .find(".k5,.k6")
    .toArray()
    .map((node) => {
      const $node = $(node);
      const title = reformatNode($node);
      const acepciones: React.ReactNode[] = [];

      $node
        .next()
        .find(".m")
        .each((_i, x) => {
          acepciones.push(
            reformatNode($(x), {
              expandAbbreviations: false,
              italicSelectors: ["abbr.c", ".h"],
              boldSelectors: [".n_acep", ".u"],
            }),
          );
        });
      return { title, acepciones };
    });

  return {
    url,
    word,
    etimologia: reformatNodeList(
      $acepcion.find(ETIMOLOGY_SELECTOR).first().contents(),
    ),
    definiciones,
    more,
    hasMore: !!more.length,
    acepciones: $acepciones
      .toArray()
      .map((acepcion) => $(acepcion).find(TITLE_SELECTOR).text()),
  };
}
