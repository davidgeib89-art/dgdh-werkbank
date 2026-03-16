import fs from "node:fs/promises";

export async function writeFakeNodeCommand(
  commandPath: string,
  script: string,
): Promise<string> {
  if (process.platform === "win32") {
    const scriptPath = `${commandPath}.cjs`;
    const launcherPath = `${commandPath}.cmd`;
    await fs.writeFile(scriptPath, script, "utf8");
    await fs.writeFile(
      launcherPath,
      `@echo off\r\n"${process.execPath}" "${scriptPath}" %*\r\n`,
      "utf8",
    );
    return launcherPath;
  }

  await fs.writeFile(commandPath, script, "utf8");
  await fs.chmod(commandPath, 0o755);
  return commandPath;
}
