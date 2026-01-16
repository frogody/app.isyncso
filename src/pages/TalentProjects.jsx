import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import { GlassCard, StatCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Copy,
  Archive,
  RefreshCw,
  Loader2,
  ChevronRight,
  Target,
  TrendingUp,
  UserPlus,
  Zap,
  Link2,
  Globe,
  Sparkles,
  ChevronDown,
  X,
  Check,
  ArrowRight,
  FileText,
  Wand2,
} from "lucide-react";

// ============================================================================
// LOCATION DATA - Hierarchical city → region → country auto-derivation
// ============================================================================
const LOCATION_DATA = {
  // Netherlands
  "amsterdam": { city: "Amsterdam", region: "North Holland", country: "Netherlands", remote: false },
  "rotterdam": { city: "Rotterdam", region: "South Holland", country: "Netherlands", remote: false },
  "the hague": { city: "The Hague", region: "South Holland", country: "Netherlands", remote: false },
  "utrecht": { city: "Utrecht", region: "Utrecht", country: "Netherlands", remote: false },
  "eindhoven": { city: "Eindhoven", region: "North Brabant", country: "Netherlands", remote: false },
  // UK
  "london": { city: "London", region: "Greater London", country: "United Kingdom", remote: false },
  "manchester": { city: "Manchester", region: "Greater Manchester", country: "United Kingdom", remote: false },
  "birmingham": { city: "Birmingham", region: "West Midlands", country: "United Kingdom", remote: false },
  "edinburgh": { city: "Edinburgh", region: "Scotland", country: "United Kingdom", remote: false },
  "bristol": { city: "Bristol", region: "South West", country: "United Kingdom", remote: false },
  // Germany
  "berlin": { city: "Berlin", region: "Berlin", country: "Germany", remote: false },
  "munich": { city: "Munich", region: "Bavaria", country: "Germany", remote: false },
  "frankfurt": { city: "Frankfurt", region: "Hesse", country: "Germany", remote: false },
  "hamburg": { city: "Hamburg", region: "Hamburg", country: "Germany", remote: false },
  "cologne": { city: "Cologne", region: "North Rhine-Westphalia", country: "Germany", remote: false },
  // USA
  "new york": { city: "New York", region: "New York", country: "United States", remote: false },
  "san francisco": { city: "San Francisco", region: "California", country: "United States", remote: false },
  "los angeles": { city: "Los Angeles", region: "California", country: "United States", remote: false },
  "chicago": { city: "Chicago", region: "Illinois", country: "United States", remote: false },
  "austin": { city: "Austin", region: "Texas", country: "United States", remote: false },
  "seattle": { city: "Seattle", region: "Washington", country: "United States", remote: false },
  "boston": { city: "Boston", region: "Massachusetts", country: "United States", remote: false },
  "miami": { city: "Miami", region: "Florida", country: "United States", remote: false },
  "denver": { city: "Denver", region: "Colorado", country: "United States", remote: false },
  // France
  "paris": { city: "Paris", region: "Île-de-France", country: "France", remote: false },
  "lyon": { city: "Lyon", region: "Auvergne-Rhône-Alpes", country: "France", remote: false },
  "marseille": { city: "Marseille", region: "Provence-Alpes-Côte d'Azur", country: "France", remote: false },
  // Spain
  "madrid": { city: "Madrid", region: "Community of Madrid", country: "Spain", remote: false },
  "barcelona": { city: "Barcelona", region: "Catalonia", country: "Spain", remote: false },
  // Remote options
  "remote": { city: "Remote", region: "Worldwide", country: "Any", remote: true },
  "hybrid": { city: "Hybrid", region: "Flexible", country: "Negotiable", remote: true },
};

// Common job titles for quick selection
const COMMON_JOB_TITLES = [
  "Software Engineer",
  "Senior Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "DevOps Engineer",
  "Data Scientist",
  "Data Engineer",
  "Product Manager",
  "Project Manager",
  "UX Designer",
  "UI Designer",
  "Account Executive",
  "Sales Representative",
  "Marketing Manager",
  "Finance Manager",
  "HR Manager",
  "Operations Manager",
  "Business Analyst",
  "Technical Lead",
  "Engineering Manager",
  "Chief Technology Officer",
];

// Role title → suggested skills mapping
const ROLE_SKILLS_MAP = {
  "software engineer": ["JavaScript", "Python", "Git", "SQL", "REST APIs", "Agile"],
  "senior software engineer": ["System Design", "Code Review", "Mentoring", "CI/CD", "Cloud Services", "Architecture"],
  "frontend developer": ["React", "TypeScript", "CSS", "HTML5", "Responsive Design", "Web Performance"],
  "backend developer": ["Node.js", "Python", "Java", "Databases", "REST APIs", "Microservices"],
  "full stack developer": ["React", "Node.js", "PostgreSQL", "AWS", "Git", "Docker"],
  "devops engineer": ["AWS", "Docker", "Kubernetes", "Terraform", "CI/CD", "Linux"],
  "data scientist": ["Python", "Machine Learning", "Statistics", "SQL", "TensorFlow", "Data Visualization"],
  "data engineer": ["Python", "SQL", "Apache Spark", "ETL", "Data Warehousing", "Airflow"],
  "product manager": ["Roadmapping", "User Research", "Agile", "Analytics", "Stakeholder Management"],
  "project manager": ["Project Planning", "Risk Management", "Agile/Scrum", "Budget Management", "Communication"],
  "ux designer": ["User Research", "Wireframing", "Figma", "Prototyping", "Usability Testing"],
  "ui designer": ["Figma", "Adobe XD", "Visual Design", "Design Systems", "Typography"],
  "account executive": ["Sales", "Negotiation", "CRM", "Pipeline Management", "Relationship Building"],
  "marketing manager": ["Digital Marketing", "SEO", "Content Strategy", "Analytics", "Campaign Management"],
  "finance manager": ["Financial Analysis", "Budgeting", "Forecasting", "Excel", "ERP Systems"],
  "hr manager": ["Recruitment", "Employee Relations", "HRIS", "Performance Management", "Compliance"],
};

