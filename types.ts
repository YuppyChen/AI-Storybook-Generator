export type Language = 'en' | 'zh';

export type IllustrationStyle = 'storybook' | 'watercolor' | 'cartoon' | 'photorealistic' | 'anime';

export type ImageModel = 'imagen-4.0-generate-001' | 'gemini-2.5-flash-image-preview';

export interface StoryPage {
  pageNumber: number;
  storyText: string;
  illustrationPrompt: string;
  imageUrl?: string;
}

export interface Story {
  title: string;
  pages: StoryPage[];
}