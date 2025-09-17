import React, { useState, useRef } from 'react';
import type { Story } from '../types';
import { StoryPage as StoryPageComponent } from './StoryPage';
import { ArrowLeftIcon, ArrowRightIcon, DownloadIcon, RefreshIcon, ArchiveIcon } from './icons';
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
  const pagesRef = useRef<(HTMLDivElement | null)[]>([]);

  const t = translations[language];
  const totalPages = story.pages.length;

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
  };

  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
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
                    <StoryPageComponent page={page} />
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

       <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
        <button
          onClick={handleExportPDF}
          disabled={isExporting || isPackaging}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-all duration-300 transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
        >
          <DownloadIcon className="h-5 w-5" />
          {isExporting ? t.exportingPdf : t.exportPdf}
        </button>
        <button
          onClick={handleExportPackage}
          disabled={isPackaging || isExporting}
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