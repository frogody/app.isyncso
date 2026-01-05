import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, FileText, Table, Save, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";

const EXPORT_FORMATS = [
  {
    id: 'csv',
    name: 'CSV (Spreadsheet)',
    description: 'Clean table format perfect for Excel/Google Sheets',
    icon: Table
  },
  {
    id: 'json',
    name: 'JSON (Raw Data)',
    description: 'Complete data structure for technical use',
    icon: FileText
  }
];

export default function ExportConfig({ onExport, onBack, selectedCount, isProcessing, enrichedData, criteria, productContext }) {
  const [format, setFormat] = useState('csv');
  const [saveToDatabase, setSaveToDatabase] = useState(false);
  const [listName, setListName] = useState('');
  const [listDescription, setListDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleExport = () => {
    onExport({ format });
  };

  const handleSaveAndExport = async () => {
    if (!listName.trim()) {
      setError('Please enter a list name');
      return;
    }
    
    if (enrichedData.length === 0) {
      setError('No prospects to save');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const response = await base44.functions.invoke('saveProspectList', {
        list_name: listName,
        description: listDescription,
        prospects: enrichedData,
        criteria_snapshot: criteria,
        product_context_snapshot: productContext
      });

      if (response.data?.success) {
        setSaveSuccess(true);
        setTimeout(() => {
          window.location.href = `/CIDEList?id=${response.data.list_id}`;
        }, 1500);
      } else {
        throw new Error(response.data?.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Save failed:', error);
      setError(`Failed to save: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-0 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Download className="w-5 h-5 text-indigo-400" />
          Download Your Prospects
        </CardTitle>
        <p className="text-sm text-gray-400 mt-2">
          Choose your preferred export format
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Save to Database */}
        <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
          <div className="flex items-start gap-3 mb-4">
            <input
              type="checkbox"
              checked={saveToDatabase}
              onChange={(e) => setSaveToDatabase(e.target.checked)}
              className="mt-1"
            />
            <div className="flex-1">
              <h4 className="text-white font-semibold mb-1">💾 Save to CIDE Database</h4>
              <p className="text-sm text-gray-400">
                Keep these prospects for tracking and future enrichment
              </p>
            </div>
          </div>

          {saveToDatabase && (
            <div className="space-y-3 pl-7">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              <div>
                <Label className="text-gray-300 mb-2">List Name *</Label>
                <Input
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  placeholder="e.g., Dutch SaaS - Zendesk Users"
                  className="bg-black/30 border-indigo-500/30 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300 mb-2">Description (optional)</Label>
                <Input
                  value={listDescription}
                  onChange={(e) => setListDescription(e.target.value)}
                  placeholder="ICP: 50-200 employees, Series A+"
                  className="bg-black/30 border-indigo-500/30 text-white"
                />
              </div>
              <Button
                onClick={handleSaveAndExport}
                disabled={isSaving || !listName.trim()}
                className="w-full bg-gradient-to-br from-indigo-500/30 to-indigo-600/20 border border-indigo-400/50 text-indigo-200 hover:bg-indigo-500/40 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-indigo-200/30 border-t-indigo-200 rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Saved! Redirecting...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save List
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {!saveToDatabase && (
          <>
            <div className="text-center text-sm text-gray-500">— or export only (no save) —</div>

        <RadioGroup value={format} onValueChange={setFormat}>
          <div className="space-y-3">
            {EXPORT_FORMATS.map((fmt) => {
              const Icon = fmt.icon;
              const isSelected = format === fmt.id;
              
              return (
                <div
                  key={fmt.id}
                  onClick={() => setFormat(fmt.id)}
                  className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-400 bg-indigo-500/10'
                      : 'border-gray-700 bg-gray-900/30 hover:border-gray-600'
                  }`}
                >
                  <RadioGroupItem value={fmt.id} id={fmt.id} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={fmt.id} className="flex items-center gap-2 cursor-pointer">
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-indigo-400' : 'text-gray-500'}`} />
                      <span className="text-white font-semibold">{fmt.name}</span>
                    </Label>
                    <p className="text-sm text-gray-400 mt-1">{fmt.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </RadioGroup>

        {/* Export Summary */}
        <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
          <h4 className="text-white font-semibold mb-2">Export Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Companies</div>
              <div className="text-white font-semibold">{selectedCount}</div>
            </div>
            <div>
              <div className="text-gray-400">Format</div>
              <div className="text-white font-semibold">{format.toUpperCase()}</div>
            </div>
          </div>
        </div>

            <div className="flex justify-between pt-4 border-t border-indigo-500/20">
              <Button onClick={onBack} variant="outline" className="border-gray-700 text-gray-400">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleExport}
                disabled={isProcessing}
                className="bg-gradient-to-br from-indigo-500/30 to-indigo-600/20 border border-indigo-400/50 text-indigo-200 hover:bg-indigo-500/40 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-indigo-200/30 border-t-indigo-200 rounded-full animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download Export
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}