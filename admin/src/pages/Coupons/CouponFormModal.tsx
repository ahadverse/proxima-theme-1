import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';
import { apiErrorMessage } from '@/lib/api';
import { useCreateCoupon, useUpdateCoupon } from '@/api/coupons';
import type { Coupon } from '@/types/coupon';

const schema = z.object({
  code: z.string().min(1, 'Code is required'),
  type: z.enum(['percentage', 'fixed']),
  value: z.coerce.number().min(0, 'Must be 0 or more'),
  minOrderAmount: z.coerce.number().min(0).optional(),
  maxDiscountAmount: z.coerce.number().min(0).optional(),
  usageLimit: z.coerce.number().min(0).optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
  status: z.enum(['active', 'inactive']),
});
type FormValues = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

const emptyValues: FormValues = {
  code: '',
  type: 'percentage',
  value: 0,
  minOrderAmount: 0,
  status: 'active',
};

function toInputDate(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

interface CouponFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupon: Coupon | null;
}

export function CouponFormModal({ isOpen, onClose, coupon }: CouponFormModalProps) {
  const isEdit = Boolean(coupon);
  const createMutation = useCreateCoupon();
  const updateMutation = useUpdateCoupon();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues, unknown, FormOutput>({ resolver: zodResolver(schema), defaultValues: emptyValues });

  useEffect(() => {
    if (!isOpen) return;
    reset(
      coupon
        ? {
            code: coupon.code,
            type: coupon.type,
            value: coupon.value,
            minOrderAmount: coupon.minOrderAmount,
            maxDiscountAmount: coupon.maxDiscountAmount ?? undefined,
            usageLimit: coupon.usageLimit ?? undefined,
            startsAt: toInputDate(coupon.startsAt),
            expiresAt: toInputDate(coupon.expiresAt),
            status: coupon.status,
          }
        : emptyValues
    );
  }, [isOpen, coupon, reset]);

  const type = watch('type');

  function onSubmit(values: FormOutput) {
    const input = {
      ...values,
      maxDiscountAmount: values.maxDiscountAmount ?? null,
      usageLimit: values.usageLimit ?? null,
      startsAt: values.startsAt || null,
      expiresAt: values.expiresAt || null,
    };
    const action = isEdit && coupon ? updateMutation.mutateAsync({ id: coupon._id, input }) : createMutation.mutateAsync(input);

    toast.promise(action, {
      loading: isEdit ? 'Saving changes…' : 'Creating coupon…',
      success: () => {
        onClose();
        return isEdit ? 'Coupon updated' : 'Coupon created';
      },
      error: (err) => apiErrorMessage(err, 'Could not save coupon'),
    });
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Coupon' : 'Add Coupon'}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="coupon-form" isLoading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create coupon'}
          </Button>
        </>
      }
    >
      <form id="coupon-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Code" error={errors.code?.message}>
            <Input {...register('code')} placeholder="SAVE10" className="uppercase" />
          </FormField>
          <FormField label="Type">
            <Select {...register('type')}>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label={type === 'percentage' ? 'Discount %' : 'Discount amount (৳)'} error={errors.value?.message}>
            <Input type="number" step="0.01" {...register('value')} />
          </FormField>
          <FormField label="Min order amount (৳)">
            <Input type="number" step="0.01" {...register('minOrderAmount')} />
          </FormField>
        </div>

        {type === 'percentage' && (
          <FormField label="Max discount amount (৳)" hint="Caps the discount on a percentage coupon">
            <Input type="number" step="0.01" {...register('maxDiscountAmount')} />
          </FormField>
        )}

        <FormField label="Usage limit" hint="Leave blank for unlimited uses">
          <Input type="number" {...register('usageLimit')} />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Starts at">
            <Input type="date" {...register('startsAt')} />
          </FormField>
          <FormField label="Expires at">
            <Input type="date" {...register('expiresAt')} />
          </FormField>
        </div>

        <FormField label="Status">
          <Select {...register('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </FormField>
      </form>
    </Modal>
  );
}
