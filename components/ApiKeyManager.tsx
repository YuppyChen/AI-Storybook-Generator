import React, { useState, useEffect } from 'react';
import { KeyIcon } from './icons';
import { translations } from '../i18n';
import type { Language } from '../types';

interface ApiKeyManagerProps {
  initialApiKey: string | null;
  onApiKeyChange: (apiKey: string) => void;
  language: Language;
}

export const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ initialApiKey, onApiKeyChange, language }) => {
  const [apiKey, setApiKey] = useState(initialApiKey || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isKeySet, setIsKeySet] = useState(!!initialApiKey);
  const t = translations[language];

  useEffect(() => {
    setIsKeySet(!!initialApiKey);
    setApiKey(initialApiKey || '');
    if (!initialApiKey) {
        setIsEditing(true);
    }
  }, [initialApiKey]);

  const handleSave = () => {
    if (apiKey.trim()) {
      onApiKeyChange(apiKey.trim());
      setIsEditing(false);
      setIsKeySet(true);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsEditing(!isEditing)}
        className={`flex items-center gap-2 p-2 rounded-lg transition-colors text-sm font-semibold
          ${isKeySet ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
      >
        <KeyIcon className="h-5 w-5" />
        <span className="hidden md:inline">{t.apiKey}</span>
      </button>
      {isEditing && (
        <div className="absolute top-full mt-2 left-0 w-64 md:w-80 p-4 bg-white rounded-lg shadow-2xl border border-gray-200 z-50">
          <label htmlFor="api-key-input" className="block text-sm font-bold text-gray-700 mb-2">
            {t.apiKey}
          </label>
          <input
            id="api-key-input"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={t.apiKeyPlaceholder}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-400"
          />
          <button
            onClick={handleSave}
            className="mt-3 w-full bg-amber-500 text-white font-bold py-2 px-4 rounded-md hover:bg-amber-600 transition-colors"
          >
            {t.apiKeySave}
          </button>
        </div>
      )}
    </div>
  );
};