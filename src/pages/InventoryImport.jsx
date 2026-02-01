import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Upload, Columns, CheckCircle, Download, Sparkles,
  ArrowLeft, ArrowRight, FileSpreadsheet, Package, Building2,
  Sun, Moon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUser } from '@/components/context/UserContext';
import { Product, PhysicalProduct, Supplier } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { ProductsPageTransition } from '@/components/products/ui';

import { FileUploader } from '@/components/import/FileUploader';
import { ColumnMapper } from '@/components/import/ColumnMapper';
import { ValidationPreview } from '@/components/import/ValidationPreview';
import { ImportProgress } from '@/components/import/ImportProgress';

const STEPS = [
  { id: 'upload', title: 'Upload File', icon: Upload, description: 'Upload your inventory spreadsheet' },
  { id: 'map', title: 'Map Columns', icon: Columns, description: 'Match columns to product fields' },
  { id: 'validate', title: 'Review Data', icon: CheckCircle, description: 'Review and validate data' },
  { id: 'import', title: 'Import', icon: Download, description: 'Import products to inventory' },
  { id: 'enrich', title: 'Enrich', icon: Sparkles, description: 'Auto-enrich with product data' }
];

// Generate URL-safe slug
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100) + '-' + Date.now().toString(36);
};

export default function InventoryImport() {
  const { user } = useUser();
  const { theme, toggleTheme, t } = useTheme();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);

  // File upload state
  const [fileData, setFileData] = useState(null);

  // Column mapping state
  const [mappings, setMappings] = useState({});
  const [aiSuggestions, setAiSuggestions] = useState({});
  const [aiConfidence, setAiConfidence] = useState(0);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // Validation state
  const [validationResult, setValidationResult] = useState(null);

  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResults, setImportResults] = useState(null);
  const [importErrors, setImportErrors] = useState([]);

  // Handle file processed
  const handleFileProcessed = useCallback((data) => {
    setFileData(data);
    // Auto-advance to mapping step
    setCurrentStep(1);
    // Request AI suggestions
    requestAISuggestions(data.headers);
  }, []);

  // Request AI column mapping suggestions
  const requestAISuggestions = async (headers) => {
    setIsLoadingAI(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/map-import-columns`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            headers: headers.map(h => h.name),
            // Send multiple samples for better analysis
            sampleData: headers.map(h => h.samples?.slice(0, 3).join(' | ') || ''),
            // Send detected types to help AI
            detectedTypes: headers.map(h => h.detectedType || 'unknown')
          })
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.mappings) {
          setAiSuggestions(result.mappings);
          setAiConfidence(result.confidence || 0.8);
          setMappings(result.mappings);
        }
      }
    } catch (error) {
      console.error('AI mapping error:', error);
      // Fallback to manual mapping
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Handle mapping changes
  const handleMappingChange = useCallback((newMappings) => {
    setMappings(newMappings);
  }, []);

  // Handle validation complete
  const handleValidationComplete = useCallback((result) => {
    setValidationResult(result);
  }, []);

  // Find or create supplier - returns { id, isNew, name }
  const findOrCreateSupplier = async (supplierName, companyId, hintEmail = null) => {
    if (!supplierName) return null;

    // Try to find existing supplier
    const { data: existing } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('company_id', companyId)
      .ilike('name', supplierName)
      .single();

    if (existing) {
      return { id: existing.id, isNew: false, name: existing.name };
    }

    // Create new supplier
    const { data: created, error } = await supabase
      .from('suppliers')
      .insert({
        company_id: companyId,
        name: supplierName,
        status: 'active'
      })
      .select('id, name')
      .single();

    if (error) {
      console.error('Failed to create supplier:', error);
      return null;
    }

    return { id: created.id, isNew: true, name: created.name };
  };

  // Queue supplier for enrichment - returns queue ID
  const queueSupplierForEnrichment = async (supplierId, supplierName, companyId, hintEmail = null) => {
    const { data, error } = await supabase
      .from('supplier_research_queue')
      .insert({
        company_id: companyId,
        supplier_id: supplierId,
        supplier_name: supplierName,
        hint_email: hintEmail,
        hint_country: 'NL',  // Default to Netherlands
        status: 'pending'
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to queue supplier for enrichment:', error);
      return null;
    }

    return data?.id;
  };

  // Trigger supplier research
  const triggerSupplierResearch = async (queueIds) => {
    if (!queueIds || queueIds.length === 0) return;

    // Get queue items with their details
    const { data: queueItems, error: fetchError } = await supabase
      .from('supplier_research_queue')
      .select('id, supplier_name, hint_email, hint_country')
      .in('id', queueIds);

    if (fetchError || !queueItems?.length) {
      console.error('Failed to fetch supplier queue items:', fetchError);
      return;
    }

    const researchItems = queueItems.map(q => ({
      queueId: q.id,
      supplierName: q.supplier_name,
      hintEmail: q.hint_email,
      hintCountry: q.hint_country,
    }));

    // Call the research function
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research-supplier`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ items: researchItems })
        }
      );

      if (!response.ok) {
        console.error('Supplier research function error:', await response.text());
      } else {
        const result = await response.json();
        console.log('Supplier research triggered successfully:', result);
      }
    } catch (error) {
      console.error('Failed to trigger supplier research:', error);
    }
  };

  // Link supplier to product
  const linkSupplierToProduct = async (productId, supplierId, companyId, purchasePrice, purchaseDate) => {
    if (!supplierId) return;

    const { error } = await supabase
      .from('product_suppliers')
      .upsert({
        company_id: companyId,
        product_id: productId,
        supplier_id: supplierId,
        last_purchase_price: purchasePrice,
        last_purchase_date: purchaseDate || new Date().toISOString().split('T')[0],
        is_preferred: true,
        is_active: true
      }, {
        onConflict: 'product_id,supplier_id'
      });

    if (error) {
      console.error('Failed to link supplier to product:', error);
    }
  };

  // Import a single product
  const importProduct = async (row, companyId) => {
    // Check for existing product by EAN
    let existingProduct = null;
    if (row.ean) {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyId)
        .eq('ean', row.ean)
        .single();
      existingProduct = data;
    }

    let productId;

    if (existingProduct) {
      // Update existing product's quantity
      productId = existingProduct.id;

      // Get current physical product
      const { data: pp } = await supabase
        .from('physical_products')
        .select('inventory')
        .eq('product_id', productId)
        .single();

      const currentQty = pp?.inventory?.quantity || 0;
      const newQty = currentQty + row.quantity;

      await supabase
        .from('physical_products')
        .update({
          inventory: {
            ...pp?.inventory,
            quantity: newQty,
            track_quantity: true
          }
        })
        .eq('product_id', productId);

      return { productId, action: 'updated', hasEan: !!row.ean };
    } else {
      // Create new product
      const slug = generateSlug(row.name);

      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          company_id: companyId,
          name: row.name,
          ean: row.ean || null,
          sku: row.sku || null,
          slug,
          type: 'physical',
          is_physical: true,
          status: 'draft',
          category: row.category || null
        })
        .select()
        .single();

      if (productError) throw productError;

      productId = product.id;

      // Create physical product details
      const { error: ppError } = await supabase
        .from('physical_products')
        .insert({
          product_id: productId,
          sku: row.sku || null,
          barcode: row.ean || null,
          pricing: {
            base_price: row.purchase_price,
            currency: 'EUR'
          },
          inventory: {
            quantity: row.quantity,
            track_quantity: true
          }
        });

      if (ppError) throw ppError;

      return { productId, action: 'created', hasEan: !!row.ean };
    }
  };

  // Create stock purchase record
  const createStockPurchase = async (productId, row, supplierId, companyId) => {
    await supabase
      .from('stock_purchases')
      .insert({
        company_id: companyId,
        product_id: productId,
        supplier_id: supplierId,
        quantity: row.quantity,
        unit_price: row.purchase_price,
        currency: 'EUR',
        purchase_date: row.purchase_date || new Date().toISOString().split('T')[0],
        invoice_number: row.order_number || null,
        source_type: 'import'
      });
  };

  // Queue product for enrichment - returns the queue ID
  const queueForEnrichment = async (productId, name, ean, companyId) => {
    if (!ean) return null;

    const { data, error } = await supabase
      .from('product_research_queue')
      .insert({
        company_id: companyId,
        product_description: name,  // Correct column name
        extracted_ean: ean,         // Correct column name
        status: 'pending',
        matched_product_id: productId
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to queue for enrichment:', error);
      return null;
    }

    return data?.id;
  };

  // Trigger the research function for queued items
  const triggerResearch = async (queueIds) => {
    if (!queueIds || queueIds.length === 0) return;

    // Get queue items with their details
    const { data: queueItems, error: fetchError } = await supabase
      .from('product_research_queue')
      .select('id, product_description, model_number, supplier_name, extracted_ean')
      .in('id', queueIds);

    if (fetchError || !queueItems?.length) {
      console.error('Failed to fetch queue items:', fetchError);
      return;
    }

    const researchItems = queueItems.map(q => ({
      queueId: q.id,
      productDescription: q.product_description,
      modelNumber: q.model_number,
      supplierName: q.supplier_name,
      extractedEan: q.extracted_ean,
    }));

    // Call the research function
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research-product`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ items: researchItems })
        }
      );

      if (!response.ok) {
        console.error('Research function error:', await response.text());
      } else {
        const result = await response.json();
        console.log('Research triggered successfully:', result);
      }
    } catch (error) {
      console.error('Failed to trigger research:', error);
    }
  };

  // Execute import
  const executeImport = async () => {
    if (!validationResult?.transformedData || !user?.company_id) return;

    setIsImporting(true);
    setImportProgress({ current: 0, total: validationResult.transformedData.length });
    setImportResults(null);
    setImportErrors([]);

    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      toEnrich: 0,
      suppliersCreated: 0
    };
    const errors = [];
    const enrichmentQueueIds = []; // Collect queue IDs for product enrichment
    const supplierEnrichmentQueueIds = []; // Collect queue IDs for supplier enrichment

    // Cache suppliers - stores { id, isNew, name }
    const supplierCache = new Map();
    const newSupplierIds = new Set(); // Track which suppliers are new and need enrichment

    for (let i = 0; i < validationResult.transformedData.length; i++) {
      const row = validationResult.transformedData[i];

      // Skip invalid rows
      if (!row._validation.isValid) {
        results.failed++;
        errors.push({ row: row._rowIndex, error: row._validation.errors.join(', ') });
        continue;
      }

      try {
        // Get or create supplier
        let supplierInfo = null;
        if (row.supplier) {
          const supplierKey = row.supplier.toLowerCase().trim();
          if (supplierCache.has(supplierKey)) {
            supplierInfo = supplierCache.get(supplierKey);
          } else {
            // Pass email hint if available
            const hintEmail = row.email || null;
            supplierInfo = await findOrCreateSupplier(row.supplier, user.company_id, hintEmail);
            if (supplierInfo) {
              supplierCache.set(supplierKey, supplierInfo);
              // If this is a new supplier, queue it for enrichment (only once)
              if (supplierInfo.isNew && !newSupplierIds.has(supplierInfo.id)) {
                newSupplierIds.add(supplierInfo.id);
                const supplierQueueId = await queueSupplierForEnrichment(
                  supplierInfo.id,
                  supplierInfo.name,
                  user.company_id,
                  hintEmail
                );
                if (supplierQueueId) {
                  supplierEnrichmentQueueIds.push(supplierQueueId);
                  results.suppliersCreated++;
                }
              }
            }
          }
        }

        const supplierId = supplierInfo?.id || null;

        // Import product
        const importResult = await importProduct(row, user.company_id);

        // Create stock purchase record
        await createStockPurchase(importResult.productId, row, supplierId, user.company_id);

        // Link supplier to product (creates product_suppliers record)
        if (supplierId) {
          await linkSupplierToProduct(
            importResult.productId,
            supplierId,
            user.company_id,
            row.purchase_price,
            row.purchase_date
          );
        }

        // Queue for enrichment if has EAN
        if (importResult.hasEan) {
          const queueId = await queueForEnrichment(importResult.productId, row.name, row.ean, user.company_id);
          if (queueId) {
            enrichmentQueueIds.push(queueId);
            results.toEnrich++;
          }
        }

        if (importResult.action === 'created') {
          results.created++;
        } else {
          results.updated++;
        }

        setImportProgress({
          current: i + 1,
          total: validationResult.transformedData.length,
          currentName: row.name
        });

      } catch (error) {
        console.error('Import error:', error);
        results.failed++;
        errors.push({ row: row._rowIndex, error: error.message });
      }
    }

    setIsImporting(false);
    setImportResults(results);
    setImportErrors(errors);

    if (results.failed === 0) {
      const supplierMsg = results.suppliersCreated > 0 ? `, ${results.suppliersCreated} new suppliers` : '';
      toast.success(`Successfully imported ${results.created} products${supplierMsg}!`);
    } else {
      toast.warning(`Import completed with ${results.failed} errors`);
    }

    // Move to enrichment step
    setCurrentStep(4);

    // Trigger AI enrichment for queued products (async - don't wait)
    if (enrichmentQueueIds.length > 0) {
      toast.info(`Starting AI enrichment for ${enrichmentQueueIds.length} products...`);
      triggerResearch(enrichmentQueueIds).then(() => {
        toast.success('Product enrichment started! Products will be updated with images and details.');
      }).catch((err) => {
        console.error('Product enrichment trigger failed:', err);
        toast.error('Failed to start product enrichment. You can retry from the products page.');
      });
    }

    // Trigger AI enrichment for new suppliers (async - don't wait)
    if (supplierEnrichmentQueueIds.length > 0) {
      toast.info(`Starting AI enrichment for ${supplierEnrichmentQueueIds.length} suppliers...`);
      triggerSupplierResearch(supplierEnrichmentQueueIds).then(() => {
        toast.success('Supplier enrichment started! Suppliers will be updated with website, logo, and contact info.');
      }).catch((err) => {
        console.error('Supplier enrichment trigger failed:', err);
        toast.error('Failed to start supplier enrichment.');
      });
    }
  };

  // Check if can proceed to next step
  const canProceed = () => {
    switch (currentStep) {
      case 0: return fileData !== null;
      case 1: {
        // Must have required fields mapped
        const mappedFields = new Set(Object.values(mappings));
        return mappedFields.has('name') && mappedFields.has('purchase_price') && mappedFields.has('quantity');
      }
      case 2: return validationResult?.canImport;
      case 3: {
        // Allow clicking "Start Import" if we have data to import, OR if import is complete
        const hasDataToImport = validationResult?.transformedData?.length > 0;
        const importComplete = importResults !== null;
        return hasDataToImport || importComplete;
      }
      default: return false;
    }
  };

  // Navigation
  const goNext = () => {
    if (currentStep === 3 && !importResults) {
      // Start import
      executeImport();
    } else if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const resetWizard = () => {
    setCurrentStep(0);
    setFileData(null);
    setMappings({});
    setAiSuggestions({});
    setAiConfidence(0);
    setValidationResult(null);
    setImportResults(null);
    setImportErrors([]);
  };

  return (
    <ProductsPageTransition>
      <div className={`max-w-full mx-auto px-4 lg:px-6 py-4 space-y-4 ${t('bg-white', '')}`}>
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className={`text-lg font-bold ${t('text-zinc-900', 'text-white')}`}>Import Inventory</h1>
            <p className={`text-xs ${t('text-zinc-500', 'text-zinc-400')}`}>Bulk import products from spreadsheets</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg border transition-colors ${t(
                'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600',
                'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              )}`}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            {currentStep === STEPS.length - 1 && importResults && (
              <Button onClick={resetWizard} variant="outline">
                Import Another File
              </Button>
            )}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            const Icon = step.icon;

            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all",
                      isActive
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-400"
                        : isCompleted
                        ? "bg-green-500/20 border-green-500 text-green-400"
                        : `${t('bg-zinc-100 border-zinc-300 text-zinc-400', 'bg-zinc-900 border-zinc-700 text-zinc-500')}`
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium",
                    isActive ? "text-cyan-400" : isCompleted ? "text-green-400" : `${t('text-zinc-400', 'text-zinc-500')}`
                  )}>
                    {step.title}
                  </span>
                </div>

                {index < STEPS.length - 1 && (
                  <div className={cn(
                    "flex-1 h-0.5 mx-3",
                    index < currentStep ? "bg-green-500" : `${t('bg-zinc-200', 'bg-zinc-800')}`
                  )} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step Content */}
        <div className={`${t('bg-white/80 border-zinc-200/60', 'bg-zinc-900/50 border-zinc-800/60')} border rounded-xl p-4`}>
          <div>
            {/* Step 0: Upload */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <div>
                  <h2 className={`text-sm font-bold ${t('text-zinc-900', 'text-white')}`}>{STEPS[0].title}</h2>
                  <p className={`text-xs mt-1 ${t('text-zinc-400', 'text-zinc-500')}`}>{STEPS[0].description}</p>
                </div>
                <FileUploader onFileProcessed={handleFileProcessed} />
              </div>
            )}

            {/* Step 1: Map Columns */}
            {currentStep === 1 && fileData && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className={`text-sm font-bold ${t('text-zinc-900', 'text-white')}`}>{STEPS[1].title}</h2>
                    <p className={`text-xs mt-1 ${t('text-zinc-400', 'text-zinc-500')}`}>
                      {fileData.totalRows} rows found in "{fileData.fileName}"
                    </p>
                  </div>
                </div>
                <ColumnMapper
                  sourceColumns={fileData.headers}
                  aiSuggestions={aiSuggestions}
                  aiConfidence={aiConfidence}
                  isLoadingAI={isLoadingAI}
                  onMappingChange={handleMappingChange}
                  onRequestAISuggestions={() => requestAISuggestions(fileData.headers)}
                />
              </div>
            )}

            {/* Step 2: Validate */}
            {currentStep === 2 && fileData && (
              <div className="space-y-4">
                <div>
                  <h2 className={`text-sm font-bold ${t('text-zinc-900', 'text-white')}`}>{STEPS[2].title}</h2>
                  <p className={`text-xs mt-1 ${t('text-zinc-400', 'text-zinc-500')}`}>{STEPS[2].description}</p>
                </div>
                <ValidationPreview
                  sourceColumns={fileData.headers}
                  rows={fileData.rows}
                  mappings={mappings}
                  onValidationComplete={handleValidationComplete}
                />
              </div>
            )}

            {/* Step 3: Import */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <h2 className={`text-sm font-bold ${t('text-zinc-900', 'text-white')}`}>{STEPS[3].title}</h2>
                  <p className={`text-xs mt-1 ${t('text-zinc-400', 'text-zinc-500')}`}>{STEPS[3].description}</p>
                </div>
                <ImportProgress
                  isImporting={isImporting}
                  progress={importProgress}
                  results={importResults}
                  errors={importErrors}
                  totalToImport={validationResult?.transformedData?.length || 0}
                />
              </div>
            )}

            {/* Step 4: Enrich */}
            {currentStep === 4 && importResults && (
              <div className="space-y-4">
                <div>
                  <h2 className={`text-sm font-bold ${t('text-zinc-900', 'text-white')}`}>{STEPS[4].title}</h2>
                  <p className={`text-xs mt-1 ${t('text-zinc-400', 'text-zinc-500')}`}>{STEPS[4].description}</p>
                </div>

                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>

                  <h3 className={`text-xl font-bold mb-2 ${t('text-zinc-900', 'text-white')}`}>
                    Import Complete!
                  </h3>

                  <p className={`text-xs mb-4 ${t('text-zinc-500', 'text-zinc-400')}`}>
                    {importResults.created} products created, {importResults.updated} updated
                    {importResults.suppliersCreated > 0 && (
                      <span className="block mt-1 text-cyan-400">
                        {importResults.suppliersCreated} new suppliers added
                      </span>
                    )}
                  </p>

                  <div className="flex flex-wrap justify-center gap-3 mb-4">
                    {importResults.toEnrich > 0 && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-purple-500/10 border border-purple-500/20 text-purple-400">
                        <Sparkles className="w-3 h-3" />
                        <span>{importResults.toEnrich} products queued for AI enrichment</span>
                      </div>
                    )}
                    {importResults.suppliersCreated > 0 && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                        <Building2 className="w-3 h-3" />
                        <span>{importResults.suppliersCreated} suppliers queued for AI enrichment</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <Button
                      variant="outline"
                      onClick={resetWizard}
                      className="text-xs"
                    >
                      Import More Products
                    </Button>
                    <Button
                      onClick={() => window.location.href = '/productsphysical'}
                      className="bg-cyan-500 hover:bg-cyan-600 text-white text-xs"
                    >
                      <Package className="w-3 h-3 mr-2" />
                      View Products
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        {currentStep < 4 && (
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={goBack}
              disabled={currentStep === 0}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>

            <Button
              onClick={goNext}
              disabled={!canProceed() || isImporting}
              className="gap-2 bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              {currentStep === 3 && !importResults ? (
                <>
                  <Download className="w-4 h-4" />
                  Start Import
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </ProductsPageTransition>
  );
}
