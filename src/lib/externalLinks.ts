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
  if (!isYoutubeMusicUrl(value)) throw new Error("UNSUPPORTED MUSIC URL.");

  if (window.__TAURI_INTERNALS__) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(value);
    return;
  }

  window.open(value, "_blank", "noopener,noreferrer");
}
