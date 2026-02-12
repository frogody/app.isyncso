import React, { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  Receipt, Search, Filter, Clock, Check, X, AlertTriangle,
  Eye, FileText, Upload, Sparkles, ChevronRight, ChevronDown, Edit2,
  CheckCircle2, XCircle, RefreshCw, Euro, Calendar,
  Building, Percent, ExternalLink, Image, FileUp, Loader2,
  Send, Package, ShoppingCart, Layers
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/components/context/UserContext";
import { PermissionGuard } from "@/components/guards";
import { toast } from "sonner";
import {
  listStockPurchases,
  getStockPurchase,
  getStockPurchaseReviewQueue,
  approveStockPurchase,
  rejectStockPurchase,
} from "@/lib/db/queries";
import { MIN_CONFIDENCE } from "@/lib/db/schema";
import { storage, supabase } from "@/api/supabaseClient";
import ManualPurchaseModal from "@/components/purchases/ManualPurchaseModal";

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
      <Progress value={percent} className={`w-24 h-2 ${color}`} />
      <span className={`text-xs font-medium ${textColor}`}>{percent}%</span>
    </div>
  );
}

// Review modal - "Send to Finance?" workflow
function ReviewModal({ expense, isOpen, onClose, onApprove, onReject, onCheckDuplicate }) {
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);

  // Check for duplicates when modal opens
  useEffect(() => {
    if (isOpen && expense && onCheckDuplicate) {
      checkForDuplicates();
    }
    return () => {
      setDuplicateWarning(null);
      setShowDuplicateConfirm(false);
    };
  }, [isOpen, expense?.id]);

  const checkForDuplicates = async () => {
    if (!expense) return;
    try {
      const duplicate = await onCheckDuplicate(expense);
      if (duplicate) {
        setDuplicateWarning(duplicate);
      }
    } catch (error) {
      console.error('Error checking duplicates:', error);
    }
  };

  const handleSendToFinance = async (forceCreate = false) => {
    // If duplicate found and not force creating, show confirmation
    if (duplicateWarning && !forceCreate && !showDuplicateConfirm) {
      setShowDuplicateConfirm(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await onApprove(expense.id, notes, { sendToFinance: true, forceCreate });
      onClose();
      toast.success("Invoice sent to finance");
    } catch (error) {
      toast.error("Error sending: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeepInInventory = async () => {
    setIsSubmitting(true);
    try {
      // Approve for inventory but don't send to finance
      await onApprove(expense.id, notes, { sendToFinance: false });
      onClose();
      toast.success("Invoice approved for inventory (not sent to finance)");
    } catch (error) {
      toast.error("Error approving: " + error.message);
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
          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span className="text-sm text-zinc-400">AI Confidence</span>
            </div>
            <ConfidenceIndicator confidence={expense.ai_confidence || 0} />
          </div>

          {/* Original document */}
          {expense.original_file_url && (
            <div>
              <Label className="text-zinc-400">Original document</Label>
              <div className="mt-2 rounded-lg border border-white/10 overflow-hidden">
                <img
                  src={expense.original_file_url}
                  alt="Invoice"
                  className="w-full max-h-64 object-contain bg-zinc-950"
                />
              </div>
              <Button
                variant="link"
                size="sm"
                className="mt-1 text-cyan-400"
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
              <Label className="text-zinc-400">Supplier</Label>
              <p className="text-white font-medium">
                {extractedData.supplier_name || expense.suppliers?.name || "-"}
              </p>
            </div>
            <div>
              <Label className="text-zinc-400">Invoice Number</Label>
              <p className="text-white font-medium">
                {expense.external_reference || "-"}
              </p>
            </div>
            <div>
              <Label className="text-zinc-400">Invoice Date</Label>
              <p className="text-white font-medium">
                {expense.invoice_date
                  ? new Date(expense.invoice_date).toLocaleDateString("en-GB")
                  : "-"}
              </p>
            </div>
            <div>
              <Label className="text-zinc-400">Total</Label>
              <p className="text-white font-medium text-lg">
                € {expense.total?.toFixed(2) || "0.00"}
              </p>
            </div>
          </div>

          {/* Line items */}
          {expense.stock_purchase_line_items && expense.stock_purchase_line_items.length > 0 && (
            <div>
              <Label className="text-zinc-400 mb-2 block">Line Items</Label>
              <div className="rounded-lg border border-white/10 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-900/50">
                    <tr className="text-left text-zinc-500">
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2 text-right">Quantity</th>
                      <th className="px-3 py-2 text-right">Price</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {expense.stock_purchase_line_items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-white">
                          {item.description}
                          {item.ean && (
                            <span className="ml-2 text-xs text-zinc-500">
                              EAN: {item.ean}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-zinc-400">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-2 text-right text-zinc-400">
                          € {item.unit_price?.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right text-white">
                          € {item.line_total?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-zinc-900/30">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right text-zinc-400">
                        Subtotal
                      </td>
                      <td className="px-3 py-2 text-right text-white">
                        € {expense.subtotal?.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right text-zinc-400">
                        VAT ({expense.tax_percent || 21}%)
                      </td>
                      <td className="px-3 py-2 text-right text-white">
                        € {expense.tax_amount?.toFixed(2)}
                      </td>
                    </tr>
                    <tr className="font-medium">
                      <td colSpan={3} className="px-3 py-2 text-right text-white">
                        Total
                      </td>
                      <td className="px-3 py-2 text-right text-cyan-400">
                        € {expense.total?.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Review notes */}
          <div>
            <Label>Remarks</Label>
            <Textarea
              placeholder="Any remarks about the review..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 bg-zinc-900/50 border-white/10"
            />
          </div>
        </div>

        {/* Duplicate warning */}
        {duplicateWarning && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-4">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Possible duplicate found!</span>
            </div>
            <p className="text-sm text-amber-300/80 mt-1">
              An invoice with the same number ({duplicateWarning.invoice_number})
              from {duplicateWarning.supplier_name} on {new Date(duplicateWarning.invoice_date).toLocaleDateString('en-GB')} already exists.
            </p>
          </div>
        )}

        {/* Duplicate confirmation dialog */}
        {showDuplicateConfirm ? (
          <DialogFooter className="flex-col gap-3">
            <p className="text-sm text-zinc-400 text-center">
              Are you sure you want to add this as a new invoice?
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDuplicateConfirm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleSendToFinance(true)}
                disabled={isSubmitting}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <AlertTriangle className="w-4 h-4 mr-2" />
                )}
                Add anyway
              </Button>
            </div>
          </DialogFooter>
        ) : (
          <DialogFooter className="flex-col gap-3">
            <div className="text-center">
              <p className="text-sm text-zinc-400 mb-2">Send to finance?</p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={handleKeepInInventory}
                disabled={isSubmitting}
                className="border-zinc-700"
              >
                <Package className="w-4 h-4 mr-2" />
                No, inventory only
              </Button>
              <Button
                onClick={() => handleSendToFinance()}
                disabled={isSubmitting}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Yes, to finance
              </Button>
            </div>
          </DialogFooter>
        )}
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
function ExpenseCard({ expense, onReview, onRetry }) {
  // Defensive: ensure expense exists
  if (!expense) return null;

  // Get safe style object
  const status = getExpenseStatusStyle(expense.status);
  const needsReview = expense.needs_review && expense.review_status === "pending";
  const isFailed = expense.status === 'failed';

  return (
    <div
      className={`p-3 rounded-lg bg-zinc-900/50 border transition-all ${
        needsReview
          ? "border-yellow-500/30 hover:border-yellow-500/50"
          : "border-white/5 hover:border-cyan-500/30"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <div className={`p-2 rounded-lg ${status.bg} ${status.border}`}>
            <Receipt className={`w-4 h-4 ${status.text}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-white">
                {expense.expense_number || expense.external_reference || "Invoice"}
              </h3>
              <Badge className={`${status.bg} ${status.text} ${status.border}`}>
                {expense.status.replace("_", " ")}
              </Badge>
              {needsReview && (
                <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Review Required
                </Badge>
              )}
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              {expense.suppliers?.name || "Unknown supplier"}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm font-semibold text-white">
            € {expense.total?.toFixed(2) || "0.00"}
          </p>
          {expense.ai_confidence !== undefined && (
            <ConfidenceIndicator confidence={expense.ai_confidence} />
          )}
        </div>
      </div>

      {/* Details row */}
      <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          {expense.invoice_date && (
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(expense.invoice_date).toLocaleDateString("en-GB")}
            </span>
          )}
          {expense.stock_purchase_line_items && (
            <span>{expense.stock_purchase_line_items.length} items</span>
          )}
          {expense.source_type === "email" && (
            <Badge variant="outline" className="text-xs">
              Via email
            </Badge>
          )}
          {expense.source_type === "email_pool" && (
            <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
              Email Pool
            </Badge>
          )}
          {expense.source_type === "invoice" && (
            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
              Invoice
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
              className="bg-amber-600 hover:bg-amber-700"
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

// Purchase group header with expand/collapse
function PurchaseGroupHeader({ group, expenses, isExpanded, onToggle }) {
  const totalValue = expenses.reduce((sum, e) => sum + (e.total || 0), 0);
  const totalItems = expenses.reduce((sum, e) => sum + (e.stock_purchase_line_items?.length || 0), 0);

  const CHANNEL_LABELS = { b2b: 'B2B', b2c: 'B2C', onbepaald: 'Undecided' };

  return (
    <button
      onClick={onToggle}
      className="w-full p-3 rounded-lg bg-zinc-900/80 border border-cyan-500/20 hover:border-cyan-500/40 transition-all text-left"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-white">{group.name}</h3>
              {group.sales_channel && (
                <Badge className={`text-xs ${
                  group.sales_channel === 'b2b'
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    : group.sales_channel === 'b2c'
                      ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                      : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                }`}>
                  {CHANNEL_LABELS[group.sales_channel] || group.sales_channel}
                </Badge>
              )}
              <Badge className="bg-zinc-500/10 text-zinc-400 border-zinc-500/30 text-xs">
                {expenses.length} invoices
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
              {group.suppliers?.name && (
                <span className="flex items-center gap-1">
                  <Building className="w-3 h-3" /> {group.suppliers.name}
                </span>
              )}
              {group.purchase_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(group.purchase_date).toLocaleDateString('en-GB')}
                </span>
              )}
              <span>{totalItems} items</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold text-white">€ {totalValue.toFixed(2)}</p>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          )}
        </div>
      </div>
    </button>
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
            <h3 className="font-medium text-yellow-400">
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
function UploadInvoiceModal({ isOpen, onClose, onUploadComplete, companyId, userId }) {
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
        toast.info("Converting PDF and extracting text...");
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

        <div className="space-y-4 py-4">
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
                  : "border-white/20 hover:border-cyan-500/50 hover:bg-cyan-500/5"
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
              <div className="p-6">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-48 mx-auto rounded-lg object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <FileText className="w-16 h-16 text-cyan-400" />
                  </div>
                )}
                <div className="mt-3 text-center">
                  <p className="text-white font-medium truncate text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-zinc-400">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-zinc-400"
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
                <p className="text-white font-medium text-sm">
                  Drag a file here or click to select
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  JPG, PNG, WebP of PDF (max 50MB)
                </p>
              </div>
            )}
          </div>

          {/* Upload progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">
                  {uploadProgress < 90 ? "Uploading..." : "Processing..."}
                </span>
                <span className="text-cyan-400">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Info box */}
          <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/10">
            <div className="flex items-start gap-2">
              <Sparkles className="w-3 h-3 text-cyan-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-zinc-400">
                <p>AI will automatically extract:</p>
                <ul className="mt-1 space-y-0.5 text-zinc-500 text-[10px]">
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

export default function StockPurchases() {
  const { user } = useUser();
  const [expenses, setExpenses] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [purchaseGroups, setPurchaseGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});

  const companyId = user?.company_id;

  // Load stock purchases function (can be called for refresh)
  const loadStockPurchases = useCallback(async () => {
    if (!companyId) return;

    setIsLoading(true);
    try {
      const [purchaseData, queueData, groupsResult] = await Promise.all([
        listStockPurchases(companyId),
        getStockPurchaseReviewQueue(companyId),
        supabase
          .from('purchase_groups')
          .select('*, suppliers(id, name)')
          .eq('company_id', companyId)
          .order('purchase_date', { ascending: false }),
      ]);
      setExpenses(purchaseData);
      setReviewQueue(queueData);
      setPurchaseGroups(groupsResult.data || []);
    } catch (error) {
      console.error("Failed to load stock purchases:", error);
      toast.error("Failed to load stock purchases");
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // Load expenses on mount
  useEffect(() => {
    loadStockPurchases();
  }, [loadStockPurchases]);

  // Filter expenses
  const filteredExpenses = expenses.filter((expense) => {
    // Status filter
    if (filter === "review" && !expense.needs_review) return false;
    if (filter === "approved" && expense.status !== "approved") return false;
    if (filter === "pending" && expense.status !== "pending_review") return false;

    // Source filter
    if (sourceFilter !== "all") {
      if ((expense.source_type || "manual") !== sourceFilter) return false;
    }

    // Group filter
    if (groupFilter !== "all") {
      if (groupFilter === "ungrouped" && expense.purchase_group_id) return false;
      if (groupFilter !== "ungrouped" && expense.purchase_group_id !== groupFilter) return false;
    }

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

  // Organize expenses by group
  const groupedExpenses = {};
  const ungroupedExpenses = [];
  filteredExpenses.forEach(expense => {
    if (expense.purchase_group_id) {
      if (!groupedExpenses[expense.purchase_group_id]) {
        groupedExpenses[expense.purchase_group_id] = [];
      }
      groupedExpenses[expense.purchase_group_id].push(expense);
    } else {
      ungroupedExpenses.push(expense);
    }
  });

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

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
    // Load full stock purchase details
    try {
      const fullPurchase = await getStockPurchase(expense.id);
      setSelectedExpense(fullPurchase);
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
          const [purchaseData, queueData] = await Promise.all([
            listStockPurchases(companyId),
            getStockPurchaseReviewQueue(companyId),
          ]);
          setExpenses(purchaseData);
          setReviewQueue(queueData);

          // Check if it's still failed
          const updatedExpense = purchaseData.find(e => e.id === expense.id);
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

  // Check for duplicate invoices in finance/expenses
  const checkForDuplicate = async (expense) => {
    if (!expense?.external_reference) return null;

    // Check if invoice with same number already exists in expenses table
    const { data: existing } = await supabase
      .from('expenses')
      .select('id, external_reference, supplier_id, invoice_date, suppliers(name)')
      .eq('company_id', companyId)
      .eq('external_reference', expense.external_reference)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return {
        id: existing.id,
        invoice_number: existing.external_reference,
        supplier_name: existing.suppliers?.name || 'Unknown',
        invoice_date: existing.invoice_date,
      };
    }
    return null;
  };

  const handleApprove = async (purchaseId, notes, options = {}) => {
    const { sendToFinance = true, forceCreate = false } = options;

    // Approve the stock purchase (this creates expected deliveries and updates inventory)
    await approveStockPurchase(purchaseId, user?.id, notes);

    // If sending to finance, create expense record
    if (sendToFinance) {
      const purchase = expenses.find(e => e.id === purchaseId);
      if (purchase) {
        // Create expense record in finance system
        const { error: expenseError } = await supabase
          .from('expenses')
          .insert({
            company_id: companyId,
            user_id: user?.id,
            document_type: 'invoice',
            source_type: 'stock_purchase',
            source_stock_purchase_id: purchaseId,
            supplier_id: purchase.supplier_id,
            external_reference: purchase.external_reference,
            invoice_date: purchase.invoice_date,
            date: purchase.invoice_date,
            description: `Invoice ${purchase.external_reference || purchase.invoice_number || ''}`.trim(),
            amount: purchase.total,
            subtotal: purchase.subtotal,
            tax_percent: purchase.tax_percent,
            tax_amount: purchase.tax_amount,
            total: purchase.total,
            currency: purchase.currency || 'EUR',
            payment_status: 'pending',
            payment_due_date: purchase.payment_due_date,
            original_file_url: purchase.original_file_url,
            ai_extracted_data: purchase.ai_extracted_data,
            ai_confidence: purchase.ai_confidence,
            status: 'approved',
            review_status: 'approved',
            needs_review: false,
          });

        if (expenseError) {
          console.error('Error creating expense:', expenseError);
          toast.error('Approved but could not send to finance');
        }
      }
    }

    // Refresh all data including groups
    await loadStockPurchases();
  };

  const handleReject = async (purchaseId, notes) => {
    await rejectStockPurchase(purchaseId, user?.id, notes);
    await loadStockPurchases();
  };

  return (
    <PermissionGuard permission="finance.view" showMessage>
      <div className="max-w-full mx-auto px-4 lg:px-6 py-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg font-bold text-white">Stock Purchases</h1>
            <p className="text-xs text-zinc-400">Manage purchase orders and stock procurement</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowManualModal(true)}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Manual Purchase
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
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-zinc-500">Total invoices</span>
            </div>
            <p className="text-lg font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-zinc-500">To Review</span>
            </div>
            <p className="text-lg font-bold text-white">{stats.pendingReview}</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-xs text-zinc-500">Approved</span>
            </div>
            <p className="text-lg font-bold text-white">{stats.approved}</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Euro className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-zinc-500">Total amount</span>
            </div>
            <p className="text-lg font-bold text-white">€ {stats.totalAmount.toFixed(0)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Search by invoice number or supplier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-zinc-900/50 border-white/10"
              />
            </div>
            {/* Source filter */}
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[140px] bg-zinc-900/50 border-white/10 text-white">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800/60">
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="email_pool">Email Pool</SelectItem>
              </SelectContent>
            </Select>
            {/* Group filter */}
            {purchaseGroups.length > 0 && (
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="w-[180px] bg-zinc-900/50 border-white/10 text-white">
                  <SelectValue placeholder="Group" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800/60">
                  <SelectItem value="all">All Groups</SelectItem>
                  <SelectItem value="ungrouped">Ungrouped</SelectItem>
                  {purchaseGroups.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="bg-zinc-900/50">
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
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-12 text-center">
            <Receipt className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              No invoices found
            </h3>
            <p className="text-zinc-500">
              {search
                ? "Try a different search"
                : "Upload an invoice to get started"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Grouped purchases */}
            {purchaseGroups
              .filter(g => groupedExpenses[g.id]?.length > 0)
              .map(group => (
                <div key={group.id} className="space-y-2">
                  <PurchaseGroupHeader
                    group={group}
                    expenses={groupedExpenses[group.id]}
                    isExpanded={expandedGroups[group.id]}
                    onToggle={() => toggleGroup(group.id)}
                  />
                  {expandedGroups[group.id] && (
                    <div className="ml-6 space-y-2 border-l-2 border-cyan-500/20 pl-3">
                      {groupedExpenses[group.id].map(expense => (
                        <ExpenseCard
                          key={expense.id}
                          expense={expense}
                          onReview={handleReview}
                          onRetry={handleRetry}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}

            {/* Ungrouped purchases */}
            {ungroupedExpenses.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                onReview={handleReview}
                onRetry={handleRetry}
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
          onCheckDuplicate={checkForDuplicate}
        />

        {/* Upload invoice modal */}
        <UploadInvoiceModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUploadComplete={loadStockPurchases}
          companyId={companyId}
          userId={user?.id}
        />

        {/* Manual purchase modal */}
        <ManualPurchaseModal
          isOpen={showManualModal}
          onClose={() => setShowManualModal(false)}
          onPurchaseCreated={loadStockPurchases}
          companyId={companyId}
          userId={user?.id}
        />
      </div>
    </PermissionGuard>
  );
}
