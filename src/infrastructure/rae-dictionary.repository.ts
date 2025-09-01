export async function searchDictionaryEntries(
  query: string,
  offset: number = 0,
  limit: number = 5,
): Promise<string[]> {
  return await fetch(
    `https://dle.rae.es/srv/keys?q=${encodeURIComponent(query)}`,
  )
    .then((r) => r.json() as Promise<string[]>)
    .catch(() => [])
    .then((keys) =>
      keys.map((key) => key.split("|")[0] ?? "").slice(offset, offset + limit),
    );
}
