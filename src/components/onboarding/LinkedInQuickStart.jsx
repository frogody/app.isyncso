
import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InvokeLLM, UploadFile, ExtractDataFromUploadedFile } from "@/api/integrations";
import { getFirmographicData, getTechnographicsData, getPeopleData } from "@/components/integrations/ExploriumAPI";
import { Link2, FileUp, ClipboardList, Loader2, CheckCircle2, AlertTriangle, Building2, User } from "lucide-react"; // Added User icon

export default function LinkedInQuickStart({ open, onClose, onComplete }) {
  const [tab, setTab] = useState("pdf");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [companyDomain, setCompanyDomain] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [enriching, setEnriching] = useState(false);

  const profileSchema = {
    type: "object",
    properties: {
      full_name: { type: "string" },
      headline: { type: "string" },
      current_role: { type: "string" },
      company: { type: "string" },
      seniority: { type: "string" },
      years_of_experience: { type: "number" },
      skills: { type: "array", items: { type: "string" } },
      industries: { type: "array", items: { type: "string" } },
      location: { type: "string" },
      education: {
        type: "array",
        items: {
          type: "object",
          properties: {
            school: { type: "string" },
            degree: { type: "string" },
            field: { type: "string" },
            start_year: { type: "number" },
            end_year: { type: "number" }
          }
        }
      },
      certifications: { type: "array", items: { type: "string" } },
      summary: { type: "string" },
      linkedin_url: { type: "string" }
    }
  };

  const isValidLinkedIn = (url) => {
    try {
      const u = new URL(url);
      return u.hostname.includes("linkedin.com") && /\/in\/|\/pub\//.test(u.pathname);
    } catch {
      return false;
    }
  };

  const enrichWithCompanyData = async (profileData) => {
    if (!companyDomain && !profileData.company && !profileData.linkedin_url) return profileData; // Added linkedin_url check for people data

    // Determine domain for company data
    const domain = companyDomain || (profileData.company ? `${profileData.company.toLowerCase().replace(/\s+/g, '')}.com` : null);

    setEnriching(true); // Start enriching state
    try {
      // Parallel fetch: company data + individual LinkedIn data
      const [firmoRes, techRes, peopleRes] = await Promise.all([
        domain ? getFirmographicData({ businesses: [{ domain }] }).catch(() => null) : Promise.resolve(null),
        domain ? getTechnographicsData({ businesses: [{ domain }] }).catch(() => null) : Promise.resolve(null),
        profileData.linkedin_url
          ? getPeopleData({ contacts: [{ linkedin_url: profileData.linkedin_url }] }).catch(() => null)
          : Promise.resolve(null)
      ]);

      const firmo = firmoRes?.data?.[0]?.data || {};
      const tech = techRes?.data?.[0]?.data || {};
      const people = peopleRes?.data?.[0]?.data || {}; // Extracted people data

      const techStack = tech.full_nested_tech_stack?.flatMap(category =>
        Object.keys(category).flatMap(key =>
          Array.isArray(category[key]) ? category[key] : []
        )
      ) || [];

      return {
        ...profileData,
        company_domain: domain,
        // Enhanced with individual professional data from Explorium
        enriched_profile: {
          current_title: people.title || profileData.current_role,
          seniority_level: people.seniority,
          management_level: people.management_level,
          department: people.department,
          job_functions: people.job_functions || [],
          skills_validated: people.skills || [],
          years_in_current_role: people.years_in_current_role,
          total_years_experience: people.total_years_experience || profileData.years_of_experience,
          education_level: people.education_level,
          career_path: people.past_companies || []
        },
        company_data: {
          name: firmo.name || profileData.company,
          description: firmo.business_description,
          industry: firmo.linkedin_industry_category || firmo.naics_description,
          size_range: firmo.number_of_employees_range,
          revenue_range: firmo.yearly_revenue_range,
          tech_stack: techStack.slice(0, 20), // Top 20 technologies
          linkedin_profile: firmo.linkedin_profile
        }
      };
    } catch (e) {
      console.error("Company enrichment failed:", e);
      return profileData;
    } finally {
      setEnriching(false); // Ensure enriching state is reset
    }
  };

  const setOkProfile = useCallback(async (data) => {
    const cleaned = data || {};
    const ok = !!(cleaned.current_role || (Array.isArray(cleaned.skills) && cleaned.skills.length >= 5));
    if (!ok) return false;

    // Enrich with company data
    const enriched = await enrichWithCompanyData(cleaned);
    setProfile(enriched);
    return true;
  }, [companyDomain]);

  const importFromUrl = async () => {
    setError("");
    if (!isValidLinkedIn(linkedinUrl)) {
      setError("Please paste a valid public LinkedIn profile URL (e.g., https://www.linkedin.com/in/your-handle/).");
      return;
    }
    setLoading(true);
    try {
      const result = await InvokeLLM({
        prompt: `Gather public details about this LinkedIn profile and corroborating sources. Return strictly the JSON per schema.
URL: ${linkedinUrl}
Focus on: current role/title, company, seniority, years of experience, top 10-20 skills, industry, education, certifications, and a single-sentence summary. If the page is private, infer conservatively from search results (name + headline snippets).`,
        add_context_from_internet: true,
        response_json_schema: profileSchema
      });
      const ok = await setOkProfile({ ...(result || {}), linkedin_url: linkedinUrl });
      if (!ok) {
        setError("This LinkedIn profile appears private or blocked. Please use 'LinkedIn PDF / Resume' tab for a reliable import (Profile → More → Save to PDF).");
      }
    } catch (e) {
      setError("Public scraping failed (likely due to LinkedIn protections). Please use the PDF/Resume tab for a reliable import.");
    } finally {
      setLoading(false);
    }
  };

  const importFromPdf = async () => {
    setError("");
    if (!file) {
      setError("Please select a LinkedIn PDF or resume (PDF).");
      return;
    }
    setLoading(true);
    try {
      const { file_url } = await UploadFile({ file });
      const extracted = await ExtractDataFromUploadedFile({
        file_url,
        json_schema: profileSchema
      });
      if (extracted.status === "success") {
        const ok = await setOkProfile(extracted.output);
        if (!ok) setError("We parsed your file but could not confidently identify your role/skills. Try another PDF (LinkedIn → More → Save to PDF) or use Paste Text.");
      } else {
        setError("We could not parse that file. Please try a LinkedIn Save to PDF or a different resume PDF.");
      }
    } catch (e) {
      setError("Upload/parse failed. Please try again with a LinkedIn PDF export.");
    } finally {
      setLoading(false);
    }
  };

  const importFromText = async () => {
    setError("");
    if (!pastedText.trim()) {
      setError("Paste sections like About + Experience + Skills from LinkedIn.");
      return;
    }
    setLoading(true);
    try {
      const result = await InvokeLLM({
        prompt: `Extract a structured professional profile from the following text. Parse accurately and conservatively.
Text:
${pastedText}
Return JSON following the schema exactly.`,
        response_json_schema: profileSchema
      });
      const ok = await setOkProfile(result);
      if (!ok) setError("We need at least a current role or 5+ skills. Try adding more of your profile text.");
    } catch (e) {
      setError("Parsing failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const acceptProfile = () => {
    if (!profile) return;
    onComplete(profile);
    setTimeout(() => {
      setProfile(null);
      setLinkedinUrl("");
      setPastedText("");
      setCompanyDomain("");
      setFile(null);
      setError("");
      setTab("pdf");
      onClose();
    }, 0);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass border-0 text-white max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-white">Quick Start with Your Profile</DialogTitle>
          <DialogDescription className="text-gray-400">
            For the most accurate personalization, import your LinkedIn (best: PDF export). We'll analyze your company's tech stack and industry to create ultra-targeted courses.
          </DialogDescription>
        </DialogHeader>

        {/* Company Domain Input */}
        <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span className="font-medium">Company Domain (Optional but Recommended)</span>
          </div>
          <Input
            value={companyDomain}
            onChange={(e) => setCompanyDomain(e.target.value)}
            placeholder="company.com"
            className="bg-transparent border border-white/10 text-white focus-ring"
          />
          <p className="text-xs text-gray-400">
            We'll analyze your company's tech stack and industry to create courses that match your exact tools and workflows.
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="bg-white/5">
            <TabsTrigger value="pdf" className="text-gray-300">LinkedIn PDF / Resume</TabsTrigger>
            <TabsTrigger value="url" className="text-gray-300">LinkedIn URL (best-effort)</TabsTrigger>
            <TabsTrigger value="paste" className="text-gray-300">Paste Profile Text</TabsTrigger>
          </TabsList>

          <TabsContent value="pdf" className="mt-5 space-y-4">
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300">
              Tip: On LinkedIn, open your profile → More → Save to PDF. Upload that file here for the most reliable import.
            </div>
            <div className="flex gap-2">
              <Input
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="bg-transparent border border-white/10 text-white focus-ring"
              />
              <Button onClick={importFromPdf} disabled={loading} className="btn-primary">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4 mr-2" />}
                Import PDF
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="url" className="mt-5 space-y-3">
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300">
              Note: Public URL import can fail if the profile is private. If it does, switch to the PDF tab.
            </div>
            <div className="flex gap-2">
              <Input
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://www.linkedin.com/in/your-handle/"
                className="bg-transparent border border-white/10 text-white focus-ring"
              />
              <Button onClick={importFromUrl} disabled={loading} className="btn-primary">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
                Import URL
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="paste" className="mt-5 space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <ClipboardList className="w-4 h-4" />
              Paste your About, Experience, and Skills sections.
            </div>
            <Textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              rows={8}
              placeholder="Paste LinkedIn profile text here…"
              className="bg-transparent border border-white/10 text-white focus-ring"
            />
            <Button onClick={importFromText} disabled={loading} className="btn-primary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? "Parsing…" : "Parse Text"}
            </Button>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 flex items-center gap-2 mt-4">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {enriching && (
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 mt-4">
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
            <div>
              <p className="text-emerald-300 font-medium">Enriching profile data...</p>
              <p className="text-xs text-gray-400">Fetching tech stack, industry, and individual professional insights from Explorium</p>
            </div>
          </div>
        )}

        {profile && (
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 mt-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-white font-semibold">
                {profile.full_name || "Profile"} {profile.current_role ? `— ${profile.current_role}` : ""}
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Ready</Badge>
            </div>
            {profile.headline && <p className="text-sm text-gray-300 mb-2">{profile.headline}</p>}

            <div className="grid md:grid-cols-2 gap-3 text-sm text-gray-300">
              {profile.company && <div><span className="text-gray-400">Company:</span> {profile.company}</div>}
              {profile.years_of_experience != null && <div><span className="text-gray-400">Experience:</span> {profile.years_of_experience} yrs</div>}
              {Array.isArray(profile.industries) && profile.industries[0] && <div><span className="text-gray-400">Industry:</span> {profile.industries[0]}</div>}
              {profile.location && <div><span className="text-gray-400">Location:</span> {profile.location}</div>}
            </div>

            {/* NEW: Individual Professional Enrichment */}
            {profile.enriched_profile && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-2">
                <div className="flex items-center gap-2 text-blue-300 font-medium">
                  <User className="w-4 h-4" />
                  Professional Profile Analysis
                </div>
                <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-300">
                  {profile.enriched_profile.seniority_level && (
                    <div><span className="text-gray-400">Seniority:</span> {profile.enriched_profile.seniority_level}</div>
                  )}
                  {profile.enriched_profile.department && (
                    <div><span className="text-gray-400">Department:</span> {profile.enriched_profile.department}</div>
                  )}
                  {profile.enriched_profile.management_level && (
                    <div><span className="text-gray-400">Management:</span> {profile.enriched_profile.management_level}</div>
                  )}
                  {profile.enriched_profile.years_in_current_role && (
                    <div><span className="text-gray-400">Years in Role:</span> {profile.enriched_profile.years_in_current_role}</div>
                  )}
                  {profile.enriched_profile.total_years_experience && (
                    <div><span className="text-gray-400">Total Experience:</span> {profile.enriched_profile.total_years_experience} yrs</div>
                  )}
                  {profile.enriched_profile.education_level && (
                    <div><span className="text-gray-400">Education Level:</span> {profile.enriched_profile.education_level}</div>
                  )}
                </div>
                {Array.isArray(profile.enriched_profile.job_functions) && profile.enriched_profile.job_functions.length > 0 && (
                  <div>
                    <div className="text-gray-400 text-xs mb-1">Job Functions:</div>
                    <div className="flex flex-wrap gap-1">
                      {profile.enriched_profile.job_functions.map((func, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-200 text-xs">
                          {func}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {profile.company_data && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-medium">
                  <Building2 className="w-4 h-4" />
                  Company Intelligence
                </div>
                <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-300">
                  {profile.company_data.industry && (
                    <div><span className="text-gray-400">Industry:</span> {profile.company_data.industry}</div>
                  )}
                  {profile.company_data.size_range && (
                    <div><span className="text-gray-400">Size:</span> {profile.company_data.size_range} employees</div>
                  )}
                </div>
                {Array.isArray(profile.company_data.tech_stack) && profile.company_data.tech_stack.length > 0 && (
                  <div>
                    <div className="text-gray-400 text-xs mb-1">Tech Stack ({profile.company_data.tech_stack.length} tools):</div>
                    <div className="flex flex-wrap gap-1">
                      {profile.company_data.tech_stack.slice(0, 10).map((tech, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-200 text-xs">
                          {tech}
                        </span>
                      ))}
                      {profile.company_data.tech_stack.length > 10 && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-200 text-xs">
                          +{profile.company_data.tech_stack.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {Array.isArray(profile.skills) && profile.skills.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.skills.slice(0, 10).map((s, i) => (
                  <span key={i} className="badge">{s}</span>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} className="bg-transparent border-white/10 text-gray-300 hover:bg-white/5">
            Cancel
          </Button>
          <Button onClick={acceptProfile} disabled={!profile} className="btn-primary">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Use This Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
