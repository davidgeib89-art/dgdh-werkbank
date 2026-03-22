import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

async function run() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "symlink-test-"));
  const source = path.join(root, "source.txt");
  const target = path.join(root, "target.txt");

  await fs.writeFile(source, "hello");
  console.log("Source created at:", source);

  try {
    await fs.symlink(source, target);
    console.log("Symlink created at:", target);
  } catch (err) {
    console.error("Symlink creation failed:", err);
    return;
  }

  try {
    const link = await fs.readlink(target);
    console.log("Readlink result:", link);
    if (link === source) {
      console.log("SUCCESS: readlink matches source");
    } else {
      console.log("FAILURE: readlink does not match source");
    }
  } catch (err) {
    console.error("Readlink failed:", err);
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
