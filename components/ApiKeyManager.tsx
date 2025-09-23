import React from 'react';

// The ApiKeyManager component has been removed as it violates the project's security
// and architectural guidelines. The API key must be managed exclusively via the
// `process.env.API_KEY` environment variable and should not be handled in the UI.
export const ApiKeyManager: React.FC = () => {
  return null;
};
