import { retrieveWordDefinitionUsecase } from "$application/usecases/retrieve-word-definition.usecase.tsx";
import { searchDictionaryEntries } from "$infrastructure/rae-dictionary.repository.ts";
import {
  CallbackQueryContext,
  ChosenInlineResultContext,
  CommandContext,
  InlineKeyboard,
  InlineQueryContext,
  NextFunction,
} from "grammy";
import { Fragment } from "react";
import { AppContextType } from "../../context.ts";
import {
  createWordDefinitionResponse,
  createWordListInlineQueryResult,
  createWordNotFoundResponse,
} from "../helpers/rae-response.helper.tsx";
import {
  createInlineKeyboardPagination,
  makeKeyboardCallbackQuery,
  readKeyboardCallbackQuery,
} from "./keyboard.ts";

export async function raeMoreCallbackQueryHandler(
  ctx: CallbackQueryContext<AppContextType>,
) {
  const { palabra, acepcion, pagina, edit } = readKeyboardCallbackQuery(
    ctx.match[1] || "",
  );

  await replyMore(ctx, acepcion, pagina, palabra, edit);
  await ctx.callbackQuery.answer();
}

export async function raeCallbackQueryHandler(
  ctx: CallbackQueryContext<AppContextType>,
) {
  const { palabra, acepcion, edit } = readKeyboardCallbackQuery(
    ctx.match[1] || "",
  );
  await replyWithWord({ ctx, palabra, acepcionIndex: acepcion, edit });
  await ctx.callbackQuery.answer();
}

export async function raeCommandHandler(ctx: CommandContext<AppContextType>) {
  const palabra = ctx.match;
  await replyWithWord({ ctx, palabra, acepcionIndex: 0, edit: false });
}

export async function raeInlineQueryHandler(
  ctx: InlineQueryContext<AppContextType>,
) {
  const palabra = ctx.match[0];
  const items = await searchDictionaryEntries(palabra);
  await ctx.inlineQuery.answer(createWordListInlineQueryResult(items));
}

export async function raeChosenInlineResultHandler(
  ctx: ChosenInlineResultContext<AppContextType>,
  next: NextFunction,
) {
  const palabra = ctx.match[0];
  const messageId = ctx.chosenInlineResult.inline_message_id;
  if (!messageId) return next();
  await replyWithWord({
    ctx,
    palabra,
    acepcionIndex: 0,
    editInlineMessageId: messageId,
  });
}

async function replyWithWord({
  ctx,
  palabra,
  acepcionIndex,
  edit,
  editInlineMessageId,
}: {
  ctx: AppContextType;
  palabra: string | undefined;
  acepcionIndex: number;
  edit?: boolean;
  editInlineMessageId?: string;
}) {
  if (!palabra) {
    await ctx.reply("Por favor, introduce una palabra");
    return;
  }

  const result = await retrieveWordDefinitionUsecase({
    db: ctx.db,
    palabra,
    botUserName: ctx.me.username,
    acepcionIndex,
  });

  if (!result || result.sugerencias) {
    const response = createWordNotFoundResponse(palabra, result?.sugerencias);

    await ctx.replyWithReact(response.content, {
      reply_markup: response.markup,
      reply_to_message_id: ctx.message?.message_id,
    });
    return;
  }

  const {
    word,
    definiciones: definiciones,
    etimologia,
    url,
    more,
    acepciones,
  } = result;

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
        }),
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
      }),
    );
  }

  const { content } = createWordDefinitionResponse({
    word,
    etimologia,
    definiciones,
    url,
  });

  const htmlContent = ctx.renderReactText(content);

  const commonOptions = {
    parse_mode: "HTML",
    link_preview_options: {
      is_disabled: true,
    },
  } as const;

  if (editInlineMessageId) {
    console.log("editInlineMessageId", editInlineMessageId);
    await ctx.api.editMessageTextInline(
      editInlineMessageId,
      htmlContent,
      commonOptions,
    );
  } else if (edit) {
    if (ctx.callbackQuery?.message) {
      await ctx.callbackQuery.message.editText(htmlContent, commonOptions);
    }
  } else {
    await ctx.reply(htmlContent, {
      ...commonOptions,
      reply_to_message_id: ctx.message?.message_id,
    });
  }
}

const PAGE_SIZE = 10;

async function replyMore(
  ctx: AppContextType,
  acepcionIndex: number,
  page: number,
  palabra: string | undefined,
  isEdit: boolean,
) {
  if (!palabra) {
    await ctx.reply("Por favor, introduce una palabra");
    return;
  }

  const result = await retrieveWordDefinitionUsecase({
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
    pageCount,
  );

  const Contenido = () => (
    <>
      {sliced?.map(({ title, acepciones }, index) => (
        <Fragment key={index}>
          <b>{title}</b>
          {acepciones.map((acepcion, aindex) => (
            <Fragment key={aindex}>
              {"\n"}
              {acepcion}
            </Fragment>
          ))}
          {"\n\n"}
        </Fragment>
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
      await ctx.editMessageTextWithReact(
        ctx.callbackQuery.message,
        <Contenido />,
        {
          parse_mode: "HTML",
          reply_markup: inline_keyboard,
          link_preview_options: { is_disabled: true },
        },
      );
    }
  } else {
    await ctx.replyWithReact(<Contenido />, {
      reply_to_message_id: ctx.callbackQuery?.message?.message_id,
      link_preview_options: { is_disabled: true },
      reply_markup: inline_keyboard,
    });
  }
}
