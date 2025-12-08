
import React, { useState } from 'react';
import Character, { GeneratedImage, AspectRatio } from './types';
import { fileToBase64, downloadImage, getFormattedDate } from './utils/fileUtils';
import { generateImage, generateItemSwap, generateFaceSwap, removeImageBackground } from './services/geminiService';

// --- Helper & Icon Components (defined outside main component) ---

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

const PreviewIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
    </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

interface AspectRatioSelectorProps {
  aspectRatio: AspectRatio;
  setAspectRatio: (ratio: AspectRatio) => void;
  customRatio: { width: number; height: number };
  setCustomRatio: (ratio: { width: number; height: number }) => void;
}

const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({ 
  aspectRatio, 
  setAspectRatio, 
  customRatio, 
  setCustomRatio 
}) => (
  <div className="mb-4">
    <h2 className="text-xl font-semibold mb-3">Ratio</h2>
    <select
      value={aspectRatio}
      onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
      className="w-full p-2 bg-base-300 rounded border border-base-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
    >
      <option>1:1</option>
      <option>16:9</option>
      <option>9:16</option>
      <option>4:3</option>
      <option>Custom</option>
    </select>
    {aspectRatio === 'Custom' && (
      <div className="flex items-center space-x-2 mt-2">
        <input 
          type="number" 
          value={customRatio.width} 
          onChange={e => setCustomRatio({...customRatio, width: parseInt(e.target.value) || 1})} 
          className="w-full p-2 bg-base-300 rounded" 
        />
        <span className="font-bold">:</span>
        <input 
          type="number" 
          value={customRatio.height} 
          onChange={e => setCustomRatio({...customRatio, height: parseInt(e.target.value) || 1})} 
          className="w-full p-2 bg-base-300 rounded" 
        />
      </div>
    )}
  </div>
);

interface ImageCountSelectorProps {
  count: number;
  setCount: (count: number) => void;
}

const ImageCountSelector: React.FC<ImageCountSelectorProps> = ({ count, setCount }) => (
  <div className="mb-4">
    <h2 className="text-xl font-semibold mb-3">Number of Images</h2>
    <div className="flex space-x-2">
      {[1, 2, 3, 4].map((num) => (
        <button
          key={num}
          onClick={() => setCount(num)}
          className={`flex-1 py-2 rounded-lg font-bold border ${
            count === num 
              ? 'bg-brand-primary border-brand-primary text-white' 
              : 'bg-base-300 border-base-300 text-gray-400 hover:border-gray-500'
          }`}
        >
          {num}
        </button>
      ))}
    </div>
  </div>
);

interface CharacterSlotProps {
  character: Character;
  onUpdate: (character: Character) => void;
}

const CharacterSlot: React.FC<CharacterSlotProps> = ({ character, onUpdate }) => {
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const { base64, mimeType } = await fileToBase64(file);
      onUpdate({ ...character, image: base64, mimeType });
    }
  };

  return (
    <div className="bg-base-300 p-4 rounded-lg flex items-center space-x-4">
      <input
        type="checkbox"
        className="form-checkbox h-5 w-5 text-brand-primary bg-base-100 border-base-content rounded focus:ring-brand-secondary"
        checked={character.selected}
        onChange={(e) => onUpdate({ ...character, selected: e.target.checked })}
      />
      <div className="flex-1 min-w-0">
        <input
          type="text"
          value={character.name}
          onChange={(e) => onUpdate({ ...character, name: e.target.value })}
          className="w-full bg-base-100 text-base-content font-semibold p-1 rounded border border-transparent focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />
      </div>
      <label className="cursor-pointer relative group">
        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
        {character.image ? (
          <img src={`data:${character.mimeType};base64,${character.image}`} alt={character.name} className="w-16 h-16 object-cover rounded-md border-2 border-base-200" />
        ) : (
          <div className="w-16 h-16 bg-base-200 rounded-md flex items-center justify-center text-gray-400 hover:bg-brand-primary/20 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </div>
        )}
      </label>
    </div>
  );
};

interface SingleImageUploadProps {
  label: string;
  image: { base64: string; mimeType: string } | null;
  onUpload: (data: { base64: string; mimeType: string } | null) => void;
}

