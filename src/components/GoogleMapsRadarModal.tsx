import React, { useState } from 'react';
import { MapPin, Search, Sparkles, ExternalLink, X, Loader2, Compass, Navigation } from 'lucide-react';

interface GroundingChunk {
  maps?: {
    uri?: string;
    title?: string;
    placeAnswerSources?: {
      reviewSnippets?: {
        snippet?: string;
      }[];
    };
  };
  web?: {
    uri?: string;
    title?: string;
  };
}

interface GoogleMapsRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  location?: { lat: number; lng: number };
  locationName?: string;
}

export const GoogleMapsRadarModal: React.FC<GoogleMapsRadarModalProps> = ({
  isOpen,
  onClose,
  location,
  locationName = 'Current Location',
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [groundingChunks, setGroundingChunks] = useState<GroundingChunk[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (queryText?: string) => {
    const query = queryText || prompt;
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);
    setGroundingChunks([]);

    try {
      const lat = location?.lat || -1.286389;
      const lng = location?.lng || 36.817223;

      const res = await fetch('/api/maps/grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query, lat, lng }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch Google Maps data');
      }

      setResponse(data.text);
      setGroundingChunks(data.groundingChunks || []);
    } catch (err: any) {
      console.error('Google Maps grounding error:', err);
      setError(err.message || 'Error querying Google Maps API');
    } finally {
      setLoading(false);
    }
  };

  const presetQueries = [
    { label: '📍 Nearby Landmarks', query: 'Find popular landmarks and major streets around this location' },
    { label: '☕ Food & Cafes', query: 'Recommend top-rated restaurants or coffee shops nearby' },
    { label: '⛽ Gas & Services', query: 'Find open gas stations, mechanics, and driver services nearby' },
    { label: '🏪 Convenience Stores', query: 'Find supermarkets or 24/7 convenience stores nearby' },
  ];

  // Filter out unique maps URIs
  const mapPlaces = groundingChunks.filter((chunk) => chunk.maps?.uri || chunk.web?.uri);

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121215] border border-[#27272A] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#27272A] bg-[#18181B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
              <MapPin className="w-5 h-5 animate-pulse text-red-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Google Maps Grounding
                <span className="text-[10px] uppercase font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                  Gemini AI Powered
                </span>
              </h3>
              <p className="text-xs text-[#A1A1AA] flex items-center gap-1 mt-0.5">
                <Navigation className="w-3 h-3 text-red-400" />
                Grounded near: <span className="text-white font-medium">{locationName}</span>
                {location && (
                  <span className="font-mono text-[10px] text-[#71717A]">
                    ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#A1A1AA] hover:text-white p-2 rounded-lg hover:bg-[#27272A] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Quick Presets */}
          <div>
            <label className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-2">
              Quick Radar Insights
            </label>
            <div className="flex flex-wrap gap-2">
              {presetQueries.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(preset.query);
                    handleSearch(preset.query);
                  }}
                  disabled={loading}
                  className="bg-[#1C1C1F] hover:bg-red-500/10 hover:border-red-500/30 text-[#FAFAFA] text-xs font-medium px-3 py-1.5 rounded-lg border border-[#27272A] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Ask Google Maps (e.g. Find coffee shops or gas stations near here)..."
                className="w-full bg-[#18181B] border border-[#27272A] focus:border-red-500 text-white text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none transition-all placeholder-[#71717A]"
              />
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={loading || !prompt.trim()}
              className="bg-red-600 hover:bg-red-500 text-white font-medium text-sm px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-red-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Search</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Response Container */}
          {response && (
            <div className="space-y-4">
              <div className="p-4 bg-[#18181B] border border-[#27272A] rounded-xl text-sm text-[#E4E4E7] leading-relaxed whitespace-pre-wrap">
                <div className="flex items-center gap-2 text-xs font-semibold text-red-400 mb-2 border-b border-[#27272A] pb-2">
                  <Compass className="w-4 h-4" />
                  Google Maps AI Grounded Overview:
                </div>
                {response}
              </div>

              {/* Grounded Google Maps Links */}
              {mapPlaces.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    Verified Google Maps Links ({mapPlaces.length}):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {mapPlaces.map((chunk, i) => {
                      const uri = chunk.maps?.uri || chunk.web?.uri;
                      const title = chunk.maps?.title || chunk.web?.title || 'Google Maps Location';
                      const snippets = chunk.maps?.placeAnswerSources?.reviewSnippets;

                      if (!uri) return null;

                      return (
                        <a
                          key={i}
                          href={uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] hover:border-red-500/40 rounded-xl transition-all group flex flex-col justify-between gap-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-white group-hover:text-red-400 transition-colors line-clamp-1 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              {title}
                            </span>
                            <ExternalLink className="w-3.5 h-3.5 text-[#71717A] group-hover:text-red-400 shrink-0" />
                          </div>
                          {snippets && snippets.length > 0 && (
                            <p className="text-[11px] text-[#A1A1AA] line-clamp-2 italic">
                              "{snippets[0].snippet}"
                            </p>
                          )}
                          <span className="text-[10px] text-red-400 font-mono flex items-center gap-1 mt-1">
                            Open in Google Maps &rarr;
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
