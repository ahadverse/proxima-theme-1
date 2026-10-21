import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';
import { apiErrorMessage } from '@/lib/api';
import { useCreateFaq, useUpdateFaq } from '@/api/faq';
import type { Faq } from '@/types/faq';

const schema = z.object({
  question: z.string().trim().min(1, 'Question is required').max(300, 'Keep it under 300 characters'),
  answer: z.string().trim().min(1, 'Answer is required').max(5000, 'Keep it under 5,000 characters'),
  sortOrder: z.coerce.number({ error: 'Enter a number' }),
  status: z.enum(['active', 'inactive']),
});
type FormValues = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

interface FaqFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** null = add a new question. */
  faq: Faq | null;
  /** Where a new question lands by default — after the last one. */
  nextSortOrder: number;
}

export function FaqFormModal({ isOpen, onClose, faq, nextSortOrder }: FaqFormModalProps) {
  const isEdit = Boolean(faq);
  const createMutation = useCreateFaq();
  const updateMutation = useUpdateFaq();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { question: '', answer: '', sortOrder: 0, status: 'active' },
  });

  useEffect(() => {
    if (!isOpen) return;
    reset(
      faq
        ? { question: faq.question, answer: faq.answer, sortOrder: faq.sortOrder, status: faq.status }
        : { question: '', answer: '', sortOrder: nextSortOrder, status: 'active' }
    );
  }, [isOpen, faq, nextSortOrder, reset]);

  function onSubmit(values: FormOutput) {
    const action =
      isEdit && faq
        ? updateMutation.mutateAsync({ id: faq._id, input: values })
        : createMutation.mutateAsync(values);

    toast.promise(action, {
      loading: isEdit ? 'Saving changes…' : 'Adding question…',
      success: () => {
        onClose();
        return isEdit ? 'Question updated' : 'Question added';
      },
      error: (err) => apiErrorMessage(err, 'Could not save question'),
    });
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Question' : 'Add Question'}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="faq-form" isLoading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Add question'}
          </Button>
        </>
      }
    >
      <form id="faq-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField label="Question" error={errors.question?.message}>
          <Input {...register('question')} placeholder="How long does delivery take?" />
        </FormField>
        <FormField
          label="Answer"
          error={errors.answer?.message}
          hint="Plain text — line breaks are kept"
        >
          <Textarea rows={6} {...register('answer')} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Order" error={errors.sortOrder?.message} hint="Lower numbers come first">
            <Input type="number" {...register('sortOrder')} />
          </FormField>
          <FormField label="Status" hint="Inactive questions are hidden from the storefront">
            <Select {...register('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </FormField>
        </div>
      </form>
    </Modal>
  );
}
