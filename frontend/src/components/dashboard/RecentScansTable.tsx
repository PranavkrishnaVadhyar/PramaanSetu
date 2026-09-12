import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanHistoryItem } from '../../api/types';
import { RiskBadge } from '../shared/RiskBadge';
import { formatDocType, formatShortDate, formatScanId } from '../../utils/formatters';
import { FileText, CreditCard, BookOpen, ChevronRight } from 'lucide-react';

interface RecentScansTableProps {
  scans: ScanHistoryItem[];
  isLoading?: boolean;
}

export const RecentScansTable: React.FC<RecentScansTableProps> = ({ scans, isLoading }) => {
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
      <div className="bg-surface rounded-card border border-border p-6 text-center text-xs text-text-secondary">
        Loading recent screening events...
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-card border border-border overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-stone-50/75 border-b border-border text-text-secondary uppercase font-mono text-[10px]">
            <tr>
              <th className="py-2.5 px-4 font-medium">Scan ID</th>
              <th className="py-2.5 px-4 font-medium">Document</th>
              <th className="py-2.5 px-4 font-medium">Subject Name</th>
              <th className="py-2.5 px-4 font-medium">Screened At</th>
              <th className="py-2.5 px-4 font-medium">Risk Verdict</th>
              <th className="py-2.5 px-4 font-medium text-right">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {scans.map((scan) => (
              <tr
                key={scan.scan_id}
                onClick={() => navigate(`/scan/${scan.scan_id}/result`)}
                className="hover:bg-stone-50/80 cursor-pointer transition-colors group"
              >
                <td className="py-3 px-4 font-mono font-medium text-text-primary">
                  {formatScanId(scan.scan_id)}
                </td>
                <td className="py-3 px-4">
                  <div className="inline-flex items-center gap-1.5 font-medium text-text-primary">
                    {getDocIcon(scan.document_type)}
                    <span>{formatDocType(scan.document_type)}</span>
                  </div>
                </td>
                <td className="py-3 px-4 font-medium text-text-primary">
                  {scan.name}
                </td>
                <td className="py-3 px-4 text-text-secondary font-mono text-[11px]">
                  {formatShortDate(scan.created_at)}
                </td>
                <td className="py-3 px-4">
                  <RiskBadge
                    score={scan.risk_score}
                    band={scan.risk_band}
                    size="sm"
                    showScore={true}
                  />
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="inline-flex items-center text-text-secondary group-hover:text-text-primary transition-colors">
                    <ChevronRight size={14} />
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
