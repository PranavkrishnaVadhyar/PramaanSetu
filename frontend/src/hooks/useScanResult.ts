import { useQuery } from '@tanstack/react-query';
import { getScanResult } from '../api/client';
import { ScanResultResponse } from '../api/types';

export function useScanResult(scanId: string | undefined) {
  return useQuery<ScanResultResponse>({
    queryKey: ['scanResult', scanId],
    queryFn: () => {
      if (!scanId) throw new Error('Scan ID required');
      return getScanResult(scanId);
    },
    enabled: !!scanId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}
