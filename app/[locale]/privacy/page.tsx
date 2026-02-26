import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Glazed & Sipped',
  description: 'Privacy Policy for Glazed & Sipped donut shop.',
};

export default function PrivacyPage() {
  return (
    <section className="container mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-fredoka text-4xl font-bold mb-8 bg-gradient-donut bg-clip-text text-transparent">
        Privacy Policy
      </h1>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
        <p className="text-sm text-gray-500">Last updated: February 2026</p>

        <section>
          <h2 className="font-fredoka text-xl font-semibold text-gray-900 mt-8 mb-3">
            1. Information We Collect
          </h2>
          <p>
            We collect information you provide directly — such as your name, email address,
            delivery address, and payment details when you create an account or place an order.
          </p>
          <p>
            We also collect usage data automatically, including browser type, pages visited, and
            cookies, to improve our services.
          </p>
        </section>

        <section>
          <h2 className="font-fredoka text-xl font-semibold text-gray-900 mt-8 mb-3">
            2. How We Use Your Information
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Process and deliver your orders</li>
            <li>Manage your account and loyalty points</li>
            <li>Send order updates and promotional communications (with your consent)</li>
            <li>Improve our website and services</li>
            <li>Prevent fraud and ensure security</li>
          </ul>
        </section>

        <section>
          <h2 className="font-fredoka text-xl font-semibold text-gray-900 mt-8 mb-3">
            3. Data Sharing
          </h2>
          <p>
            We do not sell your personal data. We share information only with trusted service
            providers (payment processors, delivery partners) necessary to fulfill your orders.
          </p>
        </section>

        <section>
          <h2 className="font-fredoka text-xl font-semibold text-gray-900 mt-8 mb-3">
            4. Cookies
          </h2>
          <p>
            We use cookies and similar technologies to remember your preferences, keep you signed
            in, and analyze site traffic. You can manage cookie preferences in your browser
            settings.
          </p>
        </section>

        <section>
          <h2 className="font-fredoka text-xl font-semibold text-gray-900 mt-8 mb-3">
            5. Data Security
          </h2>
          <p>
            We implement industry-standard security measures to protect your data, including
            encryption in transit (TLS) and at rest. However, no method of transmission over
            the Internet is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="font-fredoka text-xl font-semibold text-gray-900 mt-8 mb-3">
            6. Your Rights
          </h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Withdraw consent for marketing communications</li>
            <li>Export your data in a portable format</li>
          </ul>
        </section>

        <section>
          <h2 className="font-fredoka text-xl font-semibold text-gray-900 mt-8 mb-3">
            7. Data Retention
          </h2>
          <p>
            We retain your data for as long as your account is active or as needed to provide
            services. Order history is kept for legal and accounting purposes.
          </p>
        </section>

        <section>
          <h2 className="font-fredoka text-xl font-semibold text-gray-900 mt-8 mb-3">
            8. Children&apos;s Privacy
          </h2>
          <p>
            Our services are not intended for children under 13. We do not knowingly collect
            personal information from children.
          </p>
        </section>

        <section>
          <h2 className="font-fredoka text-xl font-semibold text-gray-900 mt-8 mb-3">
            9. Changes to This Policy
          </h2>
          <p>
            We may update this policy from time to time. We will notify you of significant changes
            via email or a notice on our website.
          </p>
        </section>

        <section>
          <h2 className="font-fredoka text-xl font-semibold text-gray-900 mt-8 mb-3">
            10. Contact Us
          </h2>
          <p>
            For privacy-related inquiries, please contact us at{' '}
            <a href="mailto:hello@donutshop.com" className="text-amber-600 hover:underline">
              hello@donutshop.com
            </a>.
          </p>
        </section>
      </div>
    </section>
  );
}
