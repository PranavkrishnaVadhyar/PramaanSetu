import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { DocumentType } from '../../api/types';

interface ScanSearchBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedDocType: string;
  onDocTypeChange: (type: string) => void;
  selectedBand: string;
  onBandChange: (band: string) => void;
  onReset: () => void;
}

export const ScanSearchBar: React.FC<ScanSearchBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedDocType,
  onDocTypeChange,
  selectedBand,
  onBandChange,
  onReset,
}) => {
  const hasFilters = searchQuery || selectedDocType !== 'all' || selectedBand !== 'all';

  return (
    <div className="bg-surface rounded-card border border-border p-4 shadow-xs space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        {/* Search Query Input */}
        <div className="sm:col-span-6 relative">
          <Search size={14} className="absolute left-3 top-3 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by subject name or scan ID (e.g. Vikram, scn-78103)..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-control border border-border bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900 transition-colors"
          />
        </div>

        {/* Document Type Filter */}
        <div className="sm:col-span-3">
          <select
            value={selectedDocType}
            onChange={(e) => onDocTypeChange(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-control border border-border bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900 text-text-primary"
          >
            <option value="all">All Document Types</option>
            <option value="passport">Passport Only</option>
            <option value="aadhaar">Aadhaar Card Only</option>
            <option value="pan">PAN Card Only</option>
          </select>
        </div>

        {/* Risk Band Filter */}
        <div className="sm:col-span-3">
          <select
            value={selectedBand}
            onChange={(e) => onBandChange(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-control border border-border bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900 text-text-primary"
          >
            <option value="all">All Risk Bands</option>
            <option value="high">High Risk Only</option>
            <option value="medium">Medium Risk Only</option>
            <option value="low">Low Risk (Cleared)</option>
          </select>
        </div>
      </div>

      {hasFilters && (
        <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-text-secondary">
          <span>Active filter constraints applied</span>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 hover:text-text-primary transition-colors text-[11px]"
          >
            <X size={12} />
            <span>Clear Filters</span>
          </button>
        </div>
      )}
    </div>
  );
};
