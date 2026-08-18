import { readFile } from "node:fs/promises";

const SOURCE_FILES = ["src/courseData.ts", "src/learningContent.ts"];
const CONCURRENCY = 10;
const TIMEOUT_MS = 12_000;
const HARD_FAILURE_STATUSES = new Set([404, 410]);

async function collectUrls() {
  const contents = await Promise.all(SOURCE_FILES.map((file) => readFile(file, "utf8")));
  return [
    ...new Set(
      contents.flatMap((content) =>
        content.match(/https?:\/\/[^"'`\s)]+/g) ?? [],
      ),
    ),
  ];
}

async function probe(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 KuaKuaReleaseAudit/1.0",
        range: "bytes=0-0",
      },
    });
    await response.body?.cancel();
    return {
      url,
      status: response.status,
      finalUrl: response.url,
      result: HARD_FAILURE_STATUSES.has(response.status)
        ? "broken"
        : response.status === 403 || response.status === 429
          ? "blocked"
          : response.ok || response.status < 400
            ? "reachable"
            : "warning",
    };
  } catch (error) {
    return {
      url,
      status: 0,
      result: "warning",
      error: error instanceof Error ? error.name : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const urls = await collectUrls();
  const results = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < urls.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await probe(urls[index]);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const broken = results.filter((item) => item.result === "broken");
  const blocked = results.filter((item) => item.result === "blocked");
  const warnings = results.filter((item) => item.result === "warning");
  const report = {
    status: broken.length === 0 ? "passed" : "failed",
    checked: results.length,
    reachable: results.filter((item) => item.result === "reachable").length,
    blocked: blocked.length,
    warnings: warnings.length,
    broken,
    blockedUrls: blocked.map(({ url, status }) => ({ url, status })),
    warningUrls: warnings.map(({ url, status, error }) => ({ url, status, error })),
  };

  console.log(JSON.stringify(report, null, 2));
  if (broken.length > 0) process.exitCode = 1;
}

await main();
