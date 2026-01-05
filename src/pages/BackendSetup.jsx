import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Copy,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Server,
  Code,
  Settings,
  Activity
} from "lucide-react";
import { toast } from "sonner";

const BACKEND_FUNCTIONS = [
  {
    name: "explorium/firmographics",
    method: "POST",
    description: "Get company firmographic data (industry, size, revenue, LinkedIn)",
    required: true,
    code: `Deno.serve(async (req) => {
  try {
    const API_KEY = Deno.env.get("EXPLORIUM_API_KEY");
    if (!API_KEY) {
      return new Response(JSON.stringify({ 
        error: "EXPLORIUM_API_KEY not configured in environment variables",
        data: [],
        total_results: 0
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const requestBody = await req.json();
    console.log("Firmographics request:", requestBody);

    const matchResponse = await fetch("https://api.explorium.ai/v1/businesses/match", {
      method: "POST",
      headers: {
        "API_KEY": API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "businesses_to_match": requestBody.businesses || []
      })
    });

    const matchText = await matchResponse.text();
    console.log("Match response:", matchResponse.status, matchText);

    if (!matchResponse.ok) {
      return new Response(JSON.stringify({ 
        error: \`Explorium match failed: \${matchResponse.status} - \${matchText}\`,
        data: [],
        total_results: 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const matchRes = JSON.parse(matchText);
    const businessesIds = matchRes.matched_businesses?.map((x) => x.business_id) || [];

    if (businessesIds.length === 0) {
      return new Response(JSON.stringify({ 
        data: [], 
        total_results: 0,
        message: "No businesses matched"
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    }

    const enrichResponse = await fetch("https://api.explorium.ai/v1/businesses/firmographics/bulk_enrich", {
      method: "POST",
      headers: {
        "api_key": API_KEY,
        "accept": "application/json",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        "business_ids": businessesIds
      })
    });

    const enrichText = await enrichResponse.text();
    console.log("Enrich response:", enrichResponse.status, enrichText);

    if (!enrichResponse.ok) {
      return new Response(JSON.stringify({ 
        error: \`Explorium enrich failed: \${enrichResponse.status} - \${enrichText}\`,
        data: [],
        total_results: 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = JSON.parse(enrichText);

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    console.error("Firmographics error:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack,
      data: [],
      total_results: 0
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  }
});`
  },
  {
    name: "explorium/technographics",
    method: "POST",
    description: "Get company tech stack and technologies used",
    required: true,
    code: `Deno.serve(async (req) => {
  try {
    const API_KEY = Deno.env.get("EXPLORIUM_API_KEY");
    if (!API_KEY) {
      return new Response(JSON.stringify({ 
        error: "EXPLORIUM_API_KEY not configured in environment variables",
        data: [],
        total_results: 0
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const requestBody = await req.json();
    console.log("Technographics request:", requestBody);

    const matchResponse = await fetch("https://api.explorium.ai/v1/businesses/match", {
      method: "POST",
      headers: {
        "API_KEY": API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "businesses_to_match": requestBody.businesses || []
      })
    });

    const matchText = await matchResponse.text();
    console.log("Match response:", matchResponse.status, matchText);

    if (!matchResponse.ok) {
      return new Response(JSON.stringify({ 
        error: \`Explorium match failed: \${matchResponse.status} - \${matchText}\`,
        data: [],
        total_results: 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const matchRes = JSON.parse(matchText);
    const businessesIds = matchRes.matched_businesses?.map((x) => x.business_id) || [];

    if (businessesIds.length === 0) {
      return new Response(JSON.stringify({ 
        data: [], 
        total_results: 0,
        message: "No businesses matched"
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    }

    const enrichResponse = await fetch("https://api.explorium.ai/v1/businesses/technographics/bulk_enrich", {
      method: "POST",
      headers: {
        "api_key": API_KEY,
        "accept": "application/json",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        "business_ids": businessesIds
      })
    });

    const enrichText = await enrichResponse.text();
    console.log("Enrich response:", enrichResponse.status, enrichText);

    if (!enrichResponse.ok) {
      return new Response(JSON.stringify({ 
        error: \`Explorium enrich failed: \${enrichResponse.status} - \${enrichText}\`,
        data: [],
        total_results: 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = JSON.parse(enrichText);

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    console.error("Technographics error:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack,
      data: [],
      total_results: 0
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  }
});`
  },
  {
    name: "explorium/people",
    method: "POST",
    description: "Get enriched professional data from LinkedIn profiles",
    required: true,
    code: `Deno.serve(async (req) => {
  try {
    const API_KEY = Deno.env.get("EXPLORIUM_API_KEY");
    if (!API_KEY) {
      return new Response(JSON.stringify({ 
        error: "EXPLORIUM_API_KEY not configured in environment variables",
        data: [],
        total_results: 0
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const requestBody = await req.json();
    console.log("People request:", requestBody);

    const matchResponse = await fetch("https://api.explorium.ai/v1/contacts/match", {
      method: "POST",
      headers: {
        "API_KEY": API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "contacts_to_match": requestBody.contacts || []
      })
    });

    const matchText = await matchResponse.text();
    console.log("Match response:", matchResponse.status, matchText);

    if (!matchResponse.ok) {
      return new Response(JSON.stringify({ 
        error: \`Explorium match failed: \${matchResponse.status} - \${matchText}\`,
        data: [],
        total_results: 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const matchRes = JSON.parse(matchText);
    const contactIds = matchRes.matched_contacts?.map((x) => x.contact_id) || [];

    if (contactIds.length === 0) {
      return new Response(JSON.stringify({ 
        data: [], 
        total_results: 0,
        message: "No contacts matched for this LinkedIn URL"
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    }

    const enrichResponse = await fetch("https://api.explorium.ai/v1/contacts/enrich", {
      method: "POST",
      headers: {
        "api_key": API_KEY,
        "accept": "application/json",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        "contact_ids": contactIds
      })
    });

    const enrichText = await enrichResponse.text();
    console.log("Enrich response:", enrichResponse.status, enrichText);

    if (!enrichResponse.ok) {
      return new Response(JSON.stringify({ 
        error: \`Explorium enrich failed: \${enrichResponse.status} - \${enrichText}\`,
        data: [],
        total_results: 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = JSON.parse(enrichText);

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    console.error("People error:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack,
      data: [],
      total_results: 0
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  }
});`
  },
  {
    name: "explorium/funding",
    method: "POST",
    description: "Get company funding rounds and acquisition data",
    required: false,
    code: `Deno.serve(async (req) => {
  try {
    const API_KEY = Deno.env.get("EXPLORIUM_API_KEY");
    if (!API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const requestBody = await req.json();

    const matchResponse = await fetch("https://api.explorium.ai/v1/businesses/match", {
      method: "POST",
      headers: {
        "API_KEY": API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "businesses_to_match": requestBody.businesses || []
      })
    });

    if (!matchResponse.ok) {
      const errorText = await matchResponse.text();
      return new Response(JSON.stringify({ error: \`Match failed: \${errorText}\` }), {
        status: matchResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const matchRes = await matchResponse.json();
    const businessesIds = matchRes.matched_businesses?.map((x) => x.business_id) || [];

    if (businessesIds.length === 0) {
      return new Response(JSON.stringify({ data: [], total_results: 0 }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    }

    const response = await fetch("https://api.explorium.ai/v1/businesses/funding_and_acquisition/bulk_enrich", {
      method: "POST",
      headers: {
        "api_key": API_KEY,
        "accept": "application/json",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        "business_ids": businessesIds
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: \`Enrich failed: \${errorText}\` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
});`
  },
  {
    name: "explorium/companies",
    method: "POST",
    description: "Search and filter companies by various criteria",
    required: false,
    code: `Deno.serve(async (req) => {
  try {
    const API_KEY = Deno.env.get("EXPLORIUM_API_KEY");
    if (!API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const requestBody = await req.json();
    const { filters = {}, page = 1, page_size = 20 } = requestBody;

    const queryParams = new URLSearchParams({
      page: page.toString(),
      page_size: page_size.toString()
    });

    if (filters.industry) queryParams.append('industry', filters.industry);
    if (filters.country) queryParams.append('country', filters.country);
    if (filters.min_employees) queryParams.append('min_employees', filters.min_employees);
    if (filters.max_employees) queryParams.append('max_employees', filters.max_employees);
    if (filters.technologies) queryParams.append('technologies', filters.technologies);

    const response = await fetch(\`https://api.explorium.ai/v1/businesses/search?\${queryParams.toString()}\`, {
      method: "GET",
      headers: {
        "api_key": API_KEY,
        "accept": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: \`Search failed: \${errorText}\` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
});`
  }
];

