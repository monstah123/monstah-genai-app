
export interface Character {
  id: number;
  name: string;
  image: string | null;
  mimeType: string | null;
  selected: boolean;
}

export interface GeneratedImage {
  id: number;
  prompt: string;
  base64: string;
}

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | 'Custom';
