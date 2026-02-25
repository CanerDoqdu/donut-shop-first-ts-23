import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Glazed & Sipped',
  description: 'Terms of Service for Glazed & Sipped donut shop.',
};

export default function TermsPage() {
  return (
    <section className="container mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-fredoka text-4xl font-bold mb-8 bg-gradient-donut bg-clip-text text-transparent">
        Terms of Service
      </h1>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
        <p className="text-sm text-gray-500">Last updated: February 2026</p>

        <section>
          <h2 className="font-fredoka text-xl font-semibold text-gray-900 mt-8 mb-3">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing and using the Glazed &amp; Sipped website and services, you agree to be
            bound by these Terms of Service. If you do not agree to these terms, please do not use
            our services.
          </p>
        </section>

        <section>
          <h2 className="font-fredoka text-xl font-semibold text-gray-900 mt-8 mb-3">
            2. Use of Services
          </h2>
          <p>
            Our services are intended for personal, non-commercial use. You agree to use our
            website and ordering platform in accordance with all applicable laws and regulations.
          </p>
        </section>

        <section>
          <h2 className="font-fredoka text-xl font-semibold text-gray-900 mt-8 mb-3">
            3. Accounts
          </h2>
          <p>
            When you create an account, you are responsible for maintaining the security of your
            credentials and for all activities that occur under your account.
          </p>
        </section>

        <section>
          <h2 className="font-fredoka text-xl font-semibold text-gray-900 mt-8 mb-3">
            4. Orders &amp; Payments
          </h2>
          <p>
            All orders are subject to availability. Prices are listed in the local currency and
            may change without notice. Payment is processed securely through our payment provider.
          </p>
        </section>

        <section>
          <h2 className="font-fredoka text-xl font-semibold text-gray-900 mt-8 mb-3">
            5. Cancellation &amp; Refunds
          </h2>
          <p>
            Orders may be cancelled before they enter preparation. Refund requests are handled on a
            case-by-case basis. Please contact our support team for assistance.
          </p>
        </section>

        <section>
          <h2 className="font-fredoka text-xl font-semibold text-gray-900 mt-8 mb-3">
            6. Intellectual Property
          </h2>
          <p>
            All content on this website — including logos, images, and text — is the property of
            Glazed &amp; Sipped and is protected by applicable intellectual property laws.
          </p>
        </section>

        <section>
          <h2 className="font-fredoka text-xl font-semibold text-gray-900 mt-8 mb-3">
            7. Limitation of Liability
          </h2>
          <p>
            Glazed &amp; Sipped is not liable for any indirect, incidental, or consequential damages
            arising from the use of our services.
          </p>
        </section>

        <section>
          <h2 className="font-fredoka text-xl font-semibold text-gray-900 mt-8 mb-3">
            8. Changes to Terms
          </h2>
          <p>
            We reserve the right to update these terms at any time. Continued use of our services
            after changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2 className="font-fredoka text-xl font-semibold text-gray-900 mt-8 mb-3">
            9. Contact
          </h2>
          <p>
            If you have any questions about these terms, please contact us at{' '}
            <a href="mailto:hello@donutshop.com" className="text-amber-600 hover:underline">
              hello@donutshop.com
            </a>.
          </p>
        </section>
      </div>
    </section>
  );
}
