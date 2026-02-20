import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { db, supabase } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, CheckCircle2, XCircle, Loader2, AlertTriangle,
  Building, Calendar, Receipt, CreditCard, Repeat, ArrowRight,
  Edit2, Trash2, Plus, X, ChevronDown, ChevronUp, RefreshCw,
  DollarSign, Euro, Percent, Globe, FileUp, Sparkles, Check, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useUser } from '@/components/context/UserContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from 'sonner';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { FinancePageTransition } from '@/components/finance/ui/FinancePageTransition';

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ─── PDF Text Extraction (proven pattern from InventoryExpenses) ──────────────

async function extractPdfText(pdfFile) {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Sort items by Y position (top-to-bottom), then X (left-to-right)
    // Transform: [scaleX, skewX, skewY, scaleY, translateX, translateY]
    const items = textContent.items
      .filter(item => item.str && item.str.trim())
      .sort((a, b) => {
        const yA = a.transform?.[5] ?? 0;
        const yB = b.transform?.[5] ?? 0;
        // PDF Y-axis goes bottom-to-top, so higher Y = higher on page
        if (Math.abs(yA - yB) > 3) return yB - yA; // different lines (3px threshold)
        const xA = a.transform?.[4] ?? 0;
        const xB = b.transform?.[4] ?? 0;
        return xA - xB; // same line, sort left-to-right
      });

    // Group items into lines based on Y position proximity
    let lastY = null;
    let lineTexts = [];
    for (const item of items) {
      const y = item.transform?.[5] ?? 0;
      if (lastY !== null && Math.abs(y - lastY) > 3) {
        // New line — flush current line
        fullText += lineTexts.join('  ') + '\n';
        lineTexts = [];
      }
      lineTexts.push(item.str.trim());
      lastY = y;
    }
    if (lineTexts.length > 0) {
      fullText += lineTexts.join('  ') + '\n';
    }
    fullText += '\n'; // page separator
  }
  return fullText.trim();
}

// ─── Processing Steps ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 'upload', label: 'Uploading', icon: Upload },
  { id: 'extract', label: 'Extracting Text', icon: FileText },
  { id: 'analyze', label: 'AI Analyzing', icon: Sparkles },
  { id: 'done', label: 'Ready for Review', icon: CheckCircle2 },
];

// ─── Expense Categories ───────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  { value: 'software', label: 'Software & Tools' },
  { value: 'hosting', label: 'Hosting & Cloud' },
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'advertising', label: 'Advertising' },
  { value: 'travel', label: 'Travel' },
  { value: 'telecom', label: 'Telecom' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'other', label: 'Other' },
];

// ─── Confidence Badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ score, label }) {
  if (score == null) return null;
  const pct = Math.round(score * 100);
  let color = 'bg-red-500/20 text-red-400 border-red-500/30';
  if (pct >= 90) color = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  else if (pct >= 70) color = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {label && <span className="opacity-70">{label}</span>}
      {pct}%
    </span>
  );
}

// ─── Processing Pipeline ──────────────────────────────────────────────────────

