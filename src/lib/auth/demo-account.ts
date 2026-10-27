/**
 * 審査員向けのデモアカウント (共有)。パスワードを持たず、/api/auth/sign-in/demo からだけ入れる。
 * 画面とサーバーの両方から使う
 */
export const DEMO_EMAIL = "demo@letterpay.invalid";
export const DEMO_NAME = "Letterpay Demo";

export function isDemoUser(user: { email: string }) {
  return user.email === DEMO_EMAIL;
}
