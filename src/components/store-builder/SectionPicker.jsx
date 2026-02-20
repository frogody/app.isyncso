import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  Image,
  Package,
  Grid3x3,
  Info,
  Quote,
  Megaphone,
  HelpCircle,
  Mail,
  Flag,
  BarChart3,
  FileText,
  Layers,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Section type definitions
// ---------------------------------------------------------------------------

const SECTION_TYPES = [
  { type: 'hero', Icon: Image, name: 'Hero Banner', description: 'Large headline with call-to-action' },
  { type: 'featured_products', Icon: Package, name: 'Featured Products', description: 'Showcase your best products' },
  { type: 'category_grid', Icon: Grid3x3, name: 'Category Grid', description: 'Browse products by category' },
  { type: 'about', Icon: Info, name: 'About', description: 'Company information and story' },
  { type: 'testimonials', Icon: Quote, name: 'Testimonials', description: 'Client reviews and quotes' },
  { type: 'cta', Icon: Megaphone, name: 'Call to Action', description: 'Conversion-focused banner' },
  { type: 'faq', Icon: HelpCircle, name: 'FAQ', description: 'Frequently asked questions' },
  { type: 'contact', Icon: Mail, name: 'Contact', description: 'Contact form and information' },
  { type: 'banner', Icon: Flag, name: 'Banner', description: 'Simple announcement banner' },
  { type: 'stats', Icon: BarChart3, name: 'Statistics', description: 'Key numbers and metrics' },
  { type: 'rich_text', Icon: FileText, name: 'Rich Text', description: 'Custom content block' },
  { type: 'logo_grid', Icon: Layers, name: 'Logo Grid', description: 'Partner and brand logos' },
];

// ---------------------------------------------------------------------------
// SectionPicker modal
// ---------------------------------------------------------------------------

export default function SectionPicker({ isOpen, onClose, onAddSection }) {
  function handleSelect(type) {
    onAddSection(type);
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-lg mx-4 bg-zinc-900 rounded-2xl border border-zinc-800/60 shadow-2xl shadow-black/50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
              <h2 className="text-base font-semibold text-zinc-100">Add Section</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid */}
            <div className="p-4 grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
              {SECTION_TYPES.map(({ type, Icon, name, description }) => (
                <button
                  key={type}
                  onClick={() => handleSelect(type)}
                  className="
                    flex flex-col items-start gap-2 p-4 rounded-xl
                    bg-zinc-800/50 border border-zinc-800/60
                    hover:border-cyan-500/50 hover:bg-zinc-800/80
                    cursor-pointer transition-colors text-left
                  "
                >
                  <Icon className="w-5 h-5 text-cyan-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{description}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
