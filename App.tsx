import React, { useState, useEffect } from 'react';
import { PromptForm } from './components/PromptForm';
import { StorybookViewer } from './components/StorybookViewer';
import { Loader } from './components/Loader';
import { generateStoryAndImages, ApiError } from './services/geminiService';
import type { Story, Language, IllustrationStyle } from './types';
import { LogoIcon } from './components/icons';
import { translations } from './i18n';
import { ApiKeyManager } from './components/ApiKeyManager';

const App: React.FC = () => {
  const [story, setStory] = useState<Story | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('zh');
  const [apiKey, setApiKey] = useState<string | null>(null);

  const t = translations[language];

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  const handleApiKeyChange = (newKey: string) => {
    setApiKey(newKey);
    localStorage.setItem('gemini_api_key', newKey);
  };

  const handleGenerateStory = async (prompt: string, style: IllustrationStyle) => {
    if (!apiKey) {
      setError(t.apiKeyMissingError);
      return;
    }
    setIsLoading(true);
    setError(null);
    setStory(null);

    try {
      await generateStoryAndImages(apiKey, prompt, style, language, (messageKey, current, total) => {
        if (messageKey === 'painting') {
            setLoadingMessage(t.loadingPainting(current!, total!));
        } else {
            setLoadingMessage(t[messageKey as keyof typeof t] as string);
        }
      }, (finalStory) => {
        setStory(finalStory);
      });
    } catch (err) {
      console.error(err);
      if (err instanceof ApiError) {
        setError(t.errors[err.userFriendlyMessageKey]);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t.errors.unknown);
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleReset = () => {
    setStory(null);
    setError(null);
    setIsLoading(false);
  }

  return (
    <div className="min-h-screen bg-amber-50 font-sans text-gray-800 antialiased">
      <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start">
        <ApiKeyManager 
          initialApiKey={apiKey}
          onApiKeyChange={handleApiKeyChange}
          language={language}
        />
        <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm rounded-lg p-1">
          <button 
            onClick={() => setLanguage('en')}
            className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${language === 'en' ? 'bg-amber-500 text-white shadow' : 'text-gray-600 hover:bg-amber-100'}`}
          >
            EN
          </button>
          <button 
            onClick={() => setLanguage('zh')}
            className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${language === 'zh' ? 'bg-amber-500 text-white shadow' : 'text-gray-600 hover:bg-amber-100'}`}
          >
            中文
          </button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 md:py-12 pt-24">
        <div className="text-center mb-8 md:mb-12">
          <div className="flex justify-center items-center gap-4 mb-4">
            <LogoIcon className="h-12 w-12 text-amber-500" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 tracking-tight">
              {t.title}
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t.description}
          </p>
        </div>

        {story ? (
          <StorybookViewer story={story} onReset={handleReset} language={language} />
        ) : isLoading ? (
          <Loader message={loadingMessage} />
        ) : (
          <>
            {!apiKey && (
              <div className="max-w-2xl mx-auto mb-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-r-lg" role="alert">
                <p className="font-bold">{t.apiKeyWarningTitle}</p>
                <p>{t.apiKeyWarningText}</p>
              </div>
            )}
            <PromptForm 
              onGenerate={handleGenerateStory} 
              isLoading={isLoading || !apiKey} 
              language={language}
              apiKey={apiKey}
            />
          </>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center">
            <p className="font-bold">{t.errorTitle}</p>
            <p>{error}</p>
          </div>
        )}
      </main>
      <footer className="text-center py-4 text-sm text-gray-500">
        <p>{t.footer}</p>
      </footer>
    </div>
  );
};

export default App;