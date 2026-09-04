import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const temp = process.env.TEMP + "\\opencode";
const zip = temp + "\\cmdtools.zip";
const dest = temp + "\\ct2";
if (!existsSync(dest)) mkdirSync(dest, { recursive: true });

console.log("extracting with tar...");
execSync(`tar -xf "${zip}" -C "${dest}"`, { stdio: "inherit" });

console.log("contents:", readdirSync(dest).join(", "));

// przenies do Android Sdk\cmdline-tools
const sdk = process.env.LOCALAPPDATA + "\\Android\\Sdk";
mkdirSync(sdk + "\\cmdline-tools", { recursive: true });
const target = sdk + "\\cmdline-tools";
execSync(`robocopy "${dest}\\cmdline-tools" "${target}" /E /MOVE /NFL /NDL /NJH /NJS`, { stdio: "inherit" });
console.log("sdkmanager exists:", existsSync(target + "\\bin\\sdkmanager.bat"));