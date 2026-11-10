import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Next.js crashes at runtime (not at build time) when a "use server" module
 * exports anything other than an async function. Guard it statically.
 */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "generated" ? [] : sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

const serverActionFiles = sourceFiles("src").filter((f) =>
  /^\s*["']use server["']/.test(readFileSync(f, "utf8")),
);

describe('"use server" modules', () => {
  it("exist (sanity check)", () => {
    expect(serverActionFiles.length).toBeGreaterThan(0);
  });

  it.each(serverActionFiles)("%s exports only async functions and types", (file) => {
    const exportLines = readFileSync(file, "utf8")
      .split("\n")
      .filter((line) => /^export\s/.test(line));
    const offending = exportLines.filter(
      (line) => !/^export\s+(async\s+function|type|interface)\s/.test(line),
    );
    expect(offending).toEqual([]);
  });
});
