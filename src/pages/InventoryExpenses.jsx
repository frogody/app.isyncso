import React, { useState, useEffect, useCallback, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  Receipt, Search, Filter, Clock, Check, X, AlertTriangle,
  Eye, FileText, Upload, Sparkles, ChevronRight, Edit2,
  CheckCircle2, XCircle, RefreshCw, Euro, Calendar,
  Building, Percent, ExternalLink, Image, FileUp, Loader2,
  Sun, Moon
} from "lucide-react";
import { useTheme } from '@/contexts/GlobalThemeContext';
import { FinancePageTransition } from '@/components/finance/ui/FinancePageTransition';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useUser } from "@/components/context/UserContext";
import { PermissionGuard } from "@/components/guards";
import { toast } from "sonner";
import {
  listExpenses,
  getExpense,
  getReviewQueue,
  approveExpense,
  rejectExpense,
} from "@/lib/db/queries";
import { MIN_CONFIDENCE } from "@/lib/db/schema";
import { storage, supabase } from "@/api/supabaseClient";

// Set up PDF.js worker using bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const DOCUMENTS_BUCKET = "attachments";

/**
 * Extract text from all pages of a PDF
 * @param {File} pdfFile - The PDF file to extract text from
 * @returns {Promise<string>} - Extracted text from all pages
 */
async function extractPdfText(pdfFile) {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';

  // Extract text from all pages
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }

  return fullText.trim();
}

/**
 * Convert a PDF file to a PNG image (first page)
 * @param {File} pdfFile - The PDF file to convert
 * @returns {Promise<File>} - A PNG image file
 */
async function convertPdfToImage(pdfFile) {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  // Get the first page
  const page = await pdf.getPage(1);

  // Set scale for good quality (2x for retina-like quality)
  const scale = 2;
  const viewport = page.getViewport({ scale });

  // Create canvas
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  // Render PDF page to canvas
  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;

  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          // Create a new File from the blob
          const fileName = pdfFile.name.replace(/\.pdf$/i, ".png");
          const imageFile = new File([blob], fileName, { type: "image/png" });
          resolve(imageFile);
        } else {
          reject(new Error("Failed to convert PDF to image"));
        }
      },
      "image/png",
      0.95
    );
  });
}

const STATUS_STYLES = {
  draft: {
    bg: "bg-zinc-500/10",
    text: "text-zinc-400",
    border: "border-zinc-500/30",
  },
  pending_review: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
    border: "border-yellow-500/30",
  },
  approved: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    border: "border-green-500/30",
  },
  processed: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  archived: {
    bg: "bg-zinc-500/10",
    text: "text-zinc-400",
    border: "border-zinc-500/30",
  },
};

// Confidence indicator
function ConfidenceIndicator({ confidence }) {
  const percent = Math.round(confidence * 100);
  let color = "bg-red-500";
  let textColor = "text-red-400";

  if (confidence >= MIN_CONFIDENCE) {
    color = "bg-green-500";
    textColor = "text-green-400";
  } else if (confidence >= 0.7) {
    color = "bg-yellow-500";
    textColor = "text-yellow-400";
  }

  return (
    <div className="flex items-center gap-2">
      <Progress value={percent} className={`w-20 h-2 ${color}`} />
      <span className={`text-xs font-medium ${textColor}`}>{percent}%</span>
    </div>
  );
}

