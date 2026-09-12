import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitScan } from '../api/client';
import { ScanSubmission } from '../api/types';

export function useSubmitScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (submission: ScanSubmission) => submitScan(submission),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] });
    },
  });
}
