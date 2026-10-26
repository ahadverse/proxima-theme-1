import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { FaqAccordion, type FaqItem } from '@/components/faq/FaqAccordion';
import { JsonLd } from '@/components/seo/JsonLd';
import { apiGet } from '@/lib/api';

const fallbackFaqs: FaqItem[] = [
  { question: 'How long does delivery take?', answer: 'Orders inside Dhaka are typically delivered within 1-2 business days, and 3-5 business days outside Dhaka.' },
  { question: 'What payment methods are accepted?', answer: 'We accept Cash on Delivery, and online payment via PayStation, bKash, and Nagad where enabled at checkout.' },
  { question: 'Can I return or exchange a product?', answer: 'Yes — see our Return & Exchange Policy page for eligibility and the process within the return window.' },
  { question: 'Are your products genuine?', answer: 'Yes, all products sold on Maroon are 100% genuine with official manufacturer warranty where applicable.' },
  { question: 'How can I track my order?', answer: 'Use the Track Order page with your order number and phone number to see live status updates.' },
];

/** The store's questions. The built-in ones appear only while the API can't be reached. */
async function getFaqs(): Promise<FaqItem[]> {
  const faqs = await apiGet<FaqItem[]>('/faq', { revalidate: 300 });
  return faqs ?? fallbackFaqs;
}

export default async function FaqPage() {
  const faqs = await getFaqs();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
      <Breadcrumb items={[{ label: 'FAQ' }]} />
      <h1 className="mb-6 text-2xl font-bold text-white md:text-3xl">Frequently Asked Questions</h1>
      {faqs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 p-10 text-center text-sm text-brand-text-muted">
          No questions have been added yet. Need help? Visit our contact page.
        </div>
      ) : (
        <>
          <JsonLd
            data={{
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqs.map((f) => ({
                '@type': 'Question',
                name: f.question,
                acceptedAnswer: { '@type': 'Answer', text: f.answer },
              })),
            }}
          />
          <FaqAccordion items={faqs} />
        </>
      )}
    </div>
  );
}
