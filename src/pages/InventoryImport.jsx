import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Upload, Columns, CheckCircle, Download, Sparkles,
  ArrowLeft, ArrowRight, FileSpreadsheet, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import { useUser } from '@/components/context/UserContext';
import { Product, PhysicalProduct, Supplier } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';

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

  // Find or create supplier
  const findOrCreateSupplier = async (supplierName, companyId) => {
    if (!supplierName) return null;

    // Try to find existing supplier
    const { data: existing } = await supabase
      .from('suppliers')
      .select('id')
      .eq('company_id', companyId)
      .ilike('name', supplierName)
      .single();

    if (existing) return existing.id;

    // Create new supplier
    const { data: created, error } = await supabase
      .from('suppliers')
      .insert({
        company_id: companyId,
        name: supplierName,
        status: 'active'
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create supplier:', error);
      return null;
    }

    return created?.id;
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

  // Queue product for enrichment
  const queueForEnrichment = async (productId, name, ean, companyId) => {
    if (!ean) return;

    await supabase
      .from('product_research_queue')
      .insert({
        company_id: companyId,
        source_type: 'import',
        original_name: name,
        ean: ean,
        status: 'pending',
        matched_product_id: productId
      });
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
      toEnrich: 0
    };
    const errors = [];

    // Cache suppliers
    const supplierCache = new Map();

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
        let supplierId = null;
        if (row.supplier) {
          if (supplierCache.has(row.supplier)) {
            supplierId = supplierCache.get(row.supplier);
          } else {
            supplierId = await findOrCreateSupplier(row.supplier, user.company_id);
            supplierCache.set(row.supplier, supplierId);
          }
        }

        // Import product
        const importResult = await importProduct(row, user.company_id);

        // Create stock purchase record
        await createStockPurchase(importResult.productId, row, supplierId, user.company_id);

        // Queue for enrichment if has EAN
        if (importResult.hasEan) {
          await queueForEnrichment(importResult.productId, row.name, row.ean, user.company_id);
          results.toEnrich++;
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
      toast.success(`Successfully imported ${results.created} products!`);
    } else {
      toast.warning(`Import completed with ${results.failed} errors`);
    }

    // Move to enrichment step
    setCurrentStep(4);
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
      case 3: return importResults !== null;
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
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
              </div>
              Import Inventory
            </h1>
            <p className="text-zinc-500 mt-2">
              Bulk import products from Excel or CSV files
            </p>
          </div>

          {currentStep === STEPS.length - 1 && importResults && (
            <Button onClick={resetWizard} variant="outline">
              Import Another File
            </Button>
          )}
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
                      "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all",
                      isActive
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-400"
                        : isCompleted
                        ? "bg-green-500/20 border-green-500 text-green-400"
                        : "bg-zinc-900 border-zinc-700 text-zinc-500"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    isActive ? "text-cyan-400" : isCompleted ? "text-green-400" : "text-zinc-500"
                  )}>
                    {step.title}
                  </span>
                </div>

                {index < STEPS.length - 1 && (
                  <div className={cn(
                    "flex-1 h-0.5 mx-4",
                    index < currentStep ? "bg-green-500" : "bg-zinc-800"
                  )} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step Content */}
        <GlassCard className="p-6">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Step 0: Upload */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">{STEPS[0].title}</h2>
                  <p className="text-sm text-zinc-500 mt-1">{STEPS[0].description}</p>
                </div>
                <FileUploader onFileProcessed={handleFileProcessed} />
              </div>
            )}

            {/* Step 1: Map Columns */}
            {currentStep === 1 && fileData && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{STEPS[1].title}</h2>
                    <p className="text-sm text-zinc-500 mt-1">
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
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">{STEPS[2].title}</h2>
                  <p className="text-sm text-zinc-500 mt-1">{STEPS[2].description}</p>
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
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">{STEPS[3].title}</h2>
                  <p className="text-sm text-zinc-500 mt-1">{STEPS[3].description}</p>
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
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">{STEPS[4].title}</h2>
                  <p className="text-sm text-zinc-500 mt-1">{STEPS[4].description}</p>
                </div>

                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-green-400" />
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-2">
                    Import Complete!
                  </h3>

                  <p className="text-zinc-400 mb-6">
                    {importResults.created} products created, {importResults.updated} updated
                  </p>

                  {importResults.toEnrich > 0 && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-6">
                      <Sparkles className="w-4 h-4" />
                      <span>{importResults.toEnrich} products queued for AI enrichment</span>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      onClick={resetWizard}
                    >
                      Import More Products
                    </Button>
                    <Button
                      onClick={() => window.location.href = '/productsphysical'}
                      className="bg-cyan-500 hover:bg-cyan-600 text-white"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      View Products
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </GlassCard>

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
    </div>
  );
}
