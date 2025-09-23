import React, { useState, useRef } from 'react';
import type { Story } from '../types';
import { StoryPage as StoryPageComponent } from './StoryPage';
import { ArrowLeftIcon, ArrowRightIcon, DownloadIcon, RefreshIcon, ArchiveIcon, LayoutIcon, VideoIcon } from './icons';
import { translations } from '../i18n';
import type { Language } from '../types';

declare const jspdf: any;
declare const html2canvas: any;
declare const JSZip: any;

interface StorybookViewerProps {
  story: Story;
  onReset: () => void;
  language: Language;
}

export const StorybookViewer: React.FC<StorybookViewerProps> = ({ story, onReset, language }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isPackaging, setIsPackaging] = useState(false);
  const [isOverlayLayout, setIsOverlayLayout] = useState(false);
  const [isCreatingVideo, setIsCreatingVideo] = useState(false);
  const pagesRef = useRef<(HTMLDivElement | null)[]>([]);

  const t = translations[language];
  const totalPages = story.pages.length;

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
  };

  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  const handleCreateVideo = async () => {
      setIsCreatingVideo(true);
  
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
  
      if (!ctx) {
          console.error("Could not get canvas context");
          setIsCreatingVideo(false);
          return;
      }
  
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];
  
      recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
              chunks.push(e.data);
          }
      };
  
      recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          document.body.appendChild(a);
          a.style.display = 'none';
          a.href = url;
          a.download = `${story.title.replace(/\s/g, '_')}.webm`;
          a.click();
          URL.revokeObjectURL(url);
          document.body.removeChild(a);
          setIsCreatingVideo(false);
      };
  
      recorder.start();
  
      const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = (err) => reject(err);
          img.src = src;
      });
  
      const wrapText = (context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
          const words = text.split(' ');
          let line = '';
          const lines = [];
  
          for (let n = 0; n < words.length; n++) {
              const testLine = line + words[n] + ' ';
              const metrics = context.measureText(testLine);
              const testWidth = metrics.width;
              if (testWidth > maxWidth && n > 0) {
                  lines.push(line);
                  line = words[n] + ' ';
              } else {
                  line = testLine;
              }
          }
          lines.push(line);
  
          const totalTextHeight = lines.length * lineHeight;
          let currentY = y - (totalTextHeight / 2) + (lineHeight / 2);
  
          for (const item of lines) {
              context.fillText(item.trim(), x, currentY);
              currentY += lineHeight;
          }
      };
  
      for (const page of story.pages) {
          if (!page.imageUrl) continue;
  
          try {
              const img = await loadImage(page.imageUrl);
              const duration = Math.max(4000, page.storyText.length * 100);
              const startTime = Date.now();
  
              while (Date.now() - startTime < duration) {
                  ctx.fillStyle = 'white';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
                  const hRatio = canvas.width / img.width;
                  const vRatio = canvas.height / img.height;
                  const ratio = Math.min(hRatio, vRatio);
                  const centerShiftX = (canvas.width - img.width * ratio) / 2;
                  const centerShiftY = (canvas.height - img.height * ratio) / 2;
                  ctx.drawImage(img, 0, 0, img.width, img.height, centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);
  
                  const subtitleBarHeight = canvas.height * 0.25;
                  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                  ctx.fillRect(0, canvas.height - subtitleBarHeight, canvas.width, subtitleBarHeight);
  
                  ctx.fillStyle = 'white';
                  ctx.font = '24px sans-serif';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  
                  const textY = canvas.height - (subtitleBarHeight / 2);
                  wrapText(ctx, page.storyText, canvas.width / 2, textY, canvas.width * 0.9, 30);
  
                  await new Promise(resolve => setTimeout(resolve, 1000 / 30)); 
              }
          } catch (error) {
              console.error("Failed to process page for video:", page.pageNumber, error);
          }
      }
  
      recorder.stop();
  };


  const handleExportPDF = async () => {
    if (!pagesRef.current[0]) return;
    setIsExporting(true);

    const { jsPDF } = jspdf;
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < totalPages; i++) {
        const pageElement = pagesRef.current[i];
        if (pageElement) {
            const canvas = await html2canvas(pageElement, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
            });
            const imgData = canvas.toDataURL('image/png');

            const imgProps = pdf.getImageProperties(imgData);
            const aspectRatio = imgProps.width / imgProps.height;
            let imgWidth = pdfWidth;
            let imgHeight = pdfWidth / aspectRatio;

            if (imgHeight > pdfHeight) {
                imgHeight = pdfHeight;
                imgWidth = pdfHeight * aspectRatio;
            }

            const x = (pdfWidth - imgWidth) / 2;
            const y = (pdfHeight - imgHeight) / 2;

            if (i > 0) {
                pdf.addPage();
            }
            pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
        }
    }

    pdf.save(`${story.title.replace(/\s/g, '_')}.pdf`);
    setIsExporting(false);
  };

  const handleExportPackage = async () => {
    setIsPackaging(true);
    const zip = new JSZip();

    // Add story text
    const storyTextContent = `${story.title}\n\n${story.pages.map(p => `Page ${p.pageNumber}\n${p.storyText}`).join('\n\n')}`;
    zip.file('story.txt', storyTextContent);

    // Add images
    const imgFolder = zip.folder('images');
    if (imgFolder) {
        for (const page of story.pages) {
            if (page.imageUrl) {
                const base64Data = page.imageUrl.split(',')[1];
                imgFolder.file(`page_${page.pageNumber}.jpeg`, base64Data, { base64: true });
            }
        }
    }

    // Generate and download zip
    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${story.title.replace(/\s/g, '_')}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    setIsPackaging(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
       <div className="relative p-6 bg-white rounded-2xl shadow-2xl border border-gray-200" style={{ perspective: '2000px' }}>
         <h2 className="text-center text-3xl font-bold mb-4 text-gray-800">{story.title}</h2>
         <div className="relative aspect-[4/3] w-full overflow-hidden">
            {story.pages.map((page, index) => (
                <div
                    key={page.pageNumber}
                    ref={el => { pagesRef.current[index] = el; }}
                    className="absolute top-0 left-0 w-full h-full transition-opacity duration-500 ease-in-out"
                    style={{ opacity: index === currentPage ? 1 : 0, zIndex: index === currentPage ? 10 : 1 }}
                >
                    <StoryPageComponent page={page} isOverlayLayout={isOverlayLayout} />
                </div>
            ))}
         </div>
         
         <div className="flex justify-between items-center mt-4">
           <button 
             onClick={goToPrevPage} 
             disabled={currentPage === 0}
             className="p-2 rounded-full bg-amber-100 hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
             aria-label="Previous Page"
            >
             <ArrowLeftIcon className="h-6 w-6 text-amber-700" />
           </button>
           <span className="text-gray-600 font-medium">
             {language === 'zh'
              ? `第 ${currentPage + 1} ${t.of} ${totalPages} 页`
              : `${t.page} ${currentPage + 1} ${t.of} ${totalPages}`}
           </span>
           <button 
             onClick={goToNextPage} 
             disabled={currentPage === totalPages - 1}
             className="p-2 rounded-full bg-amber-100 hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
             aria-label="Next Page"
            >
             <ArrowRightIcon className="h-6 w-6 text-amber-700" />
           </button>
         </div>
       </div>

       <div className="flex flex-wrap flex-col sm:flex-row items-center justify-center gap-4 mt-8">
        <button
          onClick={() => setIsOverlayLayout(!isOverlayLayout)}
          disabled={isExporting || isPackaging || isCreatingVideo}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-purple-700 transition-all duration-300 transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
        >
          <LayoutIcon className="h-5 w-5" />
          {isOverlayLayout ? t.standardLayout : t.arrangeLayout}
        </button>
        <button
          onClick={handleCreateVideo}
          disabled={isCreatingVideo || isExporting || isPackaging}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-red-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700 transition-all duration-300 transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
        >
          <VideoIcon className="h-5 w-5" />
          {isCreatingVideo ? t.creatingVideo : t.createVideo}
        </button>
        <button
          onClick={handleExportPDF}
          disabled={isExporting || isPackaging || isCreatingVideo}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-all duration-300 transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
        >
          <DownloadIcon className="h-5 w-5" />
          {isExporting ? t.exportingPdf : t.exportPdf}
        </button>
        <button
          onClick={handleExportPackage}
          disabled={isPackaging || isExporting || isCreatingVideo}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
        >
          <ArchiveIcon className="h-5 w-5" />
          {isPackaging ? t.exportingPackage : t.exportPackage}
        </button>
        <button
          onClick={onReset}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700 transition-all duration-300 transform hover:scale-105 shadow-md"
        >
          <RefreshIcon className="h-5 w-5" />
          {t.createNewStory}
        </button>
       </div>
    </div>
  );
};
