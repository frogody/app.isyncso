import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { db, supabase } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, CheckCircle2, XCircle, Loader2, AlertTriangle,
  Building, Calendar, Receipt, CreditCard, Repeat, ArrowRight,
  Edit2, Trash2, Plus, X, ChevronDown, ChevronUp, RefreshCw,
  DollarSign, Euro, Percent, Globe, FileUp, Sparkles, Check, Clock,
  Flag, Info
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
import { CreditCostBadge } from '@/components/credits/CreditCostBadge';
import { createPageUrl } from '@/utils';
import CountrySelector from '@/components/finance/CountrySelector';
import FinanceCopilotPanel from '@/components/finance/FinanceCopilotPanel';
import { determineTaxRulesForPurchase, determineTaxRulesForSale } from '@/lib/btwRules';

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

    const items = textContent.items
      .filter(item => item.str && item.str.trim())
      .sort((a, b) => {
        const yA = a.transform?.[5] ?? 0;
        const yB = b.transform?.[5] ?? 0;
        if (Math.abs(yA - yB) > 3) return yB - yA;
        const xA = a.transform?.[4] ?? 0;
        const xB = b.transform?.[4] ?? 0;
        return xA - xB;
      });

    let lastY = null;
    let lineTexts = [];
    for (const item of items) {
      const y = item.transform?.[5] ?? 0;
      if (lastY !== null && Math.abs(y - lastY) > 3) {
        fullText += lineTexts.join('  ') + '\n';
        lineTexts = [];
      }
      lineTexts.push(item.str.trim());
      lastY = y;
    }
    if (lineTexts.length > 0) {
      fullText += lineTexts.join('  ') + '\n';
    }
    fullText += '\n';
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

// ─── Document Type Options ────────────────────────────────────────────────────

