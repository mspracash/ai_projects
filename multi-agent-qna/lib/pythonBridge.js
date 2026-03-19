import { spawn } from "node:child_process";
import path from "node:path";

const DEFAULT_TIMEOUT_MS = 120000;

function resolvePythonCommand() {
  if (process.env.SEO_AGENCY_PYTHON) {
    return process.env.SEO_AGENCY_PYTHON;
  }

  if (process.platform === "win32") {
    return path.resolve("..", "seo-agency", "venv", "Scripts", "python.exe");
  }

  return path.resolve("..", "seo-agency", "venv", "bin", "python");
}

function resolveScriptPath() {
  if (process.env.SEO_AGENCY_SCRIPT) {
    return process.env.SEO_AGENCY_SCRIPT;
  }

  return path.resolve("..", "seo-agency", "retrieval_stdin.py");
}

function resolveWorkingDir() {
  if (process.env.SEO_AGENCY_CWD) {
    return process.env.SEO_AGENCY_CWD;
  }

  return path.resolve("..", "seo-agency");
}

export async function runSeoAgencySearch({ query, k = 5 }, options = {}) {
  const pythonCmd = resolvePythonCommand();
  const scriptPath = resolveScriptPath();
  const cwd = resolveWorkingDir();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    const child = spawn(pythonCmd, [scriptPath], {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8"
      }
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new Error(`Python retrieval timed out after ${timeoutMs} ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      let parsed = null;

      try {
        parsed = stdout.trim() ? JSON.parse(stdout) : null;
      } catch {
        reject(
          new Error(
            `Failed to parse Python JSON output. Exit code: ${code}. Stdout: ${stdout}. Stderr: ${stderr}`
          )
        );
        return;
      }

      if (code !== 0 || !parsed?.ok) {
        reject(
          new Error(
            parsed?.error ||
              stderr ||
              `Python retrieval failed with exit code ${code}`
          )
        );
        return;
      }

      resolve(parsed.results || []);
    });

    child.stdin.write(JSON.stringify({ query, k }));
    child.stdin.end();
  });
}