import { Octokit } from "@octokit/core";
import type { CommandConfig } from "../commands.ts";

const octokit = new Octokit();

export const config: CommandConfig = {
  command: "code",
  description: "Show code",
  setup: (bot) => {
    bot.command("code", async (ctx) => {
      const lang = ctx.match;

      if (!lang) {
        await ctx.reply("Please specify a language");
        return;
      }
      try {
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
      } catch (error) {
        if (error instanceof Error && error.name === "HttpError") {
          await ctx.replyWithReact(
            <>
              <>Your request could not be completed. Please try again later.</>
              {"\n"}
              <>If the problem persists, please contact the bot owner.</>
            </>,
          );
          return;
        }
      }
    });
  },
};

const MAX_FILE_SIZE = 3000;

// fetch a code example for a given programming language
async function fetchCodeExample(lang: string) {
  const repos = await octokit.request("GET /search/repositories", {
    q: `language:${lang} stars:>10000`,
    per_page: 5,
  });

  const repoNames = repos.data.items
    .map((item) => item.full_name)
    .sort(() => Math.random() - 0.5);

  if (repoNames.length) {
    const { data } = await octokit.request("GET /search/code", {
      q: `language:${lang} ${repoNames
        .map((name) => `repo:${name}`)
        .join(" ")} size:<${MAX_FILE_SIZE}`,
      per_page: 10,
      page: Math.floor(Math.random() * 10),
    });

    if (data.total_count === 0) {
      throw new Error(`No code examples found for language ${lang}`);
    }

    const item = data.items.sort(() => Math.random() - 0.5).at(0)!;

    const owner = item.repository.owner.login;
    const repo = item.repository.name;
    const code = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      {
        mediaType: { format: "raw" },
        owner,
        repo,
        path: item.path,
      },
    );

    return { code: String(code.data), file: item };
  }

  throw new Error(`No code examples found for language ${lang}`);
}
