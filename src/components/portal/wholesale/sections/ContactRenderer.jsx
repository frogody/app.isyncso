import React, { useState } from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';

/**
 * ContactInfoItem
 *
 * Renders a single contact detail row with icon, label, and value.
 */
function ContactInfoItem({ icon: Icon, label, value, href }) {
  const content = (
    <div className="flex items-start gap-3">
      <div
        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: 'var(--ws-surface)' }}
      >
        <Icon className="h-5 w-5" style={{ color: 'var(--ws-primary)' }} />
      </div>
      <div>
        <p
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: 'var(--ws-muted)' }}
        >
          {label}
        </p>
        <p
          className="mt-0.5 text-sm font-medium"
          style={{ color: 'var(--ws-text)' }}
        >
          {value}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block transition-opacity hover:opacity-80">
        {content}
      </a>
    );
  }

  return content;
}

/**
 * ContactForm
 *
 * Renders a contact form based on the provided formFields array.
 * Does not actually submit -- purely presentational.
 */
function ContactForm({ formFields = [] }) {
  const [formData, setFormData] = useState({});

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Form submission is intentionally a no-op.
  };

  const inputStyle = {
    backgroundColor: 'var(--ws-surface)',
    borderColor: 'var(--ws-border)',
    color: 'var(--ws-text)',
  };

  const placeholderLabels = {
    name: 'Your name',
    email: 'Email address',
    company: 'Company name',
    phone: 'Phone number',
    message: 'Your message',
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formFields.map((field) => {
        const placeholder = placeholderLabels[field] || field;

        if (field === 'message') {
          return (
            <textarea
              key={field}
              placeholder={placeholder}
              rows={4}
              value={formData[field] || ''}
              onChange={(e) => handleChange(field, e.target.value)}
              className="w-full resize-none rounded-lg border px-4 py-3 text-sm outline-none transition-colors placeholder:opacity-50 focus:ring-1"
              style={{
                ...inputStyle,
                '--tw-ring-color': 'var(--ws-primary)',
              }}
            />
          );
        }

        const inputType =
          field === 'email'
            ? 'email'
            : field === 'phone'
              ? 'tel'
              : 'text';

        return (
          <input
            key={field}
            type={inputType}
            placeholder={placeholder}
            value={formData[field] || ''}
            onChange={(e) => handleChange(field, e.target.value)}
            className="w-full rounded-lg border px-4 py-3 text-sm outline-none transition-colors placeholder:opacity-50 focus:ring-1"
            style={{
              ...inputStyle,
              '--tw-ring-color': 'var(--ws-primary)',
            }}
          />
        );
      })}

      <button
        type="submit"
        className="w-full rounded-lg px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
        style={{
          backgroundColor: 'var(--ws-primary)',
          color: 'var(--ws-bg)',
        }}
      >
        Send Message
      </button>
    </form>
  );
}

/**
 * ContactRenderer
 *
 * Renders a contact section with two-column layout:
 * contact information on the left, form on the right.
 * Collapses to single column on mobile.
 */
export default function ContactRenderer({ section, theme }) {
  const {
    heading,
    subheading,
    showForm = false,
    showMap = false,
    showPhone = false,
    showEmail = false,
    showAddress = false,
    phone,
    email,
    address,
    formFields = [],
  } = section?.props || {};

  const hasContactInfo =
    (showPhone && phone) || (showEmail && email) || (showAddress && address);
  const hasForm = showForm && formFields.length > 0;

  // Determine layout: two-column when both info and form exist
  const twoColumn = hasContactInfo && hasForm;

  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Heading */}
        {heading && (
          <h2
            className="text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ color: 'var(--ws-text)' }}
          >
            {heading}
          </h2>
        )}

        {/* Subheading */}
        {subheading && (
          <p
            className="mt-3 text-lg"
            style={{ color: 'var(--ws-muted)' }}
          >
            {subheading}
          </p>
        )}

        {/* Content */}
        <div
          className={`${heading || subheading ? 'mt-10' : ''} ${
            twoColumn
              ? 'grid grid-cols-1 gap-10 md:grid-cols-2'
              : ''
          }`}
        >
          {/* Contact Info Column */}
          {hasContactInfo && (
            <div className="space-y-6">
              {showPhone && phone && (
                <ContactInfoItem
                  icon={Phone}
                  label="Phone"
                  value={phone}
                  href={`tel:${phone}`}
                />
              )}
              {showEmail && email && (
                <ContactInfoItem
                  icon={Mail}
                  label="Email"
                  value={email}
                  href={`mailto:${email}`}
                />
              )}
              {showAddress && address && (
                <ContactInfoItem
                  icon={MapPin}
                  label="Address"
                  value={address}
                />
              )}

              {/* Map placeholder */}
              {showMap && (
                <div
                  className="mt-6 flex h-48 items-center justify-center rounded-lg border"
                  style={{
                    borderColor: 'var(--ws-border)',
                    backgroundColor: 'var(--ws-surface)',
                  }}
                >
                  <p
                    className="text-sm"
                    style={{ color: 'var(--ws-muted)' }}
                  >
                    Map placeholder
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Form Column */}
          {hasForm && (
            <div
              className="rounded-xl border p-6"
              style={{
                borderColor: 'var(--ws-border)',
                backgroundColor: 'var(--ws-surface)',
              }}
            >
              <ContactForm formFields={formFields} />
            </div>
          )}

          {/* Fallback: form only, no contact info */}
          {!hasContactInfo && hasForm && null}
        </div>
      </div>
    </section>
  );
}
