import { CmsPage } from '@/components/layout/CmsPage';

export default function ReturnExchangePage() {
  return (
    <CmsPage
      slug="return-exchange"
      fallback={{
        title: 'Return & Exchange Policy',
        children: (
          <>
            <p>
              If you are not fully satisfied with your purchase, you may request a return or exchange
              within 7 days of delivery, provided the product is unused, in its original packaging, and
              accompanied by the original invoice.
            </p>
            <p>
              Items marked as non-returnable, software, and personal-care accessories are not eligible
              for return unless defective on arrival. To start a return or exchange, contact our support
              team with your order number and reason for return.
            </p>
            <p>
              Approved returns are collected via courier or can be dropped off at any Maroon store
              location. Refunds are processed to the original payment method within 5-7 business days of
              receiving the returned item.
            </p>
          </>
        ),
      }}
    />
  );
}
