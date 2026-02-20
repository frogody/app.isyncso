import React, { useState, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * AccordionItem
 *
 * A single expandable FAQ item with smooth height transition
 * and a rotating chevron indicator.
 */
function AccordionItem({ question, answer, isOpen, onToggle }) {
  return (
    <div
      className="border-b"
      style={{ borderColor: 'var(--ws-border)' }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:opacity-80"
      >
        <span
          className="text-base font-semibold"
          style={{ color: 'var(--ws-text)' }}
        >
          {question}
        </span>
        <ChevronDown
          className="h-5 w-5 shrink-0 transition-transform duration-300"
          style={{
            color: 'var(--ws-muted)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{
          maxHeight: isOpen ? '500px' : '0px',
          opacity: isOpen ? 1 : 0,
        }}
      >
        <p
          className="pb-4 text-sm leading-relaxed"
          style={{ color: 'var(--ws-muted)' }}
        >
          {answer}
        </p>
      </div>
    </div>
  );
}

/**
 * ListItem
 *
 * A non-collapsible FAQ item with bold question and muted answer.
 */
function ListItem({ question, answer }) {
  return (
    <div
      className="border-b py-4"
      style={{ borderColor: 'var(--ws-border)' }}
    >
      <p
        className="text-base font-semibold"
        style={{ color: 'var(--ws-text)' }}
      >
        {question}
      </p>
      <p
        className="mt-1.5 text-sm leading-relaxed"
        style={{ color: 'var(--ws-muted)' }}
      >
        {answer}
      </p>
    </div>
  );
}

/**
 * GridItem
 *
 * A card-style FAQ item for grid layout.
 */
function GridItem({ question, answer }) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{
        borderColor: 'var(--ws-border)',
        backgroundColor: 'var(--ws-surface)',
      }}
    >
      <p
        className="text-base font-semibold"
        style={{ color: 'var(--ws-text)' }}
      >
        {question}
      </p>
      <p
        className="mt-2 text-sm leading-relaxed"
        style={{ color: 'var(--ws-muted)' }}
      >
        {answer}
      </p>
    </div>
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

        {/* Items */}
        <div className={heading || subheading ? 'mt-10' : ''}>
          {style === 'accordion' && (
            <div>
              {items.map((item, index) => (
                <AccordionItem
                  key={index}
                  question={item.question}
                  answer={item.answer}
                  isOpen={openIndexes.has(index)}
                  onToggle={() => toggleItem(index)}
                />
              ))}
            </div>
          )}

          {style === 'list' && (
            <div>
              {items.map((item, index) => (
                <ListItem
                  key={index}
                  question={item.question}
                  answer={item.answer}
                />
              ))}
            </div>
          )}

          {style === 'grid' && (
            <div className={`grid grid-cols-1 gap-4 ${gridColsClass}`}>
              {items.map((item, index) => (
                <GridItem
                  key={index}
                  question={item.question}
                  answer={item.answer}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
