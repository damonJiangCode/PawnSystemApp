import { createHash } from 'node:crypto';

// The URL a client uses to show a photo, or null when there is none. `v` changes
// when the photo is replaced, so the browser loads the new file instead of
// keeping the old one, and it does not reveal the stored file name.
export const buildImageUrl = (route: string, imagePath: unknown) => {
  if (typeof imagePath !== 'string' || !imagePath) return null;
  const version = createHash('sha256')
    .update(imagePath)
    .digest('hex')
    .slice(0, 8);
  return `${route}?v=${version}`;
};
