import { useQuery } from '@tanstack/react-query';
import { getScanHistory } from '../api/client';
import { ScanHistoryItem } from '../api/types';

export interface HistoryFilterParams {
  q?: string;
  document_type?: string;
  from?: string;
  to?: string;
}

export function useScanHistory(params?: HistoryFilterParams) {
  return useQuery<ScanHistoryItem[]>({
    queryKey: ['scanHistory', params?.q, params?.document_type, params?.from, params?.to],
    queryFn: () => getScanHistory(params),
    staleTime: 1000 * 30, // 30 seconds
  });
}
