import React, { useState, useCallback } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

/**
 * AccordionItem
 *
 * Glass-card expandable FAQ item with framer-motion height animation
 * and rotating chevron that shifts to primary when open.
 */
function AccordionItem({ question, answer, isOpen, onToggle, index }) {
  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--ws-surface) 60%, transparent)',
        borderColor: isOpen
          ? 'color-mix(in srgb, var(--ws-primary) 40%, var(--ws-border))'
          : 'var(--ws-border)',
        backdropFilter: 'blur(12px)',
        transition: 'border-color 0.3s ease',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span
          className="text-base font-semibold"
          style={{
            color: isOpen ? 'var(--ws-primary)' : 'var(--ws-text)',
            transition: 'color 0.3s ease',
          }}
        >
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="shrink-0"
        >
          <ChevronDown
            className="h-5 w-5"
            style={{
              color: isOpen ? 'var(--ws-primary)' : 'var(--ws-muted)',
              transition: 'color 0.3s ease',
            }}
          />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-5">
              <div
                className="border-t pt-4 pl-2"
                style={{ borderColor: 'color-mix(in srgb, var(--ws-border) 50%, transparent)' }}
              >
                <p
                  className="text-sm"
                  style={{
                    color: 'var(--ws-muted)',
                    lineHeight: '1.8',
                  }}
                >
                  {answer}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * ListItem
 *
 * Non-collapsible FAQ item with glass surface and subtle border.
 */
function ListItem({ question, answer }) {
  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      className="rounded-xl border px-6 py-5"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--ws-surface) 60%, transparent)',
        borderColor: 'var(--ws-border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <p
        className="text-base font-semibold"
        style={{ color: 'var(--ws-text)' }}
      >
        {question}
      </p>
      <p
        className="mt-2 text-sm pl-2"
        style={{ color: 'var(--ws-muted)', lineHeight: '1.8' }}
      >
        {answer}
      </p>
    </motion.div>
  );
}

/**
 * GridItem
 *
 * Card-style FAQ item with gradient top border accent.
 */
function GridItem({ question, answer }) {
  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--ws-surface) 60%, transparent)',
        borderColor: 'var(--ws-border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Gradient top border accent */}
      <div
        className="h-[2px] w-full"
        style={{
          background: `linear-gradient(90deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 40%, transparent))`,
        }}
      />
      <div className="p-5">
        <p
          className="text-base font-semibold"
          style={{ color: 'var(--ws-text)' }}
        >
          {question}
        </p>
        <p
          className="mt-2 text-sm pl-1"
          style={{ color: 'var(--ws-muted)', lineHeight: '1.8' }}
        >
          {answer}
        </p>
      </div>
    </motion.div>
  );
}

/**
 * FAQRenderer
 *
 * Renders a FAQ section with three display styles:
 * - accordion: expandable items with chevron toggle
 * - list: all items visible, question bold, answer muted
 * - grid: card-based grid layout
 */
export default function FAQRenderer({ section, theme }) {
  const {
    heading,
    subheading,
    items = [],
    style = 'accordion',
    columns = 2,
  } = section?.props || {};

  const [openIndexes, setOpenIndexes] = useState(new Set());

  const toggleItem = useCallback((index) => {
    setOpenIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  if (!items.length) return null;

  const gridColsClass =
    columns === 3
      ? 'md:grid-cols-3'
      : columns === 1
        ? 'grid-cols-1'
        : 'md:grid-cols-2';

  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Heading */}
        {heading && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              {/* Decorative "?" icon with gradient fill */}
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  background: `linear-gradient(135deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 60%, #000))`,
                }}
              >
                <HelpCircle className="h-5 w-5 text-white" />
              </div>
              <h2
                className="text-3xl font-bold tracking-tight sm:text-4xl"
                style={{
                  color: 'var(--ws-text)',
                  fontFamily: 'var(--ws-heading-font)',
                }}
              >
                {heading}
              </h2>
            </div>

            {/* Thin gradient underline */}
            <div className="mx-auto mt-3 flex justify-center">
              <div
                className="h-[2px] w-20 rounded-full"
                style={{
                  background: `linear-gradient(90deg, transparent, var(--ws-primary), transparent)`,
                }}
              />
            </div>
          </div>
        )}

        {/* Subheading */}
        {subheading && (
          <p
            className="mt-4 text-center text-lg"
            style={{ color: 'var(--ws-muted)' }}
          >
            {subheading}
          </p>
        )}

        {/* Items */}
        <div className={heading || subheading ? 'mt-10' : ''}>
          {style === 'accordion' && (
            <motion.div
              className="space-y-3"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
            >
              {items.map((item, index) => (
                <AccordionItem
                  key={index}
                  index={index}
                  question={item.question}
                  answer={item.answer}
                  isOpen={openIndexes.has(index)}
                  onToggle={() => toggleItem(index)}
                />
              ))}
            </motion.div>
          )}

          {style === 'list' && (
            <motion.div
              className="space-y-3"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
            >
              {items.map((item, index) => (
                <ListItem
                  key={index}
                  question={item.question}
                  answer={item.answer}
                />
              ))}
            </motion.div>
          )}

          {style === 'grid' && (
            <motion.div
              className={`grid grid-cols-1 gap-4 ${gridColsClass}`}
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
            >
              {items.map((item, index) => (
                <GridItem
                  key={index}
                  question={item.question}
                  answer={item.answer}
                />
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
