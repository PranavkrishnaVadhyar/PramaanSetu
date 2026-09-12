import React, { useState, useMemo } from 'react';
import { useScanHistory } from '../hooks/useScanHistory';
import { ScanSearchBar } from '../components/history/ScanSearchBar';
import { ScanHistoryTable } from '../components/history/ScanHistoryTable';
import { Download, FileSpreadsheet } from 'lucide-react';

export const History: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocType, setSelectedDocType] = useState('all');
  const [selectedBand, setSelectedBand] = useState('all');

  const { data: scans = [], isLoading } = useScanHistory({
    q: searchQuery,
    document_type: selectedDocType,
  });

  const filteredScans = useMemo(() => {
    let result = [...scans];
    if (selectedBand !== 'all') {
      result = result.filter((s) => s.risk_band === selectedBand);
    }
    return result;
  }, [scans, selectedBand]);

  const handleReset = () => {
    setSearchQuery('');
    setSelectedDocType('all');
    setSelectedBand('all');
  };

  const handleExportCSV = () => {
    const headers = ['Scan ID', 'Document Type', 'Subject Name', 'Created At', 'Risk Score', 'Risk Band'];
    const rows = filteredScans.map((s) => [
      s.scan_id,
      s.document_type,
      `"${s.name}"`,
      s.created_at,
      s.risk_score,
      s.risk_band,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pramaansetu_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-text-primary tracking-tight">
            Screening Audit Register
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Complete database of identity document screenings, algorithmic verdicts, and officer dispositions
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          disabled={filteredScans.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-primary bg-surface hover:bg-stone-50 border border-border rounded-control transition-colors disabled:opacity-50"
        >
          <Download size={14} className="text-stone-500" />
          <span>Export Audit Log (CSV)</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <ScanSearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedDocType={selectedDocType}
        onDocTypeChange={setSelectedDocType}
        selectedBand={selectedBand}
        onBandChange={setSelectedBand}
        onReset={handleReset}
      />

      {/* Results Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-text-secondary px-1">
          <span>
            Showing <strong className="text-text-primary">{filteredScans.length}</strong> screening events
          </span>
        </div>

        <ScanHistoryTable scans={filteredScans} isLoading={isLoading} />
      </div>
    </div>
  );
};
