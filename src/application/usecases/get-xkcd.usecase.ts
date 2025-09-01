import { XkcdRepository } from "$infrastructure/repositories/xkcd.repository.ts";
import { comicSchema } from "$interfaces/helpers/xkcd-response.helper.tsx";

const idRegex = /^\d+$/;

interface GetXkcdOptions {
  text: string;
  xkcdRepository: XkcdRepository;
}

export async function getXkcdUsecase(options: GetXkcdOptions) {
  const res = await retrieveComic(options.text, options.xkcdRepository);

  if (!res.ok) {
    throw new Error(`Error fetching comic: ${res.status} ${res.statusText}`);
  }

  return comicSchema.parse(res.data);
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
