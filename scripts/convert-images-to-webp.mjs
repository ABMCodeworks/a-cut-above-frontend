import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".tif", ".tiff"]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, "..");
const defaultInputDirs = [
  path.resolve(frontendRoot, "public"),
  path.resolve(frontendRoot, "src/assets"),
];

function parseArgs(argv) {
  const options = {
    dirs: [],
    dryRun: false,
    overwrite: false,
    quality: 82,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--overwrite") {
      options.overwrite = true;
      continue;
    }

    if (arg === "--quality") {
      const next = Number(argv[i + 1]);

      if (!Number.isFinite(next) || next < 1 || next > 100) {
        throw new Error("--quality must be a number from 1 to 100");
      }

      options.quality = Math.round(next);
      i += 1;
      continue;
    }

    if (arg.startsWith("--quality=")) {
      const next = Number(arg.split("=")[1]);

      if (!Number.isFinite(next) || next < 1 || next > 100) {
        throw new Error("--quality must be a number from 1 to 100");
      }

      options.quality = Math.round(next);
      continue;
    }

    options.dirs.push(path.resolve(process.cwd(), arg));
  }

  if (options.dirs.length === 0) {
    options.dirs.push(...defaultInputDirs);
  }

  return options;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") {
      continue;
    }

    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      yield* walk(entryPath);
      continue;
    }

    if (entry.isFile()) {
      yield entryPath;
    }
  }
}

async function convertFile(filePath, options) {
  const ext = path.extname(filePath).toLowerCase();

  if (!IMAGE_EXTENSIONS.has(ext)) {
    return { converted: false, skipped: true };
  }

  const outputPath = filePath.slice(0, -ext.length) + ".webp";

  if (!options.overwrite && (await fileExists(outputPath))) {
    return { converted: false, skipped: true, outputPath, reason: "exists" };
  }

  if (options.dryRun) {
    return { converted: false, skipped: false, outputPath, dryRun: true };
  }

  await sharp(filePath)
    .rotate()
    .webp({ quality: options.quality })
    .toFile(outputPath);

  return { converted: true, skipped: false, outputPath };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  let converted = 0;
  let skipped = 0;
  let planned = 0;

  for (const dir of options.dirs) {
    if (!(await fileExists(dir))) {
      throw new Error(`Directory not found: ${dir}`);
    }

    for await (const filePath of walk(dir)) {
      const result = await convertFile(filePath, options);

      if (result.converted) {
        converted += 1;
        console.log(
          `Converted: ${path.relative(process.cwd(), filePath)} -> ${path.relative(process.cwd(), result.outputPath)}`,
        );
      } else if (result.dryRun) {
        planned += 1;
        console.log(
          `Would convert: ${path.relative(process.cwd(), filePath)} -> ${path.relative(process.cwd(), result.outputPath)}`,
        );
      } else if (result.skipped) {
        skipped += 1;
      }
    }
  }

  if (options.dryRun) {
    console.log(
      `Done. ${planned} image(s) would be converted. ${skipped} skipped.`,
    );
  } else {
    console.log(`Done. ${converted} image(s) converted. ${skipped} skipped.`);
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
