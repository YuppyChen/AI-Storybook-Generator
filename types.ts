export type Language = 'en' | 'zh';

export type IllustrationStyle = 'storybook' | 'watercolor' | 'cartoon' | 'photorealistic' | 'anime';

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