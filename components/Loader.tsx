
import React from 'react';

interface LoaderProps {
  message: string;
}

export const Loader: React.FC<LoaderProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-lg max-w-md mx-auto">
      <div className="book">
        <div className="book__pg-shadow"></div>
        <div className="book__pg"></div>
        <div className="book__pg book__pg--2"></div>
        <div className="book__pg book__pg--3"></div>
        <div className="book__pg book__pg--4"></div>
        <div className="book__pg book__pg--5"></div>
      </div>
      <p className="mt-6 text-lg font-semibold text-gray-700 animate-pulse">{message}</p>
      <style>{`
        .book {
          --book-width: 100px;
          --book-height: 75px;
          --page-width: calc(var(--book-width) / 2);
          --page-height: calc(var(--book-height) * 0.95);
          --page-y-angle: 10deg;
          --page-z-angle: 0deg;
          --page-duration: 1s;
          position: relative;
          width: var(--book-width);
          height: var(--book-height);
          transform-style: preserve-3d;
          transform: rotateY(var(--page-y-angle)) rotateZ(var(--page-z-angle));
        }

        .book__pg, .book__pg-shadow {
          position: absolute;
          left: var(--page-width);
          width: var(--page-width);
          height: var(--page-height);
          border: 2px solid #a56d3c;
          border-left: 0;
          border-radius: 0 5px 5px 0;
          background: #f3e8d8;
          transform-origin: left center;
          transform-style: preserve-3d;
        }

        .book__pg-shadow {
          background: rgba(0,0,0,0.2);
          animation: page-turn-shadow var(--page-duration) linear infinite;
        }

        .book__pg {
          animation: page-turn var(--page-duration) linear infinite;
        }

        .book__pg--2 { animation-delay: 0.1s; }
        .book__pg--3 { animation-delay: 0.2s; }
        .book__pg--4 { animation-delay: 0.3s; }
        .book__pg--5 { animation-delay: 0.4s; }

        @keyframes page-turn {
          0% { transform: rotateY(0deg); }
          20% { transform: rotateY(-30deg); }
          40% { transform: rotateY(-140deg); }
          60% { transform: rotateY(-160deg); }
          100% { transform: rotateY(-180deg); }
        }
        
        @keyframes page-turn-shadow {
          0% { transform: rotateY(0deg) translateZ(-1px); }
          40% { transform: rotateY(-15deg) translateZ(-1px); }
          100% { transform: rotateY(0deg) translateZ(-1px); }
        }
      `}</style>
    </div>
  );
};
