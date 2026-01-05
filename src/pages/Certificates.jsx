import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Download, Share2, CheckCircle, ExternalLink, X, Linkedin, Calendar, Star } from "lucide-react";
import { usePagination } from "@/components/hooks/usePagination";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useUser } from "@/components/context/UserContext";
import { GlassCard, StatCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Certificates() {
  const { user, isLoading: userLoading } = useUser();
  const [certificates, setCertificates] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [previewCert, setPreviewCert] = useState(null);
  const [filterYear, setFilterYear] = useState("all");

  const loadCertificates = React.useCallback(async () => {
    if (!user) return;
    try {
      const certs = await base44.entities.Certificate.filter({ user_id: user.id });
      certs.sort((a, b) => new Date(b.issued_at) - new Date(a.issued_at));
      setCertificates(certs);
    } catch (error) {
      console.error("Failed to load certificates:", error);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadCertificates();
  }, [loadCertificates, user]);

  const filteredCerts = filterYear === "all" 
    ? certificates 
    : certificates.filter(c => new Date(c.issued_at).getFullYear().toString() === filterYear);

  const pagination = usePagination(filteredCerts, 9);

  const years = [...new Set(certificates.map(c => new Date(c.issued_at).getFullYear()))].sort((a, b) => b - a);
  const highScoreCerts = certificates.filter(c => c.final_score >= 90).length;

  const handleShare = (cert) => {
    const text = `I earned a certificate for completing "${cert.course_title}" 🎉`;
    const url = `${window.location.origin}/verify/${cert.verification_code}`;
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`;
    window.open(linkedInUrl, '_blank');
  };

  const handleVerify = (cert) => {
    window.open(`/verify/${cert.verification_code}`, '_blank');
  };

  const handleDownload = async (cert) => {
    try {
      const certElement = document.createElement('div');
      certElement.style.width = '800px';
      certElement.style.padding = '60px';
      certElement.style.background = 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)';
      certElement.style.position = 'absolute';
      certElement.style.left = '-9999px';
      certElement.innerHTML = `
        <div style="text-align: center; font-family: 'Inter', Arial, sans-serif; color: #fff; border: 2px solid #06b6d4; border-radius: 16px; padding: 40px;">
          <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, #06b6d4, #0891b2); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
              <circle cx="12" cy="8" r="6"/>
              <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
            </svg>
          </div>
          <h1 style="font-size: 32px; margin-bottom: 10px; color: #06b6d4; font-weight: 700;">Certificate of Completion</h1>
          <p style="font-size: 14px; color: #888; margin-bottom: 30px;">This certifies that</p>
          <h2 style="font-size: 28px; margin-bottom: 30px; color: #fff; font-weight: 600;">${cert.user_name}</h2>
          <p style="font-size: 14px; color: #888; margin-bottom: 10px;">has successfully completed</p>
          <h3 style="font-size: 22px; margin-bottom: 30px; color: #fff; font-weight: 500;">${cert.course_title}</h3>
          ${cert.final_score !== null ? `<p style="font-size: 16px; color: #06b6d4; margin-bottom: 30px;">Final Score: ${cert.final_score}%</p>` : ''}
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #333;">
            <p style="font-size: 11px; color: #666;">Certificate: ${cert.certificate_number}</p>
            <p style="font-size: 11px; color: #666;">Issued: ${new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p style="font-size: 11px; color: #666;">Verify at: isyncso.com/verify/${cert.verification_code}</p>
          </div>
        </div>
      `;
      document.body.appendChild(certElement);
      const canvas = await html2canvas(certElement, { scale: 2, backgroundColor: null });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Certificate-${cert.certificate_number}.pdf`);
      document.body.removeChild(certElement);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    }
  };

  const loading = userLoading || dataLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-24 w-full bg-zinc-800 rounded-2xl" />
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-24 bg-zinc-800 rounded-2xl" />)}
          </div>
          <div className="space-y-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-32 bg-zinc-800 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <PageHeader
          icon={Award}
          title="My Certificates"
          subtitle="Your earned credentials and achievements"
          color="cyan"
          badge={`${certificates.length} earned`}
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard icon={Award} label="Total Certificates" value={certificates.length} color="cyan" delay={0} />
          <StatCard icon={Star} label="High Scores (90%+)" value={highScoreCerts} color="cyan" delay={0.1} />
          <StatCard icon={Calendar} label="Years Active" value={years.length} color="cyan" delay={0.2} />
        </div>

        {/* Filters */}
        {certificates.length > 0 && (
          <div className="flex items-center gap-4">
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-40 bg-zinc-900 border-zinc-700 text-white">
                <SelectValue placeholder="Filter by year" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="all">All Years</SelectItem>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-zinc-400">{filteredCerts.length} certificate{filteredCerts.length !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Certificates Grid */}
        {certificates.length > 0 ? (
          <>
            <div className="space-y-4">
              <AnimatePresence>
                {pagination.items.map((cert, i) => (
                  <motion.div
                    key={cert.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <GlassCard glow="cyan" hover className="p-6" onClick={() => setPreviewCert(cert)}>
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center border border-cyan-500/30 flex-shrink-0">
                          <Award className="w-8 h-8 text-cyan-400" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-white mb-1 truncate">{cert.course_title}</h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400 mb-3">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(cert.issued_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            {cert.final_score !== null && (
                              <Badge className={cert.final_score >= 90 ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-zinc-700 text-zinc-300'}>
                                Score: {cert.final_score}%
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mb-4">
                            <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 font-mono text-xs">{cert.certificate_number}</Badge>
                            <Badge className="bg-cyan-500/10 text-cyan-300 border-cyan-500/20 font-mono text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); handleDownload(cert); }} className="bg-cyan-500 hover:bg-cyan-400 text-white">
                              <Download className="w-3 h-3 mr-1.5" /> Download
                            </Button>
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); handleShare(cert); }} variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                              <Linkedin className="w-3 h-3 mr-1.5" /> Share
                            </Button>
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); handleVerify(cert); }} variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                              <ExternalLink className="w-3 h-3 mr-1.5" /> Verify
                            </Button>
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button variant="outline" size="sm" onClick={pagination.prevPage} disabled={!pagination.hasPrev} className="border-zinc-700 text-zinc-300">
                  Previous
                </Button>
                <span className="text-sm text-zinc-400">Page {pagination.currentPage} of {pagination.totalPages}</span>
                <Button variant="outline" size="sm" onClick={pagination.nextPage} disabled={!pagination.hasNext} className="border-zinc-700 text-zinc-300">
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <GlassCard className="p-12 text-center">
            <Award className="w-16 h-16 text-cyan-400 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-white mb-2">No Certificates Yet</h3>
            <p className="text-zinc-400 mb-6">Complete courses to earn certificates and showcase your achievements</p>
            <Button className="bg-cyan-500 hover:bg-cyan-400 text-white">Start Learning</Button>
          </GlassCard>
        )}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewCert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewCert(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-zinc-900 to-black border border-cyan-500/30 rounded-2xl p-8 max-w-lg w-full relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setPreviewCert(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>

              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
                  <Award className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-cyan-400 mb-2">Certificate of Completion</h2>
                <p className="text-zinc-500 mb-6">This certifies that</p>
                <h3 className="text-xl font-semibold text-white mb-6">{previewCert.user_name}</h3>
                <p className="text-zinc-500 mb-2">has successfully completed</p>
                <h4 className="text-lg text-white mb-4">{previewCert.course_title}</h4>
                {previewCert.final_score && <p className="text-cyan-400 mb-6">Score: {previewCert.final_score}%</p>}
                <div className="border-t border-zinc-700 pt-4 text-xs text-zinc-500 space-y-1">
                  <p>Certificate: {previewCert.certificate_number}</p>
                  <p>Issued: {new Date(previewCert.issued_at).toLocaleDateString()}</p>
                  <p>Verification: {previewCert.verification_code}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}