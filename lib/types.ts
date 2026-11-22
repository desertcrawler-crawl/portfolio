export type ProjectImage = {
  url: string;
  width: number;
  height: number;
};

export type Project = {
  id: string;
  slug: string;
  name: string;
  info: string;
  images: ProjectImage[];
};

// SVGs are shown as they are; other images are resized and compressed by Vercel.
export const isSvg = (url: string) => /\.svg(\?|$)/i.test(url);

export const MIN_IMAGES = 2;
export const MAX_IMAGES = 6;
