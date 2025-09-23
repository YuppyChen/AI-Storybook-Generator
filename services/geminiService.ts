import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { Story, StoryPage, Language, IllustrationStyle, ImageModel } from '../types';
import { translations } from '../i18n';

// Define a custom error class to hold a user-friendly message key
export class ApiError extends Error {
    public readonly userFriendlyMessageKey: keyof typeof translations.en.errors;

    constructor(message: string, userFriendlyMessageKey: keyof typeof translations.en.errors) {
        super(message);
        this.name = 'ApiError';
        this.userFriendlyMessageKey = userFriendlyMessageKey;
    }
}

// A helper to process raw errors into specific ApiErrors
const handleApiError = (error: unknown, contextKey: keyof typeof translations.en.errors): ApiError => {
    console.error(`Error during API call:`, error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('API key not valid') || errorMessage.includes('[400]')) {
        return new ApiError(errorMessage, 'apiKeyInvalid');
    }
    if (errorMessage.includes('[429]')) {
        return new ApiError(errorMessage, 'rateLimitExceeded');
    }
    if (errorMessage.includes('prompt was blocked')) {
        return new ApiError(errorMessage, 'promptBlocked');
    }
    if (errorMessage.includes('[500]') || errorMessage.includes('[503]')) {
        return new ApiError(errorMessage, 'serverError');
    }
    
    // Fallback to the context-specific error
    return new ApiError(errorMessage, contextKey);
};


const storySchema = {
  type: Type.OBJECT,
  properties: {
    title: { 
      type: Type.STRING,
      description: "A creative and catchy title for the story."
    },
    pages: {
      type: Type.ARRAY,
      description: "An array of pages that make up the story.",
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

export const generateRandomInspiration = async (language: Language): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const langInstruction = language === 'zh' ? 'Chinese' : 'English';
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate a single, short, whimsical children's story idea. The idea should be a single sentence. Output it in ${langInstruction}. Just the idea, nothing else.`,
            config: {
                temperature: 1.2,
            },
        });
        return response.text.trim().replace(/"/g, '');
    } catch (error) {
        throw handleApiError(error, 'inspirationFailed');
    }
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
        throw handleApiError(error, 'characterFailed');
    }
};

const generateStoryContent = async (prompt: string, language: Language, numberOfPages: number): Promise<Story> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const langInstruction = language === 'zh' ? 'Chinese' : 'English';

        const systemInstruction = `You are a world-class children's book author, specializing in captivating stories for children aged 3-7. Your mission is to create a complete ${numberOfPages}-page story. Each story must have a clear beginning, a simple conflict or challenge in the middle, and a heartwarming resolution at the end. Ensure every story imparts a gentle, positive message, like friendship, bravery, or curiosity. The story's title and main text should be in ${langInstruction}. Crucially, the 'illustrationPrompt' for each page must be a vivid, action-oriented description in English, focusing ONLY on the setting and the character's actions. DO NOT describe the character's physical features in the illustration prompt, as that is handled separately.`;
        const contents = `Write a ${numberOfPages}-page children's story in ${langInstruction} based on this idea: "${prompt}". The story should be whimsical, gentle, and follow a classic narrative arc. The tone should be appropriate for a 3-7 year old. Remember all the rules from the system instruction.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents,
            config: {
                responseMimeType: "application/json",
                responseSchema: storySchema,
                systemInstruction: systemInstruction,
            },
        });

        const jsonText = response.text;
        const parsedStory = JSON.parse(jsonText);

        if (!parsedStory.title || !Array.isArray(parsedStory.pages) || parsedStory.pages.length === 0) {
            throw new Error("Invalid story structure received from API.");
        }
        
        return parsedStory as Story;

    } catch (error) {
        throw handleApiError(error, 'storyFailed');
    }
};

const generateImageForPage = async (page: StoryPage, style: IllustrationStyle, characterProfile: string, imageModel: ImageModel): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const styleDescription: Record<IllustrationStyle, string> = {
            storybook: "Charming children's storybook illustration, simple and heartwarming, with soft colors and clean lines. Centered character.",
            watercolor: "Vibrant and gentle watercolor painting, with beautiful color bleeds and a dreamy, whimsical feel, perfect for a children's book.",
            cartoon: "Playful and bold cartoon style, with thick outlines, expressive characters, and bright, cheerful colors. Dynamic and fun.",
            photorealistic: "Cinematic, photorealistic style, epic lighting, highly detailed, visually stunning. 8k.",
            anime: "Lush and expressive anime style, cinematic lighting, vibrant colors, beautiful details, reminiscent of a Studio Ghibli film.",
        };
        
        const fullPrompt = `
Style: ${styleDescription[style]}
Subject: ${characterProfile}.
Scene: The character is ${page.illustrationPrompt}.
Negative prompt: Do not include any text, words, letters, signatures, or watermarks. The image should be clean.`;
        
        if (imageModel === 'gemini-2.5-flash-image-preview') {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image-preview',
                contents: { parts: [{ text: fullPrompt }] },
                config: {
                    responseModalities: [Modality.IMAGE, Modality.TEXT],
                },
            });

            const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
            if (imagePart?.inlineData) {
                return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
            }

        } else { // Default to 'imagen-4.0-generate-001'
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: fullPrompt,
                config: {
                  numberOfImages: 1,
                  outputMimeType: 'image/jpeg',
                  aspectRatio: '4:3',
                },
            });
    
            const image = response.generatedImages?.[0]?.image;
            if (image && image.imageBytes) {
                return `data:image/jpeg;base64,${image.imageBytes}`;
            }
        }
        
        throw new Error("No image was generated.");

    } catch (error) {
        throw handleApiError(error, 'imageFailed');
    }
};

export const generateStoryAndImages = async (
  prompt: string, 
  style: IllustrationStyle,
  language: Language,
  numberOfPages: number,
  imageModel: ImageModel,
  onProgress: (messageKey: string, current?: number, total?: number) => void,
  onCompletePage: (storyUpdate: Story | ((prevStory: Story | null) => Story | null)) => void
): Promise<void> => {
    onProgress("loadingCharacter");
    const characterProfile = await generateCharacterProfile(prompt, language);

    onProgress("loadingCrafting");
    const storyStructure = await generateStoryContent(prompt, language, numberOfPages);
    
    onCompletePage(storyStructure); // Display text first

    const totalPages = storyStructure.pages.length;

    const imagePromises = storyStructure.pages.map((page, index) => 
        (async () => {
            onProgress("painting", index + 1, totalPages);
            const imageUrl = await generateImageForPage(page, style, characterProfile, imageModel);
            
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