
import React, { useState } from "react";
import { InvokeClaude } from "@/components/integrations/AnthropicAPI"; // Changed import path as requested
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Zap, 
  Lightbulb,
  Target,
  MessageSquare,
  Code,
  Loader2,
  CheckCircle,
  Copy
} from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function ContentEnhancer() {
  const [inputContent, setInputContent] = useState("");
  const [enhancementType, setEnhancementType] = useState("improve");
  const [targetAudience, setTargetAudience] = useState("intermediate");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedContent, setEnhancedContent] = useState(null);
  const [activeTab, setActiveTab] = useState("original");

  const enhancementOptions = [
    { value: "improve", label: "Improve Clarity", icon: Lightbulb },
    { value: "simplify", label: "Simplify Language", icon: MessageSquare },
    { value: "technical", label: "Add Technical Depth", icon: Code },
    { value: "examples", label: "Add Examples", icon: Target },
    { value: "interactive", label: "Make Interactive", icon: Zap }
  ];

  const enhanceContent = async () => {
    if (!inputContent.trim()) return;
    
    setIsEnhancing(true);
    
    try {
      let enhancementPrompt = "";
      
      switch (enhancementType) {
        case "improve":
          enhancementPrompt = "Improve the clarity and readability of this educational content while maintaining technical accuracy. Make it more engaging and easier to understand.";
          break;
        case "simplify":
          enhancementPrompt = "Simplify this content for better understanding. Use clearer language, shorter sentences, and explain complex terms.";
          break;
        case "technical":
          enhancementPrompt = "Add more technical depth to this content. Include advanced concepts, technical details, and industry best practices.";
          break;
        case "examples":
          enhancementPrompt = "Enhance this content by adding practical examples, real-world applications, and concrete use cases to illustrate key concepts.";
          break;
        case "interactive":
          enhancementPrompt = "Transform this content into an interactive learning experience. Add questions, exercises, thought experiments, and engagement activities.";
          break;
      }

      const prompt = `${enhancementPrompt}

Target Audience: ${targetAudience} level learners

Original Content:
${inputContent}

Please provide the enhanced version that is optimized for learning and engagement. Format it in markdown for better presentation.`;

      const result = await InvokeClaude({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            enhanced_content: { type: "string" },
            improvements_made: { type: "array", items: { type: "string" } },
            learning_benefits: { type: "array", items: { type: "string" } },
            suggested_activities: { type: "array", items: { type: "string" } }
          }
        }
      });

      setEnhancedContent(result);
      setActiveTab("enhanced");
    } catch (error) {
      console.error("Error enhancing content:", error);
    } finally {
      setIsEnhancing(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      {/* Enhancement Settings */}
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            Content Enhancement AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Enhancement Type</label>
              <Select value={enhancementType} onValueChange={setEnhancementType}>
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {enhancementOptions.map(option => (
                    <SelectItem key={option.value} value={option.value} className="text-white">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Target Audience</label>
              <Select value={targetAudience} onValueChange={setTargetAudience}>
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="beginner" className="text-white">Beginner</SelectItem>
                  <SelectItem value="intermediate" className="text-white">Intermediate</SelectItem>
                  <SelectItem value="advanced" className="text-white">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Content to Enhance</label>
            <Textarea
              placeholder="Paste your course content, lesson text, or any educational material here..."
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              className="bg-gray-800/50 border-gray-700 text-white h-32"
            />
          </div>

          <Button
            onClick={enhanceContent}
            disabled={isEnhancing || !inputContent.trim()}
            className="w-full emerald-gradient emerald-gradient-hover"
          >
            {isEnhancing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enhancing Content...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Enhance with AI
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Enhanced Content Results */}
      {enhancedContent && (
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              Enhanced Content Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 bg-gray-800/50">
                <TabsTrigger value="original">Original</TabsTrigger>
                <TabsTrigger value="enhanced">Enhanced</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="original" className="mt-4">
                <div className="p-4 rounded-lg bg-gray-800/30 border border-gray-700/50">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-white">Original Content</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(inputContent)}
                      className="border-gray-700"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown>{inputContent}</ReactMarkdown>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="enhanced" className="mt-4">
                <div className="p-4 rounded-lg bg-gray-800/30 border border-gray-700/50">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-white">Enhanced Content</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(enhancedContent.enhanced_content)}
                      className="border-gray-700"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown>{enhancedContent.enhanced_content}</ReactMarkdown>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="analysis" className="mt-4">
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <h3 className="font-semibold text-emerald-400 mb-2">Improvements Made</h3>
                    <ul className="space-y-1">
                      {enhancedContent.improvements_made?.map((improvement, index) => (
                        <li key={index} className="text-sm text-green-300 flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-400" />
                          {improvement}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-emerald-400/10 border border-emerald-400/20">
                    <h3 className="font-semibold text-emerald-300 mb-2">Learning Benefits</h3>
                    <ul className="space-y-1">
                      {enhancedContent.learning_benefits?.map((benefit, index) => (
                        <li key={index} className="text-sm text-blue-300 flex items-start gap-2">
                          <Target className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-300" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {enhancedContent.suggested_activities && (
                    <div className="p-4 rounded-lg bg-emerald-600/10 border border-emerald-600/20">
                      <h3 className="font-semibold text-emerald-500 mb-2">Suggested Activities</h3>
                      <ul className="space-y-1">
                        {enhancedContent.suggested_activities.map((activity, index) => (
                          <li key={index} className="text-sm text-purple-300 flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-500" />
                            {activity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
