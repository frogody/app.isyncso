import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';

const LAST_UPDATED = '2026-02-26';
const COMPANY_NAME = 'iSyncSO';
const COMPANY_LEGAL = 'iSyncSO B.V.';
const COMPANY_COUNTRY = 'the Netherlands';
const COMPANY_EMAIL = 'support@isyncso.com';
const APP_URL = 'https://app.isyncso.com';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-black text-zinc-300">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white hover:text-cyan-400 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to {COMPANY_NAME}</span>
          </Link>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-medium text-white">{COMPANY_NAME}</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-sm text-zinc-500 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-10 text-[15px] leading-relaxed">

          {/* 1. Agreement */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Agreement to Terms</h2>
            <p>
              These Terms of Service ("Terms") constitute a legally binding agreement between you ("User", "you")
              and {COMPANY_LEGAL} ("{COMPANY_NAME}", "we", "us"), registered in {COMPANY_COUNTRY}, governing
              your use of the {COMPANY_NAME} platform at <a href={APP_URL} className="text-cyan-400 hover:underline">{APP_URL}</a> (the "Service").
            </p>
            <p className="mt-3">
              By creating an account or using the Service, you agree to be bound by these Terms and our{' '}
              <Link to="/privacy" className="text-cyan-400 hover:underline">Privacy Policy</Link>. If you do not
              agree, do not use the Service.
            </p>
          </section>

          {/* 2. Description */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
            <p>
              {COMPANY_NAME} is a business management platform providing accounting, invoicing, expense
              tracking, bank reconciliation, inventory management, CRM, and AI-powered business tools. The
              Service includes:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Financial administration: invoices, expenses, journal entries, general ledger, and tax reports</li>
              <li>Bank account synchronization via Open Banking (PSD2) for transaction import and reconciliation</li>
              <li>AI-powered invoice extraction and classification from uploaded documents and email attachments</li>
              <li>Inventory and product management</li>
              <li>Customer relationship management (CRM) and pipeline tracking</li>
              <li>Third-party integrations via APIs and connected services</li>
            </ul>
          </section>

          {/* 3. Account */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Account Registration and Security</h2>
            <p>
              You must provide accurate, complete information when creating an account. You are responsible for
              maintaining the confidentiality of your credentials and for all activities that occur under your
              account. Notify us immediately at{' '}
              <a href={`mailto:${COMPANY_EMAIL}`} className="text-cyan-400 hover:underline">{COMPANY_EMAIL}</a>{' '}
              if you become aware of unauthorized access.
            </p>
            <p className="mt-3">
              We reserve the right to suspend or terminate accounts that violate these Terms or that appear to
              be used fraudulently.
            </p>
          </section>

          {/* 4. Open Banking */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Open Banking and Bank Account Access</h2>

            <h3 className="text-lg font-medium text-white mt-4 mb-2">4.1 Consent</h3>
            <p>
              To use our bank synchronization feature, you must explicitly consent to {COMPANY_NAME} accessing
              your bank account information through a licensed Account Information Service Provider (AISP) under
              the Payment Services Directive 2 (PSD2). Consent is granted directly through your bank's
              authentication environment. This consent is separate from your acceptance of these Terms.
            </p>

            <h3 className="text-lg font-medium text-white mt-4 mb-2">4.2 Scope of Access</h3>
            <p>
              Bank account access is read-only. We retrieve account identifiers, balances, and transaction
              history for the purpose of automated reconciliation and financial reporting. We cannot initiate
              payments, modify your accounts, or perform any write operations on your bank account.
            </p>

            <h3 className="text-lg font-medium text-white mt-4 mb-2">4.3 Consent Duration</h3>
            <p>
              In accordance with PSD2, bank access consent is valid for a maximum of 90 days. You will need to
              re-authenticate periodically. You may revoke consent at any time through your {COMPANY_NAME}
              settings or directly with your bank. Revoking consent will stop future transaction synchronization
              but will not delete previously imported transaction data.
            </p>

            <h3 className="text-lg font-medium text-white mt-4 mb-2">4.4 Limited Use</h3>
            <p>
              In compliance with PSD2 Article 66(3)(g), we do not use, access, or store bank account data for
              purposes other than providing the account information service explicitly requested by you. Bank
              data is not used for marketing, credit assessment, advertising, or sold to third parties.
            </p>

            <h3 className="text-lg font-medium text-white mt-4 mb-2">4.5 Bank Availability</h3>
            <p>
              Bank synchronization depends on your bank's availability and compliance with Open Banking
              standards. We do not guarantee uninterrupted access and are not responsible for downtime,
              rate limits, or changes imposed by your bank or the AISP.
            </p>
          </section>

          {/* 5. User Obligations */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. User Obligations</h2>
            <p>When using the Service, you agree to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Provide accurate business and financial information</li>
              <li>Use the Service in compliance with applicable laws, including Dutch tax and accounting regulations</li>
              <li>Not use the Service for illegal activities, money laundering, or tax fraud</li>
              <li>Not attempt to access other users' data or circumvent security measures</li>
              <li>Not reverse-engineer, decompile, or create derivative works of the Service</li>
              <li>Maintain your own records and not rely solely on {COMPANY_NAME} as your only data backup</li>
            </ul>
          </section>

          {/* 6. Data Ownership */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Data Ownership and Intellectual Property</h2>

            <h3 className="text-lg font-medium text-white mt-4 mb-2">6.1 Your Data</h3>
            <p>
              You retain full ownership of all data you upload or create in the Service, including financial
              records, invoices, contacts, and documents. We do not claim ownership over your data.
            </p>

            <h3 className="text-lg font-medium text-white mt-4 mb-2">6.2 License to Us</h3>
            <p>
              You grant {COMPANY_NAME} a limited, non-exclusive license to process, store, and display your
              data solely for the purpose of providing the Service to you.
            </p>

            <h3 className="text-lg font-medium text-white mt-4 mb-2">6.3 Our Property</h3>
            <p>
              The Service, including its design, code, features, and branding, is the intellectual property of
              {COMPANY_LEGAL}. These Terms do not grant you any rights to our intellectual property beyond the
              right to use the Service as intended.
            </p>
          </section>

          {/* 7. AI Features */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. AI-Powered Features</h2>
            <p>
              The Service includes AI-powered features such as invoice extraction, expense classification, and
              the SYNC AI assistant. While we strive for accuracy, AI-generated outputs may contain errors.
              You are responsible for reviewing and verifying all AI-generated data before using it for
              accounting, tax, or legal purposes.
            </p>
            <p className="mt-3">
              {COMPANY_NAME} is not a licensed accountant or financial advisor. The Service is a tool to
              assist with financial administration. For professional accounting, tax, or legal advice, consult
              a qualified professional.
            </p>
          </section>

          {/* 8. Third-Party Services */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Third-Party Integrations</h2>
            <p>
              The Service integrates with third-party services (banks, email providers, payment processors,
              etc.). Your use of these integrations is subject to the respective third party's terms and
              privacy policies. We are not responsible for the availability, accuracy, or security of
              third-party services.
            </p>
          </section>

          {/* 9. Pricing */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Pricing and Payment</h2>
            <p>
              Current pricing is displayed on our website and within the Service. We reserve the right to
              change pricing with 30 days' notice. Fees are non-refundable except as required by applicable
              law. If you do not agree to a price change, you may cancel your subscription before the change
              takes effect.
            </p>
          </section>

          {/* 10. Availability */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Service Availability</h2>
            <p>
              We aim to provide the Service 24/7 but do not guarantee uninterrupted access. We may perform
              maintenance, updates, or improvements that temporarily affect availability. We will provide
              reasonable notice for planned downtime where possible.
            </p>
          </section>

          {/* 11. Limitation of Liability */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                {COMPANY_NAME} is provided "as is" without warranties of any kind, express or implied,
                including merchantability or fitness for a particular purpose.
              </li>
              <li>
                We are not liable for indirect, incidental, special, consequential, or punitive damages,
                including loss of profits, data, or business opportunities.
              </li>
              <li>
                Our total liability for any claim arising from or related to the Service shall not exceed
                the amount you paid to us in the 12 months preceding the claim.
              </li>
              <li>
                We are not liable for errors in AI-generated outputs, bank synchronization failures due to
                third-party issues, or financial decisions made based on data in the Service.
              </li>
            </ul>
          </section>

          {/* 12. Termination */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">12. Termination</h2>
            <p>
              You may terminate your account at any time through your account settings or by contacting us.
              We may terminate or suspend your account for violation of these Terms, with notice where
              reasonably possible.
            </p>
            <p className="mt-3">
              Upon termination, you may export your data within 30 days. After this period, we will delete
              your data except where retention is required by law (e.g., 7-year fiscal retention for
              financial records under Dutch law).
            </p>
          </section>

          {/* 13. Governing Law */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">13. Governing Law and Disputes</h2>
            <p>
              These Terms are governed by the laws of {COMPANY_COUNTRY}. Any disputes arising from these
              Terms or the Service shall be submitted to the competent court in Amsterdam, the Netherlands.
            </p>
          </section>

          {/* 14. Changes */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">14. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. Material changes will be communicated via email
              or in-app notification at least 30 days before they take effect. Continued use of the Service
              after notification constitutes acceptance of the updated Terms. If you disagree with changes,
              you may terminate your account before they take effect.
            </p>
          </section>

          {/* 15. Contact */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">15. Contact</h2>
            <p>For questions about these Terms of Service, contact:</p>
            <div className="mt-2 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
              <p className="text-white font-medium">{COMPANY_LEGAL}</p>
              <p>{COMPANY_COUNTRY}</p>
              <p>Email: <a href={`mailto:${COMPANY_EMAIL}`} className="text-cyan-400 hover:underline">{COMPANY_EMAIL}</a></p>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-zinc-800 text-center text-sm text-zinc-500">
          <p>&copy; {new Date().getFullYear()} {COMPANY_LEGAL}. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <Link to="/privacy" className="text-cyan-400 hover:underline">Privacy Policy</Link>
            <span className="text-zinc-700">|</span>
            <Link to="/terms" className="text-cyan-400 hover:underline">Terms of Service</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
