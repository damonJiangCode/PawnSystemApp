import fs from "fs/promises";
import path from "path";
import type { ImageKind } from "../../shared/payload-contracts/image.contract.ts";

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

const resolveImagePath = (baseDir: string, imagePath: string) => {
  const resolved = path.resolve(baseDir, imagePath);

  if (!resolved.startsWith(`${baseDir}${path.sep}`) && resolved !== baseDir) {
    throw new Error("Invalid image path");
  }

  return resolved;
};

const resolveItemImagePath = (imagePath: string) => {
  return resolveImagePath(getItemImageBaseDir(), imagePath);
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

const finalizeImage = async (
  imagePath: string,
  baseDir: string,
  prefix: string,
): Promise<string> => {
  if (!imagePath) {
    return "";
  }

  const currentBaseName = path.basename(imagePath);

  if (currentBaseName.startsWith(`${prefix}_`)) {
    return imagePath;
  }

  await fs.mkdir(baseDir, { recursive: true });

  const currentPath = await resolveStoredImagePath(imagePath, baseDir);
  const nextName = `${prefix}_${Date.now()}.png`;
  const nextPath = path.join(baseDir, nextName);
  const nextRelPath = path.join("images", path.basename(baseDir), nextName);

  if (!(await fileExists(currentPath))) {
    return imagePath;
  }

  await fs.rename(currentPath, nextPath);
  return nextRelPath;
};

export const imageStorage = {
  saveItemImage: async (fileName: string, base64: string): Promise<string> => {
    if (!base64) {
      throw new Error("Missing image data");
    }

    const baseDir = getItemImageBaseDir();
    await fs.mkdir(baseDir, { recursive: true });

    const safeName = path.basename(fileName);
    const relPath = path.join("images", "items", safeName);
    const absPath = resolveItemImagePath(safeName);
    const buffer = Buffer.from(base64, "base64");

    await fs.writeFile(absPath, buffer);
    return relPath;
  },

  finalizeItemImage: async (
    itemNumber: number,
    imagePath: string,
  ): Promise<string> => {
    return finalizeImage(
      imagePath,
      getItemImageBaseDir(),
      `item_${itemNumber}`,
    );
  },

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
