import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Award } from "lucide-react";

export default function VerifyCertificate() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code") || window.location.pathname.split('/verify/')[1];
  
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (code) {
      verifyCertificate();
    } else {
      setError("No verification code provided");
      setLoading(false);
    }
  }, [code]);

  const verifyCertificate = async () => {
    try {
      // Search for certificate by verification code
      const certs = await base44.entities.Certificate.filter({ 
        verification_code: code 
      });

      if (certs.length === 0) {
        setError("Certificate not found");
      } else {
        setCertificate(certs[0]);
      }
    } catch (err) {
      console.error("Verification failed:", err);
      setError("Failed to verify certificate");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative flex items-center justify-center p-6">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-yellow-500/5 to-amber-600/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <Card className="max-w-2xl w-full glass-card border-0 border-yellow-500/30 relative z-10">
        <CardContent className="p-12 text-center">
          {error ? (
            <>
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-12 h-12 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Certificate Not Found</h2>
              <p className="text-gray-400 mb-6">
                The verification code "{code}" does not match any certificate in our records.
              </p>
              <p className="text-sm text-gray-500">
                Please check the code and try again, or contact support if you believe this is an error.
              </p>
            </>
          ) : certificate ? (
            <>
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">✓ Certificate Verified</h2>
              
              <div className="my-8 p-6 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-xl">
                <Award className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                <p className="text-gray-300 mb-2">This confirms that</p>
                <h3 className="text-2xl font-bold text-white mb-4">{certificate.user_name}</h3>
                <p className="text-gray-300 mb-2">completed</p>
                <h4 className="text-xl font-semibold text-yellow-400 mb-6">"{certificate.course_title}"</h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between px-4">
                    <span className="text-gray-400">Issued:</span>
                    <span className="text-white font-medium">
                      {new Date(certificate.issued_at).toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4">
                    <span className="text-gray-400">Certificate #:</span>
                    <span className="text-white font-mono">{certificate.certificate_number}</span>
                  </div>
                  {certificate.final_score !== null && (
                    <div className="flex items-center justify-between px-4">
                      <span className="text-gray-400">Score:</span>
                      <span className="text-white font-bold">{certificate.final_score}%</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ebfb48566133bc1cface8c/3bee25c45_logoisyncso1.png" 
                  alt="ISYNCSO" 
                  className="h-12 mx-auto opacity-50"
                />
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}