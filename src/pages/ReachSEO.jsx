import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Loader2,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Download,
  Clock,
  Globe,
  ExternalLink,
  FileText,
  Hash,
  Image,
  Link2,
  Code,
  Smartphone,
  Tag,
  Braces,
  LayoutList,
} from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import {
  Document,
  Page as PdfPage,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://sfxpmzicgpaxfntqleig.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4";

// ---------------------------------------------------------------------------
// Score Gauge
// ---------------------------------------------------------------------------

function ScoreGauge({ score, size = 180 }) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score / 100;
  const strokeDashoffset = circumference * (1 - progress);

  const color =
    score <= 40
      ? "rgb(239, 68, 68)"
      : score <= 70
        ? "rgb(245, 158, 11)"
        : "rgb(34, 211, 238)";

  const colorClass =
    score <= 40
      ? "text-red-500"
      : score <= 70
        ? "text-amber-500"
        : "text-cyan-400";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(63, 63, 70, 0.5)"
            strokeWidth={10}
          />
          {/* Progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>
        {/* Score number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={`text-4xl font-bold ${colorClass}`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            {score}
          </motion.span>
          <span className="text-xs text-zinc-500 mt-0.5">/ 100</span>
        </div>
      </div>
      <span className="text-sm font-medium text-zinc-400">SEO Score</span>
    </div>
  );
}

// Mini gauge for history rows
function MiniGauge({ score, size = 32 }) {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - score / 100);
  const color =
    score <= 40
      ? "rgb(239, 68, 68)"
      : score <= 70
        ? "rgb(245, 158, 11)"
        : "rgb(34, 211, 238)";
  const colorClass =
    score <= 40
      ? "text-red-400"
      : score <= 70
        ? "text-amber-400"
        : "text-cyan-400";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(63, 63, 70, 0.4)"
          strokeWidth={3}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${colorClass}`}
      >
        {score}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Findings Section (collapsible)
// ---------------------------------------------------------------------------

const CATEGORY_CONFIG = {
  critical: {
    icon: AlertTriangle,
    label: "Critical",
    border: "border-red-500/30",
    bg: "bg-red-500/5",
    badge: "bg-red-500/20 text-red-400",
    iconColor: "text-red-400",
    ring: "ring-red-500/20",
  },
  warning: {
    icon: AlertCircle,
    label: "Warnings",
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    badge: "bg-amber-500/20 text-amber-400",
    iconColor: "text-amber-400",
    ring: "ring-amber-500/20",
  },
  passed: {
    icon: CheckCircle,
    label: "Passed",
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/5",
    badge: "bg-cyan-500/20 text-cyan-400",
    iconColor: "text-cyan-400",
    ring: "ring-cyan-500/20",
  },
};

function FindingsSection({ category, findings }) {
  const [isOpen, setIsOpen] = useState(category === "critical");
  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;

  if (findings.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border ${config.border} ${config.bg} overflow-hidden`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${config.iconColor}`} />
          <span className="text-sm font-medium text-white">
            {config.label}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.badge}`}
          >
            {findings.length}
          </span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {findings.map((finding, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-white/[0.03] border border-zinc-800/50"
                >
                  <div className="flex items-start gap-2">
                    <Icon
                      className={`w-4 h-4 mt-0.5 shrink-0 ${config.iconColor}`}
                    />
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm font-medium text-white">
                        {finding.title}
                      </p>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {finding.description}
                      </p>
                      {finding.suggestion &&
                        finding.suggestion !== "No changes needed." && (
                          <p className="text-xs text-cyan-400/80 leading-relaxed">
                            Suggestion: {finding.suggestion}
                          </p>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Meta Analysis Card
// ---------------------------------------------------------------------------

function MetaAnalysisCard({ meta }) {
  if (!meta) return null;

  const rows = [
    {
      icon: FileText,
      label: "Title",
      value: meta.title,
      detail: meta.titleLength ? `${meta.titleLength} chars` : null,
    },
    {
      icon: LayoutList,
      label: "Description",
      value: meta.description,
      detail: meta.descriptionLength
        ? `${meta.descriptionLength} chars`
        : null,
    },
    { icon: Hash, label: "Charset", value: meta.charset },
    { icon: Smartphone, label: "Viewport", value: meta.viewport ? "Present" : null },
    { icon: Link2, label: "Canonical", value: meta.canonical },
    { icon: Tag, label: "OG Title", value: meta.ogTitle },
    { icon: Tag, label: "OG Description", value: meta.ogDescription },
    { icon: Image, label: "OG Image", value: meta.ogImage },
    { icon: Globe, label: "OG URL", value: meta.ogUrl },
    { icon: Code, label: "Robots", value: meta.robots },
    { icon: Globe, label: "Language", value: meta.language },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5"
    >
      <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
        <Braces className="w-4 h-4 text-cyan-400" />
        Meta Analysis
      </h3>
      <div className="space-y-2.5">
        {rows.map((row, i) => {
          const RowIcon = row.icon;
          return (
            <div key={i} className="flex items-start gap-3">
              <RowIcon className="w-3.5 h-3.5 mt-1 text-zinc-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-xs text-zinc-500">{row.label}</span>
                {row.value ? (
                  <p className="text-xs text-zinc-300 break-all leading-relaxed">
                    {row.value}
                    {row.detail && (
                      <span className="text-zinc-500 ml-1.5">
                        ({row.detail})
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-600 italic">Not found</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Performance Signals Card
// ---------------------------------------------------------------------------

function PerformanceCard({ signals }) {
  if (!signals) return null;

  const stats = [
    { label: "Scripts", value: signals.scriptCount },
    { label: "Inline CSS", value: signals.inlineCssBlocks },
    { label: "Images", value: signals.imageCount },
    { label: "No Alt Text", value: signals.imagesWithoutAlt },
    { label: "Internal Links", value: signals.internalLinks },
    { label: "External Links", value: signals.externalLinks },
    { label: "H1 Tags", value: signals.h1Count },
    { label: "H2 Tags", value: signals.h2Count },
    { label: "H3+ Tags", value: signals.h3Count + signals.h4Count + signals.h5Count + signals.h6Count },
    { label: "Word Count", value: signals.wordCount },
    { label: "JSON-LD", value: signals.hasJsonLd ? "Yes" : "No" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5"
    >
      <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
        <Code className="w-4 h-4 text-cyan-400" />
        Performance Signals
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="p-2.5 rounded-xl bg-white/[0.03] border border-zinc-800/50"
          >
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
              {stat.label}
            </p>
            <p className="text-lg font-semibold text-white mt-0.5">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// PDF Report
// ---------------------------------------------------------------------------

const pdfStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1a2e",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#22d3ee",
  },
  brand: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#22d3ee",
  },
  subtitle: {
    fontSize: 9,
    color: "#6b7280",
    marginTop: 2,
  },
  dateBlock: {
    alignItems: "flex-end",
  },
  dateLabel: {
    fontSize: 8,
    color: "#9ca3af",
  },
  dateValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a2e",
  },
  urlSection: {
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
    padding: 12,
    marginBottom: 20,
  },
  urlLabel: {
    fontSize: 8,
    color: "#6b7280",
    marginBottom: 2,
  },
  urlValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a2e",
  },
  scoreSection: {
    alignItems: "center",
    marginBottom: 24,
    padding: 16,
    backgroundColor: "#f0fdfa",
    borderRadius: 8,
  },
  scoreLabel: {
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 36,
    fontFamily: "Helvetica-Bold",
  },
  scoreMax: {
    fontSize: 12,
    color: "#9ca3af",
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a2e",
    marginBottom: 10,
    marginTop: 16,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  findingCard: {
    marginBottom: 8,
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
  },
  findingTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
  },
  findingDesc: {
    fontSize: 9,
    color: "#4b5563",
    lineHeight: 1.4,
  },
  findingSugg: {
    fontSize: 9,
    color: "#0891b2",
    marginTop: 3,
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: "#9ca3af",
  },
  metaRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  metaLabel: {
    width: 100,
    fontSize: 9,
    color: "#6b7280",
  },
  metaValue: {
    flex: 1,
    fontSize: 9,
    color: "#1a1a2e",
  },
});

const categoryStyles = {
  critical: {
    bg: "#fef2f2",
    border: "#fca5a5",
    titleColor: "#dc2626",
  },
  warning: {
    bg: "#fffbeb",
    border: "#fcd34d",
    titleColor: "#d97706",
  },
  passed: {
    bg: "#f0fdfa",
    border: "#67e8f9",
    titleColor: "#0891b2",
  },
};

function SeoReportPdf({ url, score, findings, meta, scanDate }) {
  const critical = findings.filter((f) => f.category === "critical");
  const warnings = findings.filter((f) => f.category === "warning");
  const passed = findings.filter((f) => f.category === "passed");

  const scoreColor =
    score <= 40 ? "#dc2626" : score <= 70 ? "#d97706" : "#0891b2";

  const renderFindings = (items, label) => {
    if (items.length === 0) return null;
    const catStyle = categoryStyles[items[0]?.category] || categoryStyles.passed;
    return (
      <View>
        <Text style={pdfStyles.sectionTitle}>
          {label} ({items.length})
        </Text>
        {items.map((f, i) => (
          <View
            key={i}
            style={[
              pdfStyles.findingCard,
              {
                backgroundColor: catStyle.bg,
                borderColor: catStyle.border,
              },
            ]}
          >
            <Text
              style={[
                pdfStyles.findingTitle,
                { color: catStyle.titleColor },
              ]}
            >
              {f.title}
            </Text>
            <Text style={pdfStyles.findingDesc}>{f.description}</Text>
            {f.suggestion && f.suggestion !== "No changes needed." && (
              <Text style={pdfStyles.findingSugg}>
                Suggestion: {f.suggestion}
              </Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  const metaRows = [
    { label: "Title", value: meta?.title || "Not found" },
    { label: "Description", value: meta?.description || "Not found" },
    { label: "Charset", value: meta?.charset || "Not found" },
    { label: "Viewport", value: meta?.viewport ? "Present" : "Not found" },
    { label: "Canonical", value: meta?.canonical || "Not found" },
    { label: "OG Title", value: meta?.ogTitle || "Not found" },
    { label: "OG Description", value: meta?.ogDescription || "Not found" },
    { label: "OG Image", value: meta?.ogImage || "Not found" },
    { label: "Language", value: meta?.language || "Not found" },
  ];

  return (
    <Document>
      <PdfPage size="A4" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header}>
          <View>
            <Text style={pdfStyles.brand}>iSyncSO SEO Report</Text>
            <Text style={pdfStyles.subtitle}>
              Automated SEO analysis by Reach
            </Text>
          </View>
          <View style={pdfStyles.dateBlock}>
            <Text style={pdfStyles.dateLabel}>Scan Date</Text>
            <Text style={pdfStyles.dateValue}>{scanDate}</Text>
          </View>
        </View>

        {/* URL */}
        <View style={pdfStyles.urlSection}>
          <Text style={pdfStyles.urlLabel}>Scanned URL</Text>
          <Text style={pdfStyles.urlValue}>{url}</Text>
        </View>

        {/* Score */}
        <View style={pdfStyles.scoreSection}>
          <Text style={pdfStyles.scoreLabel}>Overall SEO Score</Text>
          <Text style={[pdfStyles.scoreValue, { color: scoreColor }]}>
            {score}
          </Text>
          <Text style={pdfStyles.scoreMax}>out of 100</Text>
        </View>

        {/* Findings */}
        {renderFindings(critical, "Critical Issues")}
        {renderFindings(warnings, "Warnings")}
        {renderFindings(passed, "Passed Checks")}

        {/* Meta */}
        <Text style={pdfStyles.sectionTitle}>Meta Tag Analysis</Text>
        {metaRows.map((row, i) => (
          <View key={i} style={pdfStyles.metaRow}>
            <Text style={pdfStyles.metaLabel}>{row.label}</Text>
            <Text style={pdfStyles.metaValue}>{row.value}</Text>
          </View>
        ))}

        {/* Footer */}
        <View style={pdfStyles.footer} fixed>
          <Text style={pdfStyles.footerText}>
            Generated by iSyncSO Reach - SEO Scanner
          </Text>
          <Text style={pdfStyles.footerText}>{scanDate}</Text>
        </View>
      </PdfPage>
    </Document>
  );
}