function ProcessingPipeline({ currentStep, error }) {
  return (
    <div className="flex items-center gap-2 py-4">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const isActive = step.id === currentStep;
        const isDone = STEPS.findIndex(s => s.id === currentStep) > i;
        const isError = error && isActive;

        return (
          <React.Fragment key={step.id}>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
              isError ? 'bg-red-500/10 text-red-400' :
              isDone ? 'bg-emerald-500/10 text-emerald-400' :
              isActive ? 'bg-cyan-500/10 text-cyan-400' :
              'bg-zinc-800/50 text-zinc-500'
            }`}>
              {isActive && !isDone && !isError ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isError ? (
                <XCircle className="w-4 h-4" />
              ) : isDone ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
              <span>{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <ArrowRight className={`w-4 h-4 flex-shrink-0 ${isDone ? 'text-emerald-500' : 'text-zinc-600'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FinanceSmartImport() {
  const { user } = useUser();
  const { theme, ft } = useTheme();
  const fileInputRef = useRef(null);

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [processError, setProcessError] = useState(null);
  const [fileName, setFileName] = useState('');

  // Extraction results
  const [extraction, setExtraction] = useState(null);
  const [vendorMatch, setVendorMatch] = useState(null);
  const [taxClassification, setTaxClassification] = useState(null);
  const [currencyConversion, setCurrencyConversion] = useState(null);
  const [recurring, setRecurring] = useState(null);

  // Editable form (populated from extraction, user can modify)
  const [formData, setFormData] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [saving, setSaving] = useState(false);

  // Tax rates from DB
  const [taxRates, setTaxRates] = useState([]);

  const companyId = user?.company_id || user?.organization_id;

  useEffect(() => {
    loadTaxRates();
  }, [companyId]);

  const loadTaxRates = async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from('tax_rates')
      .select('id, name, rate')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('is_default', { ascending: false });
    if (data) setTaxRates(data);
  };

  // ─── Drop / File Select ───────────────────────────────────────────────────

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer?.files || e.target?.files || []);
    if (files.length === 0) return;
    await processFile(files[0]);
  }, [companyId, user]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // ─── Process File ─────────────────────────────────────────────────────────

  const processFile = async (file) => {
    if (!companyId || !user?.id) {
      toast.error('You must be logged in');
      return;
    }

    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/');
    if (!isPDF && !isImage) {
      toast.error('Please drop a PDF or image file (PNG, JPG)');
      return;
    }

    setProcessing(true);
    setProcessError(null);
    setFileName(file.name);
    setExtraction(null);
    setFormData(null);
    setLineItems([]);

    try {
      // Step 1: Upload to storage
      setCurrentStep('upload');
      const storagePath = `invoices/${companyId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(storagePath, file);
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: urlData } = supabase.storage
        .from('attachments')
        .getPublicUrl(storagePath);
      const fileUrl = urlData?.publicUrl;

      // Step 2: Extract text
      setCurrentStep('extract');
      let pdfText = '';
      if (isPDF) {
        pdfText = await extractPdfText(file);
        console.log(`[SmartImport] PDF text extracted — length: ${pdfText.length}`);
        console.log(`[SmartImport] First 500 chars:\n${pdfText.substring(0, 500)}`);
        console.log(`[SmartImport] Last 200 chars:\n${pdfText.substring(pdfText.length - 200)}`);
      } else {
        // For images, we can't extract text client-side — send empty and let LLM handle via description
        pdfText = `[Image file: ${file.name}]`;
        toast.info('Image files have lower extraction accuracy than PDFs');
      }

      if (!pdfText || pdfText.length < 10) {
        throw new Error('Could not extract text from file. Try a different PDF.');
      }

      // Step 3: Call smart-import-invoice edge function
      setCurrentStep('analyze');
      const requestBody = {
        pdfText,
        fileName: file.name,
        companyId,
        userId: user.id,
      };
      console.log(`[SmartImport] Sending to edge function — pdfText length: ${requestBody.pdfText.length}, keys:`, Object.keys(requestBody));

      const response = await fetch(`${SUPABASE_URL}/functions/v1/smart-import-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      console.log(`[SmartImport] Edge function response — status: ${response.status}, success: ${result.success}`, result.error || '');
      if (!result.success) {
        throw new Error(result.error || 'AI extraction failed');
      }

      // Step 4: Populate review form
      setCurrentStep('done');
      setExtraction(result.extraction);
      setVendorMatch(result.vendor_match);
      setTaxClassification(result.tax_classification);
      setCurrencyConversion(result.currency_conversion);
      setRecurring(result.recurring);

      const ext = result.extraction;
      const conv = result.currency_conversion;

      setFormData({
        vendor_name: ext.vendor?.name || '',
        vendor_address: ext.vendor?.address || '',
        vendor_vat: ext.vendor?.vat_number || '',
        vendor_email: ext.vendor?.email || '',
        vendor_website: ext.vendor?.website || '',
        vendor_iban: ext.vendor?.iban || '',
        invoice_number: ext.invoice?.number || '',
        invoice_date: ext.invoice?.date || new Date().toISOString().split('T')[0],
        due_date: ext.invoice?.due_date || '',
        currency: ext.invoice?.currency || 'EUR',
        subtotal: ext.invoice?.subtotal || 0,
        tax_amount: ext.invoice?.tax_amount || 0,
        total: ext.invoice?.total || 0,
        category: ext.classification?.expense_category || 'other',
        is_reverse_charge: ext.classification?.is_reverse_charge || false,
        is_recurring: ext.classification?.is_recurring || false,
        recurring_frequency: ext.classification?.recurring_frequency || 'monthly',
        tax_rate_id: result.tax_classification?.rate_id || '',
        tax_rate: result.tax_classification?.rate ?? 21,
        original_amount: conv?.original_amount || null,
        original_currency: conv?.original_currency || null,
        exchange_rate: conv?.exchange_rate || null,
        eur_amount: conv?.eur_amount || ext.invoice?.total || 0,
        file_url: fileUrl,
        notes: '',
      });

      setLineItems(
        (ext.line_items || []).map((li, i) => ({
          ...li,
          id: `temp_${i}`,
        }))
      );

      toast.success('Invoice analyzed successfully!');
    } catch (error) {
      console.error('Processing error:', error);
      setProcessError(error.message);
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  // ─── Save & File ──────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!formData || !companyId || !user?.id) return;

    setSaving(true);
    try {
      // 1. Create/update vendor
      let vendorId = vendorMatch?.id || null;
      if (!vendorId && formData.vendor_name) {
        const { data: newVendor, error: vErr } = await supabase
          .from('vendors')
          .insert({
            company_id: companyId,
            name: formData.vendor_name,
            email: formData.vendor_email || null,
            address: formData.vendor_address || null,
            vat_number: formData.vendor_vat || null,
            website: formData.vendor_website || null,
            iban: formData.vendor_iban || null,
            is_active: true,
          })
          .select('id')
          .single();
        if (vErr) console.warn('Vendor create error:', vErr);
        else vendorId = newVendor?.id;
      }

      // 2. Calculate EUR amount
      const isEUR = formData.currency === 'EUR';
      const amount = isEUR ? formData.total : (formData.eur_amount || formData.total);
      const taxAmount = formData.tax_amount || 0;
      const taxRate = formData.tax_rate || 0;

      // 3. Create expense
      const expenseData = {
        user_id: user.id,
        company_id: companyId,
        description: `${formData.vendor_name} ${formData.invoice_number ? '#' + formData.invoice_number : ''}`.trim(),
        amount,
        category: formData.category,
        vendor: formData.vendor_name,
        date: formData.invoice_date,
        notes: formData.notes || (formData.is_reverse_charge ? 'Reverse charge (intracommunautaire verwerving / dienst)' : ''),
        receipt_url: formData.file_url || '',
        original_file_url: formData.file_url || '',
        is_recurring: formData.is_recurring,
        tax_deductible: !formData.is_reverse_charge,
        tax_amount: isEUR ? taxAmount : Math.round(taxAmount * (formData.exchange_rate || 1) * 100) / 100,
        tax_percent: taxRate,
        tax_rate_id: formData.tax_rate_id || null,
        invoice_date: formData.invoice_date,
        payment_due_date: formData.due_date || null,
        external_reference: formData.invoice_number || null,
        currency: 'EUR',
        subtotal: isEUR ? formData.subtotal : Math.round((formData.subtotal || 0) * (formData.exchange_rate || 1) * 100) / 100,
        total: amount,
        status: 'approved',
        payment_status: 'pending',
        source_type: 'smart_import',
        vendor_id: vendorId,
        original_amount: !isEUR ? formData.total : null,
        original_currency: !isEUR ? formData.currency : null,
        exchange_rate: !isEUR ? formData.exchange_rate : null,
        ai_extracted_data: extraction || {},
        ai_confidence: extraction?.confidence?.overall || null,
        needs_review: false,
        review_status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      };

      const newExpense = await db.entities.Expense.create(expenseData);
      if (!newExpense?.id) throw new Error('Failed to create expense');

      // 4. Create line items
      if (lineItems.length > 0) {
        const lineItemRows = lineItems.map((li, i) => ({
          expense_id: newExpense.id,
          description: li.description,
          quantity: li.quantity || 1,
          unit_price: li.unit_price || 0,
          tax_percent: li.tax_rate_percent || 0,
          tax_amount: (li.unit_price || 0) * (li.quantity || 1) * ((li.tax_rate_percent || 0) / 100),
          line_total: li.line_total || 0,
          line_number: i + 1,
          ai_confidence: extraction?.confidence ? { line_items: extraction.confidence.line_items } : {},
        }));

        const { error: liErr } = await supabase
          .from('expense_line_items')
          .insert(lineItemRows);
        if (liErr) console.warn('Line items error:', liErr);
      }

      // 5. Post to GL
      try {
        const { data: glResult } = await supabase.rpc('post_expense', { p_expense_id: newExpense.id });
        if (glResult?.success) {
          toast.success('Posted to General Ledger');
        } else if (glResult?.error) {
          toast.info(glResult.error);
        }
      } catch (glErr) {
        console.warn('GL posting (non-critical):', glErr);
      }

      // 6. Create recurring template if detected
      if (formData.is_recurring && formData.vendor_name) {
        try {
          const nextDate = recurring?.suggested_next_date || (() => {
            const d = new Date(formData.invoice_date);
            d.setMonth(d.getMonth() + 1);
            return d.toISOString().split('T')[0];
          })();

          const { error: recErr } = await supabase.from('recurring_invoices').insert({
            company_id: companyId,
            client_name: formData.vendor_name,
            client_email: formData.vendor_email || null,
            description: `Recurring: ${formData.vendor_name} ${formData.category}`,
            items: lineItems.map(li => ({
              description: li.description,
              quantity: li.quantity,
              unit_price: li.unit_price,
              tax_rate_percent: li.tax_rate_percent,
            })),
            tax_rate: formData.tax_rate,
            frequency: formData.recurring_frequency || 'monthly',
            next_generate_date: nextDate,
            auto_send: false,
            is_active: true,
            total_generated: 0,
            created_by: user.id,
          });
          if (!recErr) toast.success('Recurring template created');
        } catch (recErr) {
          console.warn('Recurring template (non-critical):', recErr);
        }
      }

      toast.success('Expense saved and filed!');
      resetState();
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ─── State Management ─────────────────────────────────────────────────────

  const resetState = () => {
    setProcessing(false);
    setCurrentStep(null);
    setProcessError(null);
    setFileName('');
    setExtraction(null);
    setVendorMatch(null);
    setTaxClassification(null);
    setCurrencyConversion(null);
    setRecurring(null);
    setFormData(null);
    setLineItems([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateFormField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateLineItem = (idx, field, value) => {
    setLineItems(prev => prev.map((li, i) => {
      if (i !== idx) return li;
      const updated = { ...li, [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        updated.line_total = (parseFloat(updated.quantity) || 0) * (parseFloat(updated.unit_price) || 0);
      }
      return updated;
    }));
  };

  const removeLineItem = (idx) => {
    setLineItems(prev => prev.filter((_, i) => i !== idx));
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const showReview = formData && !processing;

  return (
    <FinancePageTransition>
      <div className={`min-h-screen ${ft('bg-gray-50', 'bg-black')} p-6`}>
        <PageHeader
          title="Smart Invoice Import"
          description="Drop an invoice PDF and AI handles the rest — extraction, tax, currency, vendor matching."
        />

        <div className="max-w-5xl mx-auto mt-6 space-y-6">
          {/* ─── Drop Zone ──────────────────────────────────────────── */}
          {!showReview && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className={`${ft('bg-white border-gray-200', 'bg-zinc-900/50 border-zinc-800')} overflow-hidden`}>
                <CardContent className="p-0">
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => !processing && fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center p-16 cursor-pointer transition-all border-2 border-dashed rounded-xl m-4 ${
                      processing
                        ? 'border-cyan-500/30 bg-cyan-500/5'
                        : 'border-zinc-700 hover:border-cyan-500/50 hover:bg-cyan-500/5'
                    }`}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
                        <p className="text-lg font-medium text-zinc-200">Processing {fileName}...</p>
                        <ProcessingPipeline currentStep={currentStep} error={processError} />
                      </>
                    ) : processError ? (
                      <>
                        <XCircle className="w-12 h-12 text-red-400 mb-4" />
                        <p className="text-lg font-medium text-red-400 mb-2">Processing Failed</p>
                        <p className="text-sm text-zinc-400 mb-4">{processError}</p>
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); resetState(); }}>
                          <RefreshCw className="w-4 h-4 mr-2" /> Try Again
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-4">
                          <Upload className="w-8 h-8 text-cyan-400" />
                        </div>
                        <p className={`text-lg font-medium ${ft('text-gray-900', 'text-zinc-200')} mb-1`}>
                          Drop an invoice here
                        </p>
                        <p className="text-sm text-zinc-500 mb-4">
                          PDF, PNG, or JPG — AI will extract everything automatically
                        </p>
                        <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-700">
                          Supports multi-language: English, Dutch, German
                        </Badge>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) processFile(e.target.files[0]);
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ─── Review Card ────────────────────────────────────────── */}
          {showReview && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Header with confidence + file info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${ft('text-gray-900', 'text-white')}`}>{fileName}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <ConfidenceBadge score={extraction?.confidence?.overall} label="Overall" />
                      <ConfidenceBadge score={extraction?.confidence?.vendor} label="Vendor" />
                      <ConfidenceBadge score={extraction?.confidence?.amounts} label="Amounts" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={resetState}>
                    <X className="w-4 h-4 mr-1" /> Discard
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                    Save & File
                  </Button>
                </div>
              </div>

              {/* Vendor Section */}
              <Card className={ft('bg-white border-gray-200', 'bg-zinc-900/50 border-zinc-800')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building className="w-4 h-4 text-cyan-400" /> Vendor / Supplier
                    </CardTitle>
                    {vendorMatch && (
                      <Badge variant="outline" className={`text-xs ${
                        vendorMatch.match_type === 'new' ? 'border-yellow-500/50 text-yellow-400' :
                        'border-emerald-500/50 text-emerald-400'
                      }`}>
                        {vendorMatch.match_type === 'new' ? 'New vendor' :
                         vendorMatch.match_type === 'exact_vat' ? 'Matched (VAT)' :
                         'Matched (name)'}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-zinc-500">Company Name</Label>
                    <Input
                      value={formData.vendor_name}
                      onChange={(e) => updateFormField('vendor_name', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-500">VAT Number</Label>
                    <Input
                      value={formData.vendor_vat}
                      onChange={(e) => updateFormField('vendor_vat', e.target.value)}
                      className="mt-1"
                      placeholder="e.g. NL123456789B01"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-500">Email</Label>
                    <Input
                      value={formData.vendor_email}
                      onChange={(e) => updateFormField('vendor_email', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-500">IBAN</Label>
                    <Input
                      value={formData.vendor_iban}
                      onChange={(e) => updateFormField('vendor_iban', e.target.value)}
                      className="mt-1"
                      placeholder="e.g. NL91ABNA0417164300"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-zinc-500">Address</Label>
                    <Input
                      value={formData.vendor_address}
                      onChange={(e) => updateFormField('vendor_address', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Invoice Details */}
              <Card className={ft('bg-white border-gray-200', 'bg-zinc-900/50 border-zinc-800')}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-cyan-400" /> Invoice Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-zinc-500">Invoice Number</Label>
                    <Input
                      value={formData.invoice_number}
                      onChange={(e) => updateFormField('invoice_number', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-500">Invoice Date</Label>
                    <Input
                      type="date"
                      value={formData.invoice_date}
                      onChange={(e) => updateFormField('invoice_date', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-500">Due Date</Label>
                    <Input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => updateFormField('due_date', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-500">Category</Label>
                    <Select value={formData.category} onValueChange={(v) => updateFormField('category', v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-500">Tax Rate</Label>
                    <Select
                      value={formData.tax_rate_id || `manual_${formData.tax_rate}`}
                      onValueChange={(v) => {
                        if (v.startsWith('manual_')) {
                          updateFormField('tax_rate', parseFloat(v.replace('manual_', '')));
                          updateFormField('tax_rate_id', '');
                        } else {
                          const tr = taxRates.find(t => t.id === v);
                          if (tr) {
                            updateFormField('tax_rate_id', tr.id);
                            updateFormField('tax_rate', Number(tr.rate));
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {taxRates.map(tr => (
                          <SelectItem key={tr.id} value={tr.id}>{tr.name} ({tr.rate}%)</SelectItem>
                        ))}
                        {taxRates.length === 0 && (
                          <>
                            <SelectItem value="manual_21">BTW 21%</SelectItem>
                            <SelectItem value="manual_9">BTW 9%</SelectItem>
                            <SelectItem value="manual_0">BTW 0%</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-500">Notes</Label>
                    <Input
                      value={formData.notes}
                      onChange={(e) => updateFormField('notes', e.target.value)}
                      className="mt-1"
                      placeholder="Optional notes"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Amounts + Currency */}
              <Card className={ft('bg-white border-gray-200', 'bg-zinc-900/50 border-zinc-800')}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-cyan-400" /> Amounts
                    {formData.currency !== 'EUR' && (
                      <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-400 ml-2">
                        <Globe className="w-3 h-3 mr-1" /> Foreign Currency
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs text-zinc-500">Currency</Label>
                      <Input
                        value={formData.currency}
                        onChange={(e) => updateFormField('currency', e.target.value.toUpperCase())}
                        className="mt-1"
                        maxLength={3}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-zinc-500">Subtotal</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.subtotal}
                        onChange={(e) => updateFormField('subtotal', parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-zinc-500">Tax Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.tax_amount}
                        onChange={(e) => updateFormField('tax_amount', parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-zinc-500">Total ({formData.currency})</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.total}
                        onChange={(e) => updateFormField('total', parseFloat(e.target.value) || 0)}
                        className="mt-1 font-semibold"
                      />
                    </div>
                    {formData.currency !== 'EUR' && (
                      <>
                        <div>
                          <Label className="text-xs text-zinc-500">ECB Exchange Rate</Label>
                          <Input
                            type="number"
                            step="0.000001"
                            value={formData.exchange_rate || ''}
                            onChange={(e) => {
                              const rate = parseFloat(e.target.value) || 0;
                              updateFormField('exchange_rate', rate);
                              updateFormField('eur_amount', Math.round(formData.total * rate * 100) / 100);
                            }}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-500">Amount in EUR</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.eur_amount || ''}
                              onChange={(e) => updateFormField('eur_amount', parseFloat(e.target.value) || 0)}
                              className="font-semibold"
                            />
                            <Euro className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Reverse Charge indicator */}
                  {formData.is_reverse_charge && (
                    <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm text-yellow-400">
                        Reverse charge applies — BTW shifted to buyer (verlegde BTW)
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Line Items */}
              {lineItems.length > 0 && (
                <Card className={ft('bg-white border-gray-200', 'bg-zinc-900/50 border-zinc-800')}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4 text-cyan-400" /> Line Items ({lineItems.length})
                        <ConfidenceBadge score={extraction?.confidence?.line_items} />
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {/* Header */}
                      <div className="grid grid-cols-12 gap-2 text-xs text-zinc-500 font-medium px-1">
                        <div className="col-span-5">Description</div>
                        <div className="col-span-1 text-right">Qty</div>
                        <div className="col-span-2 text-right">Unit Price</div>
                        <div className="col-span-1 text-right">Tax %</div>
                        <div className="col-span-2 text-right">Total</div>
                        <div className="col-span-1"></div>
                      </div>
                      {lineItems.map((li, i) => (
                        <div key={li.id} className={`grid grid-cols-12 gap-2 items-center ${ft('bg-gray-50', 'bg-zinc-800/50')} rounded-lg px-2 py-1.5`}>
                          <div className="col-span-5">
                            <Input
                              value={li.description}
                              onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                              className="text-sm h-8"
                            />
                          </div>
                          <div className="col-span-1">
                            <Input
                              type="number"
                              value={li.quantity}
                              onChange={(e) => updateLineItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                              className="text-sm h-8 text-right"
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={li.unit_price}
                              onChange={(e) => updateLineItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                              className="text-sm h-8 text-right"
                            />
                          </div>
                          <div className="col-span-1">
                            <Input
                              type="number"
                              value={li.tax_rate_percent}
                              onChange={(e) => updateLineItem(i, 'tax_rate_percent', parseFloat(e.target.value) || 0)}
                              className="text-sm h-8 text-right"
                            />
                          </div>
                          <div className="col-span-2 text-right">
                            <span className={`text-sm font-medium ${ft('text-gray-900', 'text-zinc-200')}`}>
                              {formData.currency} {(li.line_total || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="col-span-1 text-right">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLineItem(i)}>
                              <Trash2 className="w-3 h-3 text-zinc-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recurring Detection */}
              {formData.is_recurring && (
                <Card className={`${ft('bg-white border-gray-200', 'bg-zinc-900/50 border-zinc-800')} border-cyan-500/20`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Repeat className="w-4 h-4 text-cyan-400" /> Recurring Subscription Detected
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs text-zinc-500">Frequency</Label>
                        <Select value={formData.recurring_frequency} onValueChange={(v) => updateFormField('recurring_frequency', v)}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="annual">Annual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-500">Next Expected Date</Label>
                        <Input
                          type="date"
                          value={recurring?.suggested_next_date || ''}
                          readOnly
                          className="mt-1 text-zinc-400"
                        />
                      </div>
                      <div className="flex items-end">
                        <div className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 rounded-lg text-sm text-cyan-400">
                          <Clock className="w-4 h-4" />
                          A recurring template will be auto-created
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Bottom action bar */}
              <div className="flex items-center justify-between pt-2 pb-8">
                <Button variant="outline" onClick={resetState}>
                  <X className="w-4 h-4 mr-2" /> Discard & Start Over
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white px-8"
                  size="lg"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    <><Check className="w-4 h-4 mr-2" /> Save & File</>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </FinancePageTransition>
  );
}
