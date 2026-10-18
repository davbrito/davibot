import { factory } from "$infrastructure/app.ts";
import { scheduled } from "$interfaces/jobs/controllers.ts";
import { serveWebhook } from "$interfaces/webhook/server";

const app = factory.createApp();

// app.get("/dict", ...raeHtmlTestHandler);

serveWebhook(app);

export default {
  fetch(request, env, ctx) {
    return app.fetch(
      request,
      { ...env, waitUntil: (promise) => ctx.waitUntil(promise) },
      ctx,
    );
  },
  scheduled(controller, env, ctx) {
    return scheduled(controller, env, ctx);
  },
} satisfies ExportedHandler<CloudflareBindings>;
