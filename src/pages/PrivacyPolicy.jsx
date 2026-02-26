import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

const LAST_UPDATED = '2026-02-26';
const COMPANY_NAME = 'iSyncSO';
const COMPANY_LEGAL = 'iSyncSO B.V.';
const COMPANY_COUNTRY = 'the Netherlands';
const COMPANY_EMAIL = 'privacy@isyncso.com';
const APP_URL = 'https://app.isyncso.com';

export default function PrivacyPolicy() {
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
            <Shield className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-medium text-white">{COMPANY_NAME}</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-zinc-500 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-10 text-[15px] leading-relaxed">

          {/* 1. Introduction */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Introduction</h2>
            <p>
              {COMPANY_LEGAL} ("{COMPANY_NAME}", "we", "us", "our"), registered in {COMPANY_COUNTRY},
              operates the {COMPANY_NAME} platform at <a href={APP_URL} className="text-cyan-400 hover:underline">{APP_URL}</a>.
              We are committed to protecting your privacy and processing your personal data in accordance with
              the General Data Protection Regulation (EU) 2016/679 ("GDPR"), the revised Payment Services
              Directive (EU) 2015/2366 ("PSD2"), and applicable Dutch data protection law.
            </p>
            <p className="mt-3">
              This Privacy Policy explains what personal data we collect, why we process it, how we protect it,
              and what rights you have. It applies to all users of our platform, including our accounting,
              invoicing, bank synchronization, and business intelligence features.
            </p>
          </section>

          {/* 2. Data Controller */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Data Controller</h2>
            <p>The data controller for the processing of your personal data is:</p>
            <div className="mt-2 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
              <p className="text-white font-medium">{COMPANY_LEGAL}</p>
              <p>{COMPANY_COUNTRY}</p>
              <p>Email: <a href={`mailto:${COMPANY_EMAIL}`} className="text-cyan-400 hover:underline">{COMPANY_EMAIL}</a></p>
            </div>
          </section>

          {/* 3. Personal Data We Collect */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Personal Data We Collect</h2>
            <p>Depending on the features you use, we may collect and process the following categories of personal data:</p>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">3.1 Account Data</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Name, email address, and password (hashed)</li>
              <li>Company name and business registration details</li>
              <li>Profile settings and preferences</li>
            </ul>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">3.2 Financial Data</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Invoices, expenses, and journal entries you create</li>
              <li>Vendor and customer information (names, addresses, tax IDs)</li>
              <li>Subscription and billing records</li>
            </ul>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">3.3 Bank Account Data (Open Banking / PSD2)</h3>
            <p className="mt-1">
              When you connect a bank account through our Open Banking integration (powered by Enable Banking,
              a licensed Account Information Service Provider under PSD2), we access:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Bank account identifiers (IBAN, account name, currency)</li>
              <li>Transaction data (date, amount, description, counterparty name, reference)</li>
              <li>Account balance information</li>
            </ul>
            <p className="mt-2">
              We do <strong className="text-white">not</strong> access your bank login credentials.
              Authentication happens directly with your bank via secure redirect (Strong Customer Authentication).
              We only receive read-only access to account information after you provide explicit consent in your
              banking app.
            </p>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">3.4 Email Data (Gmail Integration)</h3>
            <p>
              If you enable Gmail auto-import, we access email metadata (subject, sender, date) and PDF/image
              attachments identified as invoices. We do not read the body of your emails. Attachment data is
              processed solely for invoice extraction and stored in your account.
            </p>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">3.5 Technical Data</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>IP address, browser type, device information</li>
              <li>Usage logs and feature interaction data</li>
              <li>Error reports and performance metrics</li>
            </ul>
          </section>

          {/* 4. Purposes and Legal Basis */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Purposes and Legal Basis for Processing</h2>
            <div className="overflow-x-auto">
              <table className="w-full mt-2 text-sm">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left py-2 pr-4 text-white font-medium">Purpose</th>
                    <th className="text-left py-2 pr-4 text-white font-medium">Legal Basis (GDPR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  <tr>
                    <td className="py-2 pr-4">Providing accounting, invoicing, and expense tracking services</td>
                    <td className="py-2 pr-4">Art. 6(1)(b) — Performance of contract</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Bank transaction synchronization and reconciliation</td>
                    <td className="py-2 pr-4">Art. 6(1)(b) — Performance of contract</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Accessing bank account data via Open Banking (PSD2)</td>
                    <td className="py-2 pr-4">Art. 6(1)(a) — Explicit consent (PSD2 Art. 66)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">AI-powered invoice extraction and classification</td>
                    <td className="py-2 pr-4">Art. 6(1)(b) — Performance of contract</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Email invoice auto-import (Gmail/Outlook)</td>
                    <td className="py-2 pr-4">Art. 6(1)(a) — Consent</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Platform security and fraud prevention</td>
                    <td className="py-2 pr-4">Art. 6(1)(f) — Legitimate interest</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Legal and tax compliance (Dutch bookkeeping obligations)</td>
                    <td className="py-2 pr-4">Art. 6(1)(c) — Legal obligation</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 5. Open Banking / PSD2 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Open Banking and PSD2 Specific Provisions</h2>
            <p>
              In accordance with PSD2 Article 66, we process bank account data solely for the purpose of
              providing the account information service you have explicitly requested — specifically, automated
              transaction reconciliation and financial reporting within the {COMPANY_NAME} platform.
            </p>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">5.1 Explicit Consent</h3>
            <p>
              Access to your bank account data requires your explicit, informed consent. This consent is
              obtained separately from any other terms or agreements. You actively approve access in your
              bank's own authentication environment via Strong Customer Authentication (SCA).
            </p>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">5.2 Limited Use</h3>
            <p>Bank transaction data accessed through Open Banking is used <strong className="text-white">solely</strong> for:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Automated transaction import and categorization</li>
              <li>Bank reconciliation against your journal entries and expenses</li>
              <li>Financial reporting (profit/loss, balance sheet, cash flow)</li>
            </ul>
            <p className="mt-3">
              We will <strong className="text-white">not</strong> use bank data for marketing, credit profiling,
              advertising, or sharing with third parties for their own purposes. In compliance with PSD2
              Article 66(3)(g), we do not use, access, or store any data for purposes other than the account
              information service explicitly requested by you.
            </p>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">5.3 Consent Duration and Renewal</h3>
            <p>
              Per PSD2 regulations, your bank account access consent is valid for a maximum of 90 days. After
              expiry, you will be asked to re-authenticate with your bank to continue synchronization. You can
              revoke consent at any time through your {COMPANY_NAME} settings or directly with your bank.
            </p>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">5.4 Data Intermediary</h3>
            <p>
              We use Enable Banking (Enable Banking Oy, Finland), a licensed Account Information Service
              Provider (AISP) regulated under PSD2, as our technical intermediary for Open Banking connections.
              Enable Banking facilitates the secure connection between your bank and {COMPANY_NAME} but does
              not store your financial data for its own purposes. For more information, see{' '}
              <a href="https://enablebanking.com/privacy" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                Enable Banking's Privacy Policy
              </a>.
            </p>
          </section>

          {/* 6. Data Sharing */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Data Sharing and Third-Party Processors</h2>
            <p>We share personal data only with the following categories of processors, under appropriate Data Processing Agreements:</p>
            <div className="overflow-x-auto">
              <table className="w-full mt-3 text-sm">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left py-2 pr-4 text-white font-medium">Processor</th>
                    <th className="text-left py-2 pr-4 text-white font-medium">Purpose</th>
                    <th className="text-left py-2 pr-4 text-white font-medium">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  <tr>
                    <td className="py-2 pr-4">Supabase (database & auth)</td>
                    <td className="py-2 pr-4">Data storage, authentication</td>
                    <td className="py-2 pr-4">US (AWS)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Enable Banking Oy</td>
                    <td className="py-2 pr-4">Open Banking / PSD2 bank connections</td>
                    <td className="py-2 pr-4">Finland (EU)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Vercel</td>
                    <td className="py-2 pr-4">Frontend hosting and CDN</td>
                    <td className="py-2 pr-4">US / Global edge</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Groq / AI providers</td>
                    <td className="py-2 pr-4">Invoice text extraction (no data retained)</td>
                    <td className="py-2 pr-4">US</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Composio</td>
                    <td className="py-2 pr-4">Gmail/Outlook integration</td>
                    <td className="py-2 pr-4">US</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              We do not sell personal data to third parties. We do not share bank account data with any party
              other than the processors listed above who require it for service delivery.
            </p>
          </section>

          {/* 7. Data Security */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Data Security</h2>
            <p>We implement appropriate technical and organizational measures to protect your data, including:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Encryption of data in transit (TLS 1.2+) and at rest (AES-256)</li>
              <li>Role-based access controls (RBAC) with granular permissions</li>
              <li>Row Level Security (RLS) policies ensuring data isolation between organizations</li>
              <li>Secure authentication with password hashing and optional multi-factor authentication</li>
              <li>Regular security reviews and audit logging</li>
              <li>Bank connections via licensed PSD2 intermediary with Strong Customer Authentication</li>
            </ul>
          </section>

          {/* 8. Data Retention */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Data Retention</h2>
            <div className="overflow-x-auto">
              <table className="w-full mt-2 text-sm">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left py-2 pr-4 text-white font-medium">Data Type</th>
                    <th className="text-left py-2 pr-4 text-white font-medium">Retention Period</th>
                    <th className="text-left py-2 pr-4 text-white font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  <tr>
                    <td className="py-2 pr-4">Account data</td>
                    <td className="py-2 pr-4">Duration of account + 30 days</td>
                    <td className="py-2 pr-4">Service delivery</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Financial records (invoices, expenses, journal entries)</td>
                    <td className="py-2 pr-4">7 years after creation</td>
                    <td className="py-2 pr-4">Dutch fiscal retention obligation (AWR Art. 52)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Bank transaction data</td>
                    <td className="py-2 pr-4">7 years after import</td>
                    <td className="py-2 pr-4">Accounting and tax compliance</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Bank connection sessions</td>
                    <td className="py-2 pr-4">90 days (auto-expiry per PSD2)</td>
                    <td className="py-2 pr-4">PSD2 consent window</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Technical logs</td>
                    <td className="py-2 pr-4">90 days</td>
                    <td className="py-2 pr-4">Debugging and security</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              When data is no longer needed and retention periods have expired, it is securely deleted or
              anonymized.
            </p>
          </section>

          {/* 9. Your Rights */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Your Rights</h2>
            <p>Under the GDPR, you have the following rights regarding your personal data:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>
                <strong className="text-white">Right of access</strong> — Request a copy of the personal data we hold about you.
              </li>
              <li>
                <strong className="text-white">Right to rectification</strong> — Request correction of inaccurate or incomplete data.
              </li>
              <li>
                <strong className="text-white">Right to erasure</strong> — Request deletion of your data when it is no longer
                necessary (subject to legal retention obligations).
              </li>
              <li>
                <strong className="text-white">Right to restrict processing</strong> — Request limitation of processing in certain circumstances.
              </li>
              <li>
                <strong className="text-white">Right to data portability</strong> — Receive your data in a structured, machine-readable format.
              </li>
              <li>
                <strong className="text-white">Right to object</strong> — Object to processing based on legitimate interests.
              </li>
              <li>
                <strong className="text-white">Right to withdraw consent</strong> — Withdraw consent at any time for consent-based
                processing (including Open Banking access), without affecting the lawfulness of prior processing.
              </li>
            </ul>
            <p className="mt-4">
              To exercise any of these rights, contact us at{' '}
              <a href={`mailto:${COMPANY_EMAIL}`} className="text-cyan-400 hover:underline">{COMPANY_EMAIL}</a>.
              We will respond within 30 days as required by GDPR.
            </p>
            <p className="mt-2">
              You also have the right to lodge a complaint with the Dutch Data Protection Authority
              (Autoriteit Persoonsgegevens) at{' '}
              <a href="https://autoriteitpersoonsgegevens.nl" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                autoriteitpersoonsgegevens.nl
              </a>.
            </p>
          </section>

          {/* 10. International Transfers */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. International Data Transfers</h2>
            <p>
              Some of our processors are located outside the European Economic Area (EEA), primarily in the
              United States. Where data is transferred outside the EEA, we ensure adequate protection through
              Standard Contractual Clauses (SCCs) approved by the European Commission, or through processors
              that maintain equivalent security standards.
            </p>
          </section>

          {/* 11. Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Cookies and Local Storage</h2>
            <p>
              We use essential cookies and local storage for authentication and session management. We do not
              use tracking cookies or third-party advertising cookies. Analytics data is collected in an
              anonymized form for service improvement.
            </p>
          </section>

          {/* 12. Children */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">12. Children's Privacy</h2>
            <p>
              {COMPANY_NAME} is a business tool not intended for use by individuals under 16 years of age.
              We do not knowingly collect personal data from children.
            </p>
          </section>

          {/* 13. Changes */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">13. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Material changes will be communicated via
              email or in-app notification. Continued use of the platform after notification constitutes
              acceptance of the updated policy.
            </p>
          </section>

          {/* 14. Contact */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">14. Contact</h2>
            <p>For any questions about this Privacy Policy or your personal data, contact:</p>
            <div className="mt-2 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
              <p className="text-white font-medium">{COMPANY_LEGAL}</p>
              <p>Data Protection Contact</p>
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
