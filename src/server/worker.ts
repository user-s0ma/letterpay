import { createAppHandler } from "./handler";
import { runScheduled } from "./scheduled";

const handle = createAppHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request: Request, env: AppEnv, ctx: ExecutionContext): Promise<Response> {
    return handle(request, env, ctx);
  },

  // 毎日、送る日になった客にメールを送る (wrangler.jsonc の triggers.crons)
  async scheduled(_controller: ScheduledController, env: AppEnv, ctx: ExecutionContext) {
    ctx.waitUntil(runScheduled(env));
  },
} satisfies ExportedHandler<AppEnv>;
