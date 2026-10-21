import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { marked } from 'marked';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { apiErrorMessage } from '@/lib/api';
import { toSlug } from '@/lib/slug';
import { useCreateStaticPage, useStaticPage, useUpdateStaticPage } from '@/api/staticPages';

const schema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(160, 'Keep it under 160 characters'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'An address is required')
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, numbers and hyphens only')
    .refine((v) => v !== 'manage', 'That address is reserved'),
  content: z.string().min(1, 'Write something for the page first'),
});
type FormValues = z.infer<typeof schema>;

/** Pages written before the rich text editor are Markdown; the editor works in HTML, so they are converted on opening. */
const markdownToHtml = (markdown: string) => marked.parse(markdown, { gfm: true, async: false });

export default function StaticPageForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const { data: page, isLoading, refetch } = useStaticPage(id);
  const createMutation = useCreateStaticPage();
  const updateMutation = useUpdateStaticPage();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { title: '', slug: '', content: '' } });

  useEffect(() => {
    if (page) {
      const content = page.content ?? '';
      reset({ title: page.title, slug: page.slug, content: page.contentFormat === 'html' ? content : markdownToHtml(content) });
    }
  }, [page, reset]);

  // A new page's address follows its title until someone types their own.
  const [slugEdited, setSlugEdited] = useState(false);
  const title = watch('title');
  useEffect(() => {
    if (!isEdit && !slugEdited) setValue('slug', toSlug(title));
  }, [isEdit, slugEdited, title, setValue]);

  const isSystem = page?.isSystem ?? false;
  const wasMarkdown = isEdit && page?.contentFormat !== 'html';
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  function onSubmit(values: FormValues) {
    const action =
      isEdit && id
        ? updateMutation.mutateAsync({
            id,
            // A built-in page's address is fixed — the storefront links to it.
            input: {
              title: values.title,
              content: values.content,
              contentFormat: 'html',
              ...(isSystem ? {} : { slug: values.slug }),
            },
          })
        : createMutation.mutateAsync({ ...values, contentFormat: 'html' });

    toast.promise(action, {
      loading: isEdit ? 'Saving changes…' : 'Creating page…',
      success: () => {
        navigate('/pages');
        return isEdit ? 'Page updated' : 'Page created';
      },
      error: (err) => apiErrorMessage(err, 'Could not save page'),
    });
  }

  if (isEdit && isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  // A failed load must not fall through to an empty form: saving it would overwrite the real page.
  if (isEdit && !page) {
    return (
      <ErrorState
        title="Couldn't load this page"
        description="It may have been deleted, or the request failed."
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link to="/pages" className="mb-1 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
            <ArrowLeft className="h-3 w-3" /> All pages
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Edit Page' : 'New Page'}</h1>
            {isSystem && <Badge tone="blue">Built-in</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/pages')}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create page'}
          </Button>
        </div>
      </div>

      <Card>
        <CardBody className="space-y-4 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Title" error={errors.title?.message}>
              <Input {...register('title')} placeholder="About Us" />
            </FormField>
            <FormField
              label="Web address"
              error={errors.slug?.message}
              hint={
                isSystem
                  ? "A built-in page's address is fixed — your storefront links to it"
                  : 'Your store shows this page at /pages/…'
              }
            >
              <div className="flex items-center gap-1.5">
                {!isSystem && <span className="text-sm text-slate-400">/pages/</span>}
                <Input
                  {...register('slug', { onChange: () => setSlugEdited(true) })}
                  disabled={isSystem}
                  placeholder="careers"
                />
              </div>
            </FormField>
          </div>
          {wasMarkdown && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              This page was written in Markdown. It has been converted for the editor below — check it over, and it is
              saved in the new format when you press Save.
            </p>
          )}
          <FormField label="Content" error={errors.content?.message}>
            <Controller
              control={control}
              name="content"
              render={({ field }) => (
                <RichTextEditor
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Write the page here…"
                  error={errors.content?.message}
                />
              )}
            />
          </FormField>
        </CardBody>
      </Card>
    </form>
  );
}
