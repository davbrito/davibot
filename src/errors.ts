/**
 * An upstream content source could not be reached, or refused to serve the
 * requested content — for example, `dle.rae.es` answering with a Cloudflare
 * bot challenge instead of the requested page.
 *
 * This is an expected operational condition, not a bug in the bot, so callers
 * should degrade gracefully (polite reply, admin notification) instead of
 * reporting it as an application failure.
 */
export class UpstreamUnavailableError extends Error {
  readonly service: string;
  readonly status?: number;
  readonly statusText?: string;
  readonly challenge: boolean;

  constructor(
    service: string,
    info: {
      status?: number;
      statusText?: string;
      challenge?: boolean;
      cause?: unknown;
    } = {},
  ) {
    const reason = info.status
      ? ` (${info.status}${info.statusText ? ` ${info.statusText}` : ""}${
          info.challenge ? ", bot challenge" : ""
        })`
      : "";

    super(`${service} is unavailable${reason}`, { cause: info.cause });
    this.name = "UpstreamUnavailableError";
    this.service = service;
    this.status = info.status;
    this.statusText = info.statusText;
    this.challenge = info.challenge ?? false;
  }
}