const DOC_TYPES = [
  { value: 'expense', label: 'Expense', icon: CreditCard },
  { value: 'bill', label: 'Bill (AP)', icon: Receipt },
  { value: 'sales_invoice', label: 'Sales Invoice (AR)', icon: Receipt },
  { value: 'credit_note', label: 'Credit Note', icon: FileText },
  { value: 'proforma', label: 'Proforma', icon: FileUp },
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
  const { user, company } = useUser();
  const { theme, ft } = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [processError, setProcessError] = useState(null);
  const [fileName, setFileName] = useState('');

  // Extraction results
  const [extraction, setExtraction] = useState(null);
  const [vendorMatch, setVendorMatch] = useState(null);
  const [prospectMatch, setProspectMatch] = useState(null);
  const [taxClassification, setTaxClassification] = useState(null);
  const [currencyConversion, setCurrencyConversion] = useState(null);
  const [recurring, setRecurring] = useState(null);
  const [documentType, setDocumentType] = useState('expense');
  const [taxDecision, setTaxDecision] = useState(null);
  const [confidenceData, setConfidenceData] = useState(null);

  // Editable form (populated from extraction, user can modify)
  const [formData, setFormData] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [saving, setSaving] = useState(false);

  // Tax rates from DB
  const [taxRates, setTaxRates] = useState([]);

  // Email import inbox
  const [emailImports, setEmailImports] = useState([]);
  const [emailImportsLoading, setEmailImportsLoading] = useState(false);

  const companyId = user?.company_id || user?.organization_id;

  useEffect(() => {
    loadTaxRates();
    loadEmailImports();
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

  const loadEmailImports = async () => {
    if (!companyId) return;
    setEmailImportsLoading(true);
    try {
      const { data } = await supabase
        .from('email_invoice_imports')
        .select('*')
        .eq('company_id', companyId)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false })
        .limit(20);
      setEmailImports(data || []);
    } catch (e) {
      console.warn('Failed to load email imports:', e);
    } finally {
      setEmailImportsLoading(false);
    }
  };

  const handleReviewEmailImport = async (importItem) => {
    if (!importItem.attachment_storage_path) {
      toast.error('Attachment not available');
      return;
    }
    try {
      // Download file from storage and process it
      const { data: fileData, error } = await supabase.storage
        .from('attachments')
        .download(importItem.attachment_storage_path);
      if (error) throw error;

      const file = new File([fileData], importItem.attachment_filename || 'invoice.pdf', {
        type: 'application/pdf'
      });
      await processFile(file);

      // Mark as processing
      await supabase
        .from('email_invoice_imports')
        .update({ status: 'processing' })
        .eq('id', importItem.id);
    } catch (e) {
      console.error('Failed to review email import:', e);
      toast.error('Failed to load attachment');
    }
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
    setDocumentType('expense');
    setTaxDecision(null);
    setConfidenceData(null);

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
      } else {
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
        myCompany: {
          name: company?.name || '',
          vat: company?.vat_number || company?.invoice_branding?.company_vat || '',
          email: company?.invoice_branding?.company_email || company?.email || '',
          address: company?.legal_address || company?.invoice_branding?.company_address || '',
          iban: company?.invoice_branding?.iban || '',
          kvk: company?.kvk_number || '',
        },
      };

      const response = await fetch(`${SUPABASE_URL}/functions/v1/smart-import-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'AI extraction failed');
      }

      // Step 4: Populate review form
      setCurrentStep('done');
      setExtraction(result.extraction);
      setVendorMatch(result.vendor_match);
      setProspectMatch(result.prospect_match || null);
      setTaxClassification(result.tax_classification);
      setCurrencyConversion(result.currency_conversion);
      setRecurring(result.recurring);
      setDocumentType(result.document_type || 'expense');
      setTaxDecision(result.tax_decision || null);
      setConfidenceData(result.confidence || result.extraction?.confidence || null);

      const ext = result.extraction;
      const conv = result.currency_conversion;

      setFormData({
        vendor_name: ext.vendor?.name || '',
        vendor_address: ext.vendor?.address || '',
        vendor_country: ext.vendor?.country || '',
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
        gl_code: ext.classification?.gl_code || '6900',
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

      // CRM → Invoice enrichment: fill empty fields from matched CRM prospect
      if (result.prospect_match?.prospect_data) {
        const pd = result.prospect_match.prospect_data;
        setFormData(prev => ({
          ...prev,
          vendor_email: prev.vendor_email || pd.email || '',
          vendor_country: prev.vendor_country || pd.location_country || '',
          vendor_vat: prev.vendor_vat || pd.vat_number || '',
          vendor_address: prev.vendor_address || pd.billing_address || '',
        }));
      }

      toast.success('Invoice analyzed successfully!');
    } catch (error) {
      console.error('Processing error:', error);
      setProcessError(error.message);
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  // ─── Client-side prospect matching (when user switches doc type) ────────────

  const matchProspectClientSide = async () => {
    if (!companyId || !formData?.vendor_name) return;
    const orgId = companyId;
    const name = formData.vendor_name;
    const vat = formData.vendor_vat;
    const email = formData.vendor_email;
    const fields = 'id, company, email, location_country, vat_number, billing_address';

    try {
      // Tier 1: VAT match
      if (vat) {
        const { data } = await supabase.from('prospects').select(fields)
          .eq('organization_id', orgId).eq('vat_number', vat).limit(1).maybeSingle();
        if (data) {
          setProspectMatch({ id: data.id, match_type: 'exact_vat', confidence: 0.99, prospect_data: data });
          return;
        }
      }
      // Tier 2: Email match
      if (email) {
        const { data } = await supabase.from('prospects').select(fields)
          .eq('organization_id', orgId).eq('email', email.toLowerCase()).limit(1).maybeSingle();
        if (data) {
          setProspectMatch({ id: data.id, match_type: 'exact_email', confidence: 0.95, prospect_data: data });
          return;
        }
      }
      // Tier 3: Fuzzy name match
      if (name) {
        const { data } = await supabase.from('prospects').select(fields)
          .eq('organization_id', orgId).ilike('company', `%${name}%`)
          .order('updated_date', { ascending: false }).limit(5);
        if (data?.length > 0) {
          const [best, ...rest] = data;
          setProspectMatch({
            id: best.id, match_type: 'fuzzy_name', confidence: 0.85, prospect_data: best,
            alternatives: rest.length > 0 ? rest.map(m => ({ id: m.id, company: m.company, email: m.email, location_country: m.location_country, match_type: 'fuzzy_name' })) : undefined,
          });
          return;
        }
      }
      // No match — will auto-create on save
      setProspectMatch({ id: null, match_type: 'new', confidence: 1.0, prospect_data: { company: name, email, location_country: formData.vendor_country, vat_number: vat, billing_address: formData.vendor_address } });
    } catch (err) {
      console.warn('Client-side prospect matching failed:', err);
      setProspectMatch(null);
    }
  };

  // When user manually switches to sales_invoice and we don't have a prospect match yet, run client-side matching
  useEffect(() => {
    if (documentType === 'sales_invoice' && formData && !prospectMatch) {
      matchProspectClientSide();
    }
    if (documentType !== 'sales_invoice') {
      setProspectMatch(null);
    }
  }, [documentType]);

  // ─── Save & File (routed by document type) ─────────────────────────────────

  const handleSave = async () => {
    if (!formData || !companyId || !user?.id) return;

    setSaving(true);
    try {
      // 1. Create/update vendor (only for purchase-side documents, NOT sales invoices)
      let vendorId = vendorMatch?.id || null;
      const isPurchaseDoc = documentType !== 'sales_invoice' && documentType !== 'credit_note';
      if (isPurchaseDoc && !vendorId && formData.vendor_name) {
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

        // Also create CRM supplier contact (so vendor appears in CRM → Suppliers tab)
        try {
          // Check if supplier already exists in CRM (by name or VAT)
          let existingQuery = supabase
            .from('prospects')
            .select('id')
            .eq('organization_id', companyId)
            .eq('contact_type', 'supplier');

          if (formData.vendor_vat) {
            existingQuery = existingQuery.eq('vat_number', formData.vendor_vat);
          } else {
            existingQuery = existingQuery.ilike('company', formData.vendor_name);
          }

          const { data: existingSupplier } = await existingQuery.maybeSingle();

          if (!existingSupplier) {
            await supabase.from('prospects').insert({
              organization_id: companyId,
              company: formData.vendor_name,
              email: formData.vendor_email || null,
              website: formData.vendor_website || null,
              contact_type: 'supplier',
              source: 'smart_import',
              stage: 'customer',
              owner_id: user.id,
              vat_number: formData.vendor_vat || null,
              billing_address: formData.vendor_address || null,
              location_country: formData.vendor_country || null,
              notes: `Auto-created from invoice import${formData.invoice_number ? ' #' + formData.invoice_number : ''}`,
            });
          }
        } catch (crmErr) {
          console.warn('CRM supplier creation (non-critical):', crmErr);
        }
      }

      // 2. Calculate EUR amount
      const isEUR = formData.currency === 'EUR';
      const amount = isEUR ? formData.total : (formData.eur_amount || formData.total);
      const taxAmount = formData.tax_amount || 0;
      const taxRate = formData.tax_rate || 0;

      // ── Route by document type ──────────────────────────────────────────

      if (documentType === 'bill') {
        // Save as bill (Accounts Payable)
        if (!vendorId) throw new Error('A vendor is required to create a bill');

        const billNumber = `BILL-${Date.now().toString(36).toUpperCase()}`;
        const { data: newBill, error: billErr } = await supabase
          .from('bills')
          .insert({
            company_id: companyId,
            vendor_id: vendorId,
            bill_number: billNumber,
            bill_date: formData.invoice_date,
            vendor_invoice_number: formData.invoice_number || null,
            due_date: formData.due_date || formData.invoice_date,
            status: 'pending',
            subtotal: formData.subtotal || 0,
            tax_amount: taxAmount,
            total_amount: amount,
            amount: amount,
            balance_due: amount,
            currency: formData.currency || 'EUR',
            notes: formData.notes || null,
            created_by: user.id,
            // BTW classification
            tax_mechanism: taxDecision?.mechanism || 'standard_btw',
            self_assess_rate: taxDecision?.self_assess_rate || 0,
            supplier_country: formData.vendor_country || taxDecision?.supplier_country || null,
            btw_rubric: taxDecision?.btw_rubric || null,
          })
          .select('id')
          .single();

        if (billErr) throw new Error(`Failed to create bill: ${billErr.message}`);

        // Create bill line items
        if (newBill && lineItems.length > 0) {
          const billLineItems = lineItems.map((li, idx) => ({
            bill_id: newBill.id,
            description: li.description,
            quantity: li.quantity || 1,
            unit_price: li.unit_price || 0,
            amount: li.line_total || ((li.quantity || 1) * (li.unit_price || 0)),
            tax_rate: li.tax_rate_percent || 0,
            tax_amount: ((li.line_total || 0) * (li.tax_rate_percent || 0)) / 100,
          }));
          const { error: liErr } = await supabase.from('bill_line_items').insert(billLineItems);
          if (liErr) console.warn('Bill line items error:', liErr);
        }

        toast.success('Bill created successfully!');
        resetState();
        navigate(createPageUrl('FinanceBills'));
        return;

      } else if (documentType === 'sales_invoice') {
        // Save as sales invoice (Accounts Receivable)

        // If prospect was matched client-side as "new" (no id yet), create it now
        let contactId = prospectMatch?.id || null;
        if (prospectMatch?.match_type === 'new' && !contactId && formData.vendor_name) {
          try {
            const { data: newProspect } = await supabase
              .from('prospects')
              .insert({
                organization_id: companyId,
                company: formData.vendor_name,
                email: formData.vendor_email || null,
                vat_number: formData.vendor_vat || null,
                billing_address: formData.vendor_address || null,
                billing_country: (formData.vendor_country || '').substring(0, 2) || null,
                location_country: formData.vendor_country || null,
                contact_type: 'customer',
                source: 'smart_import',
                stage: 'customer',
                owner_id: user.id,
              })
              .select('id')
              .single();
            if (newProspect) contactId = newProspect.id;
          } catch (err) {
            console.warn('Failed to create CRM prospect:', err);
          }
        }

        // Use sales-side rubric (not purchase-side from taxDecision)
        const salesRules = determineTaxRulesForSale(
          formData.vendor_country || 'NL',
          formData.tax_rate || 21
        );

        // For intracommunity/export sales, effective tax is 0%
        const isZeroTaxSale = salesRules.mechanism === 'intracommunity' || salesRules.mechanism === 'export';
        const effectiveTaxRate = isZeroTaxSale ? 0 : (formData.tax_rate || 21);
        const effectiveTaxAmount = isZeroTaxSale ? 0 : taxAmount;
        const effectiveTotal = isZeroTaxSale ? (formData.subtotal || amount) : amount;

        const { data: newInvoice, error: invErr } = await supabase
          .from('invoices')
          .insert({
            company_id: companyId,
            user_id: user.id,
            contact_id: contactId,
            client_name: formData.vendor_name,
            client_email: formData.vendor_email || null,
            client_address: formData.vendor_address || null,
            client_country: formData.vendor_country || 'NL',
            client_vat: formData.vendor_vat || null,
            subtotal: formData.subtotal || 0,
            tax_rate: effectiveTaxRate,
            tax_amount: effectiveTaxAmount,
            total: effectiveTotal,
            status: 'draft',
            invoice_type: 'customer',
            due_date: formData.due_date || null,
            description: formData.notes || '',
            items: lineItems.map(li => ({
              description: li.description,
              quantity: li.quantity || 1,
              unit_price: li.unit_price || 0,
              name: li.description,
            })),
            btw_rubric: salesRules.rubric,
            tax_mechanism: salesRules.mechanism,
          })
          .select('id, invoice_number')
          .single();

        if (invErr) throw new Error(`Failed to create sales invoice: ${invErr.message}`);

        // Bidirectional enrichment: update CRM prospect with invoice data
        if (prospectMatch?.id && prospectMatch.match_type !== 'new') {
          const enrichUpdates = {};
          if (formData.vendor_vat) enrichUpdates.vat_number = formData.vendor_vat;
          if (formData.vendor_email) enrichUpdates.email = formData.vendor_email;
          if (formData.vendor_country) enrichUpdates.location_country = formData.vendor_country;
          if (formData.vendor_address) enrichUpdates.billing_address = formData.vendor_address;
          if (Object.keys(enrichUpdates).length > 0) {
            await supabase.from('prospects').update(enrichUpdates).eq('id', prospectMatch.id);
          }
        }

        toast.success(`Sales invoice ${newInvoice?.invoice_number || ''} created as draft!`);
        resetState();
        navigate(createPageUrl('FinanceInvoices'));
        return;

      } else if (documentType === 'credit_note') {
        // Save as credit note
        const cnNumber = `CN-${Date.now().toString(36).toUpperCase()}`;
        const { data: newCN, error: cnErr } = await supabase
          .from('credit_notes')
          .insert({
            company_id: companyId,
            credit_note_number: cnNumber,
            client_name: formData.vendor_name,
            client_email: formData.vendor_email || null,
            amount: Math.abs(isEUR ? formData.subtotal : Math.round((formData.subtotal || 0) * (formData.exchange_rate || 1) * 100) / 100),
            tax_rate: taxRate,
            tax_amount: Math.abs(isEUR ? taxAmount : Math.round(taxAmount * (formData.exchange_rate || 1) * 100) / 100),
            total: Math.abs(amount),
            reason: formData.notes || `Credit note from ${formData.vendor_name}`,
            status: 'issued',
            issued_at: new Date().toISOString(),
            created_by: user.id,
            // BTW classification
            btw_rubric: taxDecision?.btw_rubric || null,
            tax_mechanism: taxDecision?.mechanism || null,
            counterparty_country: formData.vendor_country || taxDecision?.supplier_country || null,
          })
          .select('id')
          .single();

        if (cnErr) throw new Error(`Failed to create credit note: ${cnErr.message}`);

        toast.success('Credit note created!');
        resetState();
        navigate(createPageUrl('FinanceCreditNotes'));
        return;
      }

      // ── Default: expense (also handles proforma as draft) ───────────────

      const expenseData = {
        user_id: user.id,
        company_id: companyId,
        description: `${formData.vendor_name} ${formData.invoice_number ? '#' + formData.invoice_number : ''}`.trim(),
        amount,
        category: formData.category,
        vendor: formData.vendor_name,
        date: formData.invoice_date,
        notes: formData.notes || (formData.is_reverse_charge
          ? (taxDecision?.explanation || 'Reverse charge (verlegde BTW)')
          : ''),
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
        status: documentType === 'proforma' ? 'draft' : 'approved',
        payment_status: 'pending',
        source_type: 'smart_import',
        vendor_id: vendorId,
        original_amount: !isEUR ? formData.total : null,
        original_currency: !isEUR ? formData.currency : null,
        exchange_rate: !isEUR ? formData.exchange_rate : null,
        ai_extracted_data: extraction || {},
        ai_confidence: extraction?.confidence?.overall || null,
        needs_review: false,
        review_status: documentType === 'proforma' ? 'pending' : 'approved',
        reviewed_by: documentType === 'proforma' ? null : user.id,
        reviewed_at: documentType === 'proforma' ? null : new Date().toISOString(),
        // BTW classification
        tax_mechanism: taxDecision?.mechanism || 'standard_btw',
        self_assess_rate: taxDecision?.self_assess_rate || 0,
        supplier_country: formData.vendor_country || taxDecision?.supplier_country || null,
        btw_rubric: taxDecision?.btw_rubric || null,
      };

      const newExpense = await db.entities.Expense.create(expenseData);
      if (!newExpense?.id) throw new Error('Failed to create expense');

      // Create line items
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

      // Post to GL (use post_expense_with_tax for reverse charge support)
      if (documentType !== 'proforma') {
        try {
          const mechanism = taxDecision?.mechanism || 'standard_btw';
          const selfAssessRate = taxDecision?.self_assess_rate || 0;

          const { data: glResult } = await supabase.rpc('post_expense_with_tax', {
            p_expense_id: newExpense.id,
            p_tax_mechanism: mechanism,
            p_self_assess_rate: selfAssessRate,
          });
          if (glResult?.success) {
            const msg = glResult.reverse_charge_vat > 0
              ? `Posted to GL with reverse charge (${glResult.reverse_charge_vat} EUR)`
              : 'Posted to General Ledger';
            toast.success(msg);
          } else if (glResult?.error) {
            toast.error('GL posting failed: ' + glResult.error);
          }
        } catch (glErr) {
          // Fallback to regular post_expense if post_expense_with_tax doesn't exist yet
          try {
            const { data: glResult } = await supabase.rpc('post_expense', { p_expense_id: newExpense.id });
            if (glResult?.success) toast.success('Posted to General Ledger');
          } catch {
            toast.error('Could not post to General Ledger');
            console.warn('GL posting error:', glErr);
          }
        }
      }

      // Create recurring template if detected
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
            tax_rate: formData.tax_rate || 0,
            tax_mechanism: taxDecision?.mechanism || 'standard_btw',
            self_assess_rate: taxDecision?.self_assess_rate || 0,
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

        // Also create or update subscription tracker entry
        try {
          const amountType = extraction?.classification?.amount_type || 'fixed';

          // Check if subscription already exists for this vendor
          const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('id, amount_history')
            .eq('company_id', companyId)
            .ilike('name', formData.vendor_name)
            .eq('status', 'active')
            .maybeSingle();

          if (existingSub) {
            // Update existing subscription with new amount
            const history = [...(existingSub.amount_history || []), { date: formData.invoice_date, amount }];
            const avg = history.reduce((sum, h) => sum + h.amount, 0) / history.length;
            await supabase.from('subscriptions').update({
              estimated_amount: Math.round(avg * 100) / 100,
              amount,
              amount_history: history.slice(-12),
              next_billing_date: recurring?.suggested_next_date || nextDate,
            }).eq('id', existingSub.id);
            toast.success('Subscription updated with new amount');
          } else {
            // Create new subscription
            await supabase.from('subscriptions').insert({
              user_id: user.id,
              company_id: companyId,
              name: formData.vendor_name,
              provider: formData.vendor_name,
              amount,
              amount_type: amountType,
              estimated_amount: amountType === 'variable' ? amount : null,
              amount_history: amountType === 'variable' ? [{ date: formData.invoice_date, amount }] : [],
              billing_cycle: formData.recurring_frequency || 'monthly',
              category: formData.category || 'other',
              next_billing_date: recurring?.suggested_next_date || nextDate,
              tax_rate: formData.tax_rate || 21,
              tax_amount: taxAmount,
              tax_mechanism: taxDecision?.mechanism || 'standard_btw',
              status: 'active',
              description: `Auto-created from Smart Import${formData.invoice_number ? ': #' + formData.invoice_number : ''}`,
            });
          }
        } catch (subErr) {
          console.warn('Subscription tracker (non-critical):', subErr);
        }
      }

      const label = documentType === 'proforma' ? 'Proforma saved as draft!' : 'Expense saved and filed!';
      toast.success(label);
      resetState();
      navigate(createPageUrl('FinanceExpenses'));
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
    setProspectMatch(null);
    setTaxClassification(null);
    setCurrencyConversion(null);
    setRecurring(null);
    setFormData(null);
    setLineItems([]);
    setDocumentType('expense');
    setTaxDecision(null);
    setConfidenceData(null);
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
  const reviewReasons = confidenceData?.review_reasons || [];
  const requiresReview = confidenceData?.requires_review || false;

  return (
    <FinancePageTransition>
      <div className={`min-h-screen ${ft('bg-gray-50', 'bg-black')} p-6`}>
        <PageHeader
          title="Smart Invoice Import"
          description="Drop an invoice PDF and AI handles the rest — extraction, tax, currency, vendor matching."
        />

        <div className="max-w-5xl mx-auto mt-6 space-y-6">
          {/* ─── Email Import Inbox ──────────────────────────────────── */}
          {emailImports.length > 0 && !showReview && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className={ft('bg-white border-gray-200', 'bg-zinc-900/50 border-zinc-800')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className={`text-sm font-medium flex items-center gap-2 ${ft('text-slate-700', 'text-zinc-300')}`}>
                      <Receipt className="w-4 h-4 text-cyan-400" />
                      Inbox ({emailImports.length} pending)
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={loadEmailImports} className="text-xs">
                      <RefreshCw className="w-3 h-3 mr-1" /> Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {emailImports.map((imp) => (
                    <div
                      key={imp.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${ft('bg-gray-50 border-gray-200', 'bg-zinc-800/50 border-zinc-700/50')}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${ft('text-slate-900', 'text-white')}`}>
                            {imp.attachment_filename || 'Unknown file'}
                          </p>
                          <p className={`text-xs truncate ${ft('text-slate-400', 'text-zinc-500')}`}>
                            {imp.email_from?.split('<')[0]?.trim() || imp.email_from} · {imp.email_subject}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className={
                          imp.status === 'processing'
                            ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10'
                            : 'border-zinc-600 text-zinc-400'
                        }>
                          {imp.status === 'processing' ? (
                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing</>
                          ) : 'Pending'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReviewEmailImport(imp)}
                          disabled={imp.status === 'processing'}
                          className="text-xs"
                        >
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

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
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-700">
                            Supports multi-language: English, Dutch, German
                          </Badge>
                          <CreditCostBadge credits={1} />
                        </div>
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
                      <ConfidenceBadge score={confidenceData?.overall ?? extraction?.confidence?.overall} label="Overall" />
                      <ConfidenceBadge score={confidenceData?.vendor ?? extraction?.confidence?.vendor} label="Vendor" />
                      <ConfidenceBadge score={confidenceData?.amounts ?? extraction?.confidence?.amounts} label="Amounts" />
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

              {/* Review Reasons Alert */}
              {requiresReview && reviewReasons.length > 0 && (
                <div className="flex items-start gap-3 px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-400">Review required</p>
                    <ul className="mt-1 space-y-0.5">
                      {reviewReasons.map((reason, i) => (
                        <li key={i} className="text-xs text-yellow-400/80">- {reason}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* AI Copilot Panel */}
              <FinanceCopilotPanel
                extraction={extraction}
                taxDecision={taxDecision}
                documentType={documentType}
                recurring={recurring}
                currencyConversion={currencyConversion}
                vendorMatch={vendorMatch}
                confidenceData={confidenceData}
                formData={formData}
                fileName={fileName}
                user={user}
                onCategorySuggestion={(suggested) => {
                  updateFormField('category', suggested);
                  toast.info(`Category updated to "${suggested}" based on vendor research`);
                }}
                onDocTypeSwitch={(newType) => {
                  setDocumentType(newType);
                  toast.info(`Switched to ${newType === 'expense' ? 'Expense' : 'Bill (AP)'}`);
                }}
              />

              {/* Document Type Chips */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 mr-1">Document type:</span>
                {DOC_TYPES.map(dt => {
                  const Icon = dt.icon;
                  const isActive = documentType === dt.value;
                  return (
                    <button
                      key={dt.value}
                      onClick={() => setDocumentType(dt.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        isActive
                          ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                          : `${ft('bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200', 'bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:bg-zinc-700/50')}`
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {dt.label}
                    </button>
                  );
                })}
              </div>

              {/* Tax Treatment Banner */}
              {taxDecision && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                  taxDecision.mechanism === 'standard_btw'
                    ? `${ft('bg-blue-50 border-blue-200', 'bg-blue-500/10 border-blue-500/20')}`
                    : taxDecision.mechanism === 'import_no_vat'
                    ? `${ft('bg-zinc-50 border-zinc-200', 'bg-zinc-800/50 border-zinc-700')}`
                    : `${ft('bg-amber-50 border-amber-200', 'bg-amber-500/10 border-amber-500/20')}`
                }`}>
                  <Info className={`w-4 h-4 flex-shrink-0 ${
                    taxDecision.mechanism === 'standard_btw' ? 'text-blue-400'
                    : taxDecision.mechanism === 'import_no_vat' ? 'text-zinc-400'
                    : 'text-amber-400'
                  }`} />
                  <span className={`text-sm ${
                    taxDecision.mechanism === 'standard_btw' ? ft('text-blue-700', 'text-blue-300')
                    : taxDecision.mechanism === 'import_no_vat' ? ft('text-zinc-600', 'text-zinc-300')
                    : ft('text-amber-700', 'text-amber-300')
                  }`}>
                    {taxDecision.explanation}
                  </span>
                  {taxDecision.self_assess_rate > 0 && (
                    <Badge variant="outline" className="ml-auto text-xs border-amber-500/50 text-amber-400">
                      Self-assess {taxDecision.self_assess_rate}%
                    </Badge>
                  )}
                </div>
              )}

              {/* Vendor Section */}
              <Card className={ft('bg-white border-gray-200', 'bg-zinc-900/50 border-zinc-800')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building className="w-4 h-4 text-cyan-400" /> {documentType === 'sales_invoice' ? 'Customer / Buyer' : 'Vendor / Supplier'}
                      {formData.vendor_country && (
                        <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-300 ml-1">
                          <Flag className="w-3 h-3 mr-1" /> {formData.vendor_country}
                        </Badge>
                      )}
                    </CardTitle>
                    {documentType === 'sales_invoice' ? (
                      prospectMatch && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${
                            prospectMatch.match_type === 'new' ? 'border-yellow-500/50 text-yellow-400' :
                            'border-cyan-500/50 text-cyan-400'
                          }`}>
                            {prospectMatch.match_type === 'new' ? 'New customer (CRM)' :
                             prospectMatch.match_type === 'exact_vat' ? 'CRM match (VAT)' :
                             prospectMatch.match_type === 'exact_email' ? 'CRM match (email)' :
                             'CRM match (name)'}
                          </Badge>
                          {prospectMatch.alternatives?.length > 0 && (
                            <select
                              className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 rounded px-1.5 py-0.5 max-w-[180px]"
                              value={prospectMatch.id}
                              onChange={(e) => {
                                const alt = prospectMatch.alternatives.find(a => a.id === e.target.value);
                                if (alt) {
                                  setProspectMatch(prev => ({
                                    ...prev,
                                    id: alt.id,
                                    match_type: alt.match_type,
                                    prospect_data: { ...prev.prospect_data, company: alt.company, email: alt.email, location_country: alt.location_country },
                                    alternatives: [
                                      { id: prev.id, company: prev.prospect_data?.company, email: prev.prospect_data?.email, location_country: prev.prospect_data?.location_country, match_type: prev.match_type },
                                      ...prev.alternatives.filter(a => a.id !== alt.id),
                                    ],
                                  }));
                                  // Re-fill form from selected alternative
                                  setFormData(prev => ({
                                    ...prev,
                                    vendor_email: alt.email || prev.vendor_email,
                                    vendor_country: alt.location_country || prev.vendor_country,
                                  }));
                                }
                              }}
                            >
                              <option value={prospectMatch.id}>{prospectMatch.prospect_data?.company || 'Best match'}</option>
                              {prospectMatch.alternatives.map(alt => (
                                <option key={alt.id} value={alt.id}>{alt.company}{alt.email ? ` (${alt.email})` : ''}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      )
                    ) : (
                      vendorMatch && (
                        <Badge variant="outline" className={`text-xs ${
                          vendorMatch.match_type === 'new' ? 'border-yellow-500/50 text-yellow-400' :
                          'border-emerald-500/50 text-emerald-400'
                        }`}>
                          {vendorMatch.match_type === 'new' ? 'New vendor' :
                           vendorMatch.match_type === 'exact_vat' ? 'Matched (VAT)' :
                           'Matched (name)'}
                        </Badge>
                      )
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
                  <div>
                    <Label className="text-xs text-zinc-500">Address</Label>
                    <Input
                      value={formData.vendor_address}
                      onChange={(e) => updateFormField('vendor_address', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <CountrySelector
                      label="Country"
                      value={formData.vendor_country || taxDecision?.supplier_country || ''}
                      onChange={(code) => {
                        updateFormField('vendor_country', code);
                        // Recompute tax rules when country changes
                        if (code) {
                          const rules = determineTaxRulesForPurchase(code);
                          setTaxDecision(prev => ({
                            ...prev,
                            mechanism: rules.mechanism,
                            self_assess_rate: rules.selfAssessRate,
                            btw_rubric: rules.rubric,
                            supplier_country: code,
                            explanation: rules.explanation,
                          }));
                        }
                      }}
                      mode="purchase"
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
