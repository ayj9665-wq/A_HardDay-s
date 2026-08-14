import { AppError } from "../core/errors";
import { getPlatform } from "../platform";

const YOUTUBE_MUSIC_ORIGIN = "https://music.youtube.com";

export function isYoutubeMusicUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.origin === YOUTUBE_MUSIC_ORIGIN;
  } catch {
    return false;
  }
}

export async function openYoutubeMusicUrl(value: string): Promise<void> {
  if (!isYoutubeMusicUrl(value)) throw new AppError("MUSIC_URL_UNSUPPORTED");
  await getPlatform().shell.openExternal(value);
}
