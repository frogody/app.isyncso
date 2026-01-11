import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Database, Globe, BarChart3, TrendingUp, Zap, Save } from "lucide-react";
import { db } from "@/api/supabaseClient";

const ENRICHMENT_OPTIONS = [
  {
    id: 'firmographics',
    name: 'Firmographics',
    description: 'Company name, industry, size, revenue, location',
    icon: Database,
    tier: 'Free',
    color: 'indigo'
  },
  {
    id: 'technographics',
    name: 'Technographics',
    description: 'Full tech stack, sales tools, marketing tools, DevOps',
    icon: Zap,
    tier: 'Premium',
    color: 'purple'
  },
  {
    id: 'funding',
    name: 'Funding History',
    description: 'Funding rounds, total raised, investors, last round date',
    icon: TrendingUp,
    tier: 'Premium',
    color: 'green'
  }
];

export default function EnrichmentConfig({ config, onSubmit, onBack, selectedCount, isProcessing }) {
  const [localConfig, setLocalConfig] = React.useState(config);
  const [userSettings, setUserSettings] = React.useState(null);
  const [savingDefaults, setSavingDefaults] = React.useState(false);

  const loadUserSettings = React.useCallback(async () => {

    try {
      const user = await db.auth.me();
      const settings = await db.entities.UserSettings.filter({ user_id: user.id });
      if (settings.length > 0 && settings[0].cide_enrichment_defaults) {
        setUserSettings(settings[0]);
        // Pre-populate with saved defaults
        setLocalConfig(prev => ({
          ...prev,
          ...settings[0].cide_enrichment_defaults
        }));
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  }, []);

  React.useEffect(() => {
    loadUserSettings();
  }, [loadUserSettings]);

  const saveAsDefaults = React.useCallback(async () => {
    setSavingDefaults(true);
    try {
      const user = await db.auth.me();
      const settings = await db.entities.UserSettings.filter({ user_id: user.id });
      
      if (settings.length > 0) {
        await db.entities.UserSettings.update(settings[0].id, {
          cide_enrichment_defaults: localConfig
        });
      } else {
        await db.entities.UserSettings.create({
          user_id: user.id,
          cide_enrichment_defaults: localConfig
        });
      }
      alert("Saved as your default enrichment settings!");
    } catch (e) {
      console.error("Failed to save defaults:", e);
    } finally {
      setSavingDefaults(false);
    }
  }, [localConfig]);

  const toggleOption = (id) => {
    setLocalConfig(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleContinue = () => {
    onSubmit(localConfig);
  };

  const selectedOptions = Object.entries(localConfig).filter(([_, enabled]) => enabled);

  return (
    <Card className="border-0 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            Configure Data Enrichment
          </div>
          <div className="text-sm text-gray-400">
            {selectedCount} companies • {selectedOptions.length} data sources
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ENRICHMENT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isEnabled = localConfig[option.id];
            const isFree = option.tier === 'Free';
            
            return (
              <div
                key={option.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isEnabled
                    ? `border-${option.color}-400 bg-${option.color}-500/10`
                    : 'border-gray-700 bg-gray-900/30'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-${option.color}-500/20 flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 text-${option.color}-400`} />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{option.name}</h3>
                      <Badge className={`${
                        isFree 
                          ? 'bg-green-500/20 text-green-300 border-green-400/30' 
                          : 'bg-purple-500/20 text-purple-300 border-purple-400/30'
                      } text-xs`}>
                        {option.tier}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => toggleOption(option.id)}
                    disabled={option.id === 'firmographics'}
                  />
                </div>
                <p className="text-sm text-gray-400">{option.description}</p>
              </div>
            );
          })}
        </div>

        {/* Estimated Credits */}
        <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-semibold mb-1">Estimated API Usage</h4>
              <p className="text-sm text-gray-400">
                {selectedCount} companies × {selectedOptions.length} data sources
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-indigo-300">
                {selectedCount * selectedOptions.length}
              </div>
              <div className="text-xs text-gray-500">API credits</div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-indigo-500/20">
          <Button onClick={onBack} variant="outline" className="border-gray-700 text-gray-400">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button 
              onClick={saveAsDefaults}
              disabled={savingDefaults}
              variant="outline"
              className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
            >
              <Save className="w-4 h-4 mr-2" />
              {savingDefaults ? "Saving..." : "Save as Default"}
            </Button>
            <Button 
              onClick={handleContinue}
              disabled={isProcessing}
              className="bg-gradient-to-br from-indigo-500/30 to-indigo-600/20 border border-indigo-400/50 text-indigo-200 hover:bg-indigo-500/40"
            >
              {isProcessing ? (
                <>
                  <Database className="w-4 h-4 mr-2 animate-spin" />
                  Enriching...
                </>
              ) : (
                <>
                  Continue to Export
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}