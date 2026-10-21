import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormField } from '@/components/ui/FormField';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { SearchPreview } from '@/components/ui/SearchPreview';
import { SingleImageUpload } from '@/components/ui/SingleImageUpload';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { apiErrorMessage } from '@/lib/api';
import { summarize } from '@/lib/seo';
import { useAutoSlug } from '@/lib/useAutoSlug';
import { toSlug } from '@/lib/slug';
import { usePublicSettings } from '@/api/settings';
import { useCategories } from '@/api/categories';
import { useBrands } from '@/api/brands';
import { useAttributes } from '@/api/attributes';
import { useCreateProduct, useProduct, useUpdateProduct } from '@/api/products';
import { VariantBuilder } from './VariantBuilder';
import { SpecGroupBuilder } from './SpecGroupBuilder';
import {
  emptyProductFormValues,
  productFormSchema,
  type ProductFormOutput,
  type ProductFormValues,
} from './productFormSchema';
import type { ProductInput } from '@/types/product';

function toFormValues(product: NonNullable<ReturnType<typeof useProduct>['data']>): ProductFormValues {
  return {
    title: product.title,
    slug: product.slug,
    category: typeof product.category === 'string' ? product.category : product.category._id,
    brand: product.brand ? (typeof product.brand === 'string' ? product.brand : product.brand._id) : '',
    productType: product.productType,
    description: product.description ?? '',
    shortHighlights: product.shortHighlights.map((text) => ({ text })),
    images: product.images,
    basePrice: product.basePrice,
    compareAtPrice: product.compareAtPrice,
    sku: product.sku ?? '',
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    attributesUsed: product.attributesUsed.map((a) => (typeof a === 'string' ? a : a._id)),
    variants: product.variants.map((v) => ({
      sku: v.sku,
      attributes: v.attributes.map((a) => ({
        attribute: typeof a.attribute === 'string' ? a.attribute : a.attribute._id,
        value: a.value,
      })),
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      stock: v.stock,
      lowStockThreshold: v.lowStockThreshold,
      images: v.images,
    })),
    specifications: product.specifications,
    warrantyInfo: product.warrantyInfo ?? '',
    isFlashSale: product.isFlashSale,
    flashSaleEndsAt: product.flashSaleEndsAt ?? '',
    isTrending: product.isTrending,
    isBestSeller: product.isBestSeller,
    isNewArrival: product.isNewArrival,
    isFeatured: product.isFeatured,
    seoMetaTitle: product.seo?.metaTitle ?? '',
    seoMetaDescription: product.seo?.metaDescription ?? '',
    seoOgImage: product.seo?.ogImage ?? '',
    seoNoIndex: product.seo?.noIndex ?? false,
    status: product.status,
  };
}

function toProductInput(values: ProductFormOutput): ProductInput {
  return {
    title: values.title,
    slug: values.slug || undefined,
    category: values.category,
    brand: values.brand || undefined,
    productType: values.productType,
    description: values.description || undefined,
    shortHighlights: values.shortHighlights.map((h) => h.text),
    images: values.images,
    basePrice: values.basePrice,
    compareAtPrice: values.compareAtPrice,
    sku: values.sku || undefined,
    stock: values.stock,
    lowStockThreshold: values.lowStockThreshold,
    attributesUsed: values.attributesUsed,
    variants: values.productType === 'variable' ? values.variants : [],
    specifications: values.specifications,
    warrantyInfo: values.warrantyInfo || undefined,
    isFlashSale: values.isFlashSale,
    flashSaleEndsAt: values.isFlashSale ? values.flashSaleEndsAt || null : null,
    isTrending: values.isTrending,
    isBestSeller: values.isBestSeller,
    isNewArrival: values.isNewArrival,
    isFeatured: values.isFeatured,
    seo: {
      metaTitle: values.seoMetaTitle || undefined,
      metaDescription: values.seoMetaDescription || undefined,
      ogImage: values.seoOgImage || undefined,
      noIndex: values.seoNoIndex ?? false,
    },
    status: values.status,
  };
}

