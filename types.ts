export type Language = 'en' | 'zh';

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
