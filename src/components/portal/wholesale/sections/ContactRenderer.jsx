import React, { useState } from 'react';
import { Phone, Mail, MapPin, Send } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeInLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const fadeInRight = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

/**
 * ContactInfoItem
 *
 * Glass card with gradient left border, icon in gradient circle, hover lift.
 */
function ContactInfoItem({ icon: Icon, label, value, href }) {
  const content = (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="flex items-start gap-4 rounded-xl border p-5 overflow-hidden relative"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--ws-surface) 60%, transparent)',
        borderColor: 'var(--ws-border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Gradient left border */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{
          background: `linear-gradient(180deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 30%, transparent))`,
        }}
      />

      {/* Icon in gradient circle */}
      <div
        className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, var(--ws-primary) 20%, transparent), color-mix(in srgb, var(--ws-primary) 8%, transparent))`,
        }}
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
          className="mt-1 text-sm font-medium"
          style={{ color: 'var(--ws-text)' }}
        >
          {value}
        </p>
      </div>
    </motion.div>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }

  return content;
}

/**
 * ContactForm
 *
 * Glass card form with gradient top border, styled inputs, gradient submit button.
 */
function ContactForm({ formFields = [] }) {
  const [formData, setFormData] = useState({});

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
  };

  const inputClasses =
    'w-full rounded-xl border px-4 py-3.5 text-sm outline-none transition-all duration-200 placeholder:opacity-40';

  const inputStyle = {
    backgroundColor: 'color-mix(in srgb, var(--ws-surface) 80%, transparent)',
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
              className={`${inputClasses} resize-none`}
              style={inputStyle}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--ws-primary)';
                e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--ws-primary) 15%, transparent)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--ws-border)';
                e.target.style.boxShadow = 'none';
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
            className={inputClasses}
            style={inputStyle}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--ws-primary)';
              e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--ws-primary) 15%, transparent)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--ws-border)';
              e.target.style.boxShadow = 'none';
            }}
          />
        );
      })}

      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition-all duration-300"
        style={{
          background: `linear-gradient(135deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 80%, #000))`,
          color: 'var(--ws-bg)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 8px 25px color-mix(in srgb, var(--ws-primary) 30%, transparent)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <Send className="h-4 w-4" />
        Send Message
      </button>
    </form>
  );
}

/**
 * MapPlaceholder
 *
 * Glass card with a subtle grid pattern resembling a map.
 */
function MapPlaceholder() {
  return (
    <motion.div
      variants={staggerItem}
      className="mt-6 relative flex h-48 items-center justify-center rounded-xl border overflow-hidden"
      style={{
        borderColor: 'var(--ws-border)',
        backgroundColor: 'color-mix(in srgb, var(--ws-surface) 60%, transparent)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `
            linear-gradient(var(--ws-text) 1px, transparent 1px),
            linear-gradient(90deg, var(--ws-text) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      />
      {/* Center pin */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, var(--ws-primary) 20%, transparent), color-mix(in srgb, var(--ws-primary) 8%, transparent))`,
          }}
        >
          <MapPin className="h-5 w-5" style={{ color: 'var(--ws-primary)' }} />
        </div>
        <p className="text-xs font-medium" style={{ color: 'var(--ws-muted)' }}>
          Map placeholder
        </p>
      </div>
    </motion.div>
  );
}

/**
 * ContactRenderer
 *
 * Two-column layout: contact info slides in from left, form slides in from right.
 * Contact items stagger in with glass cards and gradient accents.
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
  const twoColumn = hasContactInfo && hasForm;

  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Heading */}
        {heading && (
          <div>
            <h2
              className="text-3xl font-bold tracking-tight sm:text-4xl"
              style={{
                color: 'var(--ws-text)',
                fontFamily: 'var(--ws-heading-font)',
              }}
            >
              {heading}
            </h2>
            {/* Gradient accent line */}
            <div
              className="mt-3 h-[2px] w-16 rounded-full"
              style={{
                background: `linear-gradient(90deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 20%, transparent))`,
              }}
            />
          </div>
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
            <motion.div
              variants={fadeInLeft}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
            >
              <motion.div
                className="space-y-4"
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
              >
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

                {showMap && <MapPlaceholder />}
              </motion.div>
            </motion.div>
          )}

          {/* Form Column */}
          {hasForm && (
            <motion.div
              variants={twoColumn ? fadeInRight : fadeInLeft}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="rounded-xl border overflow-hidden"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--ws-surface) 60%, transparent)',
                borderColor: 'var(--ws-border)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {/* Gradient top border */}
              <div
                className="h-[2px] w-full"
                style={{
                  background: `linear-gradient(90deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 40%, transparent))`,
                }}
              />
              <div className="p-6">
                <ContactForm formFields={formFields} />
              </div>
            </motion.div>
          )}

          {/* Fallback: form only, no contact info */}
          {!hasContactInfo && hasForm && null}
        </div>
      </div>
    </section>
  );
}
