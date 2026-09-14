import React, { useState, useRef } from 'react';
import { Upload, Link2, Sparkles, X, Check, Image as ImageIcon } from 'lucide-react';
import { PRODUCT_IMAGE_PRESETS, ProductImagePreset } from '../data/productImagePresets.js';

interface ImageUploadPickerProps {
  value?: string;
  onChange: (url: string) => void;
  brandHint?: string;
  formHint?: 'DRIED' | 'WET' | 'OTHER';
}

export const ImageUploadPicker: React.FC<ImageUploadPickerProps> = ({
  value,
  onChange,
  brandHint,
  formHint,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'preset' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState(value || '');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter presets based on brand or form if available
  const filteredPresets = PRODUCT_IMAGE_PRESETS.filter((p) => {
    if (formHint && formHint !== 'OTHER' && p.form !== formHint) return false;
    return true;
  });

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size exceeds 5MB limit.');
      return;
    }

    setUploadError('');
    setIsUploading(true);

    try {
      // Read as base64 data URL
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        try {
          // Attempt to upload to server endpoint
          const res = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image: base64Data,
              fileName: file.name,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            onChange(data.url);
          } else {
            // If server upload failed, fallback to base64 data URL
            onChange(base64Data);
          }
        } catch {
          // Fallback directly to base64 data URL
          onChange(base64Data);
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadError('Failed to read image file: ' + err.message);
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
    }
  };

  return (
    <div className="space-y-3">
      {/* Current Preview or Selector */}
      {value ? (
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#FAF8F5] border border-[#EADDCE]">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#D5C7B8] shrink-0 bg-white">
            <img
              src={value}
              alt="Product preview"
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#264653]">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Image Attached</span>
            </div>
            <p className="text-[11px] text-[#7C9082] truncate mt-0.5" title={value}>
              {value.startsWith('data:') ? 'Local Base64 image data' : value}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              onChange('');
              setUrlInput('');
            }}
            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
            title="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Tabs */}
          <div className="flex rounded-xl bg-[#F2ECE4] p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'upload'
                  ? 'bg-white text-[#264653] shadow-xs'
                  : 'text-[#7C9082] hover:text-[#264653]'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Photo</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preset')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'preset'
                  ? 'bg-white text-[#264653] shadow-xs'
                  : 'text-[#7C9082] hover:text-[#264653]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Preset Library</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'url'
                  ? 'bg-white text-[#264653] shadow-xs'
                  : 'text-[#7C9082] hover:text-[#264653]'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Image URL</span>
            </button>
          </div>

          {/* Tab 1: Upload */}
          {activeTab === 'upload' && (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFile(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#D5C7B8] hover:border-[#E76F51] hover:bg-[#FAF8F5] transition-all rounded-2xl p-4 text-center cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-[#FAF1E8] text-[#E76F51] flex items-center justify-center mx-auto mb-2">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-[#264653]">
                  {isUploading ? 'Processing image...' : 'Click to browse or drop product photo here'}
                </p>
                <p className="text-[10px] text-[#7C9082] mt-0.5">
                  Supports PNG, JPG, WebP up to 5MB (Stores in inventory)
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Presets */}
          {activeTab === 'preset' && (
            <div className="space-y-2">
              <p className="text-[11px] text-[#7C9082]">
                Select authentic packaging photos for Royal Canin, Pedigree, Whiskas, Drools, etc.:
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
                {filteredPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onChange(preset.url)}
                    className="group relative rounded-xl overflow-hidden border border-[#EADDCE] hover:border-[#E76F51] bg-white transition-all text-left flex flex-col"
                  >
                    <div className="w-full h-14 bg-[#FAF8F5] overflow-hidden">
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="p-1 text-[9px] font-bold text-[#264653] truncate">
                      {preset.brand}
                    </div>
                    <span
                      className={`absolute top-0.5 right-0.5 px-1 py-0.2 rounded text-[8px] font-black uppercase shadow-xs ${
                        preset.form === 'DRIED'
                          ? 'bg-amber-100 text-amber-800'
                          : preset.form === 'WET'
                          ? 'bg-cyan-100 text-cyan-800'
                          : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {preset.form === 'DRIED' ? 'Dry' : preset.form === 'WET' ? 'Wet' : 'Other'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: URL */}
          {activeTab === 'url' && (
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://example.com/product-image.jpg"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-[#D5C7B8] bg-[#FAF8F5] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleUrlSubmit}
                className="px-3 py-2 text-xs font-bold rounded-xl bg-[#264653] text-white hover:bg-[#1f3842]"
              >
                Apply
              </button>
            </div>
          )}

          {uploadError && (
            <p className="text-xs text-red-600 font-semibold">{uploadError}</p>
          )}
        </div>
      )}
    </div>
  );
};