const SingleImageUpload: React.FC<SingleImageUploadProps> = ({ label, image, onUpload }) => {
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const { base64, mimeType } = await fileToBase64(file);
            onUpload({ base64, mimeType });
        }
    };

    return (
        <div className="bg-base-300 p-4 rounded-lg">
            <label className="block text-sm font-medium mb-2 text-gray-300">{label}</label>
            <div className="flex items-center space-x-4">
                <label className="cursor-pointer flex-1 h-32 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center hover:border-brand-primary hover:bg-brand-primary/10 transition-all relative overflow-hidden">
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    {image ? (
                        <img src={`data:${image.mimeType};base64,${image.base64}`} alt={label} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                        <div className="text-center p-2">
                            <UploadIcon />
                            <span className="text-sm text-gray-400">Click to upload</span>
                        </div>
                    )}
                </label>
                {image && (
                    <button 
                        onClick={() => onUpload(null)}
                        className="p-2 bg-base-100 text-gray-400 hover:text-red-500 rounded-full transition-colors"
                        title="Remove image"
                    >
                        <TrashIcon />
                    </button>
                )}
            </div>
        </div>
    );
};

const SkeletonCard = () => (
    <div className="relative bg-base-200 rounded-lg overflow-hidden shadow-lg aspect-square animate-pulse border border-base-300">
        <div className="absolute inset-0 flex items-center justify-center bg-base-300/50">
            <svg className="w-12 h-12 text-base-content/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        </div>
        <div className="absolute bottom-4 left-4 right-4 h-4 bg-base-content/10 rounded"></div>
    </div>
);

interface ImageCardProps {
    image: GeneratedImage;
    index: number;
    onPreview: (base64: string) => void;
    onDelete: (id: number) => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ image, index, onPreview, onDelete }) => {
    const filename = `${String(index + 1).padStart(3, '0')}_${getFormattedDate()}.png`;

    return (
        <div className="relative group bg-base-200 rounded-lg overflow-hidden shadow-lg aspect-auto">
            <img src={`data:image/png;base64,${image.base64}`} alt={image.prompt} className="w-full h-full object-cover block" />
            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center space-y-4 p-4">
                <p className="text-white text-xs text-center line-clamp-3 font-medium px-2">{image.prompt}</p>
                <div className="flex space-x-3">
                    <button onClick={() => onPreview(image.base64)} className="p-3 bg-white/20 rounded-full text-white hover:bg-white/30 transition-colors backdrop-blur-sm shadow-md" title="Preview">
                        <PreviewIcon />
                    </button>
                    <button onClick={() => downloadImage(image.base64, filename)} className="p-3 bg-white/20 rounded-full text-white hover:bg-white/30 transition-colors backdrop-blur-sm shadow-md" title="Download">
                        <DownloadIcon />
                    </button>
                    <button onClick={() => onDelete(image.id)} className="p-3 bg-red-500/20 hover:bg-red-500/80 rounded-full text-white transition-colors backdrop-blur-sm shadow-md" title="Delete">
                        <TrashIcon />
                    </button>
                </div>
            </div>
        </div>
    );
};