export default function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const { data: product, isLoading: isLoadingProduct, refetch: refetchProduct } = useProduct(id);
  const { data: categories } = useCategories();
  const { data: brands } = useBrands();
  const { data: attributes } = useAttributes();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues, unknown, ProductFormOutput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: emptyProductFormValues,
  });
  const slugField = useAutoSlug({ watch, setValue, register, from: 'title', isEdit, resetKey: id ?? 'new' });
  const { fields: highlightFields, append: appendHighlight, remove: removeHighlight } = useFieldArray({
    control,
    name: 'shortHighlights',
  });

  useEffect(() => {
    if (product) reset(toFormValues(product));
  }, [product, reset]);

  const productType = watch('productType');
  const isFlashSale = watch('isFlashSale');

  // The search result as the storefront will build it: what was typed here, else what it fills in by itself.
  const { data: publicSettings } = usePublicSettings();
  const [title, slug, description, highlights, seoTitle, seoDescription] = watch([
    'title',
    'slug',
    'description',
    'shortHighlights',
    'seoMetaTitle',
    'seoMetaDescription',
  ]);
  const previewTitle = `${seoTitle?.trim() || title.trim() || 'Product title'}${publicSettings?.storeName ? ` | ${publicSettings.storeName}` : ''}`;
  const previewDescription =
    seoDescription?.trim() ||
    summarize(description || (highlights ?? []).map((h) => h.text).join('. ')) ||
    `Buy ${title.trim() || 'this product'} online at the best price in Bangladesh.`;

  function onSubmit(values: ProductFormOutput) {
    const input = toProductInput(values);
    const action =
      isEdit && id ? updateMutation.mutateAsync({ id, input }) : createMutation.mutateAsync(input);

    toast.promise(action, {
      loading: isEdit ? 'Saving changes…' : 'Creating product…',
      success: () => {
        navigate('/products');
        return isEdit ? 'Product updated' : 'Product created';
      },
      error: (err) => apiErrorMessage(err, 'Could not save product'),
    });
  }

  if (isEdit && isLoadingProduct) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // A failed load must not fall through to an empty form: saving it would overwrite the real product.
  if (isEdit && !product) {
    return (
      <ErrorState
        title="Couldn't load this product"
        description="It may have been deleted, or the request failed."
        onRetry={() => void refetchProduct()}
      />
    );
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Edit Product' : 'Add Product'}</h1>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/products')}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create product'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><h2 className="font-semibold text-slate-800">General</h2></CardHeader>
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Title" error={errors.title?.message}>
              <Input {...register('title')} />
            </FormField>
            <FormField
              label="Slug"
              hint={isEdit ? 'Changing this changes its web address — links that point at the old one stop working.' : 'Made from the title as you type. Type your own to change it; clear it to go back to automatic.'}
            >
              <Input {...slugField} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Category" error={errors.category?.message}>
              <Select {...register('category')}>
                <option value="">Select a category</option>
                {categories?.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Brand">
              <Select {...register('brand')}>
                <option value="">No brand</option>
                {brands?.map((b) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </Select>
            </FormField>
          </div>
          <FormField label="Description">
            <Textarea rows={4} {...register('description')} />
          </FormField>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Short highlights</label>
              <Button type="button" variant="secondary" size="sm" onClick={() => appendHighlight({ text: '' })}>
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {highlightFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <Input aria-label={`Highlight ${index + 1}`} {...register(`shortHighlights.${index}.text`)} placeholder="e.g. 6.7-inch AMOLED display" />
                  <button type="button" onClick={() => removeHighlight(index)} aria-label={`Remove highlight ${index + 1}`} className="shrink-0 text-slate-400 hover:text-red-600 dark:hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Warranty info">
              <Input {...register('warrantyInfo')} placeholder="e.g. 1 year official warranty" />
            </FormField>
            <FormField label="Status">
              <Select {...register('status')}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </Select>
            </FormField>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="font-semibold text-slate-800">Images</h2></CardHeader>
        <CardBody>
          <Controller
            control={control}
            name="images"
            render={({ field }) => <ImageUpload images={field.value ?? []} onChange={field.onChange} />}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="font-semibold text-slate-800">Pricing &amp; Stock</h2></CardHeader>
        <CardBody className="space-y-4">
          <FormField label="Product type">
            <Select {...register('productType')}>
              <option value="simple">Simple — one price/stock</option>
              <option value="variable">Variable — multiple variants (color/storage/etc.)</option>
            </Select>
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Base price" error={errors.basePrice?.message}>
              <Input type="number" step="0.01" {...register('basePrice')} />
            </FormField>
            <FormField label="Compare-at price" hint="Shown struck-through as the original price">
              <Input type="number" step="0.01" {...register('compareAtPrice')} />
            </FormField>
          </div>
          {productType === 'simple' && (
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="SKU">
                <Input {...register('sku')} />
              </FormField>
              <FormField
                label="Stock"
                hint={isEdit ? 'Change stock from the Inventory page so every adjustment is logged' : undefined}
              >
                <Input type="number" min={0} readOnly={isEdit} {...register('stock')} />
              </FormField>
              <FormField label="Low stock threshold">
                <Input type="number" {...register('lowStockThreshold')} />
              </FormField>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="font-semibold text-slate-800">Attributes &amp; Variants</h2></CardHeader>
        <CardBody className="space-y-4">
          <FormField label="Attributes used" hint="Drives which attributes the Variant Builder below combines">
            <Controller
              control={control}
              name="attributesUsed"
              render={({ field }) => (
                <div className="flex flex-wrap gap-3">
                  {attributes?.map((attr) => {
                    const selected = field.value ?? [];
                    const checked = selected.includes(attr._id);
                    return (
                      <Checkbox
                        key={attr._id}
                        label={attr.name}
                        checked={checked}
                        onChange={(e) => {
                          field.onChange(
                            e.target.checked
                              ? [...selected, attr._id]
                              : selected.filter((id) => id !== attr._id)
                          );
                        }}
                      />
                    );
                  })}
                </div>
              )}
            />
          </FormField>

          {productType === 'variable' && (
            <VariantBuilder
              control={control}
              register={register}
              attributes={attributes ?? []}
              lockedStockSkus={new Set(product?.variants.map((v) => v.sku) ?? [])}
            />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="font-semibold text-slate-800">Specifications</h2></CardHeader>
        <CardBody>
          <SpecGroupBuilder control={control} register={register} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="font-semibold text-slate-800">Merchandising</h2></CardHeader>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-6">
            <Checkbox label="Flash sale" {...register('isFlashSale')} />
            <Checkbox label="Trending" {...register('isTrending')} />
            <Checkbox label="Best seller" {...register('isBestSeller')} />
            <Checkbox label="New arrival" {...register('isNewArrival')} />
            <Checkbox label="Featured" {...register('isFeatured')} />
          </div>
          {isFlashSale && (
            <FormField label="Flash sale ends at">
              <Input type="datetime-local" {...register('flashSaleEndsAt')} />
            </FormField>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-slate-800">Search engine listing (SEO)</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            How this product shows up on Google, and how its link looks when shared. Anything left empty is filled in from the
            product automatically.
          </p>
        </CardHeader>
        <CardBody className="space-y-4">
          <SearchPreview
            title={previewTitle}
            description={previewDescription}
            siteUrl={publicSettings?.siteUrl}
            path={['product', slug?.trim() || toSlug(title) || 'product-name']}
          />
          <FormField
            label="Meta title"
            error={errors.seoMetaTitle?.message}
            hint={`${(seoTitle ?? '').length} characters — 50–60 reads best. Your store name is added after it.`}
          >
            <Input {...register('seoMetaTitle')} placeholder={title || 'Defaults to the product title'} />
          </FormField>
          <FormField
            label="Meta description"
            error={errors.seoMetaDescription?.message}
            hint={`${(seoDescription ?? '').length} characters — 150–160 reads best`}
          >
            <Textarea rows={3} {...register('seoMetaDescription')} placeholder="Defaults to the start of the product description" />
          </FormField>
          <div>
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">Social share image</p>
            <Controller
              control={control}
              name="seoOgImage"
              render={({ field }) => (
                <SingleImageUpload value={field.value} onChange={field.onChange} boxClassName="h-24 w-40" />
              )}
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Shown when the product's link is shared on Facebook, WhatsApp or Messenger. Leave empty to use the first product
              photo. 1200 × 630 works best.
            </p>
          </div>
          <div className="space-y-1.5">
            <Checkbox label="Hide this product from search engines" {...register('seoNoIndex')} />
            <p className="text-xs text-slate-500">
              The product can still be bought and opened with its link. Google is asked not to list it, and it is left out of the
              sitemap.
            </p>
          </div>
        </CardBody>
      </Card>
    </form>
  );
}