// Role title → suggested salary ranges
const ROLE_SALARY_MAP = {
  "software engineer": { min: 70000, max: 120000, currency: "EUR" },
  "senior software engineer": { min: 100000, max: 160000, currency: "EUR" },
  "frontend developer": { min: 60000, max: 100000, currency: "EUR" },
  "backend developer": { min: 65000, max: 110000, currency: "EUR" },
  "full stack developer": { min: 70000, max: 120000, currency: "EUR" },
  "devops engineer": { min: 80000, max: 140000, currency: "EUR" },
  "data scientist": { min: 75000, max: 130000, currency: "EUR" },
  "data engineer": { min: 70000, max: 120000, currency: "EUR" },
  "product manager": { min: 80000, max: 140000, currency: "EUR" },
  "project manager": { min: 65000, max: 110000, currency: "EUR" },
  "ux designer": { min: 55000, max: 95000, currency: "EUR" },
  "ui designer": { min: 50000, max: 85000, currency: "EUR" },
  "account executive": { min: 50000, max: 100000, currency: "EUR" },
  "marketing manager": { min: 60000, max: 100000, currency: "EUR" },
  "finance manager": { min: 70000, max: 120000, currency: "EUR" },
  "hr manager": { min: 60000, max: 100000, currency: "EUR" },
};

// Helper function to derive location from input
const deriveLocation = (input) => {
  if (!input) return null;
  const normalized = input.toLowerCase().trim();
  if (LOCATION_DATA[normalized]) {
    return LOCATION_DATA[normalized];
  }
  // Try partial match
  for (const [key, data] of Object.entries(LOCATION_DATA)) {
    if (key.includes(normalized) || normalized.includes(key)) {
      return data;
    }
  }
  return null;
};

// Helper function to get suggested skills for a role
const getSuggestedSkills = (roleTitle) => {
  if (!roleTitle) return [];
  const normalized = roleTitle.toLowerCase().trim();
  for (const [key, skills] of Object.entries(ROLE_SKILLS_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return skills;
    }
  }
  return [];
};

// Helper function to get suggested salary for a role
const getSuggestedSalary = (roleTitle) => {
  if (!roleTitle) return null;
  const normalized = roleTitle.toLowerCase().trim();
  for (const [key, salary] of Object.entries(ROLE_SALARY_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return `€${(salary.min / 1000).toFixed(0)}k - €${(salary.max / 1000).toFixed(0)}k`;
    }
  }
  return null;
};

