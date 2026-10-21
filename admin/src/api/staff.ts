import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiCreate, apiGet, apiRemove, apiUpdate } from '@/lib/apiClient';
import type { StaffCreateInput, StaffMember, StaffUpdateInput } from '@/types/staff';

const KEY = ['staff'];
const BASE = '/admin/auth/staff';

export function useStaff() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiGet<StaffMember[]>(BASE),
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StaffCreateInput) => apiCreate<StaffMember>(BASE, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: StaffUpdateInput }) =>
      apiUpdate<StaffMember>(`${BASE}/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRemove(`${BASE}/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