function FunctionCard({ func, index }) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(func.code);
      setCopied(true);
      toast.success(`Copied ${func.name} code!`);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy code");
    }
  };

  return (
    <Card className="glass-card border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Code className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <CardTitle className="text-white text-lg">{func.name}</CardTitle>
              <p className="text-sm text-gray-400 mt-1">{func.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={func.required ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"}>
              {func.required ? "Required" : "Optional"}
            </Badge>
            <Badge className="bg-blue-500/20 text-blue-400">
              {func.method}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <pre className="bg-black/50 border border-gray-700 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto max-h-96">
            <code>{func.code}</code>
          </pre>
          <Button
            onClick={copyCode}
            size="sm"
            className="absolute top-2 right-2 btn-primary"
          >
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4 mr-1" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1" />
                Copy Code
              </>
            )}
          </Button>
        </div>

        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-sm text-blue-300">
            <strong>Setup:</strong> Dashboard → Settings → Backend Functions → Create Function → 
            Paste name "{func.name}", select {func.method}, paste code above
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BackendSetup() {
  const [activeTab, setActiveTab] = useState("required");

  const requiredFunctions = BACKEND_FUNCTIONS.filter(f => f.required);
  const optionalFunctions = BACKEND_FUNCTIONS.filter(f => !f.required);

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Server className="w-12 h-12 text-cyan-400" />
            <div>
              <h1 className="text-4xl font-bold text-white">Backend Functions Setup</h1>
              <p className="text-xl text-gray-400">Configure Explorium API integration</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-yellow-300 font-medium mb-2">Important Setup Steps:</p>
              <ol className="text-sm text-yellow-200 space-y-1 list-decimal list-inside">
                <li>Make sure EXPLORIUM_API_KEY is set in Dashboard → Settings → Environment Variables</li>
                <li>Create each backend function below in Dashboard → Settings → Backend Functions</li>
                <li>Test connectivity using the Backend Status page</li>
                <li>Required functions must be created for onboarding to work</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Function Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-800/50">
            <TabsTrigger value="required" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Required ({requiredFunctions.length})
            </TabsTrigger>
            <TabsTrigger value="optional" className="data-[state=active]:bg-gray-600 data-[state=active]:text-white">
              Optional ({optionalFunctions.length})
            </TabsTrigger>
            <TabsTrigger value="guide" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Settings className="w-4 h-4 mr-2" />
              Setup Guide
            </TabsTrigger>
          </TabsList>

          <TabsContent value="required" className="space-y-6 mt-6">
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-red-300 text-sm">
                <strong>These functions are required for the app to work properly.</strong> The onboarding flow and course personalization depend on these endpoints.
              </p>
            </div>
            {requiredFunctions.map((func, index) => (
              <FunctionCard key={func.name} func={func} index={index} />
            ))}
          </TabsContent>

          <TabsContent value="optional" className="space-y-6 mt-6">
            <div className="p-4 rounded-lg bg-gray-500/10 border border-gray-500/20">
              <p className="text-gray-300 text-sm">
                These functions add additional capabilities but are not required for core functionality.
              </p>
            </div>
            {optionalFunctions.map((func, index) => (
              <FunctionCard key={func.name} func={func} index={index} />
            ))}
          </TabsContent>

          <TabsContent value="guide" className="mt-6">
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="text-white">Complete Setup Guide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-cyan-400 font-bold">1</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-2">Set Environment Variable</h3>
                      <p className="text-gray-400 mb-2">Navigate to Dashboard → Settings → Environment Variables</p>
                      <div className="bg-black/50 border border-gray-700 rounded-lg p-3">
                        <code className="text-sm text-cyan-400">
                          Variable: EXPLORIUM_API_KEY<br />
                          Value: [your-explorium-api-key]
                        </code>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-cyan-400 font-bold">2</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-2">Create Backend Functions</h3>
                      <p className="text-gray-400 mb-2">Go to Dashboard → Settings → Backend Functions</p>
                      <p className="text-gray-400 mb-2">For each function above:</p>
                      <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside ml-4">
                        <li>Click "Create New Function"</li>
                        <li>Enter the function name (e.g., "explorium/firmographics")</li>
                        <li>Select method (POST)</li>
                        <li>Copy and paste the Deno code from above</li>
                        <li>Save the function</li>
                      </ol>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-cyan-400 font-bold">3</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-2">Test Connectivity</h3>
                      <p className="text-gray-400 mb-3">After creating all functions, test them:</p>
                      <Button className="btn-primary" onClick={() => window.location.href = "/pages/BackendStatus"}>
                        <Activity className="w-4 h-4 mr-2" />
                        Go to Backend Status Page
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-cyan-400 font-bold">4</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-2">Verify Onboarding</h3>
                      <p className="text-gray-400">Once all required functions are green on the status page, the onboarding flow will work with full LinkedIn + company enrichment.</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <p className="text-cyan-300 text-sm">
                    <strong>Pro Tip:</strong> Keep the Backend Status page open in another tab while setting up functions so you can test immediately after creating each one.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}