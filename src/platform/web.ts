import type { Platform, SaveFileRequest } from "./types";

function downloadInBrowser({ data, suggestedName }: SaveFileRequest) {
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = suggestedName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

/**
 * Browser preview runtime. Desktop-only capabilities report `supported: false`
 * instead of failing, so the UI can say "desktop only" rather than "none found".
 */
export const webPlatform: Platform = {
  kind: "web",

  storage: {
    async read(key) {
      const raw = localStorage.getItem(key);
      if (!raw) return undefined;
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        return undefined;
      }
    },
    async write(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    },
  },

  applications: {
    supported: false,
    async listRunning() {
      return [];
    },
    async getForeground() {
      return null;
    },
    async onForegroundChange() {
      return () => {};
    },
  },

  files: {
    async save(request) {
      downloadInBrowser(request);
      return true;
    },
  },

  shell: {
    async openExternal(url) {
      window.open(url, "_blank", "noopener,noreferrer");
    },
  },

  window: {
    supported: false,
    async setAlwaysOnTop() {},
    async minimize() {},
    async toggleMaximize() {},
    async close() {},
  },
};
