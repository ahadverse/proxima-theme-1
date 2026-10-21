import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { SingleImageUpload } from '@/components/ui/SingleImageUpload';
import { TagsInput } from '@/components/ui/TagsInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { apiErrorMessage } from '@/lib/api';
import { useAutoSlug } from '@/lib/useAutoSlug';
import { useBlogPost, useCreateBlogPost, useUpdateBlogPost } from '@/api/blog';
import type { BlogInput, BlogPost, BlogStatus } from '@/types/blog';

const schema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Keep it under 200 characters'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => !v || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v), 'Lowercase letters, numbers and hyphens only')
    .refine((v) => v !== 'manage', 'That address is reserved'),
  excerpt: z.string().trim().max(400, 'Keep it under 400 characters'),
  content: z.string().min(1, 'Write the post first'),
  coverImage: z.string(),
  tags: z.array(z.string()),
  metaTitle: z.string().trim().max(120, 'Keep it under 120 characters'),
  metaDescription: z.string().trim().max(320, 'Keep it under 320 characters'),
});
type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverImage: '',
  tags: [],
  metaTitle: '',
  metaDescription: '',
};

function toFormValues(post: BlogPost): FormValues {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? '',
    content: post.content ?? '',
    coverImage: post.coverImage ?? '',
    tags: post.tags ?? [],
    metaTitle: post.seo?.metaTitle ?? '',
    metaDescription: post.seo?.metaDescription ?? '',
  };
}

function toInput(values: FormValues, status: BlogStatus): BlogInput {
  return {
    title: values.title,
    // Left out when blank: a new post gets an address generated from its title, an existing one keeps its own.
    slug: values.slug || undefined,
    excerpt: values.excerpt,
    content: values.content,
    coverImage: values.coverImage,
    tags: values.tags,
    status,
    seo: { metaTitle: values.metaTitle, metaDescription: values.metaDescription },
  };
}

export default function BlogForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const { data: post, isLoading, refetch } = useBlogPost(id);
  const createMutation = useCreateBlogPost();
  const updateMutation = useUpdateBlogPost();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyValues });
  const slugField = useAutoSlug({ watch, setValue, register, from: 'title', isEdit, resetKey: id ?? 'new' });

  useEffect(() => {
    if (post) reset(toFormValues(post));
  }, [post, reset]);

  const isPublished = post?.status === 'published';
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  function save(status: BlogStatus) {
    void handleSubmit((values) => {
      const input = toInput(values, status);
      const action =
        isEdit && id ? updateMutation.mutateAsync({ id, input }) : createMutation.mutateAsync(input);

      toast.promise(action, {
        loading: status === 'published' ? 'Publishing…' : 'Saving…',
        success: () => {
          navigate('/blog');
          if (status === 'published') return isPublished ? 'Changes saved' : 'Post published';
          return isPublished ? 'Post moved back to drafts' : 'Draft saved';
        },
        error: (err) => apiErrorMessage(err, 'Could not save post'),
      });
    })();
  }

  if (isEdit && isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  // A failed load must not fall through to an empty form: saving it would overwrite the real post.
  if (isEdit && !post) {
    return (
      <ErrorState
        title="Couldn't load this post"
        description="It may have been deleted, or the request failed."
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} noValidate>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link to="/blog" className="mb-1 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
            <ArrowLeft className="h-3 w-3" /> All posts
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Edit Post' : 'New Post'}</h1>
            {isEdit && <Badge tone={isPublished ? 'green' : 'amber'}>{isPublished ? 'Published' : 'Draft'}</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate('/blog')}>
            Cancel
          </Button>
          {isPublished ? (
            <>
              <Button type="button" variant="secondary" disabled={isSubmitting} onClick={() => save('draft')}>
                Unpublish
              </Button>
              <Button type="button" isLoading={isSubmitting} onClick={() => save('published')}>
                Save changes
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="secondary" disabled={isSubmitting} onClick={() => save('draft')}>
                Save draft
              </Button>
              <Button type="button" isLoading={isSubmitting} onClick={() => save('published')}>
                Publish
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardBody className="space-y-4 py-5">
              <FormField label="Title" error={errors.title?.message}>
                <Input {...register('title')} placeholder="A buyer's guide to your next smartphone" />
              </FormField>
              <FormField
                label="Excerpt"
                error={errors.excerpt?.message}
                hint="A sentence or two shown on the blog list and in search results"
              >
                <Textarea rows={2} {...register('excerpt')} />
              </FormField>
              <FormField label="Content" error={errors.content?.message}>
                <Controller
                  control={control}
                  name="content"
                  render={({ field }) => (
                    <MarkdownEditor value={field.value} onChange={field.onChange} error={errors.content?.message} />
                  )}
                />
              </FormField>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-800">Cover image</h2>
            </CardHeader>
            <CardBody className="py-4">
              <Controller
                control={control}
                name="coverImage"
                render={({ field }) => (
                  <SingleImageUpload value={field.value} onChange={field.onChange} boxClassName="h-32 w-full max-w-[280px]" />
                )}
              />
              <p className="mt-2 text-xs text-slate-400">Shown on the blog list and at the top of the post.</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-800">Tags</h2>
            </CardHeader>
            <CardBody className="py-4">
              <Controller
                control={control}
                name="tags"
                render={({ field }) => <TagsInput value={field.value} onChange={field.onChange} />}
              />
              <p className="mt-2 text-xs text-slate-400">Press Enter or comma after each one.</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-800">Address & search</h2>
            </CardHeader>
            <CardBody className="space-y-4 py-4">
              <FormField
                label="Web address"
                error={errors.slug?.message}
                hint={
                  isEdit
                    ? 'Changing this breaks links that already point at the post'
                    : 'Made from the title as you type. Type your own to change it; clear it to go back to automatic.'
                }
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-slate-400">/blog/</span>
                  <Input {...slugField} placeholder="my-first-post" />
                </div>
              </FormField>
              <FormField label="Search title" error={errors.metaTitle?.message} hint="Defaults to the post title">
                <Input {...register('metaTitle')} />
              </FormField>
              <FormField
                label="Search description"
                error={errors.metaDescription?.message}
                hint="Defaults to the excerpt"
              >
                <Textarea rows={3} {...register('metaDescription')} />
              </FormField>
            </CardBody>
          </Card>
        </div>
      </div>
    </form>
  );
}
