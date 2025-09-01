import { InlineKeyboard, InlineQueryResultBuilder } from "grammy";
import { Fragment, type JSX, type ReactNode } from "react";
import { makeKeyboardCallbackQuery } from "$infrastructure/helpers/keyboard.ts";

export function createWordDefinitionResponse({
  word,
  etimologia,
  definiciones,
  url,
}: {
  word: string;
  etimologia: ReactNode;
  definiciones: JSX.Element[];
  url: string;
}) {
  return {
    content: (
      <>
        <b>{word}</b>
        {etimologia ? (
          <>
            {"\n\n"}
            {etimologia}
          </>
        ) : null}
        {definiciones.map((acepcion, aindex) => (
          <Fragment key={aindex}>
            {"\n\n"}
            {acepcion}
          </Fragment>
        ))}

        {"\n\n"}
        <a href={url}>Fuente: RAE</a>
      </>
    ),
  };
}

export function createWordListInlineQueryResult(items: string[]) {
  return items.map((item) =>
    InlineQueryResultBuilder.article(`rae:${item}`, item, {
      reply_markup: new InlineKeyboard().url(
        "🔗",
        `https://dle.rae.es/${encodeURI(item)}`,
      ),
    }).text(item),
  );
}

export function createWordNotFoundResponse(
  palabra: string,
  sugerencias?: {
    word: string | undefined;
    label: string;
  }[],
) {
  let inline_keyboard;

  if (sugerencias?.length) {
    inline_keyboard = new InlineKeyboard();

    for (const { word, label } of sugerencias) {
      inline_keyboard.text(
        label,
        makeKeyboardCallbackQuery("rae", { palabra: word!, acepcion: 0 }),
      );
    }
  }

  return {
    content: (
      <>
        No se ha encontrado la palabra <b>{palabra}</b>.
        {inline_keyboard ? " Quizás quieras buscar:" : ""}
      </>
    ),
    markup: inline_keyboard,
  };
}
