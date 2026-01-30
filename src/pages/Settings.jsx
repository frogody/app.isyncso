import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import anime from '@/lib/anime-wrapper';
const animate = anime;
import { prefersReducedMotion } from '@/lib/animations';
import { db } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Settings as SettingsIcon, User, Bell, Palette, Building2,
  Lock, Save, RefreshCw, Download, Trash2, Upload, Camera,
  FileText, Plus, X, Mail, Users, Book, Wrench, Brain, Sparkles,
  CheckCircle, Globe, Linkedin, Clock, Target, Shield, Loader2,
  ChevronRight, Award, Zap, LogOut, MapPin, Calendar, Cpu,
  Euro, Phone, Twitter, Facebook, TrendingUp, BarChart3, Plug,
  UserCog, ExternalLink
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useUser } from "@/components/context/UserContext";
import { usePermissions } from "@/components/context/PermissionContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "sonner";
import PortalBranding from "@/components/settings/PortalBranding";
import AppsManagerModal from "@/components/layout/AppsManagerModal";
import TeamManagement from "@/pages/TeamManagement";
import Integrations from "@/pages/Integrations";
import { Link } from "react-router-dom";
import { LayoutGrid } from "lucide-react";

export default function Settings() {
  const { user, company, settings: userSettings, updateUser, updateSettings, isLoading: userLoading } = useUser();
  const { isAdmin } = usePermissions();
  const [saving, setSaving] = useState(false);
  const [refreshingCompany, setRefreshingCompany] = useState(false);
  const [settings, setSettings] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");

  const [profileForm, setProfileForm] = useState({
    full_name: "",
    avatar_url: "",
    linkedin_url: "",
    job_title: "",
    phone: "",
    industry: "",
    personal_tech_stack: [],
    personal_knowledge_files: []
  });

  const [learningPrefs, setLearningPrefs] = useState({
    preferred_difficulty: "",
    time_commitment: "",
    interests: []
  });

  const [companyData, setCompanyData] = useState({
    name: "",
    domain: "",
    description: "",
    industry: "",
    logo_url: "",
    tech_stack: [],
    knowledge_files: [],
    size_range: "",
    revenue_range: "",
    linkedin_url: "",
    // Enrichment fields
    headquarters: "",
    founded_year: "",
    employee_count: null,
    enriched_at: null,
    enrichment_source: null,
    // Additional enrichment fields
    website_url: "",
    twitter_url: "",
    facebook_url: "",
    hq_city: "",
    hq_state: "",
    hq_country: "",
    phone: "",
    email: "",
    naics_description: "",
    sic_description: "",
    // Funding data
    total_funding: null,
    funding_stage: "",
    funding_data: null,
    data_completeness: 0,
    tech_stack_count: 0
  });

  const [invitations, setInvitations] = useState([]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("learner");
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [techInput, setTechInput] = useState("");
  const [companyTechInput, setCompanyTechInput] = useState("");
  
  const fileInputRef = useRef(null);
  const companyFileInputRef = useRef(null);

  // Refs for anime.js animations
  const headerRef = useRef(null);
  const contentRef = useRef(null);
  const companyLogoInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      // Initialize settings with defaults if not present
      const defaultSettings = {
        theme: 'dark',
        sound_effects: false,
        achievement_toasts: true,
        notification_email: true,
        notification_push: false,
        notification_frequency: 'daily',
        notify_courses: true,
        notify_streaks: true,
        notify_badges: true,
        notify_compliance: true,
        ...userSettings
      };
      setSettings(defaultSettings);
      
      setProfileForm({
        full_name: user.full_name || "",
        avatar_url: user.avatar_url || "",
        linkedin_url: user.linkedin_url || "",
        job_title: user.job_title || "",
        phone: user.phone || "",
        industry: user.industry || "",
        personal_tech_stack: Array.isArray(user.personal_tech_stack) ? user.personal_tech_stack : [],
        personal_knowledge_files: Array.isArray(user.personal_knowledge_files) ? user.personal_knowledge_files : []
      });

      setLearningPrefs({
        preferred_difficulty: user.preferred_difficulty || "beginner",
        time_commitment: user.time_commitment || "30",
        interests: user.interests || []
      });

      if (company) {
        setCompanyData({
          name: company.name || "",
          domain: company.domain || "",
          description: company.description || "",
          industry: company.industry || "",
          logo_url: company.logo_url || "",
          tech_stack: Array.isArray(company.tech_stack) ? company.tech_stack : [],
          knowledge_files: Array.isArray(company.knowledge_files) ? company.knowledge_files : [],
          size_range: company.size_range || "",
          revenue_range: company.revenue_range || "",
          linkedin_url: company.linkedin_url || "",
          // Enrichment fields
          headquarters: company.headquarters || "",
          founded_year: company.founded_year || "",
          employee_count: company.employee_count || null,
          enriched_at: company.enriched_at || null,
          enrichment_source: company.enrichment_source || null,
          // Additional enrichment fields
          website_url: company.website_url || "",
          twitter_url: company.twitter_url || "",
          facebook_url: company.facebook_url || "",
          hq_city: company.hq_city || "",
          hq_state: company.hq_state || "",
          hq_country: company.hq_country || "",
          phone: company.phone || "",
          email: company.email || "",
          naics_description: company.naics_description || "",
          sic_description: company.sic_description || "",
          // Funding data
          total_funding: company.total_funding || null,
          funding_stage: company.funding_stage || "",
          funding_data: company.funding_data || null,
          data_completeness: company.data_completeness || 0,
          tech_stack_count: company.tech_stack_count || (Array.isArray(company.tech_stack) ? company.tech_stack.length : 0)
        });

        if (user.company_id) {
          db.entities.Invitation.filter({ company_id: user.company_id })
            .then(invites => setInvitations(invites || []))
            .catch(e => console.error("Error loading invitations:", e));
        }
      }
    }
  }, [user, userSettings, company]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      setProfileForm(prev => ({ ...prev, avatar_url: file_url }));
      await db.auth.updateMe({ avatar_url: file_url });
      toast.success('Avatar updated!');
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      toast.error('Failed to upload avatar');
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await updateUser(profileForm);
      toast.success('Profile saved successfully!');
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const saveLearningPrefs = async () => {
    setSaving(true);
    try {
      await updateUser(learningPrefs);
      toast.success('Learning preferences saved!');
    } catch (error) {
      console.error("Failed to save learning preferences:", error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = async () => {
    setSaving(true);
    try {
      await updateSettings(safeSettings);
      toast.success('Notification settings saved!');
    } catch (error) {
      console.error("Failed to save notifications:", error);
      toast.error('Failed to save notifications');
    } finally {
      setSaving(false);
    }
  };

  const saveAppearance = async () => {
    setSaving(true);
    try {
      await updateSettings({ 
        theme: safeSettings.theme, 
        sound_effects: safeSettings.sound_effects,
        achievement_toasts: safeSettings.achievement_toasts
      });
      toast.success('Appearance settings saved!');
    } catch (error) {
      console.error("Failed to save appearance:", error);
      toast.error('Failed to save appearance');
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshCompany = async () => {
    if (!company?.id) return;
    setRefreshingCompany(true);
    try {
      await db.functions.invoke('refreshCompanyEnrichment', { company_id: company.id });
      toast.success('Company data refreshed!');
      window.location.reload();
    } catch (error) {
      console.error('Failed to refresh company:', error);
      toast.error('Failed to refresh company data');
    } finally {
      setRefreshingCompany(false);
    }
  };

  const saveCompany = async () => {
    setSaving(true);
    try {
      if (company?.id) {
        await db.entities.Company.update(company.id, companyData);
        toast.success('Company profile updated!');
        window.location.reload();
      } else {
        const newCompany = await db.entities.Company.create(companyData);
        await db.auth.updateMe({ company_id: newCompany.id });
        toast.success('Company profile created!');
        window.location.reload();
      }
    } catch (error) {
      console.error("Error saving company:", error);
      toast.error('Failed to save company data');
    } finally {
      setSaving(false);
    }
  };

  const addTech = async () => {
    const val = techInput.trim();
    if (!val || profileForm.personal_tech_stack.includes(val)) return;
    const newStack = [...profileForm.personal_tech_stack, val];
    setProfileForm(prev => ({ ...prev, personal_tech_stack: newStack }));
    setTechInput("");
    try {
      await db.auth.updateMe({ personal_tech_stack: newStack });
      toast.success('Tech added!');
    } catch (error) {
      console.error('Failed to save tech stack:', error);
      toast.error('Failed to save');
    }
  };

  const removeTech = async (idx) => {
    const newStack = profileForm.personal_tech_stack.filter((_, i) => i !== idx);
    setProfileForm(prev => ({ ...prev, personal_tech_stack: newStack }));
    try {
      await db.auth.updateMe({ personal_tech_stack: newStack });
    } catch (error) {
      console.error('Failed to update tech stack:', error);
      toast.error('Failed to save');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      const newFile = { name: file.name, url: file_url, type: file.type, size: file.size, uploaded_at: new Date().toISOString() };
      const newFiles = [...profileForm.personal_knowledge_files, newFile];
      setProfileForm(prev => ({ ...prev, personal_knowledge_files: newFiles }));
      await db.auth.updateMe({ personal_knowledge_files: newFiles });
      toast.success('File uploaded!');
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error('Failed to upload file');
    }
  };

  const removeFile = async (idx) => {
    const newFiles = profileForm.personal_knowledge_files.filter((_, i) => i !== idx);
    setProfileForm(prev => ({ ...prev, personal_knowledge_files: newFiles }));
    try {
      await db.auth.updateMe({ personal_knowledge_files: newFiles });
    } catch (error) {
      console.error('Failed to remove file:', error);
      toast.error('Failed to save');
    }
  };

  const addCompanyTech = async () => {
    const val = companyTechInput.trim();
    if (!val || companyData.tech_stack.includes(val)) return;
    const newStack = [...companyData.tech_stack, val];
    setCompanyData(prev => ({ ...prev, tech_stack: newStack }));
    setCompanyTechInput("");
    if (company?.id) {
      try {
        await db.entities.Company.update(company.id, { tech_stack: newStack });
        toast.success('Tech added!');
      } catch (error) {
        console.error('Failed to save company tech stack:', error);
        toast.error('Failed to save');
      }
    }
  };

  const removeCompanyTech = async (idx) => {
    const newStack = companyData.tech_stack.filter((_, i) => i !== idx);
    setCompanyData(prev => ({ ...prev, tech_stack: newStack }));
    if (company?.id) {
      try {
        await db.entities.Company.update(company.id, { tech_stack: newStack });
      } catch (error) {
        console.error('Failed to update company tech stack:', error);
        toast.error('Failed to save');
      }
    }
  };

  const handleCompanyFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      const newFile = { name: file.name, url: file_url, type: file.type, size: file.size, uploaded_at: new Date().toISOString() };
      const newFiles = [...companyData.knowledge_files, newFile];
      setCompanyData(prev => ({ ...prev, knowledge_files: newFiles }));
      if (company?.id) {
        await db.entities.Company.update(company.id, { knowledge_files: newFiles });
      }
      toast.success('File uploaded!');
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error('Failed to upload file');
    }
  };

  const removeCompanyFile = async (idx) => {
    const newFiles = companyData.knowledge_files.filter((_, i) => i !== idx);
    setCompanyData(prev => ({ ...prev, knowledge_files: newFiles }));
    if (company?.id) {
      try {
        await db.entities.Company.update(company.id, { knowledge_files: newFiles });
      } catch (error) {
        console.error('Failed to remove company file:', error);
        toast.error('Failed to save');
      }
    }
  };

  const handleCompanyLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      setCompanyData(prev => ({ ...prev, logo_url: file_url }));
      if (company?.id) {
        await db.entities.Company.update(company.id, { logo_url: file_url });
      }
      toast.success('Logo uploaded!');
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error('Failed to upload logo');
    }
  };

  const sendInvite = async () => {
    if (!inviteEmail || !user?.company_id) return;
    try {
      const newInvite = await db.entities.Invitation.create({
        company_id: user.company_id,
        email: inviteEmail,
        role: inviteRole,
        status: 'pending'
      });
      setInvitations([...invitations, newInvite]);
      setInviteEmail("");
      setIsInviteOpen(false);
      toast.success('Invitation sent!');
    } catch (error) {
      console.error("Failed to send invite:", error);
      toast.error('Failed to send invitation');
    }
  };

  const generateInviteLink = async () => {
    if (!user?.company_id) {
      toast.error('Set up your company profile first');
      return;
    }
    try {
      const newInvite = await db.entities.Invitation.create({
        company_id: user.company_id,
        email: "link-invite@placeholder.com",
        role: "learner",
        status: 'pending'
      });
      const link = `${window.location.origin}${createPageUrl("CompanyInvite")}?token=${newInvite.id}`;
      setInviteLink(link);
      setShowLinkModal(true);
      setInvitations([...invitations, newInvite]);
    } catch (error) {
      console.error("Failed to generate invite link:", error);
      toast.error('Failed to generate invite link');
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success('Link copied to clipboard!');
  };

  const revokeInvite = async (id) => {
    try {
      await db.entities.Invitation.delete(id);
      setInvitations(invitations.filter(i => i.id !== id));
      toast.success('Invitation revoked');
    } catch (error) {
      console.error("Failed to revoke invite:", error);
    }
  };

  const handleExportData = async () => {
    try {
      const data = { user, settings, company };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-${user.email}-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported!');
    } catch (error) {
      console.error('Failed to export data:', error);
      toast.error('Failed to export data');
    }
  };

  const handleDeleteAccount = async () => {
    const firstConfirm = confirm(
      '⚠️ WARNING: This will permanently delete your account and ALL data.\n\nThis action CANNOT be undone. Continue?'
    );
    if (!firstConfirm) return;
    
    const confirmation = prompt('Type DELETE in capital letters to confirm:');
    if (confirmation !== 'DELETE') {
      toast.error('Account deletion cancelled');
      return;
    }

    try {
      const { deleteUserAccount } = await import('@/api/functions');
      const response = await deleteUserAccount({ confirmation: 'DELETE' });
      
      if (response.data?.success) {
        toast.success('Account deleted');
        await db.auth.logout(window.location.origin);
      } else {
        throw new Error(response.data?.error || 'Deletion failed');
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error('Failed to delete account');
    }
  };

  // Ensure settings is initialized with defaults (before early return)
  const safeSettings = settings || {
    theme: 'dark',
    sound_effects: false,
    achievement_toasts: true,
    notification_email: true,
    notification_push: false,
    notification_frequency: 'daily',
    notify_courses: true,
    notify_streaks: true,
    notify_badges: true,
    notify_compliance: true
  };

  // IMPORTANT: All useEffect hooks MUST be called before any early returns
  // to comply with React's Rules of Hooks (consistent hook call order)
  
  // Animate header on mount
  useEffect(() => {
    if (!headerRef.current || prefersReducedMotion()) return;

    animate({
      targets: headerRef.current,
      translateY: [-20, 0],
      opacity: [0, 1],
      duration: 500,
      easing: 'easeOutQuart',
    });
  }, []);

  // Animate content area when tab changes
  useEffect(() => {
    if (!contentRef.current || prefersReducedMotion()) return;

    animate({
      targets: contentRef.current,
      translateY: [15, 0],
      opacity: [0, 1],
      duration: 400,
      easing: 'easeOutQuad',
    });
  }, [activeTab]);

  if (userLoading || !user) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full bg-zinc-800 rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Skeleton className="h-96 bg-zinc-800 rounded-2xl" />
            <Skeleton className="h-96 bg-zinc-800 rounded-2xl lg:col-span-3" />
          </div>
        </div>
      </div>
    );
  }

  const tabConfig = [
    { id: 'profile', label: 'Profile', icon: User, color: 'cyan' },
    { id: 'learning', label: 'Learning', icon: Book, color: 'cyan' },
    { id: 'notifications', label: 'Notifications', icon: Bell, color: 'purple' },
    { id: 'appearance', label: 'Appearance', icon: Palette, color: 'pink' },
    { id: 'company', label: 'Company', icon: Building2, color: 'orange' },
    { id: 'portal', label: 'Client Portal', icon: ExternalLink, color: 'green' },
    { id: 'teams', label: 'Teams & Rights', icon: Shield, color: 'cyan' },
    { id: 'integrations', label: 'Integrations', icon: Plug, color: 'cyan' },
    { id: 'workspace', label: 'Workspace', icon: LayoutGrid, color: 'cyan' },
    { id: 'privacy', label: 'Privacy', icon: Lock, color: 'red' },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: Brain, color: 'purple' }] : [])
  ];

  const colorClasses = {
    cyan: { bg: 'bg-zinc-800/80', border: 'border-zinc-700/50', text: 'text-cyan-400/80', solid: 'bg-cyan-600/80' },
    purple: { bg: 'bg-zinc-800/80', border: 'border-zinc-700/50', text: 'text-cyan-400/70', solid: 'bg-cyan-600/80' },
    pink: { bg: 'bg-zinc-800/80', border: 'border-zinc-700/50', text: 'text-cyan-400/70', solid: 'bg-cyan-600/80' },
    orange: { bg: 'bg-zinc-800/80', border: 'border-zinc-700/50', text: 'text-cyan-400/70', solid: 'bg-cyan-600/80' },
    red: { bg: 'bg-zinc-800/80', border: 'border-zinc-700/50', text: 'text-red-400/70', solid: 'bg-red-600/80' },
    green: { bg: 'bg-zinc-800/80', border: 'border-zinc-700/50', text: 'text-cyan-400/70', solid: 'bg-cyan-600/80' },
  };

  const currentTabConfig = tabConfig.find(t => t.id === activeTab);
  const currentColor = colorClasses[currentTabConfig?.color || 'cyan'];

  return (
    <div className="min-h-screen bg-black relative">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-cyan-950/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full px-6 py-6 space-y-6">
        {/* Header */}
        <div ref={headerRef} style={{ opacity: 0 }}>
          <div className="flex items-center justify-between">
            <PageHeader
              title="Settings"
              subtitle="Manage your profile, preferences, and account"
              icon={SettingsIcon}
              color="cyan"
            />
            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-sm transition-colors"
              >
                <Shield className="w-4 h-4" />
                Admin Panel
              </Link>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div ref={contentRef} className="grid grid-cols-1 lg:grid-cols-4 gap-6" style={{ opacity: 0 }}>
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <GlassCard className="p-4 sticky top-6">
              {/* Profile Summary */}
              <div className="flex items-center gap-4 p-4 mb-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-zinc-700/50">
                    <img 
                      src={profileForm.avatar_url || user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'U')}&background=0e7490&color=fff&size=128`}
                      alt="Avatar"
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-cyan-500/70 border-2 border-zinc-900" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-zinc-100 font-semibold truncate">{user?.full_name || 'User'}</h3>
                  <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                </div>
              </div>

              {/* Navigation */}
              <nav className="space-y-1">
                {tabConfig.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  // If it's a link tab, render as anchor
                  if (tab.isLink && tab.href) {
                    return (
                      <a
                        key={tab.id}
                        href={tab.href}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{tab.label}</span>
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      </a>
                    );
                  }

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200
                        ${isActive
                          ? 'bg-zinc-800/80 text-cyan-400/90 border border-zinc-700/50'
                          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                        }
                      `}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400/80' : ''}`} />
                      <span className="font-medium">{tab.label}</span>
                      {isActive && (
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </GlassCard>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3 space-y-6">
            <AnimatePresence mode="wait">
              {/* PROFILE TAB */}
              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <GlassCard glow="cyan" className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`w-10 h-10 rounded-xl ${currentColor.bg} border ${currentColor.border} flex items-center justify-center`}>
                        <User className={`w-5 h-5 ${currentColor.text}`} />
                      </div>
                      <h2 className="text-sm font-bold text-white">Profile Information</h2>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 mb-6">
                      <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-upload').click()}>
                        <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-cyan-500/30 bg-zinc-800">
                          <img 
                            src={profileForm.avatar_url || user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'U')}&background=0e7490&color=fff&size=128`}
                            alt="Avatar"
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="w-6 h-6 text-white" />
                        </div>
                        <input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                      </div>

                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-zinc-400 text-sm">Display Name</Label>
                          <Input
                            value={profileForm.full_name}
                            onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                            className="mt-1.5 bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <Label className="text-zinc-400 text-sm">Email</Label>
                          <Input value={user?.email} disabled className="mt-1.5 bg-zinc-900/50 border-zinc-800 text-zinc-500" />
                        </div>
                        <div>
                          <Label className="text-zinc-400 text-sm">Job Title</Label>
                          <Input
                            value={profileForm.job_title}
                            onChange={(e) => setProfileForm({ ...profileForm, job_title: e.target.value })}
                            placeholder="e.g., Software Engineer"
                            className="mt-1.5 bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <Label className="text-zinc-400 text-sm">LinkedIn URL</Label>
                          <Input
                            value={profileForm.linkedin_url}
                            onChange={(e) => setProfileForm({ ...profileForm, linkedin_url: e.target.value })}
                            placeholder="https://linkedin.com/in/..."
                            className="mt-1.5 bg-zinc-800/50 border-zinc-700 text-white focus:border-cyan-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={saveProfile} disabled={saving} className="bg-cyan-600/80 hover:bg-cyan-600 text-white font-semibold">
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Profile
                      </Button>
                    </div>
                  </GlassCard>

                  {/* Tech Stack & Files */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GlassCard className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Wrench className="w-5 h-5 text-cyan-400/70" />
                          <h3 className="text-sm font-bold text-white">Tech Stack</h3>
                        </div>
                        <Badge className="bg-zinc-800/80 text-cyan-400/70 border-zinc-700/50">
                          {profileForm.personal_tech_stack.length}
                        </Badge>
                      </div>
                      <div className="flex gap-2 mb-4">
                        <Input
                          value={techInput}
                          onChange={(e) => setTechInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addTech()}
                          placeholder="Add tool..."
                          className="bg-zinc-800/50 border-zinc-700/60 text-white"
                        />
                        <Button onClick={addTech} size="sm" className="bg-cyan-600/80 hover:bg-cyan-600 text-white">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {profileForm.personal_tech_stack.map((tech, idx) => (
                          <Badge key={idx} className="bg-zinc-800/80 text-cyan-400/70 border-zinc-700/50 group pr-1">
                            {tech}
                            <button onClick={() => removeTech(idx)} className="ml-2 opacity-0 group-hover:opacity-100 hover:text-red-400">
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </GlassCard>

                    <GlassCard className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-cyan-400/70" />
                          <h3 className="text-sm font-bold text-white">Knowledge Files</h3>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="border-zinc-700/60 text-cyan-400/70 hover:bg-zinc-800/50">
                          <Plus className="w-3 h-3 mr-1" /> Add
                        </Button>
                        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                      </div>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {profileForm.personal_knowledge_files.length === 0 ? (
                          <p className="text-zinc-600 text-sm text-center py-4">No files uploaded</p>
                        ) : (
                          profileForm.personal_knowledge_files.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50 group">
                              <span className="text-sm text-zinc-200 truncate flex-1">{file.name}</span>
                              <button onClick={() => removeFile(idx)} className="p-1 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </GlassCard>
                  </div>
                </motion.div>
              )}

              {/* LEARNING TAB */}
              {activeTab === 'learning' && (
                <motion.div
                  key="learning"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <GlassCard glow="cyan" className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`w-10 h-10 rounded-xl ${currentColor.bg} border ${currentColor.border} flex items-center justify-center`}>
                        <Book className={`w-5 h-5 ${currentColor.text}`} />
                      </div>
                      <h2 className="text-sm font-bold text-white">Learning Preferences</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-zinc-400 text-sm">Preferred Difficulty</Label>
                          <Select value={learningPrefs.preferred_difficulty} onValueChange={(v) => setLearningPrefs({ ...learningPrefs, preferred_difficulty: v })}>
                            <SelectTrigger className="mt-1.5 bg-zinc-800/50 border-zinc-700 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-700">
                              <SelectItem value="beginner">Beginner</SelectItem>
                              <SelectItem value="intermediate">Intermediate</SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-zinc-400 text-sm">Daily Learning Goal</Label>
                          <Select value={learningPrefs.time_commitment} onValueChange={(v) => setLearningPrefs({ ...learningPrefs, time_commitment: v })}>
                            <SelectTrigger className="mt-1.5 bg-zinc-800/50 border-zinc-700 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-700">
                              <SelectItem value="15">15 minutes</SelectItem>
                              <SelectItem value="30">30 minutes</SelectItem>
                              <SelectItem value="60">1 hour</SelectItem>
                              <SelectItem value="120">2 hours</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="p-6 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                        <div className="flex items-center gap-3 mb-4">
                          <Target className="w-6 h-6 text-cyan-400/70" />
                          <div>
                            <h4 className="text-zinc-100 font-semibold">Your Goal</h4>
                            <p className="text-sm text-zinc-500">{learningPrefs.time_commitment || 30} min/day at {learningPrefs.preferred_difficulty || 'beginner'} level</p>
                          </div>
                        </div>
                        <Progress value={60} className="h-2" />
                        <p className="text-xs text-zinc-600 mt-2">60% of users meet their daily goal</p>
                      </div>
                    </div>

                    <div className="flex justify-end mt-6">
                      <Button onClick={saveLearningPrefs} disabled={saving} className="bg-cyan-600/80 hover:bg-cyan-600 text-white font-semibold">
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Preferences
                      </Button>
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {/* NOTIFICATIONS TAB */}
              {activeTab === 'notifications' && (
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <GlassCard glow="purple" className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`w-10 h-10 rounded-xl ${currentColor.bg} border ${currentColor.border} flex items-center justify-center`}>
                        <Bell className={`w-5 h-5 ${currentColor.text}`} />
                      </div>
                      <h2 className="text-sm font-bold text-white">Notification Settings</h2>
                    </div>

                    <div className="space-y-4">
                      {[
                        { key: 'notification_email', label: 'Email Notifications', desc: 'Receive updates via email', icon: Mail },
                        { key: 'notification_push', label: 'Push Notifications', desc: 'Browser and mobile alerts', icon: Bell },
                      ].map(({ key, label, desc, icon: Icon }) => (
                        <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/50">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center">
                              <Icon className="w-5 h-5 text-cyan-400/70" />
                            </div>
                            <div>
                              <div className="text-zinc-100 font-medium">{label}</div>
                              <div className="text-sm text-zinc-500">{desc}</div>
                            </div>
                          </div>
                          <Switch checked={safeSettings[key]} onCheckedChange={(v) => setSettings({ ...safeSettings, [key]: v })} />
                        </div>
                      ))}

                      <div className="pt-4 border-t border-zinc-800">
                        <Label className="text-zinc-400 text-sm">Notification Frequency</Label>
                        <Select value={safeSettings.notification_frequency} onValueChange={(v) => setSettings({ ...safeSettings, notification_frequency: v })}>
                          <SelectTrigger className="mt-1.5 bg-zinc-800/50 border-zinc-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-700">
                            <SelectItem value="instant">Instant</SelectItem>
                            <SelectItem value="daily">Daily Digest</SelectItem>
                            <SelectItem value="weekly">Weekly Summary</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="pt-4 border-t border-zinc-800">
                        <h4 className="text-sm text-zinc-400 mb-3">Notify me about:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {[
                            { key: 'notify_courses', label: 'Course recommendations' },
                            { key: 'notify_streaks', label: 'Streak reminders' },
                            { key: 'notify_badges', label: 'Badge achievements' },
                            { key: 'notify_compliance', label: 'Compliance deadlines' },
                          ].map(({ key, label }) => (
                            <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30">
                              <span className="text-zinc-300 text-sm">{label}</span>
                              <Switch checked={safeSettings[key]} onCheckedChange={(v) => setSettings({ ...safeSettings, [key]: v })} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end mt-6">
                      <Button onClick={saveNotifications} disabled={saving} className="bg-cyan-600/80 hover:bg-cyan-600 text-white font-semibold">
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Notifications
                      </Button>
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {/* APPEARANCE TAB */}
              {activeTab === 'appearance' && (
                <motion.div
                  key="appearance"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <GlassCard glow="pink" className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`w-10 h-10 rounded-xl ${currentColor.bg} border ${currentColor.border} flex items-center justify-center`}>
                        <Palette className={`w-5 h-5 ${currentColor.text}`} />
                      </div>
                      <h2 className="text-sm font-bold text-white">Appearance</h2>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <Label className="text-zinc-400 text-sm mb-3 block">Theme</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl border-2 border-pink-500 bg-pink-500/10 cursor-pointer">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white font-medium">Dark</span>
                              <CheckCircle className="w-5 h-5 text-pink-400" />
                            </div>
                            <div className="w-full h-16 rounded-lg bg-zinc-900 border border-zinc-700" />
                          </div>
                          <div className="p-4 rounded-xl border border-zinc-700 bg-zinc-800/30 cursor-not-allowed opacity-50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-zinc-400 font-medium">Light</span>
                              <Badge className="bg-zinc-700 text-zinc-400 text-xs">Coming Soon</Badge>
                            </div>
                            <div className="w-full h-16 rounded-lg bg-zinc-200" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-zinc-800">
                        {[
                          { key: 'sound_effects', label: 'Sound Effects', desc: 'Play sounds for actions and achievements' },
                          { key: 'achievement_toasts', label: 'Achievement Toasts', desc: 'Show celebration messages for badges and streaks' },
                        ].map(({ key, label, desc }) => (
                          <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/50">
                            <div>
                              <div className="text-white font-medium">{label}</div>
                              <div className="text-sm text-zinc-500">{desc}</div>
                            </div>
                            <Switch checked={safeSettings[key]} onCheckedChange={(v) => setSettings({ ...safeSettings, [key]: v })} />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end mt-6">
                      <Button onClick={saveAppearance} disabled={saving} className="bg-cyan-600/80 hover:bg-cyan-600 text-white font-semibold">
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Appearance
                      </Button>
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {/* COMPANY TAB */}
              {activeTab === 'company' && (
                <motion.div
                  key="company"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <GlassCard glow="orange" className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${currentColor.bg} border ${currentColor.border} flex items-center justify-center`}>
                          <Building2 className={`w-5 h-5 ${currentColor.text}`} />
                        </div>
                        <h2 className="text-sm font-bold text-white">Company Profile</h2>
                      </div>
                      {company && (
                        <Button size="sm" variant="outline" onClick={handleRefreshCompany} disabled={refreshingCompany} className="border-zinc-700/60 text-cyan-400/70 hover:bg-zinc-800/50">
                          <RefreshCw className={`w-4 h-4 mr-2 ${refreshingCompany ? 'animate-spin' : ''}`} />
                          Refresh Data
                        </Button>
                      )}
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 mb-6">
                      <div className="relative group cursor-pointer" onClick={() => companyLogoInputRef.current?.click()}>
                        <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center overflow-hidden border border-zinc-700">
                          {companyData.logo_url ? (
                            <img src={companyData.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                          ) : (
                            <Building2 className="w-8 h-8 text-zinc-400" />
                          )}
                        </div>
                        <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Upload className="w-5 h-5 text-white" />
                        </div>
                        <input ref={companyLogoInputRef} type="file" className="hidden" accept="image/*" onChange={handleCompanyLogoUpload} />
                      </div>

                      <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-zinc-400 text-sm">Company Name</Label>
                            <Input 
                              value={companyData.name}
                              onChange={(e) => setCompanyData({...companyData, name: e.target.value})}
                              className="mt-1.5 bg-zinc-800/50 border-zinc-700 text-white"
                            />
                          </div>
                          <div>
                            <Label className="text-zinc-400 text-sm">Domain</Label>
                            <Input 
                              value={companyData.domain}
                              onChange={(e) => setCompanyData({...companyData, domain: e.target.value})}
                              placeholder="company.com"
                              className="mt-1.5 bg-zinc-800/50 border-zinc-700 text-white"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-zinc-400 text-sm">Description</Label>
                          <Textarea
                            value={companyData.description}
                            onChange={(e) => setCompanyData({...companyData, description: e.target.value})}
                            placeholder="Company description..."
                            className="mt-1.5 bg-zinc-800/50 border-zinc-700 text-white min-h-[80px]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <Label className="text-zinc-400 text-xs">Industry</Label>
                        <Input value={companyData.industry} onChange={(e) => setCompanyData({...companyData, industry: e.target.value})} className="mt-1 bg-zinc-800/50 border-zinc-700 h-9 text-sm" />
                      </div>
                      <div>
                        <Label className="text-zinc-400 text-xs">Size</Label>
                        <Input value={companyData.size_range} onChange={(e) => setCompanyData({...companyData, size_range: e.target.value})} placeholder="10-50" className="mt-1 bg-zinc-800/50 border-zinc-700 h-9 text-sm" />
                      </div>
                      <div>
                        <Label className="text-zinc-400 text-xs">Revenue</Label>
                        <Input value={companyData.revenue_range} onChange={(e) => setCompanyData({...companyData, revenue_range: e.target.value})} placeholder="$1M-$10M" className="mt-1 bg-zinc-800/50 border-zinc-700 h-9 text-sm" />
                      </div>
                      <div>
                        <Label className="text-zinc-400 text-xs">LinkedIn</Label>
                        <Input value={companyData.linkedin_url} onChange={(e) => setCompanyData({...companyData, linkedin_url: e.target.value})} className="mt-1 bg-zinc-800/50 border-zinc-700 h-9 text-sm" />
                      </div>
                    </div>

                    {/* Additional Enrichment Data */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <Label className="text-zinc-400 text-xs flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Headquarters
                        </Label>
                        <Input value={companyData.headquarters} onChange={(e) => setCompanyData({...companyData, headquarters: e.target.value})} placeholder="City, Country" className="mt-1 bg-zinc-800/50 border-zinc-700 h-9 text-sm" />
                      </div>
                      <div>
                        <Label className="text-zinc-400 text-xs flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Founded
                        </Label>
                        <Input value={companyData.founded_year} onChange={(e) => setCompanyData({...companyData, founded_year: e.target.value})} placeholder="2020" className="mt-1 bg-zinc-800/50 border-zinc-700 h-9 text-sm" />
                      </div>
                      <div>
                        <Label className="text-zinc-400 text-xs flex items-center gap-1">
                          <Phone className="w-3 h-3" /> Phone
                        </Label>
                        <Input value={companyData.phone} onChange={(e) => setCompanyData({...companyData, phone: e.target.value})} placeholder="+1 555-1234" className="mt-1 bg-zinc-800/50 border-zinc-700 h-9 text-sm" />
                      </div>
                      <div>
                        <Label className="text-zinc-400 text-xs flex items-center gap-1">
                          <Mail className="w-3 h-3" /> Email
                        </Label>
                        <Input value={companyData.email} onChange={(e) => setCompanyData({...companyData, email: e.target.value})} placeholder="info@company.com" className="mt-1 bg-zinc-800/50 border-zinc-700 h-9 text-sm" />
                      </div>
                    </div>

                    {/* Funding & Enrichment Status */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      {companyData.total_funding && (
                        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-3">
                          <Euro className="w-5 h-5 text-green-400" />
                          <div>
                            <div className="text-lg font-bold text-green-400">
                              {typeof companyData.total_funding === 'number'
                                ? `$${(companyData.total_funding / 1000000).toFixed(1)}M`
                                : companyData.total_funding}
                            </div>
                            <div className="text-xs text-zinc-500">Total Funding</div>
                          </div>
                        </div>
                      )}
                      {companyData.funding_stage && (
                        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center gap-3">
                          <TrendingUp className="w-5 h-5 text-purple-400" />
                          <div>
                            <div className="text-sm font-medium text-purple-400">{companyData.funding_stage}</div>
                            <div className="text-xs text-zinc-500">Funding Stage</div>
                          </div>
                        </div>
                      )}
                      {companyData.enriched_at && (
                        <div className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30 flex items-center gap-3">
                          <div className="relative">
                            <CheckCircle className="w-5 h-5 text-green-400/70" />
                            {companyData.data_completeness > 0 && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 text-[10px] font-bold flex items-center justify-center text-black">
                                {companyData.data_completeness}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-xs text-zinc-300">
                              Enriched via <span className="text-cyan-400">{companyData.enrichment_source || 'onboarding'}</span>
                            </div>
                            <div className="text-xs text-zinc-500">
                              {new Date(companyData.enriched_at).toLocaleDateString()} • {companyData.tech_stack_count || companyData.tech_stack.length} technologies
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={saveCompany} disabled={saving} className="bg-cyan-600/80 hover:bg-cyan-600 text-white font-semibold">
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Company
                      </Button>
                    </div>
                  </GlassCard>

                  {/* Company Tech & Files */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GlassCard className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Cpu className="w-5 h-5 text-cyan-400/70" />
                          Tech Stack
                        </h3>
                        <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                          {companyData.tech_stack.length} technologies
                        </Badge>
                      </div>
                      <div className="flex gap-2 mb-4">
                        <Input placeholder="Add technology..." value={companyTechInput} onChange={(e) => setCompanyTechInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCompanyTech()} className="bg-zinc-800/50 border-zinc-700/60" />
                        <Button onClick={addCompanyTech} size="sm" className="bg-cyan-600/80 hover:bg-cyan-600"><Plus className="w-4 h-4" /></Button>
                      </div>
                      {companyData.tech_stack.length === 0 ? (
                        <div className="text-center py-6 text-zinc-500 text-sm">
                          <Cpu className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p>No tech stack data yet</p>
                          <p className="text-xs text-zinc-600 mt-1">Click "Refresh Data" to pull from Explorium</p>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                          {companyData.tech_stack.map((tech, idx) => (
                            <Badge key={idx} className="bg-zinc-800/80 text-cyan-400/70 border-zinc-700/50 group pr-1">
                              {tech}
                              <button onClick={() => removeCompanyTech(idx)} className="ml-2 opacity-0 group-hover:opacity-100 hover:text-red-400"><X className="w-3 h-3" /></button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </GlassCard>

                    <GlassCard className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <FileText className="w-5 h-5 text-cyan-400/70" />
                          Knowledge Base
                        </h3>
                        <Button size="sm" variant="outline" className="border-zinc-700/60 text-cyan-400/70" onClick={() => companyFileInputRef.current?.click()}>
                          <Plus className="w-3 h-3 mr-1" /> Add
                        </Button>
                        <input ref={companyFileInputRef} type="file" className="hidden" onChange={handleCompanyFileUpload} />
                      </div>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {companyData.knowledge_files.length === 0 ? (
                          <p className="text-zinc-600 text-sm text-center py-4">No files uploaded</p>
                        ) : (
                          companyData.knowledge_files.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50 group">
                              <span className="text-sm text-zinc-200 truncate flex-1">{file.name}</span>
                              <button onClick={() => removeCompanyFile(idx)} className="p-1 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </GlassCard>
                  </div>

                  {/* Team Members */}
                  <GlassCard className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-cyan-400/70" />
                        Team Members
                      </h3>
                      <div className="flex gap-2">
                        <Button onClick={generateInviteLink} variant="outline" size="sm" className="border-zinc-700/60 text-cyan-400/70">
                          <Plus className="w-4 h-4 mr-1" /> Generate Link
                        </Button>
                        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="bg-cyan-600/80 hover:bg-cyan-600">
                              <Mail className="w-4 h-4 mr-1" /> Invite
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-zinc-900 border-zinc-700">
                            <DialogHeader>
                              <DialogTitle className="text-white">Invite Team Member</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div>
                                <Label className="text-zinc-400">Email</Label>
                                <Input placeholder="colleague@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="mt-2 bg-zinc-800 border-zinc-700" />
                              </div>
                              <div>
                                <Label className="text-zinc-400">Role</Label>
                                <Select value={inviteRole} onValueChange={setInviteRole}>
                                  <SelectTrigger className="mt-2 bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
                                  <SelectContent className="bg-zinc-900 border-zinc-700">
                                    <SelectItem value="company_admin">Admin</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="learner">Learner</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setIsInviteOpen(false)} className="border-zinc-700">Cancel</Button>
                              <Button onClick={sendInvite} className="bg-blue-500">Send</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center">
                            <User className="w-5 h-5 text-cyan-400/70" />
                          </div>
                          <div className="flex-1">
                            <div className="text-zinc-100 font-medium">{user?.full_name} (You)</div>
                            <div className="text-xs text-zinc-500">{user?.email}</div>
                          </div>
                          <Badge className="bg-zinc-800/80 text-cyan-400/70 border-zinc-700/50">Admin</Badge>
                        </div>
                      </div>

                      {invitations.length > 0 && (
                        <div className="pt-4 border-t border-zinc-800">
                          <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-3">Pending Invitations</h4>
                          {invitations.map((invite) => (
                            <div key={invite.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30 mb-2">
                              <div className="flex items-center gap-3">
                                <Mail className="w-4 h-4 text-zinc-400" />
                                <div>
                                  <div className="text-white text-sm">{invite.email}</div>
                                  <div className="text-xs text-zinc-500 capitalize">{invite.role?.replace('_', ' ')}</div>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 h-8 w-8 p-0" onClick={() => revokeInvite(invite.id)}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {/* CLIENT PORTAL TAB */}
              {activeTab === 'portal' && (
                <motion.div
                  key="portal"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <PortalBranding />
                </motion.div>
              )}

              {/* TEAMS & RIGHTS TAB */}
              {activeTab === 'teams' && (
                <motion.div
                  key="teams"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <TeamManagement embedded />
                </motion.div>
              )}

              {/* INTEGRATIONS TAB */}
              {activeTab === 'integrations' && (
                <motion.div
                  key="integrations"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Integrations embedded />
                </motion.div>
              )}

              {/* WORKSPACE TAB */}
              {activeTab === 'workspace' && (
                <motion.div
                  key="workspace"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <AppsManagerModal embedded />
                </motion.div>
              )}

              {/* PRIVACY TAB */}
              {activeTab === 'privacy' && (
                <motion.div
                  key="privacy-logout"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Logout Card */}
                  <GlassCard className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center">
                          <LogOut className="w-6 h-6 text-cyan-400/70" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">Sign Out</h3>
                          <p className="text-sm text-zinc-500">Log out of your account on this device</p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => db.auth.logout(window.location.origin)}
                        className="bg-cyan-600/80 hover:bg-cyan-600 text-white font-medium"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </Button>
                    </div>
                  </GlassCard>

                  {/* Data & Privacy */}
                  <GlassCard glow="red" className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`w-10 h-10 rounded-xl ${currentColor.bg} border ${currentColor.border} flex items-center justify-center`}>
                        <Lock className={`w-5 h-5 ${currentColor.text}`} />
                      </div>
                      <h2 className="text-sm font-bold text-white">Data & Privacy</h2>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/50">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center">
                            <Mail className="w-5 h-5 text-cyan-400/70" />
                          </div>
                          <div>
                            <div className="text-zinc-100 font-medium">Allow External Messages</div>
                            <div className="text-sm text-zinc-500">Allow users outside your company to DM you</div>
                          </div>
                        </div>
                        <Switch
                          checked={user?.allow_external_messages !== false}
                          onCheckedChange={async (v) => {
                            try {
                              await updateUser({ allow_external_messages: v });
                              toast.success('Setting updated');
                            } catch (error) {
                              toast.error('Failed to update setting');
                            }
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/50">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center">
                            <Download className="w-5 h-5 text-cyan-400/70" />
                          </div>
                          <div>
                            <div className="text-zinc-100 font-medium">Export My Data</div>
                            <div className="text-sm text-zinc-500">Download all your data as JSON</div>
                          </div>
                        </div>
                        <Button variant="outline" onClick={handleExportData} className="border-zinc-700/60 text-zinc-400 hover:bg-zinc-800/50">
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/30 border border-red-900/30">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-zinc-800/80 border border-red-900/30 flex items-center justify-center">
                            <Trash2 className="w-5 h-5 text-red-400/70" />
                          </div>
                          <div>
                            <div className="text-zinc-100 font-medium">Delete Account</div>
                            <div className="text-sm text-red-400/60">Permanently delete your account and all data</div>
                          </div>
                        </div>
                        <Button variant="outline" onClick={handleDeleteAccount} className="border-red-900/40 text-red-400/70 hover:bg-red-900/20">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )}



              {/* ADMIN TAB */}
              {activeTab === 'admin' && isAdmin && (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <GlassCard glow="purple" className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`w-10 h-10 rounded-xl ${currentColor.bg} border ${currentColor.border} flex items-center justify-center`}>
                        <Brain className={`w-5 h-5 ${currentColor.text}`} />
                      </div>
                      <h2 className="text-sm font-bold text-white">Admin Tools</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { href: 'AIAssistant', icon: Sparkles, title: 'Course Template Builder', desc: 'Create courses for all users' },
                        { href: 'AdminDashboard', icon: SettingsIcon, title: 'Admin Dashboard', desc: 'View analytics and manage users' },
                        { href: 'ManageCourses', icon: Book, title: 'Manage Courses', desc: 'Edit and organize course library' },
                        { href: 'UserAnalytics', icon: Award, title: 'User Analytics', desc: 'Track user engagement and progress' },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <a 
                            key={item.href}
                            href={createPageUrl(item.href)}
                            className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:border-cyan-800/50 transition-all group"
                          >
                            <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center">
                              <Icon className="w-6 h-6 text-cyan-400/70" />
                            </div>
                            <div className="flex-1">
                              <div className="text-zinc-100 font-medium">{item.title}</div>
                              <div className="text-sm text-zinc-500">{item.desc}</div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-cyan-400/60 group-hover:translate-x-1 transition-transform" />
                          </a>
                        );
                      })}
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Invite Link Modal */}
        <Dialog open={showLinkModal} onOpenChange={setShowLinkModal}>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-zinc-100">Share Invite Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-zinc-500">Share this link with anyone you want to invite to your company.</p>
              <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50 font-mono text-sm text-cyan-400/80 break-all">{inviteLink}</div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLinkModal(false)} className="border-zinc-700/60 text-zinc-400">Close</Button>
              <Button onClick={copyInviteLink} className="bg-cyan-600/80 hover:bg-cyan-600 text-white">Copy Link</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

    </div>
  );
}