interface ModalProps {
    imageUrl: string | null;
    onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ imageUrl, onClose }) => {
    if (!imageUrl) return null;

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="relative max-w-5xl max-h-full" onClick={(e) => e.stopPropagation()}>
                <img src={`data:image/png;base64,${imageUrl}`} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
                <button onClick={onClose} className="absolute -top-4 -right-4 bg-base-100 hover:bg-base-200 text-white rounded-full h-10 w-10 flex items-center justify-center text-2xl shadow-lg transition-colors">&times;</button>
            </div>
        </div>
    );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'story' | 'swapper' | 'faceswap' | 'bgremover'>('story');
  
  // Shared State
  const [numberOfImages, setNumberOfImages] = useState<number>(1);

  // Story Mode State
  const [characters, setCharacters] = useState<Character[]>([
    { id: 1, name: 'Character 1', image: null, mimeType: null, selected: false },
    { id: 2, name: 'Character 2', image: null, mimeType: null, selected: false },
    { id: 3, name: 'Character 3', image: null, mimeType: null, selected: false },
    { id: 4, name: 'Character 4', image: null, mimeType: null, selected: false },
  ]);
  const [imageStyle, setImageStyle] = useState('Default');
  
  const [storyAspectRatio, setStoryAspectRatio] = useState<AspectRatio>('1:1');
  const [storyCustomRatio, setStoryCustomRatio] = useState({ width: 1, height: 1 });
  
  const [prompts, setPrompts] = useState('');
  const [generatedStoryImages, setGeneratedStoryImages] = useState<GeneratedImage[]>([]);
  
  // Swapper Mode State
  const [baseImage, setBaseImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [itemImage, setItemImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [swapPrompt, setSwapPrompt] = useState('Put the item on the person');
  const [swapAspectRatio, setSwapAspectRatio] = useState<AspectRatio>('1:1');
  const [swapCustomRatio, setSwapCustomRatio] = useState({ width: 1, height: 1 });
  const [generatedSwapImages, setGeneratedSwapImages] = useState<GeneratedImage[]>([]);

  // Face Swap Mode State
  const [faceTargetImage, setFaceTargetImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [faceSourceImage, setFaceSourceImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [faceAspectRatio, setFaceAspectRatio] = useState<AspectRatio>('1:1');
  const [faceCustomRatio, setFaceCustomRatio] = useState({ width: 1, height: 1 });
  const [generatedFaceSwapImages, setGeneratedFaceSwapImages] = useState<GeneratedImage[]>([]);

  // Background Remover State
  const [bgRemoveInputImage, setBgRemoveInputImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [generatedBgRemoveImages, setGeneratedBgRemoveImages] = useState<GeneratedImage[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);

  const handleCharacterUpdate = (updatedCharacter: Character) => {
    setCharacters(
      characters.map((c) => (c.id === updatedCharacter.id ? updatedCharacter : c))
    );
  };

  const getRatioString = (ratio: AspectRatio, custom: { width: number; height: number }) => {
    if (ratio === 'Custom') {
        return `${custom.width}:${custom.height}`;
    }
    return ratio;
  };
  
  const handleGenerateStory = async () => {
    const parsedPrompts = prompts.split(/[\n,]/).map(p => p.trim()).filter(p => p.length > 0);
    if (parsedPrompts.length === 0) {
      alert('Please enter at least one prompt.');
      return;
    }
    const selectedCharacters = characters.filter(c => c.selected && c.image);
    if (selectedCharacters.length === 0) {
      alert('Please upload and select at least one character reference image.');
      return;
    }

    setIsLoading(true);
    const currentRatio = getRatioString(storyAspectRatio, storyCustomRatio);

    const generationTasks: Promise<GeneratedImage | null>[] = [];

    parsedPrompts.forEach((prompt, pIndex) => {
        for (let i = 0; i < numberOfImages; i++) {
            const task = generateImage(prompt, selectedCharacters, currentRatio, imageStyle)
                .then(base64 => ({ 
                    id: Date.now() + Math.random(),
                    prompt: numberOfImages > 1 ? `${prompt} (v${i+1})` : prompt, 
                    base64 
                }))
                .catch(err => {
                    console.error(`Failed to generate image for prompt: "${prompt}"`, err);
                    return null;
                });
            generationTasks.push(task);
        }
    });

    const results = await Promise.all(generationTasks);
    const successfulImages = results.filter(r => r !== null) as GeneratedImage[];
    setGeneratedStoryImages(prev => [...successfulImages, ...prev]);
    
    setIsLoading(false);
  };

  const handleGenerateSwap = async () => {
      if (!baseImage || !itemImage) {
          alert('Please upload both a base image and an item image.');
          return;
      }
      if (!swapPrompt.trim()) {
          alert('Please enter a prompt for the swap.');
          return;
      }

      setIsLoading(true);
      const currentRatio = getRatioString(swapAspectRatio, swapCustomRatio);
      
      const generationTasks: Promise<GeneratedImage | null>[] = [];

      for (let i = 0; i < numberOfImages; i++) {
          const task = generateItemSwap(swapPrompt, baseImage, itemImage, currentRatio)
            .then(base64 => ({
                id: Date.now() + Math.random(),
                prompt: numberOfImages > 1 ? `${swapPrompt} (v${i+1})` : swapPrompt,
                base64
            }))
            .catch(err => {
                console.error(err);
                return null;
            });
          generationTasks.push(task);
      }
      
      const results = await Promise.all(generationTasks);
      const successfulImages = results.filter(r => r !== null) as GeneratedImage[];
      
      if (successfulImages.length === 0 && results.length > 0) {
           alert('Failed to generate swap image.');
      }

      setGeneratedSwapImages(prev => [...successfulImages, ...prev]);
      setIsLoading(false);
  };

  const handleGenerateFaceSwap = async () => {
    if (!faceTargetImage || !faceSourceImage) {
        alert('Please upload both a target image and a face source image.');
        return;
    }

    setIsLoading(true);
    const currentRatio = getRatioString(faceAspectRatio, faceCustomRatio);

    const generationTasks: Promise<GeneratedImage | null>[] = [];

    for (let i = 0; i < numberOfImages; i++) {
        const task = generateFaceSwap(faceTargetImage, faceSourceImage, currentRatio)
            .then(base64 => ({
                id: Date.now() + Math.random(),
                prompt: numberOfImages > 1 ? `Face Swap (v${i+1})` : 'Face Swap',
                base64
            }))
            .catch(err => {
                console.error(err);
                return null;
            });
        generationTasks.push(task);
    }

    const results = await Promise.all(generationTasks);
    const successfulImages = results.filter(r => r !== null) as GeneratedImage[];

    if (successfulImages.length === 0 && results.length > 0) {
        alert('Failed to generate face swap image.');
    }

    setGeneratedFaceSwapImages(prev => [...successfulImages, ...prev]);
    setIsLoading(false);
  };

  const handleRemoveBackground = async () => {
    if (!bgRemoveInputImage) {
        alert('Please upload an image to remove the background from.');
        return;
    }

    setIsLoading(true);

    try {
        const resultBase64 = await removeImageBackground(bgRemoveInputImage);
        setGeneratedBgRemoveImages(prev => [{
            id: Date.now(),
            prompt: 'Background Removal',
            base64: resultBase64
        }, ...prev]);
    } catch (err) {
        console.error(err);
        alert('Failed to remove background.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleClearAll = () => {
    if (activeTab === 'story') setGeneratedStoryImages([]);
    else if (activeTab === 'swapper') setGeneratedSwapImages([]);
    else if (activeTab === 'faceswap') setGeneratedFaceSwapImages([]);
    else if (activeTab === 'bgremover') setGeneratedBgRemoveImages([]);
  };

  const handleDeleteImage = (id: number) => {
      if (activeTab === 'story') setGeneratedStoryImages(prev => prev.filter(img => img.id !== id));
      else if (activeTab === 'swapper') setGeneratedSwapImages(prev => prev.filter(img => img.id !== id));
      else if (activeTab === 'faceswap') setGeneratedFaceSwapImages(prev => prev.filter(img => img.id !== id));
      else if (activeTab === 'bgremover') setGeneratedBgRemoveImages(prev => prev.filter(img => img.id !== id));
  };

  const handleDownloadAll = () => {
    let imagesToDownload: GeneratedImage[] = [];
    if (activeTab === 'story') imagesToDownload = generatedStoryImages;
    else if (activeTab === 'swapper') imagesToDownload = generatedSwapImages;
    else if (activeTab === 'faceswap') imagesToDownload = generatedFaceSwapImages;
    else if (activeTab === 'bgremover') imagesToDownload = generatedBgRemoveImages;

    if (imagesToDownload.length === 0) return;
    imagesToDownload.forEach((image, index) => {
        setTimeout(() => {
            const filename = `${String(index + 1).padStart(3, '0')}_${getFormattedDate()}.png`;
            downloadImage(image.base64, filename);
        }, index * 200);
    });
  };

  const displayedImages = (() => {
      switch (activeTab) {
          case 'story': return generatedStoryImages;
          case 'swapper': return generatedSwapImages;
          case 'faceswap': return generatedFaceSwapImages;
          case 'bgremover': return generatedBgRemoveImages;
          default: return [];
      }
  })();

  return (
    <>
      <div className="min-h-screen flex flex-col md:flex-row">
        {/* Left Column - Control Panel */}
        <aside className="w-full md:w-1/3 lg:w-1/4 bg-base-200 flex flex-col border-r border-base-300 min-h-screen">
          
          {/* App Header */}
          <div className="p-6 pb-2">
              <h1 className="text-2xl font-bold text-base-content"><span className="text-[#32CD32]">Monstah</span> GenAI Studio</h1>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex p-4 space-x-2 overflow-x-auto">
            <button 
              onClick={() => setActiveTab('story')}
              className={`flex-1 py-2 px-2 whitespace-nowrap rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === 'story' ? 'bg-brand-primary text-white shadow-lg' : 'bg-base-300 text-gray-400 hover:bg-base-300/80'}`}
            >
              Story
            </button>
            <button 
              onClick={() => setActiveTab('swapper')}
              className={`flex-1 py-2 px-2 whitespace-nowrap rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === 'swapper' ? 'bg-brand-primary text-white shadow-lg' : 'bg-base-300 text-gray-400 hover:bg-base-300/80'}`}
            >
              Item Swapper
            </button>
            <button 
              onClick={() => setActiveTab('faceswap')}
              className={`flex-1 py-2 px-2 whitespace-nowrap rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === 'faceswap' ? 'bg-brand-primary text-white shadow-lg' : 'bg-base-300 text-gray-400 hover:bg-base-300/80'}`}
            >
              Face Swapper
            </button>
            <button 
              onClick={() => setActiveTab('bgremover')}
              className={`flex-1 py-2 px-2 whitespace-nowrap rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === 'bgremover' ? 'bg-brand-primary text-white shadow-lg' : 'bg-base-300 text-gray-400 hover:bg-base-300/80'}`}
            >
              BG Remover
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* STORY MODE CONTROLS */}
            {activeTab === 'story' && (
                <>
                    <div>
                        <h2 className="text-xl font-semibold mb-3">1. Characters</h2>
                        <div className="space-y-3">
                        {characters.map((char) => (
                            <CharacterSlot key={char.id} character={char} onUpdate={handleCharacterUpdate} />
                        ))}
                        </div>
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold mb-3">2. Style</h2>
                        <select
                        value={imageStyle}
                        onChange={(e) => setImageStyle(e.target.value)}
                        className="w-full p-2 bg-base-300 rounded border border-base-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        >
                        <option>Default</option>
                        <option>Cyberpunk</option>
                        <option>Anime</option>
                        <option>Watercolor Painting</option>
                        <option>Cinematic</option>
                        <option>Glitch Art</option>
                        <option>Pop Surrealism</option>
                        <option>Art Deco Revival</option>
                        <option>Abstract Data Art</option>
                        <option>Kinetic Art</option>
                        <option>ASCII Art Overlay</option>
                        <option>Synesthesia Art</option>
                        <option>Sumi-e Art</option>
                        <option>Low Poly 3D</option>
                        </select>
                    </div>

                    <AspectRatioSelector 
                        aspectRatio={storyAspectRatio} 
                        setAspectRatio={setStoryAspectRatio} 
                        customRatio={storyCustomRatio} 
                        setCustomRatio={setStoryCustomRatio} 
                    />

                    <ImageCountSelector count={numberOfImages} setCount={setNumberOfImages} />

                    <div>
                        <h2 className="text-xl font-semibold mb-3">4. Prompts</h2>
                        <p className="text-xs text-gray-400 mb-2">One prompt per line.</p>
                        <textarea
                        value={prompts}
                        onChange={(e) => setPrompts(e.target.value)}
                        placeholder={`Character 1 running...\nCharacter 2 eating...`}
                        rows={6}
                        className="w-full p-3 bg-base-300 text-base-content rounded border border-base-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                    </div>

                    <button
                        onClick={handleGenerateStory}
                        disabled={isLoading}
                        className="w-full bg-brand-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-brand-secondary transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating...
                        </>
                        ) : (
                        'Generate Story'
                        )}
                    </button>
                </>
            )}

            {/* SWAPPER MODE CONTROLS */}
            {activeTab === 'swapper' && (
                <>
                    <div>
                        <h2 className="text-xl font-semibold mb-3">1. Base Image</h2>
                        <SingleImageUpload 
                            label="Person/Target"
                            image={baseImage}
                            onUpload={setBaseImage}
                        />
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold mb-3">2. Item Image</h2>
                        <SingleImageUpload 
                            label="Item/Clothing"
                            image={itemImage}
                            onUpload={setItemImage}
                        />
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold mb-3">3. Instructions</h2>
                        <textarea
                            value={swapPrompt}
                            onChange={(e) => setSwapPrompt(e.target.value)}
                            placeholder="Put the item on the person..."
                            rows={4}
                            className="w-full p-3 bg-base-300 text-base-content rounded border border-base-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                    </div>

                    <AspectRatioSelector 
                        aspectRatio={swapAspectRatio} 
                        setAspectRatio={setSwapAspectRatio} 
                        customRatio={swapCustomRatio} 
                        setCustomRatio={setSwapCustomRatio} 
                    />

                    <ImageCountSelector count={numberOfImages} setCount={setNumberOfImages} />

                    <button
                        onClick={handleGenerateSwap}
                        disabled={isLoading || !baseImage || !itemImage}
                        className="w-full bg-brand-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-brand-secondary transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Swapping...
                        </>
                        ) : (
                        'Swap Item'
                        )}
                    </button>
                </>
            )}

            {/* FACE SWAP MODE CONTROLS */}
            {activeTab === 'faceswap' && (
                <>
                    <div>
                        <h2 className="text-xl font-semibold mb-3">1. Target Image</h2>
                        <SingleImageUpload 
                            label="Body/Scene"
                            image={faceTargetImage}
                            onUpload={setFaceTargetImage}
                        />
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold mb-3">2. Source Face</h2>
                        <SingleImageUpload 
                            label="Face to Use"
                            image={faceSourceImage}
                            onUpload={setFaceSourceImage}
                        />
                    </div>

                    <div className="bg-base-300 p-3 rounded-lg text-sm text-gray-400 italic">
                        The face from Image 2 will be applied to the person in Image 1.
                    </div>

                    <AspectRatioSelector 
                        aspectRatio={faceAspectRatio} 
                        setAspectRatio={setFaceAspectRatio} 
                        customRatio={faceCustomRatio} 
                        setCustomRatio={setFaceCustomRatio} 
                    />

                    <ImageCountSelector count={numberOfImages} setCount={setNumberOfImages} />

                    <button
                        onClick={handleGenerateFaceSwap}
                        disabled={isLoading || !faceTargetImage || !faceSourceImage}
                        className="w-full bg-brand-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-brand-secondary transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Swapping Faces...
                        </>
                        ) : (
                        'Swap Face'
                        )}
                    </button>
                </>
            )}

            {/* BACKGROUND REMOVER CONTROLS */}
            {activeTab === 'bgremover' && (
                <>
                    <div>
                        <h2 className="text-xl font-semibold mb-3">1. Upload Image</h2>
                        <SingleImageUpload 
                            label="Image to Process"
                            image={bgRemoveInputImage}
                            onUpload={setBgRemoveInputImage}
                        />
                    </div>

                    <div className="bg-base-300 p-3 rounded-lg text-sm text-gray-400 italic">
                        The background will be removed or made white, keeping the subject intact.
                    </div>

                    <button
                        onClick={handleRemoveBackground}
                        disabled={isLoading || !bgRemoveInputImage}
                        className="w-full bg-brand-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-brand-secondary transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Removing Background...
                        </>
                        ) : (
                        'Remove Background'
                        )}
                    </button>
                </>
            )}

          </div>
        </aside>

        {/* Right Column - Results Display */}
        <main className="w-full md:w-2/3 lg:w-3/4 p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
                {activeTab === 'story' ? 'Story Results' : 
                 activeTab === 'swapper' ? 'Item Swap Results' : 
                 activeTab === 'faceswap' ? 'Face Swap Results' :
                 'Background Remover Results'}
            </h2>
            <div className="flex items-center space-x-2">
                {displayedImages.length > 0 && (
                    <>
                    <button 
                        onClick={handleClearAll}
                        className="bg-red-900/30 hover:bg-red-900/50 text-red-200 font-semibold py-2 px-4 rounded-lg flex items-center transition-colors"
                    >
                        <TrashIcon />
                        <span className="ml-2">Clear All</span>
                    </button>
                    <button
                        onClick={handleDownloadAll}
                        className="bg-base-300 hover:bg-base-200 text-base-content font-semibold py-2 px-4 rounded-lg flex items-center transition-colors"
                    >
                        <DownloadIcon />
                        <span className="ml-2">Download All</span>
                    </button>
                    </>
                )}
            </div>
          </div>

          {!isLoading && displayedImages.length === 0 && (
            <div className="flex items-center justify-center h-64 text-center border-2 border-dashed border-base-300 rounded-lg">
                <div className="text-gray-500">
                    <h3 className="text-xl font-semibold">No images yet.</h3>
                    <p>
                        {activeTab === 'story' && 'Upload characters and enter prompts to start.'}
                        {activeTab === 'swapper' && 'Upload a base image and an item to start swapping.'}
                        {activeTab === 'faceswap' && 'Upload a target body and a source face to start.'}
                        {activeTab === 'bgremover' && 'Upload an image to remove its background.'}
                    </p>
                </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {isLoading && Array.from({ length: numberOfImages }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
            {displayedImages.map((image, index) => (
              <ImageCard 
                key={image.id} 
                image={image} 
                index={index} 
                onPreview={setModalImage} 
                onDelete={handleDeleteImage}
              />
            ))}
          </div>
        </main>
      </div>
      <Modal imageUrl={modalImage} onClose={() => setModalImage(null)} />
    </>
  );
};

export default App;
```