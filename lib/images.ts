// Pre-curated image library with tags
export const imageLibrary = [
  { id: 'creative-1', url: '/images/creative-1.jpg', tags: ['creative', 'art', 'design'] },
  { id: 'creative-2', url: '/images/creative-2.jpg', tags: ['creative', 'colorful', 'bold'] },
  { id: 'outdoors-1', url: '/images/outdoors-1.jpg', tags: ['outdoors', 'nature', 'adventure'] },
  { id: 'outdoors-2', url: '/images/outdoors-2.jpg', tags: ['outdoors', 'hiking', 'nature'] },
  { id: 'tech-1', url: '/images/tech-1.jpg', tags: ['tech', 'digital', 'futuristic'] },
  { id: 'tech-2', url: '/images/tech-2.jpg', tags: ['tech', 'code', 'minimal'] },
  { id: 'calm-1', url: '/images/calm-1.jpg', tags: ['calm', 'peaceful', 'minimal'] },
  { id: 'calm-2', url: '/images/calm-2.jpg', tags: ['calm', 'serene', 'soft'] },
  { id: 'social-1', url: '/images/social-1.jpg', tags: ['social', 'people', 'community'] },
  { id: 'social-2', url: '/images/social-2.jpg', tags: ['social', 'friends', 'connection'] },
  { id: 'music-1', url: '/images/music-1.jpg', tags: ['music', 'sound', 'rhythm'] },
  { id: 'music-2', url: '/images/music-2.jpg', tags: ['music', 'instruments', 'creative'] },
];

export function pickImagesFromLibrary(imageTags: string[], template: 'A' | 'B'): string[] {
  // For now, return placeholder image IDs. In production, this would match tags.
  // Template A prefers bold/energetic, Template B prefers calm/minimal
  const templatePrefs = {
    A: ['creative', 'social', 'bold', 'colorful'],
    B: ['calm', 'minimal', 'serene', 'soft'],
  };

  const preferredTags = [...imageTags, ...templatePrefs[template]];
  const matched = imageLibrary.filter(img => 
    img.tags.some(tag => preferredTags.includes(tag))
  );

  // Return 3-4 images, or fallback to any
  const selected = matched.length >= 3 
    ? matched.slice(0, 4).map(img => img.id)
    : imageLibrary.slice(0, 4).map(img => img.id);

  return selected;
}
