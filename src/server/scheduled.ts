import { sendDueLetters } from "@/lib/letters/service";

/** 毎日の見回り (wrangler.jsonc の triggers.crons): 送る日になったメールを送る */
export async function runScheduled(env: AppEnv) {
  await sendDueLetters(env);
}
