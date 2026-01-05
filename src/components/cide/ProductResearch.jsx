import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Package, Loader2, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ProductResearch({ onSubmit, onBack, user }) {
  const [isResearching, setIsResearching] = useState(false);
  const [researchData, setResearchData] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);

  const handleStartResearch = async () => {
    setIsResearching(true);
    
    try {
      // Get normalized company context
      const companyResponse = await base44.functions.invoke('getCompanyContext', { user_id: user.id });
      const company = companyResponse.data || user?.company_data || {};
      const enrichedProfile = user?.enriched_profile || {};
      
      const prompt = `You are a product analyst. Research the following company to understand their product/service offerings:

**Company Information:**
- Name: ${company.name || 'Not provided'}
- Website: ${company.website_url || company.website || 'Not provided'}
- Description: ${company.description || 'Not provided'}
- Industry: ${company.industry || enrichedProfile.industry || 'Not provided'}
- Size: ${company.size_range || 'Not provided'}
- Tech Stack: ${company.tech_stack?.join(', ') || 'Not provided'}

**Your Task:**
1. Identify all products/services this company offers
2. Categorize each offering (e.g., Software, Consulting, Hardware, etc.)
3. Describe the target audience for each product/service
4. Extract key value propositions
5. Identify buyer personas for each offering

**Output Format:**
Return structured data with product listings that can be selected to refine target company search.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            products: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  category: { type: "string" },
                  description: { type: "string" },
                  target_audience: { type: "string" },
                  value_proposition: { type: "string" },
                  buyer_persona: { type: "string" }
                }
              }
            },
            company_summary: { type: "string" },
            primary_market: { type: "string" }
          }
        }
      });

      setResearchData(result);
      // Auto-select all products by default
      setSelectedProducts(result.products?.map((_, idx) => idx) || []);
    } catch (error) {
      console.error("Product research failed:", error);
      alert(`Product research failed: ${error.message}. You can skip this step if needed.`);
      setIsResearching(false);
    }
  };

  const toggleProduct = (index) => {
    setSelectedProducts(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleContinue = () => {
    const selectedProductData = selectedProducts.map(idx => researchData.products[idx]);
    onSubmit({
      products: selectedProductData,
      company_summary: researchData.company_summary,
      primary_market: researchData.primary_market
    });
  };

  return (
    <Card className="border-0 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-indigo-400" />
          Product Research
        </CardTitle>
        <p className="text-sm text-gray-400 mt-2">
          Understand what you're selling to better define your target audience
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {!researchData && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-indigo-400/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Analyze Your Product Portfolio
            </h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Our AI will research your company to identify all products and services you offer, 
              helping refine your ideal customer profile.
            </p>
            <Button
              onClick={handleStartResearch}
              disabled={isResearching}
              className="bg-gradient-to-br from-indigo-500/30 to-indigo-600/20 border border-indigo-400/50 text-indigo-200 hover:bg-indigo-500/40 px-8 disabled:opacity-50"
            >
              {isResearching ? (
                <>
                  <div className="w-4 h-4 border-2 border-indigo-200/30 border-t-indigo-200 rounded-full animate-spin mr-2" />
                  Researching...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4 mr-2" />
                  Start Product Research
                </>
              )}
            </Button>
          </div>
        )}

        {researchData && (
          <>
            {/* Company Summary */}
            <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <h4 className="text-white font-semibold mb-2">Company Overview</h4>
              <p className="text-sm text-gray-300 mb-3">{researchData.company_summary}</p>
              <div className="flex items-center gap-2">
                <Badge className="bg-indigo-500/20 text-indigo-200 border-indigo-400/30">
                  {researchData.primary_market}
                </Badge>
                <Badge className="bg-indigo-500/20 text-indigo-200 border-indigo-400/30">
                  {researchData.products?.length || 0} Products/Services
                </Badge>
              </div>
            </div>

            {/* Product Selection */}
            <div>
              <h4 className="text-white font-semibold mb-3">
                Select Products to Target ({selectedProducts.length} selected)
              </h4>
              <div className="space-y-3">
                {researchData.products?.map((product, idx) => {
                  const isSelected = selectedProducts.includes(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleProduct(idx)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-400 bg-indigo-500/10'
                          : 'border-gray-700 bg-gray-900/30 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isSelected ? 'bg-indigo-500/30' : 'bg-gray-800'
                          }`}>
                            {isSelected ? (
                              <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                            ) : (
                              <Package className="w-5 h-5 text-gray-600" />
                            )}
                          </div>
                          <div>
                            <h5 className="text-white font-semibold">{product.name}</h5>
                            <Badge className="bg-gray-800 text-gray-400 border-gray-700 text-xs">
                              {product.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 mb-3">{product.description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-gray-500">Target Audience:</span>
                          <p className="text-gray-300">{product.target_audience}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Buyer Persona:</span>
                          <p className="text-gray-300">{product.buyer_persona}</p>
                        </div>
                      </div>
                      <div className="mt-2 text-xs">
                        <span className="text-gray-500">Value Proposition:</span>
                        <p className="text-indigo-300">{product.value_proposition}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-indigo-500/20">
              <Button onClick={onBack} variant="outline" className="border-gray-700 text-gray-400">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleContinue}
                disabled={selectedProducts.length === 0}
                className="bg-gradient-to-br from-indigo-500/30 to-indigo-600/20 border border-indigo-400/50 text-indigo-200 hover:bg-indigo-500/40"
              >
                Continue to AI Research
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}