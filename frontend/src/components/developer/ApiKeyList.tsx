import React, { useState, useEffect } from 'react';
import { ApiKey } from '../../api/types';
import * as api from '../../api/client';
import { Key, Trash2, Copy, Check, Plus, AlertTriangle } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export const ApiKeyList: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyEnvironment, setNewKeyEnvironment] = useState<'test' | 'live'>('test');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      const data = await api.getKeys();
      setKeys(data);
    } catch (err) {
      console.error('Failed to load keys', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyLabel.trim()) return;
    
    setIsCreating(true);
    try {
      const key = await api.createKey(newKeyLabel, newKeyEnvironment);
      setNewlyCreatedKey(key.full_value);
      setNewKeyLabel('');
      await loadKeys();
    } catch (err) {
      console.error('Failed to create key', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) return;
    
    try {
      await api.deleteKey(id);
      await loadKeys();
    } catch (err) {
      console.error('Failed to delete key', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-text-secondary">Loading API Keys...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Newly created key alert */}
      {newlyCreatedKey && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Save your API key
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 mb-3">
                Please copy this key and store it securely. For your protection, you won't be able to see it again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 block px-3 py-2 bg-white dark:bg-stone-950 border border-emerald-200 dark:border-emerald-800 rounded-control text-sm font-mono text-emerald-900 dark:text-emerald-100">
                  {newlyCreatedKey}
                </code>
                <button
                  onClick={() => copyToClipboard(newlyCreatedKey)}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-control flex items-center gap-1.5 transition-colors text-sm font-medium"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <button
                onClick={() => setNewlyCreatedKey(null)}
                className="mt-4 text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                I have saved it securely
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create new key form */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Key size={16} className="text-stone-500" />
          Create New API Key
        </h3>
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-text-secondary mb-1">Key Name</label>
            <input
              type="text"
              value={newKeyLabel}
              onChange={(e) => setNewKeyLabel(e.target.value)}
              placeholder="e.g. Production Backend"
              className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 border border-border rounded-control text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-stone-400"
              required
            />
          </div>
          <div className="w-full sm:w-48">
            <label className="block text-xs font-medium text-text-secondary mb-1">Environment</label>
            <select
              value={newKeyEnvironment}
              onChange={(e) => setNewKeyEnvironment(e.target.value as 'test' | 'live')}
              className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 border border-border rounded-control text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-stone-400"
            >
              <option value="test">Test</option>
              <option value="live">Live</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isCreating || !newKeyLabel.trim()}
            className="w-full sm:w-auto px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-medium text-sm rounded-control hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isCreating ? 'Creating...' : <><Plus size={16} /> Create Key</>}
          </button>
        </form>
      </div>

      {/* Keys Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 dark:bg-stone-900 border-b border-border text-xs text-text-secondary uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3 font-mono">Name / Environment</th>
                <th className="px-5 py-3 font-mono">Key</th>
                <th className="px-5 py-3 font-mono">Created</th>
                <th className="px-5 py-3 font-mono">Last Used</th>
                <th className="px-5 py-3 font-mono text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {keys.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-text-secondary text-sm">
                    No API keys found. Create one above to get started.
                  </td>
                </tr>
              ) : (
                keys.map((key) => (
                  <tr key={key.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-text-primary">{key.label}</div>
                      <div className={`text-xs mt-0.5 inline-flex px-1.5 py-0.5 rounded font-mono ${
                        key.environment === 'live' 
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' 
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}>
                        {key.environment.toUpperCase()}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-text-primary">
                      {key.masked_value}
                    </td>
                    <td className="px-5 py-3 text-text-secondary text-xs">
                      {formatDate(key.created_at)}
                    </td>
                    <td className="px-5 py-3 text-text-secondary text-xs">
                      {key.last_used_at ? formatDate(key.last_used_at) : 'Never'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDelete(key.id)}
                        className="text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-1"
                        title="Revoke Key"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
