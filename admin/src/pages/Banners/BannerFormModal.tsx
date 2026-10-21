import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';
import { SingleImageUpload } from '@/components/ui/SingleImageUpload';
import { apiErrorMessage } from '@/lib/api';
import { useCreateBanner, useUpdateBanner } from '@/api/banners';
import type { Banner, BannerInput, BannerType } from '@/types/banner';
import { useBanners } from '@/api/banners';
import { HomepagePreview } from './HomepagePreview';
import { BANNER_SECTIONS, BANNER_TYPES, BANNER_TYPE_INFO, fromLocalInput, toLocalInput } from './bannerTypes';

const isValidLink = (v: string) => v === '' || (v.startsWith('/') && !v.startsWith('//')) || /^https?:\/\/\S+$/i.test(v);

const schema = z
  .object({
    type: z.enum(BANNER_TYPES as [BannerType, ...BannerType[]]),
    image: z.string().min(1, 'Upload an image'),
    mobileImage: z.string(),
    title: z.string().trim().max(120, 'Keep it under 120 characters'),
    subtitle: z.string().trim().max(160, 'Keep it under 160 characters'),
    highlights: z.string(),
    ctaText: z.string().trim().max(40, 'Keep it under 40 characters'),
    ctaLink: z.string().trim().refine(isValidLink, 'Use a path like /category/phones or a full https:// address'),
    sortOrder: z.coerce.number({ error: 'Enter a number' }),
    status: z.enum(['active', 'inactive']),
    startsAt: z.string(),
    endsAt: z.string(),
  })
  .refine((v) => v.type !== 'category_icon' || v.title, { path: ['title'], message: 'Give the icon a label' })
  .refine((v) => v.type !== 'category_icon' || v.ctaLink, { path: ['ctaLink'], message: 'Say where the icon links to' })
  .refine((v) => !v.startsAt || !v.endsAt || new Date(v.endsAt) > new Date(v.startsAt), {
    path: ['endsAt'],
    message: 'The end must come after the start',
  });
type FormValues = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

const emptyValues: FormValues = {
  type: 'hero',
  image: '',
  mobileImage: '',
  title: '',
  subtitle: '',
  highlights: '',
  ctaText: '',
  ctaLink: '',
  sortOrder: 0,
  status: 'active',
  startsAt: '',
  endsAt: '',
};

function toInput(values: FormOutput): BannerInput {
  const isIcon = values.type === 'category_icon';
  return {
    type: values.type,
    image: values.image,
    title: values.title,
    ctaLink: values.ctaLink,
    sortOrder: values.sortOrder,
    status: values.status,
    startsAt: fromLocalInput(values.startsAt),
    endsAt: fromLocalInput(values.endsAt),
    // Fields a placement doesn't use are cleared, so switching a banner's type leaves nothing stale behind.
    subtitle: isIcon ? '' : values.subtitle,
    mobileImage: isIcon ? '' : values.mobileImage,
    ctaText: isIcon ? '' : values.ctaText,
    highlights:
      values.type === 'hero'
        ? values.highlights
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
        : [],
  };
}

interface BannerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** null = add a new banner. */
  banner: Banner | null;
  /** Used when adding, so the form opens on the placement the list is filtered to. */
  defaultType?: BannerType;
}

