import { Octokit } from "@octokit/core";

const octokit = new Octokit();
const MAX_FILE_SIZE = 3000;

// fetch a code example for a given programming language
export async function fetchCodeExample(lang: string) {
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
