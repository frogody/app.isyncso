import React, { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { motion, AnimatePresence } from "framer-motion";
import anime from '@/lib/anime-wrapper';
const animate = anime;
import { prefersReducedMotion } from '@/lib/animations';
import {
  Receipt, Search, Filter, Clock, Check, X, AlertTriangle,
  Eye, FileText, Upload, Sparkles, ChevronRight, Edit2,
  CheckCircle2, XCircle, RefreshCw, DollarSign, Calendar,
  Building, Percent, ExternalLink, Image, FileUp, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { GlassCard, StatCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
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

const DOCUMENTS_BUCKET = "documents";

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
      <span className={`text-sm font-medium ${textColor}`}>{percent}%</span>
    </div>
  );
}

// Review modal
function ReviewModal({ expense, isOpen, onClose, onApprove, onReject }) {
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(expense.id, notes);
      onClose();
      toast.success("Factuur goedgekeurd");
    } catch (error) {
      toast.error("Fout bij goedkeuren: " + error.message);
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
      toast.success("Factuur afgewezen");
    } catch (error) {
      toast.error("Fout bij afwijzen: " + error.message);
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
            Factuur beoordelen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Confidence score */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span className="text-sm text-zinc-400">AI Betrouwbaarheid</span>
            </div>
            <ConfidenceIndicator confidence={expense.ai_confidence || 0} />
          </div>

          {/* Original document */}
          {expense.original_file_url && (
            <div>
              <Label className="text-zinc-400">Origineel document</Label>
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
                Open in nieuw tabblad
              </Button>
            </div>
          )}

          {/* Extracted data */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-400">Leverancier</Label>
              <p className="text-white font-medium">
                {extractedData.supplier_name || expense.suppliers?.name || "-"}
              </p>
            </div>
            <div>
              <Label className="text-zinc-400">Factuurnummer</Label>
              <p className="text-white font-medium">
                {expense.external_reference || "-"}
              </p>
            </div>
            <div>
              <Label className="text-zinc-400">Factuurdatum</Label>
              <p className="text-white font-medium">
                {expense.invoice_date
                  ? new Date(expense.invoice_date).toLocaleDateString("nl-NL")
                  : "-"}
              </p>
            </div>
            <div>
              <Label className="text-zinc-400">Totaal</Label>
              <p className="text-white font-medium text-lg">
                € {expense.total?.toFixed(2) || "0.00"}
              </p>
            </div>
          </div>

          {/* Line items */}
          {expense.expense_line_items && expense.expense_line_items.length > 0 && (
            <div>
              <Label className="text-zinc-400 mb-2 block">Regelitems</Label>
              <div className="rounded-lg border border-white/10 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-900/50">
                    <tr className="text-left text-zinc-500">
                      <th className="px-3 py-2">Omschrijving</th>
                      <th className="px-3 py-2 text-right">Aantal</th>
                      <th className="px-3 py-2 text-right">Prijs</th>
                      <th className="px-3 py-2 text-right">Totaal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {expense.expense_line_items.map((item) => (
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
                        Subtotaal
                      </td>
                      <td className="px-3 py-2 text-right text-white">
                        € {expense.subtotal?.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right text-zinc-400">
                        BTW ({expense.tax_percent || 21}%)
                      </td>
                      <td className="px-3 py-2 text-right text-white">
                        € {expense.tax_amount?.toFixed(2)}
                      </td>
                    </tr>
                    <tr className="font-medium">
                      <td colSpan={3} className="px-3 py-2 text-right text-white">
                        Totaal
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
            <Label>Opmerkingen</Label>
            <Textarea
              placeholder="Eventuele opmerkingen bij de beoordeling..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 bg-zinc-900/50 border-white/10"
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
            Afwijzen
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
            Goedkeuren
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
function ExpenseCard({ expense, onReview }) {
  // Defensive: ensure expense exists
  if (!expense) return null;

  // Get safe style object
  const status = getExpenseStatusStyle(expense.status);
  const needsReview = expense.needs_review && expense.review_status === "pending";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl bg-zinc-900/50 border transition-all ${
        needsReview
          ? "border-yellow-500/30 hover:border-yellow-500/50"
          : "border-white/5 hover:border-cyan-500/30"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${status.bg} ${status.border}`}>
            <Receipt className={`w-5 h-5 ${status.text}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-white">
                {expense.expense_number || expense.external_reference || "Factuur"}
              </h3>
              <Badge className={`${status.bg} ${status.text} ${status.border}`}>
                {expense.status.replace("_", " ")}
              </Badge>
              {needsReview && (
                <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Review vereist
                </Badge>
              )}
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              {expense.suppliers?.name || "Onbekende leverancier"}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-lg font-semibold text-white">
            € {expense.total?.toFixed(2) || "0.00"}
          </p>
          {expense.ai_confidence !== undefined && (
            <ConfidenceIndicator confidence={expense.ai_confidence} />
          )}
        </div>
      </div>

      {/* Details row */}
      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-zinc-500">
          {expense.invoice_date && (
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(expense.invoice_date).toLocaleDateString("nl-NL")}
            </span>
          )}
          {expense.expense_line_items && (
            <span>{expense.expense_line_items.length} items</span>
          )}
          {expense.source_type === "email" && (
            <Badge variant="outline" className="text-xs">
              Via e-mail
            </Badge>
          )}
        </div>

        {needsReview ? (
          <Button
            size="sm"
            onClick={() => onReview(expense)}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            <Eye className="w-4 h-4 mr-2" />
            Beoordelen
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onReview(expense)}
          >
            <Eye className="w-4 h-4 mr-2" />
            Bekijken
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// Review queue banner
function ReviewQueueBanner({ count, onClick }) {
  if (count === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 cursor-pointer hover:bg-yellow-500/20 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-400" />
          <div>
            <h3 className="font-medium text-yellow-400">
              {count} factuur{count > 1 ? "en" : ""} wachten op beoordeling
            </h3>
            <p className="text-sm text-yellow-400/70">
              AI-extractie had &lt;{Math.round(MIN_CONFIDENCE * 100)}% betrouwbaarheid
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-yellow-400" />
      </div>
    </motion.div>
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
      toast.error("Ongeldig bestandstype. Upload een afbeelding (JPG, PNG, WebP) of PDF.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("Bestand is te groot. Maximum is 50MB.");
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

      // Convert PDF to image if necessary
      if (selectedFile.type === "application/pdf") {
        toast.info("PDF wordt geconverteerd naar afbeelding...");
        setUploadProgress(10);
        try {
          fileToUpload = await convertPdfToImage(selectedFile);
          console.log("PDF converted to image:", fileToUpload.name, fileToUpload.size);
        } catch (conversionError) {
          console.error("PDF conversion failed:", conversionError);
          toast.error("Kon PDF niet converteren: " + conversionError.message);
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
      toast.info("Factuur wordt geanalyseerd met AI...");

      console.log("Calling process-invoice edge function with:", { storagePath: path, companyId, userId });

      const { data: processResult, error: processError } = await supabase.functions.invoke(
        "process-invoice",
        {
          body: {
            storagePath: path,
            bucket: DOCUMENTS_BUCKET,
            companyId: companyId,
            userId: userId,
          },
        }
      );

      console.log("Edge function response:", { processResult, processError });

      setUploadProgress(100);

      if (processError) {
        console.error("Process error:", processError);
        toast.error("Kon factuur niet verwerken: " + (processError.message || JSON.stringify(processError)));
        return;
      }

      if (!processResult) {
        console.error("No result from edge function");
        toast.error("Geen respons van de server");
        return;
      }

      if (processResult.success) {
        if (processResult.needsReview) {
          toast.warning(
            `Factuur geüpload maar vereist handmatige beoordeling (${Math.round(processResult.confidence * 100)}% betrouwbaarheid)`,
            { duration: 5000 }
          );
        } else {
          toast.success("Factuur succesvol verwerkt!");
        }
        onUploadComplete?.();
        handleClose();
      } else {
        console.error("Process failed - Full result:", processResult);
        console.error("Errors array:", processResult.errors);
        const errorMsg = processResult.errors?.join(", ") || processResult.error || "Onbekende fout";
        console.error("Error message:", errorMsg);
        toast.error("Kon factuur niet verwerken: " + errorMsg);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload mislukt: " + (error.message || "Onbekende fout"));
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
            Factuur uploaden
          </DialogTitle>
          <DialogDescription>
            Upload een factuurafbeelding of PDF. AI zal automatisch de gegevens extraheren.
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
                <div className="mt-4 text-center">
                  <p className="text-white font-medium truncate">{selectedFile.name}</p>
                  <p className="text-sm text-zinc-400">
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
                    Verwijderen
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/10 flex items-center justify-center mb-4">
                  <FileUp className="w-8 h-8 text-cyan-400" />
                </div>
                <p className="text-white font-medium">
                  Sleep een bestand hierheen of klik om te selecteren
                </p>
                <p className="text-sm text-zinc-400 mt-1">
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
                  {uploadProgress < 90 ? "Uploaden..." : "Verwerken..."}
                </span>
                <span className="text-cyan-400">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Info box */}
          <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/10">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-zinc-400">
                <p>AI zal automatisch extracten:</p>
                <ul className="mt-1 space-y-0.5 text-zinc-500">
                  <li>• Leveranciersgegevens</li>
                  <li>• Factuurnummer en datum</li>
                  <li>• Bedragen en BTW</li>
                  <li>• Regelitems indien beschikbaar</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Annuleren
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verwerken...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Uploaden & Verwerken
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
  const [expenses, setExpenses] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const companyId = user?.company_id;

  // Refs for anime.js animations
  const headerRef = useRef(null);
  const statsRef = useRef(null);

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
      toast.error("Kon uitgaven niet laden");
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // Load expenses on mount
  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Animate header on mount
  useEffect(() => {
    if (!headerRef.current || prefersReducedMotion()) return;

    animate({
      targets: headerRef.current,
      translateY: [-20, 0],
      opacity: [0, 1],
      duration: 500,
      easing: 'easeOutQuart',
    });
  }, []);

  // Animate stats bar
  useEffect(() => {
    if (isLoading || !statsRef.current || prefersReducedMotion()) return;

    animate({
      targets: statsRef.current,
      translateY: [15, 0],
      opacity: [0, 1],
      duration: 400,
      easing: 'easeOutQuad',
      delay: 100,
    });
  }, [isLoading]);

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
      toast.error("Kon factuur niet laden");
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
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 pt-6">
          <div ref={headerRef} style={{ opacity: 0 }}>
            <PageHeader
              title="Uitgaven"
              subtitle="Beheer facturen en AI-extractie reviews"
              icon={Receipt}
              actions={
                <Button
                  className="bg-cyan-600 hover:bg-cyan-700"
                  onClick={() => setShowUploadModal(true)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Factuur uploaden
                </Button>
              }
            />
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          {/* Review queue banner */}
          <ReviewQueueBanner
            count={stats.pendingReview}
            onClick={() => setFilter("review")}
          />

          {/* Stats */}
          <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6" style={{ opacity: 0 }}>
            <StatCard
              icon={Receipt}
              label="Totaal facturen"
              value={stats.total}
              color="cyan"
            />
            <StatCard
              icon={AlertTriangle}
              label="Te beoordelen"
              value={stats.pendingReview}
              color="yellow"
            />
            <StatCard
              icon={Check}
              label="Goedgekeurd"
              value={stats.approved}
              color="green"
            />
            <StatCard
              icon={DollarSign}
              label="Totaal bedrag"
              value={`€ ${stats.totalAmount.toFixed(0)}`}
              color="purple"
            />
          </div>

          {/* Filters */}
          <GlassCard className="p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  placeholder="Zoek op factuurnummer of leverancier..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-zinc-900/50 border-white/10"
                />
              </div>
              <Tabs value={filter} onValueChange={setFilter}>
                <TabsList className="bg-zinc-900/50">
                  <TabsTrigger value="all">Alles</TabsTrigger>
                  <TabsTrigger value="review">Te beoordelen</TabsTrigger>
                  <TabsTrigger value="approved">Goedgekeurd</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </GlassCard>

          {/* Expense list */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : filteredExpenses.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <Receipt className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                Geen facturen gevonden
              </h3>
              <p className="text-zinc-500">
                {search
                  ? "Probeer een andere zoekopdracht"
                  : "Upload een factuur om te beginnen"}
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-4">
              {filteredExpenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  onReview={handleReview}
                />
              ))}
            </div>
          )}
        </div>

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
        />

        {/* Upload invoice modal */}
        <UploadInvoiceModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUploadComplete={loadExpenses}
          companyId={companyId}
          userId={user?.id}
        />
      </div>
    </PermissionGuard>
  );
}
