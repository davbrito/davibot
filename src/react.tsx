/// <reference types="@types/react" />
/// <reference types="@types/react-dom" />
import type { Context, MiddlewareFn } from "grammy";
import { MessageXFragment } from "@grammyjs/hydrate/data/message.ts";
import { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

type ReplyWithReact = Context["reply"] extends (
  text: string,
  ...args: infer A
) => infer R
  ? (node: ReactNode, ...args: A) => R
  : never;

type EditMessageTextWithReact = MessageXFragment["editText"] extends (
  text: string,
  ...args: infer A
) => infer R
  ? (message: MessageXFragment, node: ReactNode, ...args: A) => R
  : never;

export type ReactFlavor = {
  replyWithReact: ReplyWithReact;
  renderReactText: (node: ReactNode) => string;
  editMessageTextWithReact: EditMessageTextWithReact;
};

export function react<C extends Context>(): MiddlewareFn<C & ReactFlavor> {
  return (ctx, next) => {
    ctx.renderReactText = (node) => renderToStaticMarkup(<>{node}</>);

    ctx.replyWithReact = (node, options, ...args) => {
      const htmlString = ctx.renderReactText(node);
      return ctx.reply(htmlString, { ...options, parse_mode: "HTML" }, ...args);
    };

    ctx.editMessageTextWithReact = (message, node, options, ...args) => {
      const htmlString = ctx.renderReactText(node);
      return message.editText(
        htmlString,
        { ...options, parse_mode: "HTML" },
        ...args
      );
    };

    return next();
  };
}