// Review modal
function ReviewModal({ expense, isOpen, onClose, onApprove, onReject, ft }) {
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(expense.id, notes);
      onClose();
      toast.success("Invoice approved");
    } catch (error) {
      toast.error("Error approving: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!notes.trim()) {
      toast.error("Geef een reden op voor afwijzing");
      return;
    }
    setIsSubmitting(true);
    try {
      await onReject(expense.id, notes);
      onClose();
      toast.success("Invoice rejected");
    } catch (error) {
      toast.error("Error rejecting: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!expense) return null;

  const extractedData = expense.ai_extracted_data || {};

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Review Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Confidence score */}
          <div className={`flex items-center justify-between p-3 rounded-lg ${ft('bg-slate-100', 'bg-zinc-900/50')} border ${ft('border-slate-200', 'border-white/10')}`}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>AI Confidence</span>
            </div>
            <ConfidenceIndicator confidence={expense.ai_confidence || 0} />
          </div>

          {/* Original document */}
          {expense.original_file_url && (
            <div>
              <Label className={`${ft('text-slate-500', 'text-zinc-400')} text-xs`}>Original document</Label>
              <div className={`mt-2 rounded-lg border ${ft('border-slate-200', 'border-white/10')} overflow-hidden`}>
                <img
                  src={expense.original_file_url}
                  alt="Invoice"
                  className={`w-full max-h-48 object-contain ${ft('bg-slate-50', 'bg-zinc-950')}`}
                />
              </div>
              <Button
                variant="link"
                size="sm"
                className="mt-1 text-cyan-400 text-xs"
                onClick={() => window.open(expense.original_file_url, "_blank")}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Open in new tab
              </Button>
            </div>
          )}

          {/* Extracted data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={`${ft('text-slate-500', 'text-zinc-400')} text-xs`}>Supplier</Label>
              <p className={`${ft('text-slate-900', 'text-white')} font-medium text-sm`}>
                {extractedData.supplier_name || expense.suppliers?.name || "-"}
              </p>
            </div>
            <div>
              <Label className={`${ft('text-slate-500', 'text-zinc-400')} text-xs`}>Invoice Number</Label>
              <p className={`${ft('text-slate-900', 'text-white')} font-medium text-sm`}>
                {expense.external_reference || "-"}
              </p>
            </div>
            <div>
              <Label className={`${ft('text-slate-500', 'text-zinc-400')} text-xs`}>Invoice Date</Label>
              <p className={`${ft('text-slate-900', 'text-white')} font-medium text-sm`}>
                {expense.invoice_date
                  ? new Date(expense.invoice_date).toLocaleDateString("en-GB")
                  : "-"}
              </p>
            </div>
            <div>
              <Label className={`${ft('text-slate-500', 'text-zinc-400')} text-xs`}>Total</Label>
              <p className={`${ft('text-slate-900', 'text-white')} font-medium text-base`}>
                &euro; {expense.total?.toFixed(2) || "0.00"}
              </p>
            </div>
          </div>

          {/* Line items */}
          {expense.expense_line_items && expense.expense_line_items.length > 0 && (
            <div>
              <Label className={`${ft('text-slate-500', 'text-zinc-400')} mb-2 block text-xs`}>Line Items</Label>
              <div className={`rounded-lg border ${ft('border-slate-200', 'border-white/10')} overflow-hidden`}>
                <table className="w-full text-xs">
                  <thead className={ft('bg-slate-100', 'bg-zinc-900/50')}>
                    <tr className={`text-left ${ft('text-slate-400', 'text-zinc-500')} text-[10px]`}>
                      <th className="px-2 py-1">Description</th>
                      <th className="px-2 py-1 text-right">Quantity</th>
                      <th className="px-2 py-1 text-right">Price</th>
                      <th className="px-2 py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${ft('divide-slate-100', 'divide-white/5')}`}>
                    {expense.expense_line_items.map((item) => (
                      <tr key={item.id}>
                        <td className={`px-2 py-1 ${ft('text-slate-900', 'text-white')}`}>
                          {item.description}
                          {item.ean && (
                            <span className={`ml-2 text-[10px] ${ft('text-slate-400', 'text-zinc-500')}`}>
                              EAN: {item.ean}
                            </span>
                          )}
                        </td>
                        <td className={`px-2 py-1 text-right ${ft('text-slate-500', 'text-zinc-400')}`}>
                          {item.quantity}
                        </td>
                        <td className={`px-2 py-1 text-right ${ft('text-slate-500', 'text-zinc-400')}`}>
                          &euro; {item.unit_price?.toFixed(2)}
                        </td>
                        <td className={`px-2 py-1 text-right ${ft('text-slate-900', 'text-white')}`}>
                          &euro; {item.line_total?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className={ft('bg-slate-50', 'bg-zinc-900/30')}>
                    <tr>
                      <td colSpan={3} className={`px-2 py-1 text-right ${ft('text-slate-500', 'text-zinc-400')}`}>
                        Subtotal
                      </td>
                      <td className={`px-2 py-1 text-right ${ft('text-slate-900', 'text-white')}`}>
                        &euro; {expense.subtotal?.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className={`px-2 py-1 text-right ${ft('text-slate-500', 'text-zinc-400')}`}>
                        VAT ({expense.tax_percent || 21}%)
                      </td>
                      <td className={`px-2 py-1 text-right ${ft('text-slate-900', 'text-white')}`}>
                        &euro; {expense.tax_amount?.toFixed(2)}
                      </td>
                    </tr>
                    <tr className="font-medium">
                      <td colSpan={3} className={`px-2 py-1 text-right ${ft('text-slate-900', 'text-white')}`}>
                        Total
                      </td>
                      <td className="px-2 py-1 text-right text-cyan-400">
                        &euro; {expense.total?.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Review notes */}
          <div>
            <Label className="text-xs">Remarks</Label>
            <Textarea
              placeholder="Any remarks about the review..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`mt-1 ${ft('bg-slate-100', 'bg-zinc-900/50')} ${ft('border-slate-200', 'border-white/10')}`}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isSubmitting}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Reject
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper to safely get expense status style
function getExpenseStatusStyle(statusKey) {
  const style = STATUS_STYLES[statusKey];
  if (style && style.bg && style.text && style.border) {
    return style;
  }
  // Return safe fallback
  return {
    bg: "bg-zinc-500/10",
    text: "text-zinc-400",
    border: "border-zinc-500/30",
  };
}

// Expense card
function ExpenseCard({ expense, onReview, onRetry, ft }) {
  // Defensive: ensure expense exists
  if (!expense) return null;

  // Get safe style object
  const status = getExpenseStatusStyle(expense.status);
  const needsReview = expense.needs_review && expense.review_status === "pending";
  const isFailed = expense.status === 'failed';

  return (
    <div
      className={`p-3 rounded-lg ${ft('bg-white', 'bg-zinc-900/50')} border transition-all ${
        needsReview
          ? "border-yellow-500/30 hover:border-yellow-500/50"
          : `${ft('border-slate-200', 'border-white/5')} hover:border-cyan-500/30`
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <div className={`p-2 rounded-lg ${status.bg} ${status.border}`}>
            <Receipt className={`w-4 h-4 ${status.text}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`font-medium ${ft('text-slate-900', 'text-white')} text-sm`}>
                {expense.expense_number || expense.external_reference || "Invoice"}
              </h3>
              <Badge className={`${status.bg} ${status.text} ${status.border} text-xs`}>
                {expense.status.replace("_", " ")}
              </Badge>
              {needsReview && (
                <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30 text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Review Required
                </Badge>
              )}
            </div>
            <p className={`text-xs ${ft('text-slate-500', 'text-zinc-400')} mt-1`}>
              {expense.suppliers?.name || "Unknown supplier"}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className={`text-sm font-semibold ${ft('text-slate-900', 'text-white')}`}>
            &euro; {expense.total?.toFixed(2) || "0.00"}
          </p>
          {expense.ai_confidence !== undefined && (
            <ConfidenceIndicator confidence={expense.ai_confidence} />
          )}
        </div>
      </div>

      {/* Details row */}
      <div className={`mt-2 pt-2 border-t ${ft('border-slate-100', 'border-white/5')} flex items-center justify-between`}>
        <div className={`flex items-center gap-3 text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>
          {expense.invoice_date && (
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(expense.invoice_date).toLocaleDateString("en-GB")}
            </span>
          )}
          {expense.expense_line_items && (
            <span>{expense.expense_line_items.length} items</span>
          )}
          {expense.source_type === "email" && (
            <Badge variant="outline" className="text-xs">
              Via email
            </Badge>
          )}
        </div>

        {isFailed ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRetry(expense);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Processing
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onReview(expense);
              }}
            >
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </Button>
          </div>
        ) : needsReview ? (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onReview(expense);
            }}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            <Eye className="w-4 h-4 mr-2" />
            Review
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onReview(expense);
            }}
          >
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
        )}
      </div>
    </div>
  );
}

// Review queue banner
function ReviewQueueBanner({ count, onClick }) {
  if (count === 0) return null;

  return (
    <div
      className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 cursor-pointer hover:bg-yellow-500/20 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <div>
            <h3 className="font-medium text-yellow-400 text-sm">
              {count} invoice{count > 1 ? "s" : ""} awaiting review
            </h3>
            <p className="text-xs text-yellow-400/70">
              AI extraction had &lt;{Math.round(MIN_CONFIDENCE * 100)}% confidence
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-yellow-400" />
      </div>
    </div>
  );
}

// Upload invoice modal
function UploadInvoiceModal({ isOpen, onClose, onUploadComplete, companyId, userId, ft }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

  const handleFileSelect = (file) => {
    if (!file) return;

    if (!acceptedTypes.includes(file.type)) {
      toast.error("Invalid file type. Upload an image (JPG, PNG, WebP) or PDF.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File is too large. Maximum is 50MB.");
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  }, []);

  const handleUpload = async () => {
    if (!selectedFile || !companyId) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      let fileToUpload = selectedFile;
      let pdfText = null;

      // Convert PDF to image if necessary AND extract text
      if (selectedFile.type === "application/pdf") {
        toast.info("PDF wordt geconverteerd en tekst wordt ge\u00ebxtraheerd...");
        setUploadProgress(10);
        try {
          // Extract text first (faster)
          pdfText = await extractPdfText(selectedFile);
          console.log("PDF text extracted, length:", pdfText.length);
          setUploadProgress(20);

          // Then convert to image for preview
          fileToUpload = await convertPdfToImage(selectedFile);
          console.log("PDF converted to image:", fileToUpload.name, fileToUpload.size);
        } catch (conversionError) {
          console.error("PDF processing failed:", conversionError);
          toast.error("Kon PDF niet verwerken: " + conversionError.message);
          return;
        }
        setUploadProgress(30);
      }

      // Generate unique filename with correct extension
      const fileId = crypto.randomUUID();
      const ext = fileToUpload.name.split(".").pop();
      const path = `${companyId}/invoices/${fileId}.${ext}`;

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 80));
      }, 200);

      // Upload to storage
      const result = await storage.upload(DOCUMENTS_BUCKET, path, fileToUpload);

      clearInterval(progressInterval);
      setUploadProgress(90);

      // Process the invoice with AI via edge function
      toast.info("Analyzing invoice with AI...");

      console.log("Calling process-invoice edge function with:", { storagePath: path, companyId, userId, hasPdfText: !!pdfText });

      // Call edge function - give it time for LLM processing
      const requestBody = {
        storagePath: path,
        bucket: DOCUMENTS_BUCKET,
        companyId: companyId,
        userId: userId,
        pdfText: pdfText, // Send extracted PDF text
      };

      console.log("Request body being sent:", {
        ...requestBody,
        pdfText: pdfText ? `${pdfText.length} chars` : null,
        pdfTextPreview: pdfText ? pdfText.substring(0, 100) : null,
      });

      // Verify pdfText is actually in the request
      console.log("CRITICAL CHECK - pdfText in requestBody?", "pdfText" in requestBody, typeof requestBody.pdfText);
      console.log("CRITICAL CHECK - pdfText value:", requestBody.pdfText ? `Present (${requestBody.pdfText.length} chars)` : "MISSING!");

      // Use direct fetch instead of supabase.functions.invoke to ensure body is sent correctly
      const startTime = Date.now();
      let processResult, processError;

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-invoice`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify(requestBody),
          }
        );

        const duration = Date.now() - startTime;

        if (!response.ok) {
          const errorText = await response.text();
          processError = { message: `HTTP ${response.status}: ${errorText}` };
          processResult = null;
        } else {
          processResult = await response.json();
          processError = null;
        }

        console.log(`Edge function response (took ${duration}ms):`, { processResult, processError });
      } catch (fetchError) {
        const duration = Date.now() - startTime;
        processError = fetchError;
        processResult = null;
        console.error(`Edge function error (took ${duration}ms):`, fetchError);
      }

      setUploadProgress(100);

      if (processError) {
        console.error("Process error:", processError);
        toast.error("Failed to process invoice: " + (processError.message || JSON.stringify(processError)));
        return;
      }

      if (!processResult) {
        console.error("No result from edge function");
        toast.error("No response from server");
        return;
      }

      if (processResult.success) {
        if (processResult.needsReview) {
          toast.warning(
            `Invoice uploaded but requires manual review (${Math.round(processResult.confidence * 100)}% confidence)`,
            { duration: 5000 }
          );
        } else {
          toast.success("Invoice processed successfully!");
        }
        onUploadComplete?.();
        handleClose();
      } else {
        console.error("Process failed - Full result:", processResult);
        console.error("Errors array:", processResult.errors);
        const errorMsg = processResult.errors?.join(", ") || processResult.error || "Unknown error";
        console.error("Error message:", errorMsg);
        toast.error("Failed to process invoice: " + errorMsg);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed: " + (error.message || "Unknown error"));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-cyan-400" />
            Upload Invoice
          </DialogTitle>
          <DialogDescription>
            Upload an invoice image or PDF. AI will automatically extract the data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative cursor-pointer rounded-xl border-2 border-dashed transition-all
              ${isDragging
                ? "border-cyan-500 bg-cyan-500/10"
                : selectedFile
                  ? "border-green-500/50 bg-green-500/5"
                  : `${ft('border-slate-300', 'border-white/20')} ${ft('hover:border-cyan-500/50 hover:bg-cyan-500/5', 'hover:border-cyan-500/50 hover:bg-cyan-500/5')}`
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => handleFileSelect(e.target.files[0])}
              className="hidden"
            />

            {selectedFile ? (
              <div className="p-4">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-40 mx-auto rounded-lg object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center py-6">
                    <FileText className="w-12 h-12 text-cyan-400" />
                  </div>
                )}
                <div className="mt-3 text-center">
                  <p className={`${ft('text-slate-900', 'text-white')} font-medium truncate text-sm`}>{selectedFile.name}</p>
                  <p className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`mt-2 ${ft('text-slate-500', 'text-zinc-400')}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-cyan-500/10 flex items-center justify-center mb-3">
                  <FileUp className="w-6 h-6 text-cyan-400" />
                </div>
                <p className={`${ft('text-slate-900', 'text-white')} font-medium text-sm`}>
                  Drag a file here or click to select
                </p>
                <p className={`text-xs ${ft('text-slate-500', 'text-zinc-400')} mt-1`}>
                  JPG, PNG, WebP of PDF (max 50MB)
                </p>
              </div>
            )}
          </div>

          {/* Upload progress */}
          {isUploading && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className={ft('text-slate-500', 'text-zinc-400')}>
                  {uploadProgress < 90 ? "Uploading..." : "Processing..."}
                </span>
                <span className="text-cyan-400">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Info box */}
          <div className={`p-3 rounded-lg ${ft('bg-slate-100', 'bg-zinc-900/50')} border ${ft('border-slate-200', 'border-white/10')}`}>
            <div className="flex items-start gap-2">
              <Sparkles className="w-3 h-3 text-cyan-400 mt-0.5 flex-shrink-0" />
              <div className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>
                <p>AI will automatically extract:</p>
                <ul className={`mt-1 space-y-0 ${ft('text-slate-400', 'text-zinc-500')} text-[10px]`}>
                  <li>- Supplier details</li>
                  <li>- Invoice number and date</li>
                  <li>- Amounts and VAT</li>
                  <li>- Line items if available</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload & Process
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function InventoryExpenses() {
  const { user } = useUser();
  const { theme, toggleTheme, ft } = useTheme();
  const [expenses, setExpenses] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const companyId = user?.company_id;

  // Load expenses function (can be called for refresh)
  const loadExpenses = useCallback(async () => {
    if (!companyId) return;

    setIsLoading(true);
    try {
      const [expenseData, queueData] = await Promise.all([
        listExpenses(companyId),
        getReviewQueue(companyId),
      ]);
      setExpenses(expenseData);
      setReviewQueue(queueData);
    } catch (error) {
      console.error("Failed to load expenses:", error);
      toast.error("Failed to load expenses");
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // Load expenses on mount
  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Filter expenses
  const filteredExpenses = expenses.filter((expense) => {
    // Status filter
    if (filter === "review" && !expense.needs_review) return false;
    if (filter === "approved" && expense.status !== "approved") return false;
    if (filter === "pending" && expense.status !== "pending_review") return false;

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        expense.expense_number?.toLowerCase().includes(searchLower) ||
        expense.external_reference?.toLowerCase().includes(searchLower) ||
        expense.suppliers?.name?.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  // Calculate stats
  const totalAmount = expenses.reduce((sum, e) => sum + (e.total || 0), 0);
  const stats = {
    total: expenses.length,
    pendingReview: reviewQueue.length,
    approved: expenses.filter((e) => e.status === "approved").length,
    totalAmount,
  };

  // Handlers
  const handleReview = async (expense) => {
    // Load full expense details
    try {
      const fullExpense = await getExpense(expense.id);
      setSelectedExpense(fullExpense);
      setShowReviewModal(true);
    } catch (error) {
      toast.error("Failed to load invoice");
    }
  };

  const handleRetry = async (expense) => {
    try {
      toast.loading("Reprocessing invoice...", { id: "retry-expense" });

      // Call process-invoice edge function with retry mode
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-invoice`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            _mode: "process",
            _expenseId: expense.id,
            _imageUrl: expense.original_file_url,
            companyId: companyId,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success("Processing triggered. Checking results...", { id: "retry-expense" });

        // Wait longer for async processing to complete
        setTimeout(async () => {
          const [expenseData, queueData] = await Promise.all([
            listExpenses(companyId),
            getReviewQueue(companyId),
          ]);
          setExpenses(expenseData);
          setReviewQueue(queueData);

          // Check if it's still failed
          const updatedExpense = expenseData.find(e => e.id === expense.id);
          if (updatedExpense?.status === 'failed') {
            const errorMsg = updatedExpense.ai_extracted_data?.error || "Unknown error";
            if (errorMsg.includes("Service unavailable") || errorMsg.includes("503")) {
              toast.error("AI service is temporarily unavailable. Please try again in a few minutes.", {
                id: "retry-expense",
                duration: 5000
              });
            } else {
              toast.error("Processing failed: " + errorMsg, {
                id: "retry-expense",
                duration: 5000
              });
            }
          } else if (updatedExpense?.status === 'processing') {
            toast.info("Still processing... Refresh the page in a moment.", { id: "retry-expense" });
          } else {
            toast.success("Invoice processed successfully!", { id: "retry-expense" });
          }
        }, 5000); // Wait 5 seconds for processing
      } else {
        toast.error("Failed to trigger processing: " + (result.error || "Unknown error"), { id: "retry-expense" });
      }
    } catch (error) {
      console.error("Retry error:", error);
      toast.error("Failed to reprocess invoice: " + error.message, { id: "retry-expense" });
    }
  };

  const handleApprove = async (expenseId, notes) => {
    await approveExpense(expenseId, user?.id, notes);
    // Refresh
    const [expenseData, queueData] = await Promise.all([
      listExpenses(companyId),
      getReviewQueue(companyId),
    ]);
    setExpenses(expenseData);
    setReviewQueue(queueData);
  };

  const handleReject = async (expenseId, notes) => {
    await rejectExpense(expenseId, user?.id, notes);
    // Refresh
    const [expenseData, queueData] = await Promise.all([
      listExpenses(companyId),
      getReviewQueue(companyId),
    ]);
    setExpenses(expenseData);
    setReviewQueue(queueData);
  };

  return (
    <PermissionGuard permission="finance.view" showMessage>
      <FinancePageTransition>
        <div className={`max-w-full mx-auto px-4 lg:px-6 py-4 space-y-4`}>
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
            <div>
              <h1 className={`text-lg font-bold ${ft('text-slate-900', 'text-white')}`}>Expenses</h1>
              <p className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>Track and manage inventory expenses</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className={ft('text-slate-600 hover:bg-slate-100', 'text-zinc-400 hover:bg-zinc-800')}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <Button
                className="bg-cyan-600 hover:bg-cyan-700"
                onClick={() => setShowUploadModal(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Invoice
              </Button>
            </div>
          </div>

          {/* Review queue banner */}
          <ReviewQueueBanner
            count={stats.pendingReview}
            onClick={() => setFilter("review")}
          />

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className={`${ft('bg-white', 'bg-zinc-900/50')} border ${ft('border-slate-200', 'border-zinc-800/60')} rounded-xl p-3`}>
              <div className="flex items-center gap-2 mb-1">
                <Receipt className="w-4 h-4 text-cyan-400" />
                <span className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>Total invoices</span>
              </div>
              <p className={`text-lg font-bold ${ft('text-slate-900', 'text-white')}`}>{stats.total}</p>
            </div>
            <div className={`${ft('bg-white', 'bg-zinc-900/50')} border ${ft('border-slate-200', 'border-zinc-800/60')} rounded-xl p-3`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>To Review</span>
              </div>
              <p className={`text-lg font-bold ${ft('text-slate-900', 'text-white')}`}>{stats.pendingReview}</p>
            </div>
            <div className={`${ft('bg-white', 'bg-zinc-900/50')} border ${ft('border-slate-200', 'border-zinc-800/60')} rounded-xl p-3`}>
              <div className="flex items-center gap-2 mb-1">
                <Check className="w-4 h-4 text-green-400" />
                <span className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>Approved</span>
              </div>
              <p className={`text-lg font-bold ${ft('text-slate-900', 'text-white')}`}>{stats.approved}</p>
            </div>
            <div className={`${ft('bg-white', 'bg-zinc-900/50')} border ${ft('border-slate-200', 'border-zinc-800/60')} rounded-xl p-3`}>
              <div className="flex items-center gap-2 mb-1">
                <Euro className="w-4 h-4 text-purple-400" />
                <span className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>Total amount</span>
              </div>
              <p className={`text-lg font-bold ${ft('text-slate-900', 'text-white')}`}>&euro; {stats.totalAmount.toFixed(0)}</p>
            </div>
          </div>

          {/* Filters */}
          <div className={`${ft('bg-white', 'bg-zinc-900/50')} border ${ft('border-slate-200', 'border-zinc-800/60')} rounded-xl p-3`}>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${ft('text-slate-400', 'text-zinc-500')}`} />
                <Input
                  placeholder="Search by invoice number or supplier..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`pl-9 ${ft('bg-slate-100', 'bg-zinc-900/50')} ${ft('border-slate-200', 'border-white/10')}`}
                />
              </div>
              <Tabs value={filter} onValueChange={setFilter}>
                <TabsList className={ft('bg-slate-100', 'bg-zinc-900/50')}>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="review">To Review</TabsTrigger>
                  <TabsTrigger value="approved">Approved</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Expense list */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className={`${ft('bg-white', 'bg-zinc-900/50')} border ${ft('border-slate-200', 'border-zinc-800/60')} rounded-xl p-8 text-center`}>
              <Receipt className={`w-12 h-12 mx-auto ${ft('text-slate-300', 'text-zinc-600')} mb-3`} />
              <h3 className={`text-base font-medium ${ft('text-slate-900', 'text-white')} mb-2`}>
                No invoices found
              </h3>
              <p className={`text-sm ${ft('text-slate-400', 'text-zinc-500')}`}>
                {search
                  ? "Try a different search"
                  : "Upload an invoice to get started"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredExpenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  onReview={handleReview}
                  onRetry={handleRetry}
                  ft={ft}
                />
              ))}
            </div>
          )}

          {/* Review modal */}
          <ReviewModal
            expense={selectedExpense}
            isOpen={showReviewModal}
            onClose={() => {
              setShowReviewModal(false);
              setSelectedExpense(null);
            }}
            onApprove={handleApprove}
            onReject={handleReject}
            ft={ft}
          />

          {/* Upload invoice modal */}
          <UploadInvoiceModal
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            onUploadComplete={loadExpenses}
            companyId={companyId}
            userId={user?.id}
            ft={ft}
          />
        </div>
      </FinancePageTransition>
    </PermissionGuard>
  );
}
