import { spawnSync } from "node:child_process";
import { parseCliArgs } from "./lib/ingestion-utils";

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function main() {
  const args = parseCliArgs();
  const channel = typeof args.channel === "string" ? args.channel : "paiziev24";
  const all = args.all === true;
  const maxPages = typeof args["max-pages"] === "string" ? args["max-pages"] : "10";

  const fetchArgs = [
    "tsx",
    "scripts/fetch-telegram-channel.ts",
    `--channel=${channel}`,
  ];

  if (all) {
    fetchArgs.push("--all");
  } else {
    fetchArgs.push(`--max-pages=${maxPages}`);
  }

  run("npx", fetchArgs);
  run("npx", ["tsx", "scripts/import-telegram-posts.ts", `--channel=${channel}`]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
