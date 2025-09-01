import { DbContext } from "$infrastructure/kv/dbcontext.ts";

export async function clearCacheUseCase(db: DbContext) {
  await db.rae.clearCache();
}
