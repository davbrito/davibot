import type { Comic } from "$apis/xkcd/index.ts";

export function createXkcdResponse(comic: Comic) {
  return {
    image: comic.img!,
    caption: (
      <>
        <b>{comic.title}</b> {"\n"}
        {comic.alt}
        {"\n\n"}
        <a href={`https://xkcd.com/${comic.num}`}>
          xkcd #{comic.num} ({comic.year}/{comic.month}/{comic.day})
        </a>
      </>
    ),
  };
}
