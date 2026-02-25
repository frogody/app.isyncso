import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles, FileText, Percent, Tag, ArrowRight,
  ChevronDown, ChevronUp, CheckCircle2, BookOpen,
  RefreshCw, Building2, ArrowLeftRight, ShieldCheck,
} from 'lucide-react';
import { useTheme } from '@/contexts/GlobalThemeContext';
import {
  generateSummary,
  generateDocTypeExplanation,
  generateTaxGuidance,
  generateCategoryInsight,
  generateNextSteps,
} from '@/lib/financeInsights';

const STEP_ICONS = {
  save: CheckCircle2,
  ledger: BookOpen,
  recurring: RefreshCw,
  subscription: RefreshCw,
  vendor: Building2,
  currency: ArrowLeftRight,
};

export default function FinanceCopilotPanel({
  extraction,
  taxDecision,
  documentType,
  recurring,
  currencyConversion,
  vendorMatch,
  confidenceData,
  formData,
  fileName,
}) {
  const { ft } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  const insights = useMemo(() => {
    if (!extraction) return null;
    return {
      summary: generateSummary(extraction, documentType, recurring, currencyConversion),
      docType: generateDocTypeExplanation(documentType),
      tax: generateTaxGuidance(taxDecision, extraction),
      category: generateCategoryInsight(formData?.category, formData?.vendor_name, extraction?.line_items),
      nextSteps: generateNextSteps(documentType, formData, recurring, vendorMatch, currencyConversion),
    };
  }, [extraction, taxDecision, documentType, recurring, currencyConversion, vendorMatch, formData?.category, formData?.vendor_name, formData?.currency]);

  if (!insights) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      <div className={`rounded-2xl border ${ft(
        'bg-gradient-to-r from-cyan-50 via-blue-50 to-cyan-50 border-cyan-200',
        'bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-cyan-500/5 border-cyan-500/20'
      )} overflow-hidden`}>
        <div className="p-4">
          {/* Header */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-2.5 w-full text-left mb-2"
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${ft('bg-cyan-100', 'bg-cyan-500/15')}`}>
              <Sparkles className="w-4 h-4 text-cyan-500" />
            </div>
            <span className={`text-sm font-semibold ${ft('text-cyan-700', 'text-cyan-400')}`}>
              Your AI Accountant
            </span>
            <div className="ml-auto">
              {collapsed
                ? <ChevronDown className={`w-4 h-4 ${ft('text-cyan-500', 'text-cyan-500/60')}`} />
                : <ChevronUp className={`w-4 h-4 ${ft('text-cyan-500', 'text-cyan-500/60')}`} />
              }
            </div>
          </button>

          {/* Summary — always visible */}
          <p className={`text-[15px] leading-relaxed ${ft('text-gray-700', 'text-zinc-300')}`}>
            {insights.summary}
          </p>

          {/* Expandable accordion sections */}
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="mt-3">
                  <Accordion type="multiple" defaultValue={['doc-type', 'tax']}>
                    {/* Document Type */}
                    <AccordionItem value="doc-type" className={`border-b ${ft('border-cyan-200/50', 'border-cyan-500/10')}`}>
                      <AccordionTrigger className={`py-3 hover:no-underline ${ft('text-gray-800', 'text-zinc-200')}`}>
                        <div className="flex items-center gap-2">
                          <FileText className={`w-4 h-4 ${ft('text-cyan-600', 'text-cyan-400')}`} />
                          <span className="text-sm font-medium">What type of document is this?</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-3">
                        <div className="pl-6 space-y-2">
                          <p className={`text-sm font-medium ${ft('text-gray-800', 'text-white')}`}>
                            {insights.docType.plain}
                          </p>
                          <p className={`text-sm ${ft('text-gray-600', 'text-zinc-400')}`}>
                            {insights.docType.explanation}
                          </p>
                          <p className={`text-xs ${ft('text-gray-500', 'text-zinc-500')} italic`}>
                            {insights.docType.tip}
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Tax & BTW */}
                    <AccordionItem value="tax" className={`border-b ${ft('border-cyan-200/50', 'border-cyan-500/10')}`}>
                      <AccordionTrigger className={`py-3 hover:no-underline ${ft('text-gray-800', 'text-zinc-200')}`}>
                        <div className="flex items-center gap-2">
                          <Percent className={`w-4 h-4 ${ft('text-cyan-600', 'text-cyan-400')}`} />
                          <span className="text-sm font-medium">Tax & BTW Treatment</span>
                          {insights.tax.badge && (
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${ft('border-amber-300 text-amber-700', 'border-amber-500/30 text-amber-400')}`}>
                              {insights.tax.badge}
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-3">
                        <div className="pl-6 space-y-2">
                          <p className={`text-sm font-medium ${ft('text-gray-800', 'text-white')}`}>
                            {insights.tax.headline}
                          </p>
                          <p className={`text-sm ${ft('text-gray-600', 'text-zinc-400')}`}>
                            {insights.tax.explanation}
                          </p>
                          <div className={`text-sm px-3 py-2 rounded-lg ${ft('bg-green-50 text-green-800 border border-green-200', 'bg-green-500/10 text-green-300 border border-green-500/20')}`}>
                            <ShieldCheck className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                            {insights.tax.whatItMeans}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Category & Deductions */}
                    <AccordionItem value="category" className={`border-b ${ft('border-cyan-200/50', 'border-cyan-500/10')}`}>
                      <AccordionTrigger className={`py-3 hover:no-underline ${ft('text-gray-800', 'text-zinc-200')}`}>
                        <div className="flex items-center gap-2">
                          <Tag className={`w-4 h-4 ${ft('text-cyan-600', 'text-cyan-400')}`} />
                          <span className="text-sm font-medium">Category & Deductions</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-3">
                        <div className="pl-6 space-y-2">
                          <p className={`text-sm ${ft('text-gray-600', 'text-zinc-400')}`}>
                            {insights.category.reason}
                          </p>
                          <p className={`text-sm ${ft('text-gray-700', 'text-zinc-300')}`}>
                            {insights.category.deductible ? (
                              <><CheckCircle2 className="w-3.5 h-3.5 inline mr-1 -mt-0.5 text-green-500" />{insights.category.deductibilityNote}</>
                            ) : (
                              insights.category.deductibilityNote
                            )}
                          </p>
                          <p className={`text-xs ${ft('text-gray-500', 'text-zinc-500')} italic`}>
                            {insights.category.changeHint}
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* What Happens Next */}
                    <AccordionItem value="next-steps" className="border-b-0">
                      <AccordionTrigger className={`py-3 hover:no-underline ${ft('text-gray-800', 'text-zinc-200')}`}>
                        <div className="flex items-center gap-2">
                          <ArrowRight className={`w-4 h-4 ${ft('text-cyan-600', 'text-cyan-400')}`} />
                          <span className="text-sm font-medium">What happens when I save?</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-1">
                        <div className="pl-6 space-y-1.5">
                          {insights.nextSteps.map((step, i) => {
                            const Icon = STEP_ICONS[step.icon] || CheckCircle2;
                            return (
                              <div key={i} className="flex items-start gap-2">
                                <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${ft('text-cyan-600', 'text-cyan-400/70')}`} />
                                <span className={`text-sm ${ft('text-gray-600', 'text-zinc-400')}`}>
                                  {step.text}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
