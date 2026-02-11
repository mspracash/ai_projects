// cache.js
import fs from "node:fs";

export function loadJson(path, fallback) {
  try {
    if (!fs.existsSync(path)) return fallback;
    const txt = fs.readFileSync(path, "utf8");
    if (!txt.trim()) return fallback;
    return JSON.parse(txt);
  } catch {
    return fallback;
  }
}

export function saveJsonAtomic(path, obj) {
  const tmp = `${path}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), "utf8");
  fs.renameSync(tmp, path);
}
