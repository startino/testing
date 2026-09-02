import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const TASK_PATTERN = /^\s*(?:[-*+]\s+)?\[([ xX])\]\s+\S/;

export function countTasks(source) {
  let complete = 0;
  let incomplete = 0;

  for (const line of source.split(/\r?\n/)) {
    const match = line.match(TASK_PATTERN);
    if (!match) continue;

    if (match[1].toLowerCase() === "x") complete += 1;
    else incomplete += 1;
  }

  return { complete, incomplete, total: complete + incomplete };
}

function usage() {
  return [
    "Usage: node tools/task-count/task-count.mjs <task-file>",
    "       command-producing-tasks | node tools/task-count/task-count.mjs -",
    "",
    "Count complete and incomplete checkbox tasks in a plain-text file.",
  ].join("\n");
}

function parseArguments(args) {
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
    return { help: true };
  }
  if (args.length === 0) {
    throw new Error("The task file is missing. Run with --help for usage.");
  }
  if (args.length > 1) {
    throw new Error("Supply one task file. Run with --help for usage.");
  }
  return { input: args[0] };
}

async function readTasks(input) {
  if (input === "-") {
    process.stdin.setEncoding("utf8");
    let source = "";
    for await (const chunk of process.stdin) source += chunk;
    return source;
  }

  const inputPath = resolve(input);
  try {
    return await readFile(inputPath, "utf8");
  } catch (error) {
    throw new Error(
      `The task file could not be read: ${inputPath}. Check the path and file permissions.`,
      { cause: error },
    );
  }
}

function renderCounts(counts) {
  return [
    `Complete: ${counts.complete}`,
    `Incomplete: ${counts.incomplete}`,
    `Total: ${counts.total}`,
  ].join("\n");
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const source = await readTasks(options.input);
  const counts = countTasks(source);
  if (counts.total === 0) {
    throw new Error("The input contains no checkbox tasks. Add a task and run the command again.");
  }
  process.stdout.write(`${renderCounts(counts)}\n`);
}

main().catch((error) => {
  process.stderr.write(`Error: ${error.message}\n`);
  process.exitCode = 1;
});
