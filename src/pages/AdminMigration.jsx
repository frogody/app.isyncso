import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, XCircle, Play, RefreshCw, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminMigration() {
  const [status, setStatus] = useState('idle');
  const [results, setResults] = useState(null);
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(false);

  const runVerification = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('verifyMigration');
      setVerification(response.data.report);
    } catch (error) {
      console.error('Verification failed:', error);
      alert(`Verification failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async () => {
    if (!confirm('This will migrate all users with company_data to normalized Company entities. Continue?')) {
      return;
    }

    setStatus('migrating');
    setLoading(true);

    try {
      const response = await base44.functions.invoke('migrateCompanyData');
      setResults(response.data.results);
      setStatus('verifying');

      // Auto-run verification after migration
      const verifyResponse = await base44.functions.invoke('verifyMigration');
      setVerification(verifyResponse.data.report);
      setStatus('complete');
    } catch (error) {
      console.error('Migration failed:', error);
      alert(`Migration failed: ${error.message}`);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Company Data Migration</h1>
            <p className="text-gray-400">Normalize legacy company_data JSON to Company entity relations</p>
          </div>
          <Database className="w-12 h-12 text-purple-400" />
        </div>

        {/* Actions */}
        <Card className="glass-card border-0 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white">Migration Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                onClick={runVerification}
                disabled={loading}
                className="bg-gradient-to-br from-cyan-500/30 to-cyan-600/20 border border-cyan-400/50 text-cyan-200"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Run Verification
              </Button>
              <Button
                onClick={runMigration}
                disabled={loading || status === 'migrating'}
                className="bg-gradient-to-br from-purple-500/30 to-purple-600/20 border border-purple-400/50 text-purple-200"
              >
                <Play className="w-4 h-4 mr-2" />
                {status === 'migrating' ? 'Migrating...' : 'Run Migration'}
              </Button>
            </div>

            {status === 'migrating' && (
              <div className="flex items-center gap-2 text-yellow-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Migration in progress...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verification Report */}
        {verification && (
          <Card className="glass-card border-0 border-cyan-500/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-cyan-400" />
                  Verification Report
                </CardTitle>
                <Badge className={verification.migration_complete ? "bg-green-500/20 text-green-300" : "bg-yellow-500/20 text-yellow-300"}>
                  {verification.migration_complete ? '✓ Complete' : '⚠ Needs Migration'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* User Stats */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">User Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">{verification.total_users}</div>
                    <div className="text-xs text-gray-400">Total Users</div>
                  </div>
                  <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                    <div className="text-2xl font-bold text-green-400">{verification.users_with_company_id}</div>
                    <div className="text-xs text-gray-400">With company_id</div>
                  </div>
                  <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/20">
                    <div className="text-2xl font-bold text-yellow-400">{verification.users_with_legacy_data_only}</div>
                    <div className="text-xs text-gray-400">Need Migration</div>
                  </div>
                  <div className="bg-gray-500/10 rounded-lg p-4 border border-gray-500/20">
                    <div className="text-2xl font-bold text-gray-400">{verification.users_without_company_id}</div>
                    <div className="text-xs text-gray-400">No Company</div>
                  </div>
                </div>
              </div>

              {/* Company Stats */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Company Statistics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">{verification.total_companies}</div>
                    <div className="text-xs text-gray-400">Total Companies</div>
                  </div>
                  <div className="bg-cyan-500/10 rounded-lg p-4 border border-cyan-500/20">
                    <div className="text-2xl font-bold text-cyan-400">{verification.companies_with_users}</div>
                    <div className="text-xs text-gray-400">With Users</div>
                  </div>
                  <div className="bg-orange-500/10 rounded-lg p-4 border border-orange-500/20">
                    <div className="text-2xl font-bold text-orange-400">{verification.orphaned_companies}</div>
                    <div className="text-xs text-gray-400">Orphaned</div>
                  </div>
                </div>
              </div>

              {/* User Distribution */}
              {Object.keys(verification.user_distribution).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">User Distribution by Company</h3>
                  <div className="space-y-2">
                    {Object.entries(verification.user_distribution)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 10)
                      .map(([company, count]) => (
                        <div key={company} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                          <span className="text-gray-300">{company}</span>
                          <Badge className="bg-purple-500/20 text-purple-300">{count} users</Badge>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Issues */}
              {verification.issues.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    Issues Found ({verification.issues.length})
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {verification.issues.map((issue, idx) => (
                      <div key={idx} className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="text-xs text-yellow-400 font-medium mb-1">{issue.type}</div>
                            <div className="text-sm text-gray-300">{issue.message}</div>
                            {issue.email && <div className="text-xs text-gray-500 mt-1">{issue.email}</div>}
                          </div>
                          {issue.type === 'unmigrated_user' && (
                            <Badge className="bg-yellow-500/20 text-yellow-300">Needs Migration</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Migration Results */}
        {results && (
          <Card className="glass-card border-0 border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                {status === 'complete' ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                Migration Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-2xl font-bold text-white">{results.users_processed}</div>
                  <div className="text-xs text-gray-400">Users Processed</div>
                </div>
                <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                  <div className="text-2xl font-bold text-green-400">{results.users_migrated}</div>
                  <div className="text-xs text-gray-400">Users Migrated</div>
                </div>
                <div className="bg-gray-500/10 rounded-lg p-4 border border-gray-500/20">
                  <div className="text-2xl font-bold text-gray-400">{results.users_skipped}</div>
                  <div className="text-xs text-gray-400">Users Skipped</div>
                </div>
                <div className="bg-cyan-500/10 rounded-lg p-4 border border-cyan-500/20">
                  <div className="text-2xl font-bold text-cyan-400">{results.companies_created}</div>
                  <div className="text-xs text-gray-400">Companies Created</div>
                </div>
                <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
                  <div className="text-2xl font-bold text-purple-400">{results.companies_reused}</div>
                  <div className="text-xs text-gray-400">Companies Reused</div>
                </div>
                <div className={`rounded-lg p-4 border ${results.errors.length > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
                  <div className={`text-2xl font-bold ${results.errors.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {results.errors.length}
                  </div>
                  <div className="text-xs text-gray-400">Errors</div>
                </div>
              </div>

              {results.errors.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
                    <XCircle className="w-5 h-5" />
                    Migration Errors
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {results.errors.map((error, idx) => (
                      <div key={idx} className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                        <div className="text-sm text-red-300">{error.error}</div>
                        <div className="text-xs text-gray-500 mt-1">User: {error.email}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}