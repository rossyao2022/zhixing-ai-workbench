import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.KUAKUA_QA_PORT || 43147);
const baseUrl = `http://127.0.0.1:${port}/kuakua-ai/`;
const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");
const python = process.platform === "win32" ? "python" : "python3";

function run(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${args.join(" ")} exited with ${code}`)));
  });
}

async function waitForPreview() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // Preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Preview did not become ready at ${baseUrl}`);
}

const preview = spawn(process.execPath, [viteBin, "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"],
});

try {
  await waitForPreview();
  for (const script of ["qa_app.py", "qa_eight_immortals.py", "qa_i18n_visual.py", "qa_mobile_responsive.py", "qa_membership.py"]) {
    await run(python, [path.join("tests", script)], {
      KUAKUA_BASE_URL: baseUrl,
      PYTHONUTF8: "1",
      PYTHONIOENCODING: "utf-8",
    });
  }
} finally {
  preview.kill();
}