export function BannerFormModal({ isOpen, onClose, banner, defaultType }: BannerFormModalProps) {
  const isEdit = Boolean(banner);
  const createMutation = useCreateBanner();
  const updateMutation = useUpdateBanner();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues, unknown, FormOutput>({ resolver: zodResolver(schema), defaultValues: emptyValues });

  useEffect(() => {
    if (!isOpen) return;
    reset(
      banner
        ? {
            type: banner.type,
            image: banner.image,
            mobileImage: banner.mobileImage ?? '',
            title: banner.title ?? '',
            subtitle: banner.subtitle ?? '',
            highlights: (banner.highlights ?? []).join('\n'),
            ctaText: banner.ctaText ?? '',
            ctaLink: banner.ctaLink ?? '',
            sortOrder: banner.sortOrder,
            status: banner.status,
            startsAt: toLocalInput(banner.startsAt),
            endsAt: toLocalInput(banner.endsAt),
          }
        : { ...emptyValues, type: defaultType ?? 'hero' }
    );
  }, [isOpen, banner, defaultType, reset]);

  const type = watch('type');
  const info = BANNER_TYPE_INFO[type] ?? BANNER_TYPE_INFO.hero;
  const isIcon = type === 'category_icon';
  const imageBox = isIcon ? 'h-20 w-20 rounded-xl' : 'h-28 w-52';
  const { data: allBanners } = useBanners({});
  const image = watch('image');

  function onSubmit(values: FormOutput) {
    const input = toInput(values);
    const action =
      isEdit && banner
        ? updateMutation.mutateAsync({ id: banner._id, input })
        : createMutation.mutateAsync(input);

    toast.promise(action, {
      loading: isEdit ? 'Saving changes…' : 'Creating banner…',
      success: () => {
        onClose();
        return isEdit ? 'Banner updated' : 'Banner created';
      },
      error: (err) => apiErrorMessage(err, 'Could not save banner'),
    });
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Banner' : 'Add Banner'}
      widthClassName="max-w-2xl"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="banner-form" isLoading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create banner'}
          </Button>
        </>
      }
    >
      <form id="banner-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField label="Placement" hint={info.where}>
          <Select {...register('type')}>
            {BANNER_SECTIONS.map((section) => (
              <optgroup key={section.key} label={`${section.title} — ${section.description}`}>
                {section.types.map((t) => (
                  <option key={t} value={t}>
                    {BANNER_TYPE_INFO[t].label}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </FormField>

        <details open className="rounded-lg border border-slate-200 p-3">
          <summary className="cursor-pointer text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Where it appears on your homepage
          </summary>
          <div className="mx-auto mt-3 max-w-[300px]">
            <HomepagePreview
              compact
              banners={(allBanners ?? []).filter((b) => b._id !== banner?._id)}
              highlight={type}
              previewImage={image}
            />
          </div>
        </details>

        <FormField label="Image" error={errors.image?.message} hint={`Suggested size ${info.size}. It's cropped to fit.`}>
          <Controller
            control={control}
            name="image"
            render={({ field }) => (
              <SingleImageUpload value={field.value} onChange={field.onChange} boxClassName={imageBox} />
            )}
          />
        </FormField>

        {!isIcon && (
          <FormField label="Mobile image (optional)" hint="Shown instead of the image on phones — useful when the wide one crops badly">
            <Controller
              control={control}
              name="mobileImage"
              render={({ field }) => (
                <SingleImageUpload value={field.value} onChange={field.onChange} boxClassName="h-28 w-20" />
              )}
            />
          </FormField>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            label={isIcon ? 'Label' : 'Headline'}
            error={errors.title?.message}
            hint={isIcon ? undefined : 'Leave all text blank to show the image on its own'}
          >
            <Input {...register('title')} placeholder={isIcon ? 'Smart Watches' : 'Official Products'} />
          </FormField>
          {!isIcon && (
            <FormField label="Small text above the headline" error={errors.subtitle?.message}>
              <Input {...register('subtitle')} placeholder="Best Deal on" />
            </FormField>
          )}
        </div>

        {type === 'hero' && (
          <FormField label="Highlights" hint="One per line — shown as a short bulleted list">
            <Textarea rows={3} {...register('highlights')} placeholder={'0% EMI\nPremium Care Free'} />
          </FormField>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {!isIcon && (
            <FormField label="Button text" error={errors.ctaText?.message}>
              <Input {...register('ctaText')} placeholder="Buy Now" />
            </FormField>
          )}
          <div className={isIcon ? 'sm:col-span-2' : undefined}>
            <FormField
              label={isIcon ? 'Links to' : 'Link'}
              error={errors.ctaLink?.message}
              hint="A page on your store (/category/phones) or a full https:// address. The whole banner is clickable."
            >
              <Input {...register('ctaLink')} placeholder="/category/phones" />
            </FormField>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Order" error={errors.sortOrder?.message} hint="Lower numbers come first within a placement">
            <Input type="number" {...register('sortOrder')} />
          </FormField>
          <FormField label="Status" hint="Inactive banners are hidden from the storefront">
            <Select {...register('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </FormField>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Show from (optional)" hint="Leave blank to show immediately">
            <Input type="datetime-local" {...register('startsAt')} />
          </FormField>
          <FormField label="Show until (optional)" error={errors.endsAt?.message} hint="Leave blank to keep showing it">
            <Input type="datetime-local" {...register('endsAt')} />
          </FormField>
        </div>
      </form>
    </Modal>
  );
}
