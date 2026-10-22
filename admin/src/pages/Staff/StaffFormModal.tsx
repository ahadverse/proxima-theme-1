import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';
import { Switch } from '@/components/ui/Switch';
import { apiErrorMessage } from '@/lib/api';
import { useCreateStaff, useUpdateStaff } from '@/api/staff';
import { useAuthStore } from '@/store/authStore';
import type { StaffMember } from '@/types/staff';

const schema = z.object({
  name: z.string().trim().min(2, 'Name is too short'),
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address')),
  // Required when creating (checked in onSubmit), optional when editing.
  password: z.string().refine((v) => !v || v.length >= 10, 'Password must be at least 10 characters'),
  role: z.enum(['super-admin', 'staff']),
  isActive: z.boolean(),
});
type FormValues = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

const emptyValues: FormValues = { name: '', email: '', password: '', role: 'staff', isActive: true };

interface StaffFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** null = add a new member. */
  member: StaffMember | null;
}

export function StaffFormModal({ isOpen, onClose, member }: StaffFormModalProps) {
  const isEdit = Boolean(member);
  const currentAdminId = useAuthStore((s) => s.admin?.id);
  const isSelf = Boolean(member && member.id === currentAdminId);
  const createMutation = useCreateStaff();
  const updateMutation = useUpdateStaff();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues, unknown, FormOutput>({ resolver: zodResolver(schema), defaultValues: emptyValues });

  useEffect(() => {
    if (!isOpen) return;
    reset(
      member
        ? { name: member.name, email: member.email, password: '', role: member.role, isActive: member.isActive }
        : emptyValues
    );
  }, [isOpen, member, reset]);

  function onSubmit(values: FormOutput) {
    if (!isEdit && !values.password) {
      setError('password', { message: 'Set a password for the new account' });
      return;
    }

    const action =
      isEdit && member
        ? updateMutation
            .mutateAsync({
              id: member.id,
              input: {
                name: values.name,
                // The server refuses self-demotion/deactivation, so don't even send them.
                ...(isSelf ? {} : { role: values.role, isActive: values.isActive }),
                ...(values.password ? { password: values.password } : {}),
              },
            })
            // Their own name is also shown in the top bar — refresh it.
            .then((saved) => {
              if (isSelf) void useAuthStore.getState().fetchMe();
              return saved;
            })
        : createMutation.mutateAsync({
            name: values.name,
            email: values.email,
            password: values.password,
            role: values.role,
          });

    toast.promise(action, {
      loading: isEdit ? 'Saving changes…' : 'Creating account…',
      success: () => {
        onClose();
        return isEdit ? 'Account updated' : 'Account created';
      },
      error: (err) => apiErrorMessage(err, 'Could not save account'),
    });
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Staff Account' : 'Add Staff Account'}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="staff-form" isLoading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create account'}
          </Button>
        </>
      }
    >
      <form id="staff-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField label="Name" error={errors.name?.message}>
          <Input {...register('name')} placeholder="Full name" />
        </FormField>
        <FormField
          label="Email"
          error={errors.email?.message}
          hint={isEdit ? "An account's email can't be changed" : 'They sign in with this'}
        >
          <Input type="email" {...register('email')} disabled={isEdit} placeholder="name@yourstore.com" />
        </FormField>
        <FormField
          label={isEdit ? 'New password' : 'Password'}
          error={errors.password?.message}
          hint={isEdit ? 'Leave blank to keep the current password' : 'At least 10 characters'}
        >
          <Input type="password" autoComplete="new-password" {...register('password')} />
        </FormField>
        <FormField
          label="Role"
          hint={
            isSelf
              ? "You can't change your own role"
              : 'Super-admins can also manage Settings and other staff accounts'
          }
        >
          <Select {...register('role')} disabled={isSelf}>
            <option value="staff">Staff</option>
            <option value="super-admin">Super-admin</option>
          </Select>
        </FormField>
        {isEdit && (
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-800">Active</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {isSelf
                  ? "You can't deactivate your own account"
                  : "A deactivated account can't sign in, and any open session is cut off"}
              </p>
            </div>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSelf}
                  aria-label="Active"
                />
              )}
            />
          </div>
        )}
      </form>
    </Modal>
  );
}
