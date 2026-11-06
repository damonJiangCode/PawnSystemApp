import { describe, expect, it } from 'vitest';
import { buildImageUrl } from './image-url.js';

describe('buildImageUrl', () => {
  it.each([null, undefined, ''])('returns null for %s', (imagePath) => {
    expect(buildImageUrl('/items/1/image', imagePath)).toBeNull();
  });

  it('changes when the photo changes and hides the file name', () => {
    const first = buildImageUrl('/items/1/image', 'images/items/a.png');
    const second = buildImageUrl('/items/1/image', 'images/items/b.png');
    expect(first).toMatch(/^\/items\/1\/image\?v=[0-9a-f]{8}$/);
    expect(second).not.toBe(first);
    expect(first).not.toContain('a.png');
  });

  it('stays the same for the same photo', () => {
    const imagePath = 'images/items/a.png';
    expect(buildImageUrl('/items/1/image', imagePath)).toBe(
      buildImageUrl('/items/1/image', imagePath),
    );
  });
});
