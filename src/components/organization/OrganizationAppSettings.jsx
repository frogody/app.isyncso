import React, { useEffect, useState } from "react";
import { User } from "@/api/entities";
import { Organization } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  RefreshCw,
  Check,
  Copy,
  Key,
  Plug,
  AlertCircle
} from "lucide-react";
import { generateApiKey } from "@/api/functions";
import IconWrapper from "../ui/IconWrapper";
import { useTranslation } from "@/components/utils/translations";

export default function OrganizationAppSettings({ organization, onUpdate }) {
  const [user, setUser] = useState(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const { t } = useTranslation(user?.language || 'nl');
  const webhookUrl = `${window.location.origin}/api/functions/zapierWebhook`;

  useEffect(() => {
    const loadUserAndKey = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const userData = await User.me();
        setUser(userData);
        
        // Set API key from organization prop
        if (organization?.zapier_api_key) {
          setApiKey(organization.zapier_api_key);
        }
      } catch (err) {
        console.error("Error loading user:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserAndKey();
  }, [organization?.zapier_api_key]);

  const handleGenerateKey = async () => {
    setIsGeneratingKey(true);
    setError(null);
    try {
      const response = await generateApiKey();
      if (response.data?.apiKey) {
        setApiKey(response.data.apiKey);
        // Trigger parent refresh
        if (onUpdate) {
          await onUpdate();
        }
      } else {
        setError("Failed to generate API key");
      }
    } catch (err) {
      console.error("Error generating API key:", err);
      setError(err.message || "Failed to generate API key");
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === "key") {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
      } else {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      }
    }).catch(err => {
      console.error("Failed to copy:", err);
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin" style={{color: 'var(--accent)'}} />
      </div>
    );
  }

  if (!user || (user.organization_role !== 'super_admin' && user.organization_role !== 'admin')) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1" style={{color: 'var(--txt)'}}>
                Administrator Access Required
              </h3>
              <p className="text-sm" style={{color: 'var(--muted)'}}>
                Only administrators can manage API keys and integrations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Card className="glass-card border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1 text-red-400">Error</h3>
                <p className="text-sm" style={{color: 'var(--muted)'}}>{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Keys */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: 'var(--txt)' }}>
            <IconWrapper icon={Key} size={20} variant="accent" />
            API Keys
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg" style={{background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.2)'}}>
            <p className="text-sm" style={{color: 'var(--txt)'}}>
              <strong>Organization API Key:</strong> This key allows external services to authenticate with your organization. Keep it secure and never share it publicly.
            </p>
          </div>

          <div>
            <Label htmlFor="apiKey" style={{color: 'var(--muted)'}}>Organization API Key</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input 
                id="apiKey" 
                readOnly 
                value={apiKey || "No API key generated yet"} 
                className="bg-transparent border font-mono text-sm" 
                style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => copyToClipboard(apiKey, 'key')} 
                className="btn-outline"
                disabled={!apiKey}
                title="Copy API key"
              >
                {copiedKey ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button
              onClick={handleGenerateKey}
              disabled={isGeneratingKey}
              className="btn-primary"
            >
              {isGeneratingKey ? (
                <>
                  <IconWrapper icon={RefreshCw} size={16} variant="accent" className="mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <IconWrapper icon={Key} size={16} variant="accent" className="mr-2" />
                  {apiKey ? 'Regenerate API Key' : 'Generate API Key'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: 'var(--txt)' }}>
            <IconWrapper icon={Plug} size={20} variant="accent" />
            Integrations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="webhookUrl" style={{color: 'var(--muted)'}}>Webhook URL</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input 
                id="webhookUrl" 
                readOnly 
                value={webhookUrl} 
                className="bg-transparent border font-mono text-sm" 
                style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => copyToClipboard(webhookUrl, 'url')} 
                className="btn-outline"
                title="Copy webhook URL"
              >
                {copiedUrl ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="p-4 rounded-lg text-sm space-y-3" style={{background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)'}}>
            <h4 className="font-semibold" style={{color: 'var(--txt)'}}>How to Setup Zapier Integration</h4>
            <ol className="list-decimal list-inside space-y-2" style={{color: 'var(--muted)'}}>
              <li>Create a new Zap in Zapier</li>
              <li>Select "Webhooks by Zapier" as your trigger app</li>
              <li>Choose "Catch Hook" as the trigger event</li>
              <li>Copy the webhook URL above and paste it into Zapier</li>
              <li>Add your API key as a header: <code className="px-1 py-0.5 rounded bg-gray-800">X-API-Key: [your-api-key]</code></li>
              <li>Test your webhook and continue building your Zap</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}