async function downloadPdfReport(reportData) {
  const scanDate = new Date(
    reportData.created_at || Date.now()
  ).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const doc = (
    <SeoReportPdf
      url={reportData.url}
      score={reportData.score}
      findings={reportData.findings || []}
      meta={reportData.meta_analysis}
      scanDate={scanDate}
    />
  );

  const blob = await pdf(doc).toBlob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  const hostname = (() => {
    try {
      return new URL(reportData.url).hostname.replace(/\./g, "_");
    } catch {
      return "report";
    }
  })();
  link.download = `seo-report-${hostname}-${Date.now()}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ReachSEO() {
  const { user } = useUser();

  // Scan state
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null); // { score, findings, meta_analysis, performance_signals }
  const [currentReport, setCurrentReport] = useState(null); // full report record
  const [exporting, setExporting] = useState(false);

  // History
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // -------------------------------------------------------------------------
  // Load history
  // -------------------------------------------------------------------------

  const loadHistory = useCallback(async () => {
    if (!user?.organization_id) return;
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("reach_seo_reports")
        .select("*")
        .eq("company_id", user.organization_id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error("Failed to load SEO history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [user?.organization_id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // -------------------------------------------------------------------------
  // Validate URL
  // -------------------------------------------------------------------------

  const isValidUrl = useMemo(() => {
    if (!url.trim()) return false;
    try {
      const parsed = new URL(url.trim());
      return ["http:", "https:"].includes(parsed.protocol);
    } catch {
      return false;
    }
  }, [url]);

  // -------------------------------------------------------------------------
  // Run scan
  // -------------------------------------------------------------------------

  const runScan = useCallback(async () => {
    if (!isValidUrl) {
      toast.error("Enter a valid URL starting with http:// or https://");
      return;
    }
    if (!user?.organization_id) {
      toast.error("No workspace found");
      return;
    }

    setScanning(true);
    setResult(null);
    setCurrentReport(null);

    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/reach-seo-scan`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ url: url.trim() }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Scan failed");
      }

      setResult(data);

      // Save to database
      const { data: saved, error: saveErr } = await supabase
        .from("reach_seo_reports")
        .insert({
          company_id: user.organization_id,
          created_by: user.id,
          url: url.trim(),
          score: data.score,
          findings: data.findings,
          meta_analysis: data.meta_analysis,
          performance_signals: data.performance_signals,
        })
        .select()
        .single();

      if (saveErr) {
        console.error("Failed to save report:", saveErr);
        // Still show results even if save fails
        setCurrentReport({
          url: url.trim(),
          score: data.score,
          findings: data.findings,
          meta_analysis: data.meta_analysis,
          performance_signals: data.performance_signals,
          created_at: new Date().toISOString(),
        });
      } else {
        setCurrentReport(saved);
        // Refresh history
        loadHistory();
      }

      toast.success(`Scan complete - Score: ${data.score}/100`);
    } catch (err) {
      console.error("SEO scan error:", err);
      toast.error(err.message || "Failed to scan URL");
    } finally {
      setScanning(false);
    }
  }, [url, isValidUrl, user, loadHistory]);

  // -------------------------------------------------------------------------
  // Load a history report
  // -------------------------------------------------------------------------

  const loadReport = useCallback((report) => {
    setUrl(report.url);
    setResult({
      score: report.score,
      findings: report.findings || [],
      meta_analysis: report.meta_analysis,
      performance_signals: report.performance_signals,
    });
    setCurrentReport(report);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // -------------------------------------------------------------------------
  // Export PDF
  // -------------------------------------------------------------------------

  const handleExportPdf = useCallback(async () => {
    if (!currentReport) return;
    setExporting(true);
    try {
      await downloadPdfReport(currentReport);
      toast.success("PDF report downloaded");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to generate PDF");
    } finally {
      setExporting(false);
    }
  }, [currentReport]);

  // -------------------------------------------------------------------------
  // Categorized findings
  // -------------------------------------------------------------------------

  const categorized = useMemo(() => {
    if (!result?.findings) return { critical: [], warning: [], passed: [] };
    return {
      critical: result.findings.filter((f) => f.category === "critical"),
      warning: result.findings.filter((f) => f.category === "warning"),
      passed: result.findings.filter((f) => f.category === "passed"),
    };
  }, [result]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="p-6 space-y-6 max-w-6xl"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-cyan-500/10">
          <Search className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">SEO Scanner</h1>
          <p className="text-sm text-zinc-400">
            Analyze and optimize your search engine presence
          </p>
        </div>
      </div>

      {/* Scan Input */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !scanning) runScan();
              }}
              placeholder="https://example.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700/50 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition-all"
              disabled={scanning}
            />
          </div>
          <button
            onClick={runScan}
            disabled={scanning || !isValidUrl}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-sm font-medium text-black transition-all flex items-center gap-2 shrink-0"
          >
            {scanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Scan
              </>
            )}
          </button>
        </div>
        {url && !isValidUrl && (
          <p className="mt-2 text-xs text-red-400">
            URL must start with http:// or https://
          </p>
        )}
      </div>

      {/* Scanning animation */}
      <AnimatePresence>
        {scanning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 flex flex-col items-center gap-4"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-zinc-700 border-t-cyan-400 animate-spin" />
              <Search className="absolute inset-0 m-auto w-6 h-6 text-cyan-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white">
                Analyzing {url}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Checking meta tags, headings, links, images, and more...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && !scanning && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Score + Actions */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <ScoreGauge score={result.score} />
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-lg font-semibold text-white">
                    {result.score >= 71
                      ? "Looking good!"
                      : result.score >= 41
                        ? "Room for improvement"
                        : "Needs attention"}
                  </h2>
                  <p className="text-sm text-zinc-400 mt-1">
                    {categorized.critical.length > 0
                      ? `${categorized.critical.length} critical issue${categorized.critical.length > 1 ? "s" : ""} found. `
                      : "No critical issues. "}
                    {categorized.warning.length > 0
                      ? `${categorized.warning.length} warning${categorized.warning.length > 1 ? "s" : ""}.`
                      : ""}
                    {categorized.passed.length > 0
                      ? ` ${categorized.passed.length} check${categorized.passed.length > 1 ? "s" : ""} passed.`
                      : ""}
                  </p>
                  <div className="flex items-center gap-3 mt-4 justify-center md:justify-start">
                    <button
                      onClick={runScan}
                      disabled={scanning}
                      className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 transition-colors flex items-center gap-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Re-scan
                    </button>
                    <button
                      onClick={handleExportPdf}
                      disabled={exporting}
                      className="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-sm text-cyan-400 transition-colors flex items-center gap-2 border border-cyan-500/20"
                    >
                      {exporting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      Export PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Findings */}
            <div className="space-y-3">
              <FindingsSection
                category="critical"
                findings={categorized.critical}
              />
              <FindingsSection
                category="warning"
                findings={categorized.warning}
              />
              <FindingsSection
                category="passed"
                findings={categorized.passed}
              />
            </div>

            {/* Meta + Performance side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <MetaAnalysisCard meta={result.meta_analysis} />
              <PerformanceCard signals={result.performance_signals} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-500" />
            <h3 className="text-sm font-medium text-white">Scan History</h3>
          </div>
          {history.length > 0 && (
            <span className="text-xs text-zinc-500">
              {history.length} scan{history.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {loadingHistory ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
          </div>
        ) : history.length === 0 && !result ? (
          // Empty state
          <div className="p-12 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-zinc-800/60 flex items-center justify-center">
              <Search className="w-6 h-6 text-zinc-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-300">
                Scan your first website
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Enter a URL above to analyze its SEO health and get
                actionable recommendations.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {history.map((report) => {
              const isActive = currentReport?.id === report.id;
              let displayUrl = report.url;
              try {
                displayUrl = new URL(report.url).hostname + new URL(report.url).pathname;
              } catch { /* keep original */ }
              if (displayUrl.length > 50) {
                displayUrl = displayUrl.slice(0, 47) + "...";
              }

              return (
                <button
                  key={report.id}
                  onClick={() => loadReport(report)}
                  className={`w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-white/[0.02] transition-colors ${
                    isActive ? "bg-cyan-500/5 border-l-2 border-cyan-500" : ""
                  }`}
                >
                  <MiniGauge score={report.score} />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm truncate ${
                        isActive ? "text-cyan-400" : "text-zinc-300"
                      }`}
                    >
                      {displayUrl}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {new Date(report.created_at).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
