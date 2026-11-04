import fs from "fs/promises";
import path from "path";
import type { ImageKind } from "../../../../shared/payload-contracts/image.contract.ts";

const { app } = require("electron/main") as typeof import("electron");

const getWorkspaceImageBaseDir = () => {
  return path.join(process.cwd(), "images");
};

const getClientImageBaseDir = () => {
  return path.join(getWorkspaceImageBaseDir(), "clients");
};

const getItemImageBaseDir = () => {
  return path.join(getWorkspaceImageBaseDir(), "items");
};

const getMigrationImageBaseDir = (kind: ImageKind) => {
  return path.join(
    process.cwd(),
    "database",
    "migration",
    "exports",
    kind === "client" ? "client-photos" : "item-photos",
  );
};

const getLegacyImagePath = (imagePath: string): string | null => {
  const legacyPath = path.resolve(app.getPath("userData"), imagePath);
  const legacyBase = path.resolve(app.getPath("userData"));

  if (!legacyPath.startsWith(`${legacyBase}${path.sep}`)) {
    return null;
  }

  return legacyPath;
};

const fileExists = async (filePath: string) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const isPathInside = (baseDir: string, filePath: string) => {
  const relativePath = path.relative(
    path.resolve(baseDir),
    path.resolve(filePath),
  );
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
};

const resolveStoredImagePath = async (
  imagePath: string,
  baseDir: string,
): Promise<string> => {
  const normalized = imagePath.replace(/\\/g, "/");
  if (normalized.startsWith("migration/exports/")) {
    imagePath = `database/${normalized}`;
  }
  if (path.isAbsolute(imagePath)) {
    return imagePath;
  }

  const workspacePath = path.resolve(process.cwd(), imagePath);
  const workspaceBase = path.resolve(process.cwd());

  if (
    workspacePath.startsWith(`${workspaceBase}${path.sep}`) &&
    (await fileExists(workspacePath))
  ) {
    return workspacePath;
  }

  if (workspacePath.startsWith(`${baseDir}${path.sep}`)) {
    return workspacePath;
  }

  const directPath = path.resolve(baseDir, path.basename(imagePath));

  if (await fileExists(directPath)) {
    return directPath;
  }

  const legacyPath = getLegacyImagePath(imagePath);
  return legacyPath ?? directPath;
};

export const imageStorage = {
  resolveImageFile: async (
    kind: ImageKind,
    imagePath: string,
  ): Promise<string | null> => {
    const baseDir =
      kind === "client" ? getClientImageBaseDir() : getItemImageBaseDir();
    const filePath = await resolveStoredImagePath(imagePath, baseDir);
    const allowedBaseDirs = [
      baseDir,
      getMigrationImageBaseDir(kind),
      app.getPath("userData"),
    ];

    if (
      !allowedBaseDirs.some((allowedDir) => isPathInside(allowedDir, filePath))
    ) {
      return null;
    }

    return (await fileExists(filePath)) ? filePath : null;
  },
};
