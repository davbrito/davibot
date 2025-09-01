import { fetchCodeExample } from "$infrastructure/code-examples.repository.ts";
import type { CommandContext } from "grammy";
import type { AppContextType } from "../../context.ts";

export default async function codeCommandHandler(
  ctx: CommandContext<AppContextType>,
): Promise<void> {
  const lang = ctx.match;

  if (!lang) {
    await ctx.reply("Please specify a language");
    return;
  }

  const { code, file } = await fetchCodeExample(lang);

  const ownerUserName = file.repository.owner.login;
  const repoName = file.repository.name;
  const content = (
    <>
      <b>Code example for {lang}:</b>
      {"\n"}
      <em>Source:</em>{" "}
      <a href={file.html_url}>{`${ownerUserName}/${repoName}`}</a>
      {"\n\n"}
      <pre>
        <code className={`language-${lang}`}>{code}</code>
      </pre>
    </>
  );

  await ctx.replyWithReact(content, {
    link_preview_options: {
      is_disabled: true,
    },
  });
}
