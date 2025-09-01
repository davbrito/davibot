import z from "zod";

export const comicSchema = z.object({
  img: z.url(),
  title: z.string(),
  alt: z.string(),
  num: z.number(),
  year: z.number(),
  month: z.number(),
  day: z.number(),
});

export type Comic = z.infer<typeof comicSchema>;

export function createXkcdResponse(comic: Comic) {
  return {
    image: comic.img,
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
