import React from 'react';
// FIX: Aliased the imported `StoryPage` type to `StoryPageType` to avoid a name collision with the component.
import type { StoryPage as StoryPageType } from '../types';

interface StoryPageProps {
  page: StoryPageType;
  isOverlayLayout: boolean;
}

export const StoryPage: React.FC<StoryPageProps> = ({ page, isOverlayLayout }) => {
  if (isOverlayLayout) {
    return (
      <div className="w-full h-full bg-white rounded-lg overflow-hidden shadow-inner relative">
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          {page.imageUrl ? (
            <img
              src={page.imageUrl}
              alt={`Illustration for page ${page.pageNumber}`}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-500">
              <svg className="animate-spin h-8 w-8 text-amber-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Painting...</span>
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-16 text-center">
          <p className="text-white leading-relaxed text-base md:text-lg drop-shadow-md">{page.storyText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg overflow-hidden shadow-inner">
      <div className="flex-grow bg-gray-100 flex items-center justify-center overflow-hidden">
        {page.imageUrl ? (
          <img
            src={page.imageUrl}
            alt={`Illustration for page ${page.pageNumber}`}
            className="object-contain w-full h-full"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-500">
            <svg className="animate-spin h-8 w-8 text-amber-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Painting...</span>
          </div>
        )}
      </div>
      <div className="p-4 bg-white border-t border-gray-200">
        <p className="text-gray-700 leading-relaxed text-center text-base md:text-lg">{page.storyText}</p>
      </div>
    </div>
  );
};
