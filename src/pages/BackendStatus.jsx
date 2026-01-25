import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { getFirmographicData, getTechnographicsData, getPeopleData } from "@/components/integrations/ExploriumAPI";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Zap,
  AlertTriangle,
  Server,
  Building2,
  Users
} from "lucide-react";

export default function BackendStatus() {
  const [me, setMe] = useState(null);
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState({
    firmographics: null,
    technographics: null,
    people: null
  });
  const [lastTest, setLastTest] = useState(null);

  useEffect(() => {
    loadUser();
    // Auto-test on load
    testAllEndpoints();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await User.me();
      setMe(userData);
    } catch (err) {
      console.error("Error loading user:", err);
    }
  };

  const testEndpoint = async (name, testFn) => {
    try {
      const startTime = Date.now();
      const result = await testFn();
      const duration = Date.now() - startTime;

      return {
        status: 'success',
        duration,
        data: result,
        error: null
      };
    } catch (err) {
      return {
        status: 'error',
        duration: 0,
        data: null,
        error: err.message
      };
    }
  };

  const testAllEndpoints = async () => {
    setTesting(true);
    setLastTest(new Date().toISOString());

    // Test with sample data
    const sampleCompany = { domain: "apple.com" };
    const samplePerson = { linkedin_url: "https://www.linkedin.com/in/satyanadella/" };

    const [firmo, tech, people] = await Promise.all([
      testEndpoint('firmographics', () => 
        getFirmographicData({ businesses: [sampleCompany] })
      ),
      testEndpoint('technographics', () => 
        getTechnographicsData({ businesses: [sampleCompany] })
      ),
      testEndpoint('people', () => 
        getPeopleData({ contacts: [samplePerson] })
      )
    ]);

    setResults({
      firmographics: firmo,
      technographics: tech,
      people: people
    });

    setTesting(false);
  };

  const getStatusColor = (status) => {
    if (!status) return "bg-gray-500";
    if (status === 'success') return "bg-green-500";
    return "bg-red-500";
  };

  const getStatusIcon = (status) => {
    if (!status) return <Loader2 className="w-5 h-5 animate-spin" />;
    if (status === 'success') return <CheckCircle className="w-5 h-5" />;
    return <XCircle className="w-5 h-5" />;
  };

  const allHealthy = results.firmographics?.status === 'success' &&
                     results.technographics?.status === 'success' &&
                     results.people?.status === 'success';

  return (
    <div className="min-h-screen bg-black px-4 lg:px-6 py-4">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white flex items-center gap-2">
              <Server className="w-8 h-8 text-emerald-400" />
              Backend Status
            </h1>
            <p className="text-gray-400 mt-2">
              Monitor and test API integrations
            </p>
          </div>
          <Button
            onClick={testAllEndpoints}
            disabled={testing}
            className="btn-primary"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Test All
              </>
            )}
          </Button>
        </div>

        {/* Overall Health */}
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full ${allHealthy ? 'bg-green-500/20' : 'bg-red-500/20'} flex items-center justify-center`}>
                {testing ? (
                  <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                ) : allHealthy ? (
                  <CheckCircle className="w-8 h-8 text-green-400" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">
                  {testing ? "Testing..." : allHealthy ? "All Systems Operational" : "Issues Detected"}
                </h2>
                <p className="text-gray-400">
                  {lastTest ? `Last checked: ${new Date(lastTest).toLocaleString()}` : "Not tested yet"}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {Object.values(results).filter(r => r?.status === 'success').length}/3
                </div>
                <div className="text-xs text-gray-400">Endpoints OK</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Endpoint Details */}
        <div className="grid gap-3">
          {/* Firmographics */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  Firmographics API
                </div>
                <Badge className={`${getStatusColor(results.firmographics?.status)} text-white`}>
                  {results.firmographics?.status || 'Not tested'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Status</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(results.firmographics?.status)}
                    <span className="text-white capitalize">
                      {results.firmographics?.status || 'Pending'}
                    </span>
                  </div>
                </div>

                {results.firmographics?.duration && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Response Time</span>
                    <span className="text-white">{results.firmographics.duration}ms</span>
                  </div>
                )}

                {results.firmographics?.error && (
                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-red-300 text-xs">{results.firmographics.error}</p>
                  </div>
                )}

                {results.firmographics?.data && (
                  <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-green-300 text-xs">
                      ✓ Retrieved data for {results.firmographics.data.total_results || 0} companies
                    </p>
                    {results.firmographics.data.data?.[0]?.data && (
                      <div className="mt-1 text-[10px] text-gray-400">
                        Sample: {results.firmographics.data.data[0].data.name || 'Company data'} - 
                        {results.firmographics.data.data[0].data.number_of_employees_range || 'Size unknown'}
                      </div>
                    )}
                  </div>
                )}

                <div className="text-[10px] text-gray-500">
                  Endpoint: <code className="bg-gray-800 px-1 py-0.5 rounded text-[9px]">/api/explorium/firmographics</code>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technographics */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-400" />
                  Technographics API
                </div>
                <Badge className={`${getStatusColor(results.technographics?.status)} text-white`}>
                  {results.technographics?.status || 'Not tested'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Status</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(results.technographics?.status)}
                    <span className="text-white capitalize">
                      {results.technographics?.status || 'Pending'}
                    </span>
                  </div>
                </div>

                {results.technographics?.duration && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Response Time</span>
                    <span className="text-white">{results.technographics.duration}ms</span>
                  </div>
                )}

                {results.technographics?.error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-red-300 text-sm">{results.technographics.error}</p>
                  </div>
                )}

                {results.technographics?.data?.data?.[0]?.data && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-green-300 text-sm">
                      ✓ Retrieved tech stack data
                    </p>
                    {results.technographics.data.data[0].data.full_nested_tech_stack && (
                      <div className="mt-2 text-xs text-gray-400">
                        Found {Object.keys(results.technographics.data.data[0].data.full_nested_tech_stack || {}).length} tech categories
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  Endpoint: <code className="bg-gray-800 px-2 py-1 rounded">/api/explorium/technographics</code>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* People */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-purple-400" />
                  People API
                </div>
                <Badge className={`${getStatusColor(results.people?.status)} text-white`}>
                  {results.people?.status || 'Not tested'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Status</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(results.people?.status)}
                    <span className="text-white capitalize">
                      {results.people?.status || 'Pending'}
                    </span>
                  </div>
                </div>

                {results.people?.duration && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Response Time</span>
                    <span className="text-white">{results.people.duration}ms</span>
                  </div>
                )}

                {results.people?.error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-red-300 text-sm">{results.people.error}</p>
                  </div>
                )}

                {results.people?.data && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-green-300 text-sm">
                      ✓ Retrieved data for {results.people.data.total_results || 0} people
                    </p>
                    {results.people.data.data?.[0]?.data && (
                      <div className="mt-2 text-xs text-gray-400">
                        Sample: Professional profile data available
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  Endpoint: <code className="bg-gray-800 px-2 py-1 rounded">/api/explorium/people</code>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Setup Instructions */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="text-white">Backend Setup Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-white font-medium">Environment Variable Set</div>
                <div className="text-sm text-gray-400">
                  EXPLORIUM_API_KEY configured in Dashboard → Settings
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-white font-medium">Backend Functions Created</div>
                <div className="text-sm text-gray-400">
                  explorium/firmographics, explorium/technographics, explorium/people
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              {allHealthy ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <div className="text-white font-medium">All Endpoints Healthy</div>
                <div className="text-sm text-gray-400">
                  {allHealthy ? "All API calls returning successfully" : "Some endpoints need attention"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}