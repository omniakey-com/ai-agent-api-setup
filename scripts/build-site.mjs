import { copyFile, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = resolve(ROOT, "_site");

if (dirname(OUTPUT) !== ROOT || !OUTPUT.endsWith("/_site")) {
  throw new Error(`Refusing to clean unexpected output path: ${OUTPUT}`);
}

await rm(OUTPUT, { recursive: true, force: true });
await mkdir(resolve(OUTPUT, "lib"), { recursive: true });
await cp(resolve(ROOT, "site"), OUTPUT, { recursive: true });
await copyFile(resolve(ROOT, "src", "catalog.mjs"), resolve(OUTPUT, "lib", "catalog.mjs"));
await copyFile(resolve(ROOT, "src", "render-config.mjs"), resolve(OUTPUT, "lib", "render-config.mjs"));

const profileFiles = ["custom-openai-compatible.json", "omniakey.json"];
const profiles = await Promise.all(
  profileFiles.map(async (filename) => {
    const content = await readFile(resolve(ROOT, "profiles", filename), "utf8");
    return JSON.parse(content);
  }),
);
await writeFile(resolve(OUTPUT, "profiles.json"), `${JSON.stringify(profiles, null, 2)}\n`, "utf8");
await writeFile(resolve(OUTPUT, ".nojekyll"), "", "utf8");

console.log(`Built ${OUTPUT}`);
