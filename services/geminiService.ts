import { GoogleGenAI, Type } from "@google/genai";
import type { Story, StoryPage, Language } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const storySchema = {
  type: Type.OBJECT,
  properties: {
    title: { 
      type: Type.STRING,
      description: "A creative and catchy title for the story."
    },
    pages: {
      type: Type.ARRAY,
      description: "An array of 5 pages that make up the story.",
      items: {
        type: Type.OBJECT,
        properties: {
          pageNumber: { 
            type: Type.INTEGER,
            description: "The sequential page number, starting from 1."
          },
          storyText: { 
            type: Type.STRING,
            description: "A paragraph of the story for this page. Should be engaging for children."
          },
          illustrationPrompt: { 
            type: Type.STRING,
            description: "A detailed, vivid, and imaginative prompt in English for generating an illustration for this page. Focus on actions, characters, and setting. E.g., 'A tiny brown mouse wearing a bright red scarf, bravely steering a leaf boat down a rushing stream in a sun-dappled forest, digital art, vibrant colors.' THIS PROMPT MUST ALWAYS BE IN ENGLISH."
          },
        },
        required: ["pageNumber", "storyText", "illustrationPrompt"],
      },
    },
  },
  required: ["title", "pages"],
};


const generateStoryContent = async (prompt: string, language: Language): Promise<Story> => {
    try {
        const langInstruction = language === 'zh' ? 'in Chinese' : 'in English';

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Create a children's story ${langInstruction} based on this prompt: "${prompt}". The story text and title should be ${langInstruction}, but the 'illustrationPrompt' for each page must be in English.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: storySchema,
                systemInstruction: `You are a creative author who writes delightful and short (5 pages) storybooks for children aged 4-8. Your stories are imaginative, have a positive message, and are easy to understand. You will write the story and title ${langInstruction}, but you will always write the illustration prompts in English.`,
            },
        });

        const jsonText = response.text;
        const parsedStory = JSON.parse(jsonText);

        if (!parsedStory.title || !Array.isArray(parsedStory.pages) || parsedStory.pages.length === 0) {
            throw new Error("Invalid story structure received from API.");
        }
        
        return parsedStory as Story;

    } catch (error) {
        console.error("Error generating story content:", error);
        throw new Error("Failed to generate the story structure. The model might be busy, please try again.");
    }
};

const generateImageForPage = async (page: StoryPage): Promise<string> => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `Children's storybook illustration style. ${page.illustrationPrompt}`,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '4:3',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        } else {
            throw new Error("No image was generated.");
        }
    } catch (error) {
        console.error(`Error generating image for page ${page.pageNumber}:`, error);
        throw new Error(`Failed to generate image for page ${page.pageNumber}.`);
    }
};

// FIX: Updated the type of onCompletePage to accept a state updater function,
// which is compatible with React's useState setter. This resolves the type error
// and allows for safe, atomic state updates as images are generated.
export const generateStoryAndImages = async (
  prompt: string, 
  language: Language,
  onProgress: (messageKey: string, current?: number, total?: number) => void,
  onCompletePage: (storyUpdate: Story | ((prevStory: Story | null) => Story | null)) => void
): Promise<void> => {
    onProgress("loadingCrafting");
    const storyStructure = await generateStoryContent(prompt, language);
    
    onCompletePage(storyStructure); // Display text first

    const totalPages = storyStructure.pages.length;

    const imagePromises = storyStructure.pages.map((page, index) => 
        (async () => {
            onProgress("painting", index + 1, totalPages);
            const imageUrl = await generateImageForPage(page);
            
            // Use an updater function for onCompletePage. This is crucial for avoiding race conditions
            // when updating the story state as images are generated concurrently. It ensures
            // each update is applied to the most recent state.
            onCompletePage(prevStory => {
                // The updater function's parameter can be null based on the state's type.
                // Although the story structure is set before this, we check for null
                // to ensure type safety.
                if (!prevStory) return null;

                const updatedPages = prevStory.pages.map(p => 
                    p.pageNumber === page.pageNumber ? { ...p, imageUrl } : p
                );
                return { ...prevStory, pages: updatedPages };
            });

        })()
    );

    await Promise.all(imagePromises);

    onProgress("loadingReady");
};