import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadFile, ExtractDataFromUploadedFile, SendEmail } from "@/api/integrations";
import { Invitation } from "@/api/entities";
import { Department } from "@/api/entities";
import { User } from "@/api/entities";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";

export default function HRImport({ onImported }) {
  const [file, setFile] = React.useState(null);
  const [uploading, setUploading] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState(null);

  const templateExample = "email,full_name,role,department\nsam@company.com,Sam Taylor,learner,Sales\nlee@company.com,Lee Chen,manager,Engineering";

  const handleImport = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const me = await User.me();
      const { file_url } = await UploadFile({ file });
      const schema = {
        type: "object",
        properties: {
          email: { type: "string" },
          full_name: { type: "string" },
          role: { type: "string" },
          department: { type: "string" },
        },
      };
      const extraction = await ExtractDataFromUploadedFile({ file_url, json_schema: schema });
      if (extraction.status !== "success") {
        throw new Error(extraction.details || "Failed to parse CSV");
      }
      const rows = Array.isArray(extraction.output) ? extraction.output : [];
      const depts = await Department.list();
      const compDepts = depts.filter(d => !me.company_id || d.company_id === me.company_id);

      let invited = 0;
      for (const r of rows) {
        if (!r.email) continue;
        const dept = compDepts.find(d => d.name?.toLowerCase() === (r.department || "").toLowerCase());
        await Invitation.create({
          company_id: me.company_id || "",
          email: r.email,
          role: ["company_admin","manager","learner"].includes((r.role || "").toLowerCase()) ? (r.role || "").toLowerCase() : "learner",
          department_id: dept?.id || undefined,
          status: "pending",
          message: `You have been invited to join ISYNCSO. Assigned role: ${r.role || "learner"}.`
        });
        invited++;
        // fire and forget email (best-effort)
        try {
          await SendEmail({
            to: r.email,
            subject: "Your ISYNCSO invite",
            body: `Hi ${r.full_name || ""},\n\nYou've been invited to ISYNCSO. Please sign in with your work email to access your learning workspace.\n\nThanks!`
          });
        } catch(e) { /* ignore */ }
      }
      setResult({ invited, total: rows.length });
      onImported?.(invited);
    } catch (e) {
      setError(e.message || "Import failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="glass-card border-0">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          <h3 className="text-white font-semibold">HR CSV Import</h3>
        </div>
        <p className="text-gray-400 text-sm">
          Import employees via CSV with headers: email, full_name, role (company_admin|manager|learner), department
        </p>
        <div className="flex items-center gap-3">
          <Input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="bg-gray-800/50 border-gray-700 text-white" />
          <Button onClick={handleImport} disabled={!file || uploading} className="emerald-gradient emerald-gradient-hover">
            {uploading ? "Importing..." : (<><Upload className="w-4 h-4 mr-2" /> Import</>)}
          </Button>
        </div>
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer">CSV Template</summary>
          <pre className="mt-2 p-3 bg-gray-900/50 rounded-md overflow-auto">{templateExample}</pre>
        </details>
        {result && (
          <div className="text-emerald-300 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Imported {result.invited}/{result.total} invitations created
          </div>
        )}
        {error && (
          <div className="text-red-300 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}