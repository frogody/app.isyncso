import React, { useState, useEffect } from "react";
import { db } from "@/api/supabaseClient";
import { createPageUrl } from "@/utils";
import { Shield, AlertTriangle } from "lucide-react";

export default function AdminGuard({ children }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verifyAdmin();
  }, []);

  const verifyAdmin = async () => {
    try {
      const user = await db.auth.me();
      
      if (!user || user.role !== 'admin') {
        // Not authorized - redirect to dashboard
        window.location.href = createPageUrl("Dashboard");
        return;
      }
      
      setIsAuthorized(true);
    } catch (error) {
      // Auth failed - redirect to login
      window.location.href = createPageUrl("Dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Access Denied</h1>
          <p className="text-gray-400">You don't have permission to access this page. Admin privileges required.</p>
        </div>
      </div>
    );
  }

  return children;
}