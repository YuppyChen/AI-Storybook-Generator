import React, { useState } from 'react';
import { MagicWandIcon } from './icons';
import { translations } from '../i18n';
import type { Language } from '../types';

interface PromptFormProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
  language: Language;
}

export const PromptForm: React.FC<PromptFormProps> = ({ onGenerate, isLoading, language }) => {
  const [prompt, setPrompt] = useState<string>('');
  const t = translations[language];
  const examplePrompts = t.examplePrompts;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onGenerate(prompt);
    }
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
      <form onSubmit={handleSubmit}>
        <label htmlFor="prompt" className="block text-lg font-semibold text-gray-700 mb-2">
          {t.promptLabel}
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t.promptPlaceholder}
          className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-shadow duration-200 resize-none"
          disabled={isLoading}
        />
        <div className="mt-4">
          <p className="text-sm text-gray-500 mb-2">{t.inspiration}</p>
          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleExampleClick(p)}
                className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm hover:bg-amber-200 transition-colors"
                disabled={isLoading}
              >
                {p}
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
      </form>
    </div>
  );
};