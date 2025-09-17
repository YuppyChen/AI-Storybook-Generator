import React, { useState } from 'react';
import { MagicWandIcon, LightbulbIcon } from './icons';
import { translations } from '../i18n';
import type { Language, IllustrationStyle } from '../types';
import { generateRandomInspiration } from '../services/geminiService';


interface PromptFormProps {
  onGenerate: (prompt: string, style: IllustrationStyle) => void;
  isLoading: boolean;
  language: Language;
  apiKey: string | null;
}

export const PromptForm: React.FC<PromptFormProps> = ({ onGenerate, isLoading, language, apiKey }) => {
  const [prompt, setPrompt] = useState<string>('');
  const [style, setStyle] = useState<IllustrationStyle>('storybook');
  const [isGeneratingInspiration, setIsGeneratingInspiration] = useState(false);
  const t = translations[language];
  const examplePrompts = t.examplePrompts;
  const illustrationStyles: IllustrationStyle[] = ['storybook', 'watercolor', 'cartoon', 'photorealistic', 'anime'];


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onGenerate(prompt, style);
    }
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
  };

  const handleGenerateInspiration = async () => {
    if (!apiKey) return;
    setIsGeneratingInspiration(true);
    try {
        const inspiration = await generateRandomInspiration(apiKey, language);
        setPrompt(inspiration);
    } catch (error) {
        console.error("Failed to generate inspiration:", error);
        alert(error instanceof Error ? error.message : "Could not generate inspiration.");
    } finally {
        setIsGeneratingInspiration(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
      <form onSubmit={handleSubmit}>
        <fieldset disabled={isLoading}>
          <label htmlFor="prompt" className="block text-lg font-semibold text-gray-700 mb-2">
            {t.promptLabel}
          </label>
          <div className="relative">
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t.promptPlaceholder}
              className="w-full h-32 p-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-shadow duration-200 resize-none disabled:bg-gray-50"
            />
            <button
                type="button"
                onClick={handleGenerateInspiration}
                disabled={isLoading || isGeneratingInspiration}
                className="absolute bottom-2 right-2 p-2 text-amber-500 rounded-full hover:bg-amber-100 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
                aria-label={t.generateInspiration}
                title={t.generateInspiration}
            >
                <LightbulbIcon className={`h-6 w-6 ${isGeneratingInspiration ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-2">{t.inspiration}</p>
            <div className="flex flex-wrap gap-2">
              {examplePrompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleExampleClick(p)}
                  className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm hover:bg-amber-200 transition-colors disabled:opacity-70"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mt-6">
            <label className="block text-lg font-semibold text-gray-700 mb-3">
              {t.illustrationStyleLabel}
            </label>
            <div className="flex flex-wrap gap-3">
              {illustrationStyles.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 border-2 ${
                    style === s
                      ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-amber-400 hover:text-amber-600'
                  }`}
                >
                  {t.styles[s as keyof typeof t.styles]}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="mt-6 w-full flex items-center justify-center gap-2 bg-amber-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-amber-600 transition-all duration-300 transform hover:scale-105 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none shadow-md"
          >
            <MagicWandIcon className="h-5 w-5" />
            {isLoading ? t.creatingButton : t.generateButton}
          </button>
        </fieldset>
      </form>
    </div>
  );
};