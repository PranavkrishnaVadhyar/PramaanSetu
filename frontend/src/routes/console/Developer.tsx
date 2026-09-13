import React, { useState } from 'react';
import { ApiKeyList } from '../../components/developer/ApiKeyList';
import { ScanSearchBar } from '../../components/history/ScanSearchBar';
import { ScanHistoryTable } from '../../components/history/ScanHistoryTable';
import { useScanHistory } from '../../hooks/useScanHistory';

export const Developer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'keys' | 'logs'>('keys');

  // Logs state (reuse from History)
  const [searchQuery, setSearchQuery] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [selectedBand, setSelectedBand] = useState('all');

  const { data: rawLogs, isLoading, error } = useScanHistory({
    q: searchQuery,
    document_type: docTypeFilter,
  });

  const logs = React.useMemo(() => {
    let result = rawLogs || [];
    if (selectedBand !== 'all') {
      result = result.filter((s) => s.risk_band === selectedBand);
    }
    return result;
  }, [rawLogs, selectedBand]);

  const handleReset = () => {
    setSearchQuery('');
    setDocTypeFilter('all');
    setSelectedBand('all');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="border-b border-border">
        <h1 className="text-xl font-semibold text-text-primary tracking-tight">
          Developer Settings
        </h1>
        <p className="text-xs text-text-secondary mt-0.5 pb-4">
          Manage your API credentials and review verification activity.
        </p>

        <div className="flex gap-6 -mb-px">
          <button
            onClick={() => setActiveTab('keys')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'keys'
                ? 'border-stone-900 text-stone-900 dark:border-white dark:text-white'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            API Keys
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'logs'
                ? 'border-stone-900 text-stone-900 dark:border-white dark:text-white'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Usage & Logs
          </button>
        </div>
      </div>

      <div className="pt-2">
        {activeTab === 'keys' ? (
          <ApiKeyList />
        ) : (
          <div className="space-y-4">
            <ScanSearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedDocType={docTypeFilter}
              onDocTypeChange={setDocTypeFilter}
              selectedBand={selectedBand}
              onBandChange={setSelectedBand}
              onReset={handleReset}
            />
            {error ? (
              <div className="p-4 text-center text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-200 dark:border-rose-900/40 text-sm">
                Failed to load API logs. Please try again.
              </div>
            ) : (
              <ScanHistoryTable scans={logs || []} isLoading={isLoading} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
