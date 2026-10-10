import { cookies } from "next/headers";
import crypto from "crypto";
import { DEMO } from "./store";

export const ADMIN_COOKIE = "sd_admin";

export function adminPassword() {
  return process.env.ADMIN_PASSWORD || (DEMO ? "demo" : "");
}

export function tokenFor(pw: string) {
  return crypto.createHash("sha256").update("sdbeautyglam::" + pw).digest("hex");
}

export function isAdmin() {
  const pw = adminPassword();
  if (!pw) return false;
  const c = cookies().get(ADMIN_COOKIE)?.value;
  return !!c && c === tokenFor(pw);
}
