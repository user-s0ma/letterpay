import { createRequestHandler, RouterContextProvider, type ServerBuild } from "react-router";
import { appContext } from "@/lib/util/app-context";
import api from "./api";

/**
 * 1つのリクエストを画面の API (/api) と画面 (React Router) に振り分ける
 */
export function createAppHandler(build: () => Promise<ServerBuild>, mode: string) {
  const requestHandler = createRequestHandler(build, mode);

  return async function handle(
    request: Request,
    env: AppEnv,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return api.fetch(request, env, ctx);
    }

    const context = new RouterContextProvider();
    context.set(appContext, { env, ctx });

    const response = await requestHandler(request, context);
    try {
      if ((response.headers.get("content-type") || "").includes("text/html")) {
        response.headers.set(
          "Content-Security-Policy",
          "frame-ancestors 'none'",
        );
      }
    } catch {
      /*noop*/
    }
    return response;
  };
}
