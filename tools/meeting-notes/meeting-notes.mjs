import { readFile, writeFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";

const SECTION_ALIASES = new Map([
  ["summary", "summary"],
  ["notes", "summary"],
  ["discussion", "summary"],
  ["decisions", "decisions"],
  ["decision", "decisions"],
  ["action items", "actions"],
  ["actions", "actions"],
  ["todos", "actions"],
  ["to-dos", "actions"],
]);

const MARKERS = [
  { section: "decisions", pattern: /^(?:decision|decided)\s*:\s*/i },
  { section: "decisions", pattern: /^we decided\s+(?:to|that)\s+/i, preserve: true },
  { section: "actions", pattern: /^(?:action item|action|todo|to-do)\s*:\s*/i },
  { section: "summary", pattern: /^(?:summary|note)\s*:\s*/i },
];

function cleanLine(line) {
  return line
    .trim()
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .replace(/^\[[ xX]\]\s+/, "")
    .trim();
}

function headingSection(line) {
  const match = line.trim().match(/^(?:#{1,6}\s+)?(.+?)\s*:?[#\s]*$/);
  return match ? SECTION_ALIASES.get(match[1].toLowerCase()) : undefined;
}

export function parseNotes(source) {
  const sections = { summary: [], decisions: [], actions: [] };
  let activeSection = "summary";

  for (const rawLine of source.split(/\r?\n/)) {
    const nextSection = headingSection(rawLine);
    if (nextSection) {
      activeSection = nextSection;
      continue;
    }

    let line = cleanLine(rawLine);
    if (!line || /^#{1,6}\s+/.test(line)) continue;

    let section = activeSection;
    for (const marker of MARKERS) {
      if (!marker.pattern.test(line)) continue;
      section = marker.section;
      if (!marker.preserve) line = line.replace(marker.pattern, "").trim();
      break;
    }

    if (line) sections[section].push(line);
  }

  return sections;
}

function renderSection(title, entries) {
  const lines = entries.length > 0 ? entries.map((entry) => `- ${entry}`) : ["- None recorded."];
  return [`## ${title}`, "", ...lines].join("\n");
}

export function renderMarkdown(source, inputPath) {
  const sections = parseNotes(source);
  const inputName = basename(inputPath, extname(inputPath));
  const title = inputName
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return [
    `# ${title || "Meeting Notes"}`,
    "",
    renderSection("Summary", sections.summary),
    "",
    renderSection("Decisions", sections.decisions),
    "",
    renderSection("Action Items", sections.actions),
    "",
  ].join("\n");
}

function usage() {
  return [
    "Usage: node tools/meeting-notes/meeting-notes.mjs <input-file> [-o <output-file>]",
    "",
    "Read meeting notes and write structured Markdown.",
    "If you omit -o, the command writes to standard output.",
  ].join("\n");
}

function parseArguments(args) {
  if (args.includes("--help") || args.includes("-h")) return { help: true };

  let inputPath;
  let outputPath;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "-o" || argument === "--output") {
      outputPath = args[index + 1];
      if (!outputPath) {
        throw new Error(
          `The ${argument} option has no output file. Add a file path after ${argument}.`,
        );
      }
      index += 1;
      continue;
    }
    if (argument.startsWith("-")) {
      throw new Error(`The option ${argument} is not valid. Run with --help for usage.`);
    }
    if (inputPath) throw new Error(`The input ${argument} is unexpected. Supply one input file.`);
    inputPath = argument;
  }

  if (!inputPath) throw new Error("The input file is missing. Supply a meeting-notes file.");
  return { inputPath, outputPath };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const inputPath = resolve(options.inputPath);
  let source;
  try {
    source = await readFile(inputPath, "utf8");
  } catch (error) {
    throw new Error(
      `The input file could not be read: ${inputPath}. Check the path and file permissions.`,
      { cause: error },
    );
  }

  const markdown = renderMarkdown(source, inputPath);
  if (!options.outputPath) {
    process.stdout.write(markdown);
    return;
  }

  const outputPath = resolve(options.outputPath);
  try {
    await writeFile(outputPath, markdown, "utf8");
  } catch (error) {
    throw new Error(
      `The output file could not be written: ${outputPath}. Check the path and file permissions.`,
      { cause: error },
    );
  }
}

main().catch((error) => {
  process.stderr.write(`Error: ${error.message}\n`);
  process.exitCode = 1;
});
