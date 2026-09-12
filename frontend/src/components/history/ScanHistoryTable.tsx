import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanHistoryItem } from '../../api/types';
import { RiskBadge } from '../shared/RiskBadge';
import { formatDocType, formatDate, formatScanId } from '../../utils/formatters';
import { FileText, CreditCard, BookOpen, ChevronRight, Inbox } from 'lucide-react';
import { EmptyState } from '../shared/EmptyState';

interface ScanHistoryTableProps {
  scans: ScanHistoryItem[];
  isLoading?: boolean;
}

export const ScanHistoryTable: React.FC<ScanHistoryTableProps> = ({ scans, isLoading }) => {
  const navigate = useNavigate();

  const getDocIcon = (type: string) => {
    switch (type) {
      case 'passport':
        return <BookOpen size={14} className="text-stone-500" />;
      case 'aadhaar':
        return <FileText size={14} className="text-stone-500" />;
      case 'pan':
        return <CreditCard size={14} className="text-stone-500" />;
      default:
        return <FileText size={14} className="text-stone-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-surface rounded-card border border-border p-8 text-center text-xs text-text-secondary">
        Loading historical screening entries...
      </div>
    );
  }

  if (scans.length === 0) {
    return (
      <EmptyState
        title="No matching screening records"
        description="Try adjusting your query string or clearing risk band filters."
      />
    );
  }

  return (
    <div className="bg-surface rounded-card border border-border overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-stone-50/75 border-b border-border text-text-secondary uppercase font-mono text-[10px]">
            <tr>
              <th className="py-3 px-4 font-medium">Scan ID</th>
              <th className="py-3 px-4 font-medium">Document Type</th>
              <th className="py-3 px-4 font-medium">Subject Identity</th>
              <th className="py-3 px-4 font-medium">Screening Timestamp</th>
              <th className="py-3 px-4 font-medium">Risk Assessment</th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {scans.map((scan) => (
              <tr
                key={scan.scan_id}
                onClick={() => navigate(`/scan/${scan.scan_id}/result`)}
                className="hover:bg-stone-50 cursor-pointer transition-colors group"
              >
                <td className="py-3.5 px-4 font-mono font-medium text-text-primary">
                  {formatScanId(scan.scan_id)}
                </td>
                <td className="py-3.5 px-4">
                  <div className="inline-flex items-center gap-1.5 font-medium text-text-primary">
                    {getDocIcon(scan.document_type)}
                    <span>{formatDocType(scan.document_type)}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-medium text-text-primary">
                  {scan.name}
                </td>
                <td className="py-3.5 px-4 text-text-secondary font-mono text-[11px]">
                  {formatDate(scan.created_at)}
                </td>
                <td className="py-3.5 px-4">
                  <RiskBadge
                    score={scan.risk_score}
                    band={scan.risk_band}
                    size="sm"
                    showScore={true}
                  />
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="inline-flex items-center gap-1 text-xs text-text-secondary group-hover:text-text-primary transition-colors">
                    <span>Inspect</span>
                    <ChevronRight size={13} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
