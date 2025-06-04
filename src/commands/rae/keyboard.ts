import { InlineKeyboard } from "grammy";
import { range } from "iteretijs";
import { z } from "zod";

const paramsSchema = z.object({
  acepcion: z.coerce.number().int().min(0).default(0),
  pagina: z.coerce.number().int().min(0).default(0),
  palabra: z.string().nonempty(),
  edit: z.stringbool().default(false),
});

export function createInlineKeyboardPagination(
  acepcionIndex: number,
  page: number,
  palabra: string,
  pageCount: number,
) {
  const inline_keyboard = new InlineKeyboard();
  if (pageCount > 1) {
    if (page > 0) {
      inline_keyboard.text(
        "⬅️",
        makeKeyboardCallbackQuery("rae-more", {
          acepcion: acepcionIndex,
          pagina: page - 1,
          palabra,
          edit: true,
        }),
      );
    }

    const pageSubset = range(
      Math.max(0, page - 2),
      Math.min(page + 3, pageCount),
    );

    for (const i of pageSubset) {
      inline_keyboard.text(
        //   i === page ? `_${i + 1}_` : String(i + 1),
        i === page ? `${i + 1} ✅` : String(i + 1),
        makeKeyboardCallbackQuery("rae-more", {
          acepcion: acepcionIndex,
          pagina: i,
          palabra,
          edit: true,
        }),
      );
    }

    if (page < pageCount - 1) {
      inline_keyboard.text(
        "➡️",
        makeKeyboardCallbackQuery("rae-more", {
          acepcion: acepcionIndex,
          pagina: page + 1,
          palabra,
          edit: true,
        }),
      );
    }
  }

  inline_keyboard.row();
  inline_keyboard.text(
    "Volver",
    makeKeyboardCallbackQuery("rae", {
      palabra,
      acepcion: acepcionIndex,
      edit: true,
    }),
  );

  return inline_keyboard;
}

export function makeKeyboardCallbackQuery(
  command: string,
  { acepcion, pagina, palabra, edit }: {
    acepcion?: number;
    pagina?: number;
    palabra: string;
    edit?: boolean;
  },
) {
  return command + " " + new URLSearchParams({
    acepcion: String(acepcion ?? 0),
    pagina: String(pagina ?? 0),
    palabra,
    edit: edit ? "true" : "false",
  }).toString();
}

export function readKeyboardCallbackQuery(text: string) {
  return paramsSchema.parse(Object.fromEntries(new URLSearchParams(text)));
}

export type KeyboardParams = z.infer<typeof paramsSchema>;
