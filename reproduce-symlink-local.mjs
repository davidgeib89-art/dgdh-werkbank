import fs from "node:fs/promises";
import path from "node:path";

async function run() {
  const root = path.resolve("test-symlink-local");
  await fs.mkdir(root, { recursive: true });
  const source = path.join(root, "source.txt");
  const target = path.join(root, "target.txt");

  await fs.writeFile(source, "hello");
  console.log("Source created at:", source);

  try {
    const type = process.platform === "win32" ? "file" : null;
    await fs.symlink(source, target, type);
    console.log("Symlink created at:", target);
  } catch (err) {
    console.error("Symlink creation failed:", err);
    await fs.rm(root, { recursive: true, force: true });
    return;
  }

  try {
    const real = await fs.realpath(target);
    console.log("Real path:", real);
    if (real === source) {
      console.log("SUCCESS: realpath matches source");
    } else {
      console.log("FAILURE: realpath does not match source");
    }
  } catch (err) {
    console.error("Realpath failed:", err);
  }

  // Cleanup
  await fs.rm(root, { recursive: true, force: true });
}

run();
