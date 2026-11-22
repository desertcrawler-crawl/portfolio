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

export const MIN_IMAGES = 2;
export const MAX_IMAGES = 6;
