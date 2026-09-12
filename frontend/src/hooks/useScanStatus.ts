import { useQuery } from '@tanstack/react-query';
import { getScanStatus } from '../api/client';
import { ScanStatusResponse } from '../api/types';

export function useScanStatus(scanId: string | undefined) {
  return useQuery<ScanStatusResponse>({
    queryKey: ['scanStatus', scanId],
    queryFn: () => {
      if (!scanId) throw new Error('Scan ID required');
      return getScanStatus(scanId);
    },
    enabled: !!scanId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 1000;
      if (data.current_stage === 'done' || data.current_stage === 'failed') {
        return false;
      }
      return 1000;
    },
    refetchIntervalInBackground: true,
  });
}
