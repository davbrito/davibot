/// <reference types="npm:@types/react" />
/// <reference types="npm:@types/react-dom" />
import type { Context, MiddlewareFn } from "grammy";
import { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

type ReplyWithReact = Context["reply"] extends (
  text: string,
  ...args: infer A
) => infer R
  ? (node: ReactNode, ...args: A) => R
  : never;

export type ReactFlavor = {
  replyWithReact: ReplyWithReact;
  renderReactText: (node: ReactNode) => string;
};

export function react<C extends Context>(): MiddlewareFn<C & ReactFlavor> {
  return (ctx, next) => {
    ctx.renderReactText = (node) => renderToStaticMarkup(<>{node}</>);

    ctx.replyWithReact = (node, options, ...args) => {
      return ctx.reply(
        ctx.renderReactText(node),
        { ...options, parse_mode: "HTML" },
        ...args,
      );
    };

    return next();
  };
}
