import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, Shield, Database } from "lucide-react";

const glossaryTerms = [
  {
    term: "AI System",
    category: "General",
    definition: "Any software that uses artificial intelligence to make decisions, predictions, or recommendations.",
    examples: "ChatGPT, hiring algorithms, recommendation engines, facial recognition",
    relatedTerms: ["High-Risk AI", "GPAI"],
    icon: "🤖"
  },
  {
    term: "EU AI Act",
    category: "Compliance",
    definition: "European Union law regulating artificial intelligence, phased rollout from 2024-2027.",
    examples: null,
    relatedTerms: ["Compliance", "Risk Classification"],
    icon: "🇪🇺"
  },
  {
    term: "High-Risk AI",
    category: "Compliance",
    definition: "AI systems that could significantly impact people's lives and require compliance documentation.",
    examples: "Hiring tools, credit scoring, medical diagnosis, education assessment",
    relatedTerms: ["Annex III", "Conformity Assessment"],
    icon: "⚠️"
  },
  {
    term: "Prohibited AI",
    category: "Compliance",
    definition: "AI systems that are banned in the EU due to unacceptable risk.",
    examples: "Social scoring, real-time biometric ID in public spaces, subliminal manipulation",
    relatedTerms: ["Risk Classification"],
    icon: "🚫"
  },
  {
    term: "GPAI",
    category: "Compliance",
    definition: "General Purpose AI - AI models trained on broad data that can be used for many tasks.",
    examples: "ChatGPT, Claude, GPT-4, Gemini",
    relatedTerms: ["Foundation Models"],
    icon: "🌐"
  },
  {
    term: "Annex III",
    category: "Compliance",
    definition: "The EU AI Act's official list of high-risk AI use cases that require compliance.",
    examples: "Biometric ID, critical infrastructure, employment, law enforcement",
    relatedTerms: ["High-Risk AI"],
    icon: "📋"
  },
  {
    term: "Conformity Assessment",
    category: "Compliance",
    definition: "The process of proving an AI system complies with EU AI Act requirements.",
    examples: "Documentation, testing, certification",
    relatedTerms: ["Technical Documentation"],
    icon: "✅"
  },
  {
    term: "Technical Documentation",
    category: "Compliance",
    definition: "Required paperwork describing how an AI system works, its risks, and safeguards.",
    examples: "System design docs, risk assessments, test results",
    relatedTerms: ["Conformity Assessment"],
    icon: "📄"
  },
  {
    term: "Provider",
    category: "Compliance",
    definition: "The organization that builds or develops an AI system.",
    examples: "OpenAI (for ChatGPT), company building custom AI",
    relatedTerms: ["Deployer"],
    icon: "🏗️"
  },
  {
    term: "Deployer",
    category: "Compliance",
    definition: "The organization that uses an AI system (you, if you use ChatGPT for work).",
    examples: "Companies using AI tools from vendors",
    relatedTerms: ["Provider"],
    icon: "🚀"
  },
  {
    term: "ICP",
    category: "Sales",
    definition: "Ideal Customer Profile - a description of the perfect company to sell to.",
    examples: "SaaS companies with 50-200 employees in healthcare",
    relatedTerms: ["Firmographics", "Buying Signals"],
    icon: "🎯"
  },
  {
    term: "Firmographics",
    category: "Sales",
    definition: "Facts about a company: industry, size, revenue, location.",
    examples: "500-employee SaaS company in San Francisco with $50M revenue",
    relatedTerms: ["Technographics"],
    icon: "🏢"
  },
  {
    term: "Technographics",
    category: "Sales",
    definition: "Information about what technologies a company uses.",
    examples: "Uses Salesforce, AWS, React, Stripe",
    relatedTerms: ["Firmographics", "Tech Stack"],
    icon: "💻"
  },
  {
    term: "Buying Signals",
    category: "Sales",
    definition: "Signs that a company might be ready to buy your product.",
    examples: "Hiring for relevant roles, raised funding, mentioned pain point on social media",
    relatedTerms: ["Intent Data"],
    icon: "🔔"
  },
  {
    term: "Intent Data",
    category: "Sales",
    definition: "Information about what topics a company is researching online.",
    examples: "Searching for 'CRM software comparison', reading vendor blogs",
    relatedTerms: ["Buying Signals"],
    icon: "🔍"
  }
];

export default function Glossary() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = useMemo(() => {
    const cats = [...new Set(glossaryTerms.map(t => t.category))];
    return ["all", ...cats];
  }, []);

  const filteredTerms = useMemo(() => {
    return glossaryTerms.filter(term => {
      const matchesSearch = term.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           term.definition.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || term.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  const getCategoryIcon = (category) => {
    switch(category) {
      case "Compliance": return <Shield className="w-4 h-4" />;
      case "Sales": return <Database className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="w-full max-w-5xl mx-auto px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl font-bold text-white">Glossary</h1>
          </div>
          <p className="text-gray-400">
            A beginner-friendly guide to AI compliance and sales terminology.
          </p>
        </div>

        {/* Search & Filter */}
        <Card className="glass-card border-0">
          <CardContent className="p-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search terms..."
                className="pl-10 bg-gray-800/50 border-gray-700 text-white"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <Badge
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`cursor-pointer transition-all ${
                    selectedCategory === cat
                      ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {cat === "all" ? "All" : cat}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Terms List */}
        <div className="space-y-3">
          {filteredTerms.map((term, index) => (
            <Card key={index} id={term.term.toLowerCase().replace(/\s+/g, '-')} className="glass-card border-0">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{term.icon}</span>
                    <div>
                      <h3 className="text-lg font-bold text-white">{term.term}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {getCategoryIcon(term.category)}
                        <span className="text-xs text-gray-500">{term.category}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-gray-300 leading-relaxed">{term.definition}</p>

                {term.examples && (
                  <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-2">
                    <p className="text-[10px] font-semibold text-gray-400 mb-1">Examples:</p>
                    <p className="text-xs text-gray-400">{term.examples}</p>
                  </div>
                )}

                {term.relatedTerms && term.relatedTerms.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 mb-2">Related terms:</p>
                    <div className="flex flex-wrap gap-2">
                      {term.relatedTerms.map((related, i) => (
                        <a
                          key={i}
                          href={`#${related.toLowerCase().replace(/\s+/g, '-')}`}
                          className="text-xs px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                        >
                          {related}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTerms.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No terms found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}