// ============================================================================
// SMART QUICK ADD MODAL - The sophisticated role/project creation system
// ============================================================================
const SmartQuickAddModal = ({ isOpen, onClose, clients, projects, onCreateRole, onCreateProject }) => {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState("quick"); // quick, url, advanced
  const [isProcessing, setIsProcessing] = useState(false);

  // Step 1: Basic Info
  const [roleTitle, setRoleTitle] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [createNewProject, setCreateNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  // Step 2: Location with auto-derivation
  const [locationInput, setLocationInput] = useState("");
  const [derivedLocation, setDerivedLocation] = useState(null);
  const [locationOpen, setLocationOpen] = useState(false);

  // Step 3: Auto-populated fields
  const [suggestedSkills, setSuggestedSkills] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [suggestedSalary, setSuggestedSalary] = useState("");
  const [employmentType, setEmploymentType] = useState("full_time");
  const [description, setDescription] = useState("");

  // URL parsing
  const [jobUrl, setJobUrl] = useState("");
  const [parsedJob, setParsedJob] = useState(null);

  // Title suggestions dropdown
  const [titleOpen, setTitleOpen] = useState(false);
  const [filteredTitles, setFilteredTitles] = useState(COMMON_JOB_TITLES);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setRoleTitle("");
      setSelectedClient(null);
      setSelectedProject(null);
      setCreateNewProject(false);
      setNewProjectName("");
      setLocationInput("");
      setDerivedLocation(null);
      setSuggestedSkills([]);
      setSelectedSkills([]);
      setSuggestedSalary("");
      setEmploymentType("full_time");
      setDescription("");
      setJobUrl("");
      setParsedJob(null);
    }
  }, [isOpen]);

  // Auto-derive location when input changes
  useEffect(() => {
    if (locationInput) {
      const derived = deriveLocation(locationInput);
      setDerivedLocation(derived);
    } else {
      setDerivedLocation(null);
    }
  }, [locationInput]);

  // Auto-suggest skills and salary when role title changes
  useEffect(() => {
    if (roleTitle) {
      const skills = getSuggestedSkills(roleTitle);
      setSuggestedSkills(skills);
      if (selectedSkills.length === 0 && skills.length > 0) {
        setSelectedSkills(skills.slice(0, 4)); // Pre-select top 4
      }

      const salary = getSuggestedSalary(roleTitle);
      if (salary && !suggestedSalary) {
        setSuggestedSalary(salary);
      }
    }
  }, [roleTitle]);

  // Filter job titles based on input
  useEffect(() => {
    if (roleTitle) {
      const filtered = COMMON_JOB_TITLES.filter(t =>
        t.toLowerCase().includes(roleTitle.toLowerCase())
      );
      setFilteredTitles(filtered.length > 0 ? filtered : COMMON_JOB_TITLES);
    } else {
      setFilteredTitles(COMMON_JOB_TITLES);
    }
  }, [roleTitle]);

  // Parse job posting URL
  const parseJobUrl = async () => {
    if (!jobUrl) return;
    setIsProcessing(true);
    try {
      // Simulate parsing (in production, call an edge function)
      await new Promise(r => setTimeout(r, 1500));

      // Extract domain for demo
      const url = new URL(jobUrl);
      const domain = url.hostname.replace('www.', '');

      // Demo parsed data
      setParsedJob({
        title: "Software Engineer", // Would come from scraping
        company: domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1),
        location: "Remote",
        description: `Parsed from ${domain}`,
        source: url.hostname,
      });

      setRoleTitle("Software Engineer");
      setLocationInput("remote");
      toast.success("Job posting parsed successfully!");
    } catch (error) {
      toast.error("Could not parse job posting URL");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!roleTitle.trim()) {
      toast.error("Please enter a role title");
      return;
    }

    setIsProcessing(true);
    try {
      // Determine or create project
      let projectId = selectedProject?.id;

      if (createNewProject && newProjectName) {
        // Create new project first
        const newProject = await onCreateProject({
          name: newProjectName,
          client_id: selectedClient?.id,
          client_name: selectedClient?.name,
          status: "active",
          priority: "medium",
        });
        projectId = newProject?.id;
      }

      // Build location string
      const locationStr = derivedLocation
        ? `${derivedLocation.city}, ${derivedLocation.region}, ${derivedLocation.country}`
        : locationInput;

      // Create the role
      await onCreateRole({
        title: roleTitle,
        location: locationStr,
        requirements: selectedSkills.join('\n'),
        salary_range: suggestedSalary,
        employment_type: employmentType,
        responsibilities: description,
        status: "active",
      }, null, projectId);

      toast.success(`Role "${roleTitle}" created successfully!`);
      onClose();
    } catch (error) {
      console.error("Error creating role:", error);
      toast.error(error.message || "Failed to create role");
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick location suggestions
  const quickLocations = [
    { label: "Remote", value: "remote" },
    { label: "Hybrid", value: "hybrid" },
    { label: "Amsterdam", value: "amsterdam" },
    { label: "London", value: "london" },
    { label: "New York", value: "new york" },
    { label: "Berlin", value: "berlin" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-red-400" />
            Quick Add Role
          </DialogTitle>
        </DialogHeader>

        {/* Mode Tabs */}
        <Tabs value={mode} onValueChange={setMode} className="mt-2">
          <TabsList className="grid grid-cols-3 bg-zinc-800/50">
            <TabsTrigger value="quick" className="data-[state=active]:bg-red-600">
              <Zap className="w-4 h-4 mr-2" />
              Quick
            </TabsTrigger>
            <TabsTrigger value="url" className="data-[state=active]:bg-red-600">
              <Link2 className="w-4 h-4 mr-2" />
              From URL
            </TabsTrigger>
            <TabsTrigger value="advanced" className="data-[state=active]:bg-red-600">
              <FileText className="w-4 h-4 mr-2" />
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* Quick Mode */}
          <TabsContent value="quick" className="space-y-6 mt-6">
            {/* Step 1: Role Title with Autocomplete */}
            <div className="space-y-3">
              <Label className="text-white/70 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">1</span>
                What role are you hiring for?
              </Label>
              <Popover open={titleOpen} onOpenChange={setTitleOpen}>
                <PopoverTrigger asChild>
                  <div className="relative">
                    <Input
                      value={roleTitle}
                      onChange={(e) => {
                        setRoleTitle(e.target.value);
                        setTitleOpen(true);
                      }}
                      onFocus={() => setTitleOpen(true)}
                      placeholder="Start typing or select..."
                      className="bg-zinc-800/50 border-zinc-700 text-white text-lg h-12"
                    />
                    {roleTitle && (
                      <button
                        onClick={() => setRoleTitle("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0 bg-slate-800 border-white/10" align="start">
                  <Command className="bg-transparent">
                    <CommandList>
                      <CommandEmpty>No matching titles</CommandEmpty>
                      <CommandGroup heading="Suggested Titles">
                        {filteredTitles.slice(0, 8).map((title) => (
                          <CommandItem
                            key={title}
                            onSelect={() => {
                              setRoleTitle(title);
                              setTitleOpen(false);
                            }}
                            className="text-white cursor-pointer"
                          >
                            <Briefcase className="w-4 h-4 mr-2 text-red-400" />
                            {title}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Quick select chips */}
              <div className="flex flex-wrap gap-2">
                {["Software Engineer", "Product Manager", "Data Scientist", "UX Designer"].map((title) => (
                  <button
                    key={title}
                    onClick={() => setRoleTitle(title)}
                    className={`px-3 py-1 rounded-full text-sm transition-all ${
                      roleTitle === title
                        ? "bg-red-600 text-white"
                        : "bg-zinc-800 text-white/60 hover:bg-zinc-700 hover:text-white"
                    }`}
                  >
                    {title}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Client Selection */}
            {roleTitle && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <Label className="text-white/70 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">2</span>
                  Which client is this for?
                </Label>
                <div className="flex flex-wrap gap-2">
                  {clients.slice(0, 6).map((client) => (
                    <button
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className={`px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                        selectedClient?.id === client.id
                          ? "bg-red-600 text-white"
                          : "bg-zinc-800 text-white/60 hover:bg-zinc-700 hover:text-white"
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      {client.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedClient({ id: "internal", name: "Internal Hiring" })}
                    className={`px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                      selectedClient?.id === "internal"
                        ? "bg-red-600 text-white"
                        : "bg-zinc-800 text-white/60 hover:bg-zinc-700 hover:text-white"
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Internal
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Project Selection */}
            {selectedClient && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <Label className="text-white/70 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">3</span>
                  Add to existing project or create new?
                </Label>
                <div className="flex flex-wrap gap-2">
                  {projects
                    .filter(p => !selectedClient?.id || selectedClient.id === "internal" || p.client_id === selectedClient.id)
                    .slice(0, 4)
                    .map((project) => (
                      <button
                        key={project.id}
                        onClick={() => {
                          setSelectedProject(project);
                          setCreateNewProject(false);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                          selectedProject?.id === project.id
                            ? "bg-red-600 text-white"
                            : "bg-zinc-800 text-white/60 hover:bg-zinc-700 hover:text-white"
                        }`}
                      >
                        <Briefcase className="w-4 h-4" />
                        {project.title || project.name}
                      </button>
                    ))}
                  <button
                    onClick={() => {
                      setCreateNewProject(true);
                      setSelectedProject(null);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                      createNewProject
                        ? "bg-red-600 text-white"
                        : "bg-zinc-800 text-white/60 hover:bg-zinc-700 hover:text-white"
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    New Project
                  </button>
                </div>

                {createNewProject && (
                  <Input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="New project name..."
                    className="bg-zinc-800/50 border-zinc-700 text-white"
                    autoFocus
                  />
                )}
              </motion.div>
            )}

            {/* Step 4: Location with Auto-Derivation */}
            {(selectedProject || createNewProject) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <Label className="text-white/70 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">4</span>
                  Where is this role located?
                </Label>

                {/* Quick location chips */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {quickLocations.map((loc) => (
                    <button
                      key={loc.value}
                      onClick={() => setLocationInput(loc.value)}
                      className={`px-3 py-1 rounded-full text-sm transition-all flex items-center gap-1 ${
                        locationInput.toLowerCase() === loc.value
                          ? "bg-red-600 text-white"
                          : "bg-zinc-800 text-white/60 hover:bg-zinc-700 hover:text-white"
                      }`}
                    >
                      {loc.value === "remote" || loc.value === "hybrid" ? (
                        <Globe className="w-3 h-3" />
                      ) : (
                        <MapPin className="w-3 h-3" />
                      )}
                      {loc.label}
                    </button>
                  ))}
                </div>

                <Input
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="Type a city name..."
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                />

                {/* Auto-derived location display */}
                {derivedLocation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
                  >
                    <div className="flex items-center gap-2 text-green-400 text-sm mb-2">
                      <Sparkles className="w-4 h-4" />
                      Auto-derived location
                    </div>
                    <div className="flex items-center gap-2 text-white">
                      <MapPin className="w-4 h-4 text-white/60" />
                      <span className="font-medium">{derivedLocation.city}</span>
                      <ChevronRight className="w-4 h-4 text-white/40" />
                      <span className="text-white/70">{derivedLocation.region}</span>
                      <ChevronRight className="w-4 h-4 text-white/40" />
                      <span className="text-white/70">{derivedLocation.country}</span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Step 5: Auto-suggested fields */}
            {derivedLocation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <Label className="text-white/70 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">5</span>
                  Confirm auto-filled details
                  <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                    <Wand2 className="w-3 h-3 mr-1" />
                    AI Suggested
                  </Badge>
                </Label>

                {/* Suggested Skills */}
                {suggestedSkills.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm text-white/60">Required Skills</span>
                    <div className="flex flex-wrap gap-2">
                      {suggestedSkills.map((skill) => (
                        <button
                          key={skill}
                          onClick={() => {
                            if (selectedSkills.includes(skill)) {
                              setSelectedSkills(selectedSkills.filter(s => s !== skill));
                            } else {
                              setSelectedSkills([...selectedSkills, skill]);
                            }
                          }}
                          className={`px-3 py-1 rounded-full text-sm transition-all flex items-center gap-1 ${
                            selectedSkills.includes(skill)
                              ? "bg-red-600 text-white"
                              : "bg-zinc-800 text-white/40 hover:text-white"
                          }`}
                        >
                          {selectedSkills.includes(skill) && <Check className="w-3 h-3" />}
                          {skill}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Salary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-sm text-white/60">Salary Range</span>
                    <Input
                      value={suggestedSalary}
                      onChange={(e) => setSuggestedSalary(e.target.value)}
                      placeholder="e.g., €70k - €120k"
                      className="bg-zinc-800/50 border-zinc-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-white/60">Employment Type</span>
                    <Select value={employmentType} onValueChange={setEmploymentType}>
                      <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-white/10">
                        <SelectItem value="full_time">Full Time</SelectItem>
                        <SelectItem value="part_time">Part Time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="freelance">Freelance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </motion.div>
            )}
          </TabsContent>

          {/* URL Mode */}
          <TabsContent value="url" className="space-y-6 mt-6">
            <div className="space-y-3">
              <Label className="text-white/70">Paste a job posting URL</Label>
              <div className="flex gap-2">
                <Input
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="https://linkedin.com/jobs/... or https://indeed.com/..."
                  className="bg-zinc-800/50 border-zinc-700 text-white flex-1"
                />
                <Button
                  onClick={parseJobUrl}
                  disabled={!jobUrl || isProcessing}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Parse
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-white/40">
                We'll extract the job title, location, and description automatically
              </p>
            </div>

            {parsedJob && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700"
              >
                <div className="flex items-center gap-2 text-green-400 text-sm mb-3">
                  <CheckCircle2 className="w-4 h-4" />
                  Parsed successfully from {parsedJob.source}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 text-sm w-20">Title:</span>
                    <span className="text-white">{parsedJob.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 text-sm w-20">Company:</span>
                    <span className="text-white">{parsedJob.company}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 text-sm w-20">Location:</span>
                    <span className="text-white">{parsedJob.location}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {parsedJob && (
              <div className="pt-4">
                <Button
                  onClick={() => setMode("quick")}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Continue to Complete Role
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Advanced Mode - Full Form */}
          <TabsContent value="advanced" className="space-y-4 mt-6">
            <p className="text-sm text-white/60">
              For detailed role configuration, use the full form with all available options.
            </p>
            <Button
              onClick={() => {
                onClose();
                // Trigger advanced modal (the original RoleModal)
              }}
              variant="outline"
              className="w-full border-zinc-700 text-white"
            >
              <FileText className="w-4 h-4 mr-2" />
              Open Advanced Form
            </Button>
          </TabsContent>
        </Tabs>

        {/* Submit Button */}
        {mode === "quick" && derivedLocation && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-4 border-t border-zinc-700 mt-4"
          >
            <Button
              onClick={handleSubmit}
              disabled={isProcessing || !roleTitle}
              className="w-full h-12 bg-red-600 hover:bg-red-700 text-lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Create {roleTitle || "Role"}
                </>
              )}
            </Button>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
};

import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const styles = {
    active: { bg: "bg-red-500/20", text: "text-red-400", label: "Active" },
    filled: { bg: "bg-red-500/20", text: "text-red-400", label: "Filled" },
    on_hold: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "On Hold" },
    cancelled: { bg: "bg-zinc-500/20", text: "text-zinc-400", label: "Cancelled" },
    draft: { bg: "bg-zinc-500/20", text: "text-zinc-400", label: "Draft" },
  };

  const style = styles[status] || styles.draft;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
};

// Priority Badge
const PriorityBadge = ({ priority }) => {
  const styles = {
    urgent: { bg: "bg-red-500/20", text: "text-red-400", label: "Urgent" },
    high: { bg: "bg-red-500/20", text: "text-red-400", label: "High" },
    medium: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Medium" },
    low: { bg: "bg-zinc-500/20", text: "text-zinc-400", label: "Low" },
  };

  const style = styles[priority] || styles.medium;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
};

// Progress Ring
const ProgressRing = ({ filled, total, size = 40, strokeWidth = 3 }) => {
  const progress = total > 0 ? Math.round((filled / total) * 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#ef4444"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute text-xs font-medium text-white">{filled}/{total}</span>
    </div>
  );
};

// Role Card Component
const RoleCard = ({ role, onEdit, onDelete }) => {
  // Map DB fields to display: notes contains department, location_requirements is location
  const displayStatus = role.status === 'open' ? 'active' : role.status;

  return (
    <motion.div
      variants={itemVariants}
      className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/30 hover:border-red-500/20 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-white">{role.title}</h4>
          {role.notes && <p className="text-sm text-white/60">{role.notes}</p>}
        </div>
        <StatusBadge status={displayStatus} />
      </div>

      <div className="flex items-center gap-4 text-sm text-white/50 mb-3">
        {role.location_requirements && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {role.location_requirements}
          </span>
        )}
        {role.salary_range && (
          <span className="flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5" />
            {role.salary_range}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-zinc-700/30">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-red-400" />
          <span className="text-sm text-white/70">
            {role.candidates_matched || 0} candidates matched
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(role)}
            className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(role)}
            className="p-1.5 rounded hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Project Card Component
const ProjectCard = ({ project, roles, onEdit, onDelete, onViewRoles, onAddRole }) => {
  const [showMenu, setShowMenu] = useState(false);
  const projectRoles = roles.filter(r => r.project_id === project.id);
  const filledRoles = projectRoles.filter(r => r.status === "filled").length;

  return (
    <motion.div variants={itemVariants}>
      <GlassCard className="p-6 hover:border-red-500/30 transition-all duration-300">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={project.status} />
              <PriorityBadge priority={project.priority} />
            </div>
            <h3 className="text-lg font-semibold text-white">{project.title || project.name}</h3>
            <p className="text-sm text-white/60 line-clamp-2 mt-1">{project.description}</p>
          </div>
          
          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            
            <AnimatePresence>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-20 overflow-hidden"
                  >
                    <button
                      onClick={() => {
                        onEdit(project);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-white/70 hover:bg-white/10 flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Project
                    </button>
                    <button
                      onClick={() => {
                        onAddRole(project);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-white/70 hover:bg-white/10 flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add Role
                    </button>
                    <button
                      onClick={() => {
                        onDelete(project);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Client & Timeline */}
        <div className="flex items-center gap-4 text-sm text-white/50 mb-4">
          {project.client_name && (
            <span className="flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              {project.client_name}
            </span>
          )}
          {project.deadline && (
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(project.deadline).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg mb-4">
          <div className="flex items-center gap-3">
            <ProgressRing filled={filledRoles} total={projectRoles.length} />
            <div>
              <p className="text-sm font-medium text-white">Roles Progress</p>
              <p className="text-xs text-white/50">{filledRoles} of {projectRoles.length} filled</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewRoles(project)}
            className="text-red-400 hover:text-red-300"
          >
            View Roles
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Roles Preview */}
        {projectRoles.length > 0 && (
          <div className="space-y-2">
            {projectRoles.slice(0, 3).map((role) => (
              <div
                key={role.id}
                className="flex items-center justify-between p-2 bg-zinc-800/30 rounded"
              >
                <span className="text-sm text-white/80">{role.title}</span>
                <StatusBadge status={role.status} />
              </div>
            ))}
            {projectRoles.length > 3 && (
              <p className="text-xs text-white/40 text-center pt-1">
                +{projectRoles.length - 3} more roles
              </p>
            )}
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
};

// Project Modal Component
const ProjectModal = ({ isOpen, onClose, project, onSave, clients = [] }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    client_id: "",
    client_name: "",
    status: "active",
    priority: "medium",
    deadline: "",
    budget: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.title || project.name || "", // Database uses 'title', form uses 'name'
        description: project.description || "",
        client_id: project.client_id || "",
        client_name: project.client_company || project.client_name || "",
        status: project.status || "active",
        priority: project.priority || "medium",
        deadline: project.deadline ? project.deadline.split("T")[0] : "",
        budget: project.budget || "",
        notes: project.notes || "",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        client_id: "",
        client_name: "",
        status: "active",
        priority: "medium",
        deadline: "",
        budget: "",
        notes: "",
      });
    }
  }, [project, isOpen]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Project name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData, project?.id);
      onClose();
    } catch (error) {
      console.error("Error saving project:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">
            {project ? "Edit Project" : "New Project"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-white/70">Project Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Q1 Engineering Hiring"
              className="bg-zinc-800/50 border-zinc-700 text-white mt-1"
            />
          </div>

          <div>
            <Label className="text-white/70">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Project description..."
              className="bg-zinc-800/50 border-zinc-700 text-white mt-1"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white/70">Client</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => {
                  const selectedClient = clients.find(c => c.id === value);
                  setFormData({
                    ...formData,
                    client_id: value,
                    client_name: selectedClient?.name || "",
                  });
                }}
              >
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white mt-1">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10">
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <Building2 className="w-3 h-3" />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/70">Budget</Label>
              <Input
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="e.g., $50,000"
                className="bg-zinc-800/50 border-zinc-700 text-white mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white/70">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10">
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="filled">Filled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/70">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-white/70">Deadline</Label>
            <Input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="bg-zinc-800/50 border-zinc-700 text-white mt-1"
            />
          </div>

          <div>
            <Label className="text-white/70">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              className="bg-zinc-800/50 border-zinc-700 text-white mt-1"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-white/70">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              project ? "Save Changes" : "Create Project"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Role Modal Component
const RoleModal = ({ isOpen, onClose, role, projectId, onSave }) => {
  const [formData, setFormData] = useState({
    title: "",
    department: "",
    location: "",
    employment_type: "full_time",
    salary_range: "",
    requirements: "",
    responsibilities: "",
    status: "active",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (role) {
      // Map DB fields back to form fields
      // DB: notes -> department, location_requirements -> location,
      // required_skills (array) -> requirements (string), description -> responsibilities
      setFormData({
        title: role.title || "",
        department: role.notes || "", // department stored in notes
        location: role.location_requirements || "", // location_requirements -> location
        employment_type: role.employment_type || "full_time",
        salary_range: role.salary_range || "",
        requirements: Array.isArray(role.required_skills) ? role.required_skills.join('\n') : "", // array -> string
        responsibilities: role.description || "", // description -> responsibilities
        status: role.status === 'open' ? 'active' : (role.status || "active"),
      });
    } else {
      setFormData({
        title: "",
        department: "",
        location: "",
        employment_type: "full_time",
        salary_range: "",
        requirements: "",
        responsibilities: "",
        status: "active",
      });
    }
  }, [role, isOpen]);

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error("Role title is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData, role?.id, projectId);
      onClose();
    } catch (error) {
      console.error("Error saving role:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            {role ? "Edit Role" : "New Role"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-white/70">Role Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Senior Software Engineer"
              className="bg-zinc-800/50 border-zinc-700 text-white mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white/70">Department</Label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g., Engineering"
                className="bg-zinc-800/50 border-zinc-700 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-white/70">Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Remote, NYC"
                className="bg-zinc-800/50 border-zinc-700 text-white mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white/70">Employment Type</Label>
              <Select
                value={formData.employment_type}
                onValueChange={(value) => setFormData({ ...formData, employment_type: value })}
              >
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10">
                  <SelectItem value="full_time">Full Time</SelectItem>
                  <SelectItem value="part_time">Part Time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/70">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10">
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="filled">Filled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-white/70">Salary Range</Label>
            <Input
              value={formData.salary_range}
              onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
              placeholder="e.g., $120k - $150k"
              className="bg-zinc-800/50 border-zinc-700 text-white mt-1"
            />
          </div>

          <div>
            <Label className="text-white/70">Requirements</Label>
            <Textarea
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              placeholder="List key requirements..."
              className="bg-zinc-800/50 border-zinc-700 text-white mt-1"
              rows={3}
            />
          </div>

          <div>
            <Label className="text-white/70">Responsibilities</Label>
            <Textarea
              value={formData.responsibilities}
              onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
              placeholder="List key responsibilities..."
              className="bg-zinc-800/50 border-zinc-700 text-white mt-1"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-white/70">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              role ? "Save Changes" : "Create Role"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Roles Panel Component
const RolesPanel = ({ project, roles, onClose, onEditRole, onDeleteRole, onAddRole }) => {
  const projectRoles = roles.filter(r => r.project_id === project?.id);

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          className="fixed right-0 top-0 h-full w-[450px] bg-slate-900 border-l border-white/10 shadow-2xl z-50 overflow-y-auto"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white">{project.title || project.name}</h2>
                <p className="text-sm text-white/60">Roles & Positions</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <Button
              onClick={() => onAddRole(project)}
              className="w-full mb-6 bg-red-600 hover:bg-red-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Role
            </Button>

            <div className="space-y-3">
              {projectRoles.length === 0 ? (
                <div className="text-center py-8 text-white/40">
                  <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No roles yet</p>
                  <p className="text-sm mt-1">Add roles to this project</p>
                </div>
              ) : (
                projectRoles.map((role) => (
                  <RoleCard
                    key={role.id}
                    role={role}
                    onEdit={onEditRole}
                    onDelete={onDeleteRole}
                  />
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function TalentProjects() {
  const { user } = useUser();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [roles, setRoles] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal states
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [quickAddModalOpen, setQuickAddModalOpen] = useState(false); // NEW: Smart Quick Add
  const [editingProject, setEditingProject] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [selectedProjectForRole, setSelectedProjectForRole] = useState(null);
  const [viewingRolesProject, setViewingRolesProject] = useState(null);

  // Delete states
  const [deleteProjectDialog, setDeleteProjectDialog] = useState(null);
  const [deleteRoleDialog, setDeleteRoleDialog] = useState(null);

  // Filter states (enhanced)
  const [clientFilter, setClientFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");

  useEffect(() => {
    if (user?.organization_id) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projectsRes, rolesRes, clientsRes] = await Promise.all([
        supabase
          .from("projects")
          .select("*")
          .eq("organization_id", user.organization_id)
          .order("created_date", { ascending: false }),
        supabase
          .from("roles")
          .select("*")
          .eq("organization_id", user.organization_id)
          .order("created_date", { ascending: false }),
        // Load clients (prospects with is_recruitment_client=true OR contact_type in client types)
        supabase
          .from("prospects")
          .select("id, first_name, last_name, company, email, phone, is_recruitment_client, contact_type")
          .or("is_recruitment_client.eq.true,contact_type.eq.client,contact_type.eq.recruitment_client")
          .eq("organization_id", user.organization_id)
          .order("created_date", { ascending: false }),
      ]);

      console.log("Fetch results:", {
        projects: projectsRes.error ? projectsRes.error : `${projectsRes.data?.length || 0} projects`,
        roles: rolesRes.error ? rolesRes.error : `${rolesRes.data?.length || 0} roles`,
        clients: clientsRes.error ? clientsRes.error : `${clientsRes.data?.length || 0} clients`
      });

      if (projectsRes.error) throw projectsRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (clientsRes.error) {
        console.error("Error loading clients:", JSON.stringify(clientsRes.error, null, 2));
        // Don't throw - just log and continue with empty clients
      }

      setProjects(projectsRes.data || []);
      setRoles(rolesRes.data || []);

      // Format clients for dropdown - use company name or full name
      const formattedClients = (clientsRes.data || []).map(c => ({
        id: c.id,
        name: c.company || `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.email || "Unknown",
      }));
      console.log("Formatted clients:", formattedClients);
      setClients(formattedClients);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        !searchQuery ||
        (project.title || project.name)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.client_company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      const matchesClient = clientFilter === "all" || project.client_id === clientFilter;
      return matchesSearch && matchesStatus && matchesClient;
    });
  }, [projects, searchQuery, statusFilter, clientFilter]);

  // Project CRUD
  const handleSaveProject = async (formData, projectId) => {
    try {
      // Map form field 'name' to database column 'title'
      const projectData = {
        title: formData.name, // Database uses 'title' not 'name'
        description: formData.description || null,
        client_id: formData.client_id || null,
        client_company: formData.client_name || null,
        status: formData.status || 'active',
        priority: formData.priority || 'medium',
        deadline: formData.deadline || null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        fee_percentage: formData.fee_percentage ? parseFloat(formData.fee_percentage) : null,
        notes: formData.notes || null,
        organization_id: user.organization_id,
      };

      console.log('Saving project with data:', JSON.stringify(projectData, null, 2));

      if (projectId) {
        const { data, error } = await supabase
          .from("projects")
          .update(projectData)
          .eq("id", projectId)
          .select();

        console.log('Update result:', JSON.stringify({ data, error }, null, 2));
        if (error) throw error;
        toast.success(`Project "${formData.name}" updated`);
        fetchData();
        return data?.[0];
      } else {
        const { data, error } = await supabase
          .from("projects")
          .insert([projectData])
          .select();

        console.log('Insert result:', JSON.stringify({ data, error }, null, 2));
        if (error) throw error;
        toast.success(`Project "${formData.name}" created`);
        fetchData();
        return data?.[0]; // Return created project for quick add modal
      }
    } catch (error) {
      console.error("Error saving project:", JSON.stringify(error, null, 2));
      console.error("Error message:", error?.message);
      console.error("Error code:", error?.code);
      toast.error(error?.message || "Failed to save project");
      throw error;
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteProjectDialog) return;

    try {
      // Delete associated roles first
      await supabase
        .from("roles")
        .delete()
        .eq("project_id", deleteProjectDialog.id);

      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", deleteProjectDialog.id);

      if (error) throw error;
      toast.success(`Project "${deleteProjectDialog.name}" deleted`);
      setDeleteProjectDialog(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error(error.message || "Failed to delete project");
    }
  };

  // Role CRUD
  const handleSaveRole = async (formData, roleId, projectId) => {
    try {
      // Map form fields to database columns
      // DB schema: title, description, required_skills (ARRAY), preferred_skills (ARRAY),
      // location_requirements, salary_range, employment_type, seniority_level, remote_policy,
      // status, project_id, organization_id, notes
      const roleData = {
        title: formData.title,
        description: formData.responsibilities || null, // Map responsibilities to description
        required_skills: formData.requirements ? formData.requirements.split('\n').filter(s => s.trim()) : [], // Convert to array
        location_requirements: formData.location || null, // Map location to location_requirements
        salary_range: formData.salary_range || null,
        employment_type: formData.employment_type || 'full_time',
        status: formData.status === 'active' ? 'open' : formData.status, // DB uses 'open' not 'active'
        notes: formData.department || null, // Store department in notes field for now
        organization_id: user.organization_id,
        project_id: projectId || selectedProjectForRole?.id,
      };

      console.log('Saving role with data:', JSON.stringify(roleData, null, 2));

      if (roleId) {
        const { data, error } = await supabase
          .from("roles")
          .update(roleData)
          .eq("id", roleId)
          .select();
        console.log('Role update result:', JSON.stringify({ data, error }, null, 2));
        if (error) throw error;
        toast.success("Role updated successfully");
      } else {
        const { data, error } = await supabase
          .from("roles")
          .insert([roleData])
          .select();
        console.log('Role insert result:', JSON.stringify({ data, error }, null, 2));
        if (error) throw error;
        toast.success("Role created successfully");
      }
      fetchData();
    } catch (error) {
      console.error("Error saving role:", error);
      toast.error(error.message || "Failed to save role");
      throw error;
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteRoleDialog) return;

    try {
      const { error } = await supabase
        .from("roles")
        .delete()
        .eq("id", deleteRoleDialog.id);

      if (error) throw error;
      toast.success("Role deleted successfully");
      setDeleteRoleDialog(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting role:", error);
      toast.error("Failed to delete role");
    }
  };

  // Stats
  const stats = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === "active").length;
    const totalRoles = roles.length;
    const filledRoles = roles.filter(r => r.status === "filled").length;
    const activeRoles = roles.filter(r => r.status === "active").length;

    return { activeProjects, totalRoles, filledRoles, activeRoles };
  }, [projects, roles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black relative">
        <div className="relative z-10 w-full px-6 lg:px-8 py-6">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
        <PageHeader
          title="Recruitment Projects"
          subtitle="Manage hiring projects and open roles"
          color="red"
          actions={
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setQuickAddModalOpen(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Zap className="w-4 h-4 mr-2" />
                Quick Add Role
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingProject(null);
                  setProjectModalOpen(true);
                }}
                className="border-zinc-700 text-white hover:bg-zinc-800"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </div>
          }
        />

        {/* Stats */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
        >
          <motion.div variants={itemVariants}>
            <StatCard
              title="Active Projects"
              value={stats.activeProjects}
              icon={Briefcase}
              color="red"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              title="Total Roles"
              value={stats.totalRoles}
              icon={Target}
              color="red"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              title="Active Roles"
              value={stats.activeRoles}
              icon={Users}
              color="red"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              title="Filled Roles"
              value={stats.filledRoles}
              icon={CheckCircle2}
              color="red"
            />
          </motion.div>
        </motion.div>

        {/* Enhanced Filters */}
        <div className="space-y-3">
          {/* Quick Filter Chips - Click to filter by client */}
          {clients.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-white/50">Quick filter:</span>
              <button
                onClick={() => setClientFilter("all")}
                className={`px-3 py-1 rounded-full text-xs transition-all ${
                  clientFilter === "all"
                    ? "bg-red-600 text-white"
                    : "bg-zinc-800 text-white/60 hover:bg-zinc-700"
                }`}
              >
                All Clients
              </button>
              {clients.slice(0, 5).map((client) => (
                <button
                  key={client.id}
                  onClick={() => setClientFilter(client.id)}
                  className={`px-3 py-1 rounded-full text-xs transition-all flex items-center gap-1 ${
                    clientFilter === client.id
                      ? "bg-red-600 text-white"
                      : "bg-zinc-800 text-white/60 hover:bg-zinc-700"
                  }`}
                >
                  <Building2 className="w-3 h-3" />
                  {client.name}
                </button>
              ))}
            </div>
          )}

          {/* Main Filters Row */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects, clients, roles..."
                className="pl-10 bg-zinc-800/50 border-zinc-700 text-white"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-zinc-800/50 border-zinc-700 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-white/10">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="filled">Filled</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              onClick={fetchData}
              className="text-white/60 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Projects Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {filteredProjects.length === 0 ? (
            <div className="col-span-2 text-center py-16">
              <Briefcase className="w-16 h-16 mx-auto mb-4 text-white/20" />
              <h3 className="text-xl font-medium text-white/60 mb-2">No projects found</h3>
              <p className="text-white/40 mb-6">
                {searchQuery || statusFilter !== "all" || clientFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by adding your first role"}
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button
                  onClick={() => setQuickAddModalOpen(true)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Quick Add Role
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingProject(null);
                    setProjectModalOpen(true);
                  }}
                  className="border-zinc-700 text-white hover:bg-zinc-800"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </div>
            </div>
          ) : (
            filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                roles={roles}
                onEdit={(p) => {
                  setEditingProject(p);
                  setProjectModalOpen(true);
                }}
                onDelete={(p) => setDeleteProjectDialog(p)}
                onViewRoles={(p) => setViewingRolesProject(p)}
                onAddRole={(p) => {
                  setSelectedProjectForRole(p);
                  setEditingRole(null);
                  setRoleModalOpen(true);
                }}
              />
            ))
          )}
        </motion.div>

        {/* Roles Panel */}
        <RolesPanel
          project={viewingRolesProject}
          roles={roles}
          onClose={() => setViewingRolesProject(null)}
          onEditRole={(role) => {
            setEditingRole(role);
            setSelectedProjectForRole({ id: role.project_id });
            setRoleModalOpen(true);
          }}
          onDeleteRole={(role) => setDeleteRoleDialog(role)}
          onAddRole={(project) => {
            setSelectedProjectForRole(project);
            setEditingRole(null);
            setRoleModalOpen(true);
          }}
        />

        {/* Project Modal */}
        <ProjectModal
          isOpen={projectModalOpen}
          onClose={() => {
            setProjectModalOpen(false);
            setEditingProject(null);
          }}
          project={editingProject}
          onSave={handleSaveProject}
          clients={clients}
        />

        {/* Role Modal */}
        <RoleModal
          isOpen={roleModalOpen}
          onClose={() => {
            setRoleModalOpen(false);
            setEditingRole(null);
            setSelectedProjectForRole(null);
          }}
          role={editingRole}
          projectId={selectedProjectForRole?.id}
          onSave={handleSaveRole}
        />

        {/* Smart Quick Add Modal */}
        <SmartQuickAddModal
          isOpen={quickAddModalOpen}
          onClose={() => setQuickAddModalOpen(false)}
          clients={clients}
          projects={projects}
          onCreateRole={handleSaveRole}
          onCreateProject={handleSaveProject}
        />

        {/* Delete Project Dialog */}
        <AlertDialog open={!!deleteProjectDialog} onOpenChange={() => setDeleteProjectDialog(null)}>
          <AlertDialogContent className="bg-slate-900 border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Project?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/60">
                This will permanently delete "{deleteProjectDialog?.name}" and all associated roles.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteProject}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Role Dialog */}
        <AlertDialog open={!!deleteRoleDialog} onOpenChange={() => setDeleteRoleDialog(null)}>
          <AlertDialogContent className="bg-slate-900 border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Role?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/60">
                This will permanently delete the "{deleteRoleDialog?.title}" role.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteRole}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
