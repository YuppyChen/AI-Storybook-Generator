import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { Story, StoryPage, Language, IllustrationStyle } from '../types';

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
            description: "A detailed, vivid, and imaginative prompt in English for generating an illustration for this page. This prompt should describe the scene and the character's actions, but NOT the character's physical appearance. E.g., '...bravely steering a leaf boat down a rushing stream in a sun-dappled forest.' THIS PROMPT MUST ALWAYS BE IN ENGLISH."
          },
        },
        required: ["pageNumber", "storyText", "illustrationPrompt"],
      },
    },
  },
  required: ["title", "pages"],
};

const generateCharacterProfile = async (prompt: string, language: Language): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const langInstruction = language === 'zh' ? 'Chinese' : 'English';
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `The user wants to create a children's story about: "${prompt}". Please create a visually distinct and consistent character profile for the main character. Describe their appearance in a single, concise sentence in English. This will be used in every illustration prompt. For example, for 'a little fox', a good description is 'a small red fox with a fluffy, white-tipped tail, wearing oversized aviator goggles and a bright red scarf'.`,
            config: {
                systemInstruction: `You are a character designer for children's books. Your task is to create a single, descriptive sentence in English that establishes a clear and consistent visual identity for a character based on a story prompt. The language of the user's prompt is ${langInstruction}.`,
                temperature: 0.8,
            },
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating character profile:", error);
        throw new Error("Failed to design the character. The model might be busy, please try again.");
    }
};

const generateStoryContent = async (prompt: string, language: Language): Promise<Story> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const langInstruction = language === 'zh' ? 'in Chinese' : 'in English';

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Create a children's story ${langInstruction} based on this prompt: "${prompt}". The story text and title should be ${langInstruction}, but the 'illustrationPrompt' for each page must be in English. The illustration prompt should ONLY describe the scene and action, not the character's appearance.`,
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

const generateImageForPage = async (page: StoryPage, style: IllustrationStyle, characterProfile: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const styleDescription: Record<IllustrationStyle, string> = {
            storybook: "Children's storybook illustration style.",
            watercolor: "In the style of a vibrant watercolor painting for a children's book.",
            cartoon: "In a playful and colorful cartoon style for a children's book.",
            photorealistic: "In a photorealistic style, highly detailed.",
            anime: "In a beautiful and expressive anime style.",
        };
        
        const fullPrompt = `${styleDescription[style]} An illustration of ${characterProfile}, in a scene where they are ${page.illustrationPrompt}`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [{ text: fullPrompt }],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

        if (imagePart && imagePart.inlineData) {
            const { mimeType, data } = imagePart.inlineData;
            return `data:${mimeType};base64,${data}`;
        } else {
            const textResponse = response.text?.trim();
            console.error("Image generation failed. Model response:", textResponse || "No text response.");
            throw new Error("No image was generated." + (textResponse ? ` Model response: ${textResponse}` : ''));
        }
    } catch (error) {
        console.error(`Error generating image for page ${page.pageNumber}:`, error);
        if (error instanceof Error && error.message.includes("No image was generated")) {
            throw error;
        }
        throw new Error(`Failed to generate image for page ${page.pageNumber}. The model might be busy or the prompt could be unsuitable.`);
    }
};

export const generateStoryAndImages = async (
  prompt: string, 
  style: IllustrationStyle,
  language: Language,
  onProgress: (messageKey: string, current?: number, total?: number) => void,
  onCompletePage: (storyUpdate: Story | ((prevStory: Story | null) => Story | null)) => void
): Promise<void> => {
    onProgress("loadingCharacter");
    const characterProfile = await generateCharacterProfile(prompt, language);

    onProgress("loadingCrafting");
    const storyStructure = await generateStoryContent(prompt, language);
    
    onCompletePage(storyStructure); // Display text first

    const totalPages = storyStructure.pages.length;

    const imagePromises = storyStructure.pages.map((page, index) => 
        (async () => {
            onProgress("painting", index + 1, totalPages);
            const imageUrl = await generateImageForPage(page, style, characterProfile);
            
            onCompletePage(prevStory => {
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