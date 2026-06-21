import { XkcdRepository } from "$infrastructure/repositories/xkcd.repository.ts";

const idRegex = /^\d+$/;

interface GetXkcdOptions {
  text: string;
  xkcdRepository: XkcdRepository;
}

export async function getXkcdUsecase(options: GetXkcdOptions) {
  const res = await retrieveComic(options.text, options.xkcdRepository);

  if (res.error || !res.data) {
    const { response, error } = res;
    throw new Error(
      `Failed to retrieve XKCD comic: ${
        String(error)
      }\nResponse: ${response?.status} ${response?.statusText}`,
    );
  }

  return (res.data);
}

async function retrieveComic(text: string, repository: XkcdRepository) {
  if (text === "current") {
    return await repository.getCurrent();
  }

  const id = text.trim().match(idRegex)?.[0];

  if (id) {
    return await repository.get(Number(id));
  } else {
    return await repository.getRandom();
  }
}
