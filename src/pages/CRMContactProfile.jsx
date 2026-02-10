import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { usePermissions } from '@/components/context/PermissionContext';
import { createPageUrl } from '@/utils';
import { isEnrichmentStale, isMissingEnrichmentData } from '@/constants/crm';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { fullEnrichFromLinkedIn, fullEnrichFromEmail } from '@/lib/explorium-api';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { CRMPageTransition } from '@/components/crm/ui';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Briefcase,
  Globe,
  Linkedin,
  ExternalLink,
  Calendar,
  GraduationCap,
  Sparkles,
  Clock,
  MessageSquare,
  FileText,
  Euro,
  Target,
  TrendingUp,
  Loader2,
  Edit2,
  Trash2,
  ChevronRight,
  Award,
  History,
  Lightbulb,
  Users,
  Zap,
  RefreshCw,
  Github,
  Twitter,
  Instagram,
  Facebook,
  Cpu,
  BarChart3,
  Database,
  Cloud,
  Shield,
  Code,
  Layers,
  Server,
  Banknote,
  BadgeEuro,
  BadgeCheck,
  TrendingDown,
  Building2,
  Hash,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  Share2,
  Sun,
  Moon,
} from 'lucide-react';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

// Static color class map for StatCard (avoids Tailwind purge issues with dynamic interpolation)
const statCardColorClasses = {
  cyan:   { bg: 'bg-cyan-500/10',   text: 'text-cyan-400' },
  green:  { bg: 'bg-green-500/10',  text: 'text-green-400' },
  blue:   { bg: 'bg-blue-500/10',   text: 'text-blue-400' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400' },
};

// Stat Card Component - Responsive sizing
const StatCard = ({ label, value, icon: Icon, color = 'cyan', subtext, trend, crt }) => {
  const colorCls = statCardColorClasses[color] || statCardColorClasses.cyan;
  return (
  <div className={`${crt('bg-slate-100 border border-slate-200', 'bg-white/[0.03] border border-white/[0.06]')} rounded-xl p-3 ${crt('hover:bg-slate-50', 'hover:bg-white/[0.05]')} transition-colors group`}>
    <div className="flex items-start justify-between mb-2">
      <div className={`p-2 rounded-lg ${colorCls.bg}`}>
        <Icon className={`w-4 h-4 ${colorCls.text}`} />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-[10px] sm:text-xs ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <p className={`text-lg font-bold ${crt('text-slate-900', 'text-white')} mb-0.5 group-hover:text-cyan-400 transition-colors`}>{value || '-'}</p>
    <p className={`text-xs ${crt('text-slate-500', 'text-white/50')}`}>{label}</p>
    {subtext && <p className={`text-[10px] ${crt('text-slate-400', 'text-white/30')} mt-0.5`}>{subtext}</p>}
  </div>
  );
};

// Info Row Component - Touch-friendly
const InfoRow = ({ icon: Icon, label, value, link, copyable, crt }) => {
  if (!value) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast.success('Copied to clipboard');
  };

  return (
    <div className={`flex items-center gap-2 sm:gap-3 py-2.5 sm:py-3 border-b ${crt('border-slate-100', 'border-white/[0.04]')} last:border-0 group`}>
      <div className={`p-1.5 sm:p-2 rounded-lg ${crt('bg-slate-100', 'bg-white/[0.04]')} flex-shrink-0`}>
        <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${crt('text-slate-400', 'text-white/40')}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[10px] sm:text-xs ${crt('text-slate-400', 'text-white/40')}`}>{label}</p>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs sm:text-sm text-cyan-400 hover:text-cyan-300 truncate flex items-center gap-1 active:scale-[0.98]"
          >
            <span className="truncate">{value}</span>
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
        ) : (
          <p className={`text-xs sm:text-sm ${crt('text-slate-900', 'text-white')} truncate`}>{value}</p>
        )}
      </div>
      {copyable && (
        <button
          onClick={handleCopy}
          className={`p-2 sm:p-1.5 rounded-lg sm:opacity-0 sm:group-hover:opacity-100 ${crt('hover:bg-slate-100 active:bg-slate-200', 'hover:bg-white/[0.06] active:bg-white/[0.1]')} transition-all flex-shrink-0`}
        >
          <Copy className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${crt('text-slate-400 hover:text-slate-700', 'text-white/40 hover:text-white')}`} />
        </button>
      )}
    </div>
  );
};

// Section Card Component - Responsive padding
const SectionCard = ({ icon: Icon, title, children, action, className = '', crt }) => (
  <div className={`${crt('bg-white border border-slate-200 shadow-sm', 'bg-white/[0.03] border border-white/[0.06]')} rounded-xl p-4 ${className}`}>
    <div className="flex items-center justify-between mb-3 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="p-2 rounded-lg bg-cyan-500/10 flex-shrink-0">
          <Icon className="w-4 h-4 text-cyan-400" />
        </div>
        <h3 className={`text-sm sm:text-base font-semibold ${crt('text-slate-900', 'text-white')} truncate`}>{title}</h3>
      </div>
      {action}
    </div>
    {children}
  </div>
);

// Expandable Text Component
const ExpandableText = ({ text, maxLength = 300, crt }) => {
  const [expanded, setExpanded] = useState(false);
  if (!text) return <p className={`${crt('text-slate-500', 'text-white/60')} text-sm`}>No information available</p>;
  if (text.length <= maxLength) return <p className={`${crt('text-slate-600', 'text-white/70')} text-sm leading-relaxed`}>{text}</p>;

  return (
    <div>
      <p className={`${crt('text-slate-600', 'text-white/70')} text-sm leading-relaxed`}>
        {expanded ? text : text.slice(0, maxLength) + '...'}
      </p>
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-cyan-400 hover:text-cyan-300 text-sm mt-2"
      >
        {expanded ? 'Show less' : 'Read more'}
      </button>
    </div>
  );
};

// Email Status Badge
const EmailStatusBadge = ({ status }) => {
  if (!status) return null;
  const statusConfig = {
    valid: { icon: CheckCircle, label: 'Valid', bgClass: 'bg-green-500/20', textClass: 'text-green-400', borderClass: 'border-green-500/30' },
    invalid: { icon: XCircle, label: 'Invalid', bgClass: 'bg-red-500/20', textClass: 'text-red-400', borderClass: 'border-red-500/30' },
    'catch-all': { icon: AlertCircle, label: 'Catch-all', bgClass: 'bg-yellow-500/20', textClass: 'text-yellow-400', borderClass: 'border-yellow-500/30' },
    unknown: { icon: AlertCircle, label: 'Unknown', bgClass: 'bg-gray-500/20', textClass: 'text-gray-400', borderClass: 'border-gray-500/30' },
  };
  const config = statusConfig[status.toLowerCase()] || statusConfig.unknown;
  const IconComponent = config.icon;

  return (
    <Badge className={`${config.bgClass} ${config.textClass} ${config.borderClass} ml-2`}>
      <IconComponent className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
};

// Tech Category Icon Mapping
const getTechCategoryIcon = (category) => {
  const icons = {
    crm: Users,
    marketing: Target,
    analytics: BarChart3,
    ecommerce: Building2,
    cms: FileText,
    email: Mail,
    hosting: Server,
    cdn: Globe,
    payment: Banknote,
    advertising: Zap,
    'customer support': MessageSquare,
    hr: Users,
    accounting: BadgeEuro,
    'project management': Layers,
    security: Shield,
    cloud: Cloud,
    database: Database,
    'programming languages': Code,
    frameworks: Cpu,
    devops: Server,
    collaboration: Users,
    'video conferencing': MessageSquare,
    'social media': Share2,
  };
  return icons[category.toLowerCase()] || Cpu;
};

// Social Profile Icon Mapping
const getSocialIcon = (platform) => {
  const icons = {
    twitter: Twitter,
    facebook: Facebook,
    github: Github,
    instagram: Instagram,
    linkedin: Linkedin,
  };
  return icons[platform.toLowerCase()] || Globe;
};

export default function CRMContactProfile() {
  const { user } = useUser();
  const { hasPermission } = usePermissions();
  const { theme, toggleTheme, crt } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contactId = searchParams.get('id');

  // Permission checks
  const canEdit = hasPermission('users.edit');
  const canDelete = hasPermission('users.delete');

  const [contact, setContact] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reEnriching, setReEnriching] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showReEnrichConfirm, setShowReEnrichConfirm] = useState(false);

  useEffect(() => {
    if (contactId && user?.organization_id) {
      fetchContact();
    }
  }, [contactId, user?.organization_id]);

  const fetchContact = async () => {
    try {
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .eq('id', contactId)
        .eq('organization_id', user.organization_id)
        .single();

      if (error) throw error;
      setContact(data);

      // Fetch linked company if exists
      if (data.crm_company_id) {
        const { data: companyData } = await supabase
          .from('crm_companies')
          .select('*')
          .eq('id', data.crm_company_id)
          .single();
        setCompany(companyData);
      }
    } catch (err) {
      console.error('Error fetching contact:', err);
      toast.error('Failed to load contact');
    } finally {
      setLoading(false);
    }
  };

  const handleReEnrich = async () => {
    if (!contact) return;
    if (!canEdit) {
      toast.error("You don't have permission to update contacts");
      return;
    }

    setReEnriching(true);
    setShowReEnrichConfirm(false);
    try {
      let enrichedData;
      if (contact.linkedin_url) {
        enrichedData = await fullEnrichFromLinkedIn(contact.linkedin_url);
      } else if (contact.email) {
        enrichedData = await fullEnrichFromEmail(contact.email);
      } else {
        throw new Error('No LinkedIn URL or email to re-enrich from');
      }

      // Update the contact with new enrichment data
      const { error: updateError } = await supabase
        .from('prospects')
        .update({
          // Contact info
          mobile_phone: enrichedData.mobile_phone || contact.mobile_phone,
          work_phone: enrichedData.work_phone || contact.work_phone,
          personal_email: enrichedData.personal_email || contact.personal_email,
          email_status: enrichedData.email_status || contact.email_status,

          // Location
          location_city: enrichedData.location_city || contact.location_city,
          location_region: enrichedData.location_region || contact.location_region,
          location_country: enrichedData.location_country || contact.location_country,

          // Professional
          job_department: enrichedData.job_department || contact.job_department,
          job_seniority_level: enrichedData.job_seniority_level || contact.job_seniority_level,
          age_group: enrichedData.age_group || contact.age_group,
          gender: enrichedData.gender || contact.gender,

          // JSONB fields
          skills: enrichedData.skills?.length ? enrichedData.skills : contact.skills,
          interests: enrichedData.interests?.length ? enrichedData.interests : contact.interests,
          education: enrichedData.education?.length ? enrichedData.education : contact.education,
          work_history: enrichedData.work_history?.length ? enrichedData.work_history : contact.work_history,
          certifications: enrichedData.certifications?.length ? enrichedData.certifications : contact.certifications,

          // Company info
          company_domain: enrichedData.company_domain || contact.company_domain,
          company_linkedin: enrichedData.company_linkedin || contact.company_linkedin,
          company_industry: enrichedData.company_industry || contact.company_industry,
          company_size: enrichedData.company_size || contact.company_size,
          company_employee_count: enrichedData.company_employee_count || contact.company_employee_count,
          company_revenue: enrichedData.company_revenue || contact.company_revenue,
          company_founded_year: enrichedData.company_founded_year || contact.company_founded_year,
          company_hq_location: enrichedData.company_hq_location || contact.company_hq_location,
          company_description: enrichedData.company_description || contact.company_description,
          company_logo_url: enrichedData.company_logo_url || contact.company_logo_url,

          // Tech stack
          company_tech_stack: enrichedData.company_tech_stack?.length ? enrichedData.company_tech_stack : contact.company_tech_stack,
          company_tech_categories: Object.keys(enrichedData.company_tech_categories || {}).length ? enrichedData.company_tech_categories : contact.company_tech_categories,

          // Funding
          company_funding_total: enrichedData.company_funding_total || contact.company_funding_total,
          company_funding_rounds: enrichedData.company_funding_rounds?.length ? enrichedData.company_funding_rounds : contact.company_funding_rounds,
          company_investors: enrichedData.company_investors?.length ? enrichedData.company_investors : contact.company_investors,
          company_last_funding: enrichedData.company_last_funding || contact.company_last_funding,
          company_is_ipo: enrichedData.company_is_ipo ?? contact.company_is_ipo,
          company_ticker: enrichedData.company_ticker || contact.company_ticker,

          // Additional firmographic fields
          company_naics: enrichedData.company_naics || contact.company_naics,
          company_naics_description: enrichedData.company_naics_description || contact.company_naics_description,
          company_sic_code: enrichedData.company_sic_code || contact.company_sic_code,
          company_sic_code_description: enrichedData.company_sic_code_description || contact.company_sic_code_description,
          company_locations_distribution: enrichedData.company_locations_distribution?.length ? enrichedData.company_locations_distribution : contact.company_locations_distribution,

          // Social
          social_profiles: Object.keys(enrichedData.social_profiles || {}).length ? enrichedData.social_profiles : contact.social_profiles,
          social_activity: Object.keys(enrichedData.social_activity || {}).length ? enrichedData.social_activity : contact.social_activity,

          // Intent
          intent_topics: enrichedData.intent_topics?.length ? enrichedData.intent_topics : contact.intent_topics,

          // Raw data
          enrichment_data: enrichedData.enrichment_data || contact.enrichment_data,

          // Metadata
          enriched_at: new Date().toISOString(),
          enrichment_source: 'explorium',
          explorium_prospect_id: enrichedData.explorium_prospect_id || contact.explorium_prospect_id,
          explorium_business_id: enrichedData.explorium_business_id || contact.explorium_business_id,
        })
        .eq('id', contactId);

      if (updateError) throw updateError;

      toast.success('Contact re-enriched successfully!');
      fetchContact(); // Reload the data
    } catch (err) {
      console.error('Re-enrichment error:', err);
      toast.error(err.message || 'Failed to re-enrich contact');
    } finally {
      setReEnriching(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${crt('bg-slate-50', 'bg-black')}`}>
        <div className="w-full px-4 lg:px-6 py-4 space-y-4">
          <Skeleton className={`h-8 w-32 ${crt('bg-slate-200', 'bg-white/10')}`} />
          <Skeleton className={`h-64 w-full ${crt('bg-slate-200', 'bg-white/10')} rounded-3xl`} />
          <Skeleton className={`h-12 w-full ${crt('bg-slate-200', 'bg-white/10')} rounded-2xl`} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className={`h-96 lg:col-span-2 ${crt('bg-slate-200', 'bg-white/10')} rounded-2xl`} />
            <Skeleton className={`h-96 ${crt('bg-slate-200', 'bg-white/10')} rounded-2xl`} />
          </div>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className={`min-h-screen ${crt('bg-slate-50', 'bg-black')} flex items-center justify-center`}>
        <div className="text-center">
          <User className={`w-16 h-16 ${crt('text-slate-300', 'text-white/20')} mx-auto mb-4`} />
          <h2 className={`text-xl font-semibold ${crt('text-slate-900', 'text-white')} mb-2`}>Contact Not Found</h2>
          <p className={`${crt('text-slate-500', 'text-white/60')} mb-6`}>This contact may have been deleted or you don't have access.</p>
          <Link
            to={createPageUrl('CRMContacts')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Contacts
          </Link>
        </div>
      </div>
    );
  }

  const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown';
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const tabs = [
    { id: 'overview', label: 'Overview', mobileLabel: 'Overview', icon: User },
    { id: 'skills', label: 'Skills & Career', mobileLabel: 'Skills', icon: Award },
    { id: 'company', label: 'Company', mobileLabel: 'Company', icon: Building },
    { id: 'techstack', label: 'Tech Stack', mobileLabel: 'Tech', icon: Cpu },
    { id: 'funding', label: 'Funding', mobileLabel: 'Funding', icon: Euro },
    { id: 'social', label: 'Social', mobileLabel: 'Social', icon: Share2 },
  ];

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (value) => {
    if (!value) return '-';
    if (typeof value === 'string') return value;
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', notation: 'compact' }).format(value);
  };

  const stageBadgeColor = {
    'New Lead': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Contacted: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Qualified: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    Proposal: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    Negotiation: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    Won: 'bg-green-500/20 text-green-400 border-green-500/30',
    Lost: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  // Get tech categories for display
  const techCategories = contact.company_tech_categories || {};
  const hasTechData = contact.company_tech_stack?.length > 0 || Object.keys(techCategories).length > 0;

  // Get funding data
  const fundingRounds = contact.company_funding_rounds || [];
  const investors = contact.company_investors || [];
  const hasFundingData = fundingRounds.length > 0 || investors.length > 0 || contact.company_funding_total;

  // Get social profiles
  const socialProfiles = contact.social_profiles || {};
  const hasSocialData = Object.keys(socialProfiles).length > 0;

  return (
    <CRMPageTransition>
      <div className={`min-h-screen ${crt('bg-slate-50', 'bg-black')}`}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full px-4 lg:px-6 py-4 space-y-4"
        >
          {/* Back Navigation + Theme Toggle */}
          <motion.div variants={itemVariants} className="flex items-center justify-between">
            <Link
              to={createPageUrl('CRMContacts')}
              className={`inline-flex items-center gap-2 ${crt('text-slate-500 hover:text-slate-900', 'text-white/50 hover:text-white')} transition-colors min-h-[44px] active:scale-[0.98]`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm sm:text-base">Back to Contacts</span>
            </Link>
            <button onClick={toggleTheme} className={`p-2 rounded-lg border transition-colors ${crt('border-slate-200 hover:bg-slate-100 text-slate-600', 'border-zinc-700 hover:bg-zinc-800 text-zinc-400')}`}>
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </motion.div>

          {/* Stale Data Warning */}
          {contact && (isEnrichmentStale(contact.enriched_at) || isMissingEnrichmentData(contact)) && (
            <motion.div
              variants={itemVariants}
              className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-amber-400 font-medium text-sm">
                    {!contact.enriched_at ? 'Contact not enriched' :
                     isMissingEnrichmentData(contact) ? 'Enrichment data may be incomplete' :
                     'Enrichment data may be outdated'}
                  </p>
                  <p className="text-amber-400/60 text-xs mt-0.5">
                    {contact.enriched_at
                      ? `Last enriched ${formatDate(contact.enriched_at)}`
                      : 'Click Re-enrich to get the latest company and contact data'}
                  </p>
                </div>
              </div>
              {canEdit && (
                <Button
                  size="sm"
                  onClick={() => setShowReEnrichConfirm(true)}
                  disabled={reEnriching}
                  className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${reEnriching ? 'animate-spin' : ''}`} />
                  Re-enrich Now
                </Button>
              )}
            </motion.div>
          )}

          {/* Re-enrich Confirmation Dialog */}
          <AnimatePresence>
            {showReEnrichConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`fixed inset-0 z-50 flex items-center justify-center ${crt('bg-black/30', 'bg-black/60')} backdrop-blur-sm p-4`}
                onClick={() => setShowReEnrichConfirm(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className={`${crt('bg-white border border-slate-200 shadow-xl', 'bg-zinc-900 border border-zinc-700')} rounded-2xl p-6 max-w-md w-full`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-cyan-500/10 rounded-xl">
                      <RefreshCw className="w-5 h-5 text-cyan-400" />
                    </div>
                    <h3 className={`text-lg font-semibold ${crt('text-slate-900', 'text-white')}`}>Re-enrich Contact</h3>
                  </div>
                  <p className={`${crt('text-slate-500', 'text-white/60')} text-sm mb-4`}>
                    This will fetch the latest data from Explorium and may overwrite some existing fields.
                    The following may be updated:
                  </p>
                  <ul className={`${crt('text-slate-400', 'text-white/50')} text-sm space-y-1 mb-6 pl-4 list-disc`}>
                    <li>Contact details (phone, email status)</li>
                    <li>Company information (size, revenue, description)</li>
                    <li>Tech stack and categories</li>
                    <li>Funding rounds and investors</li>
                  </ul>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className={`flex-1 ${crt('border-slate-300', 'border-zinc-700')}`}
                      onClick={() => setShowReEnrichConfirm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                      onClick={handleReEnrich}
                      disabled={reEnriching}
                    >
                      {reEnriching ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Re-enriching...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Confirm Re-enrich
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hero Section */}
          <motion.div
            variants={itemVariants}
            className={`${crt('bg-white border border-slate-200 shadow-sm', 'bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/[0.06]')} rounded-xl p-4`}
          >
            <div className="flex flex-col lg:flex-row lg:items-start gap-4 sm:gap-6">
              {/* Avatar & Basic Info */}
              <div className="flex items-start gap-4 sm:gap-5 flex-1">
                <div className="relative flex-shrink-0">
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-xl sm:rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-xl sm:text-2xl lg:text-3xl font-bold text-white shadow-lg shadow-cyan-500/20`}>
                    {initials}
                  </div>
                  {contact.enriched_at && (
                    <div className={`absolute -bottom-1 -right-1 p-1 sm:p-1.5 bg-green-500 rounded-full border-2 ${crt('border-white', 'border-black')}`}>
                      <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className={`text-lg sm:text-xl lg:text-2xl font-bold ${crt('text-slate-900', 'text-white')} truncate`}>{fullName}</h1>
                    {contact.email_status && <EmailStatusBadge status={contact.email_status} />}
                  </div>
                  <p className={`${crt('text-slate-500', 'text-white/60')} text-sm sm:text-base lg:text-lg mb-2 sm:mb-3 truncate`}>{contact.job_title || 'No title'}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {contact.company && (
                      <Badge className={`${crt('bg-slate-100 text-slate-600 border-slate-200', 'bg-white/10 text-white/70 border-white/10')} text-xs sm:text-sm`}>
                        <Building className="w-3 h-3 mr-1" />
                        <span className="truncate max-w-[120px] sm:max-w-none">{contact.company}</span>
                      </Badge>
                    )}
                    {contact.location && (
                      <Badge className={`${crt('bg-slate-100 text-slate-600 border-slate-200', 'bg-white/10 text-white/70 border-white/10')} text-xs sm:text-sm hidden sm:flex`}>
                        <MapPin className="w-3 h-3 mr-1" />
                        {contact.location}
                      </Badge>
                    )}
                    {contact.stage && (
                      <Badge className={`text-xs sm:text-sm ${stageBadgeColor[contact.stage] || crt('bg-slate-100 text-slate-600', 'bg-white/10 text-white/70')}`}>
                        {contact.stage}
                      </Badge>
                    )}
                    {contact.company_is_ipo && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs sm:text-sm hidden md:flex">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Public
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions - Horizontal scroll on mobile */}
              <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible pb-2 sm:pb-0">
                {canEdit && (
                  <Button
                    variant="outline"
                    onClick={() => setShowReEnrichConfirm(true)}
                    disabled={reEnriching}
                    className={`${crt('border-slate-300 text-slate-700 hover:bg-slate-100', 'border-zinc-700 text-white hover:bg-zinc-800')} h-10 flex-shrink-0 text-sm px-3 sm:px-4`}
                  >
                    {reEnriching ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Re-enrich
                  </Button>
                )}
                <Button variant="outline" className={`${crt('border-slate-300 text-slate-700 hover:bg-slate-100', 'border-zinc-700 text-white hover:bg-zinc-800')} h-10 flex-shrink-0 text-sm px-3 sm:px-4`}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Message
                </Button>
                {contact.email && (
                  <Button
                    className="bg-cyan-600 hover:bg-cyan-700 h-10 flex-shrink-0 text-sm px-3 sm:px-4"
                    onClick={() => window.location.href = `mailto:${contact.email}`}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Stats Bar - Horizontal scroll on mobile */}
            <div className={`mt-4 pt-4 border-t ${crt('border-slate-200', 'border-white/[0.06]')}`}>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible scrollbar-hide sm:grid sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9">
                <div className="text-center min-w-[80px] sm:min-w-0 flex-shrink-0 sm:flex-shrink">
                  <p className={`text-xs sm:text-sm ${crt('text-slate-400', 'text-white/40')} mb-0.5 sm:mb-1`}>Contact Type</p>
                  <p className={`text-sm sm:text-base lg:text-lg font-semibold ${crt('text-slate-900', 'text-white')} capitalize whitespace-nowrap`}>
                    {contact.contact_type || 'Lead'}
                  </p>
                </div>
                <div className="text-center min-w-[80px] sm:min-w-0 flex-shrink-0 sm:flex-shrink">
                  <p className={`text-xs sm:text-sm ${crt('text-slate-400', 'text-white/40')} mb-0.5 sm:mb-1`}>Source</p>
                  <p className={`text-sm sm:text-base lg:text-lg font-semibold ${crt('text-slate-900', 'text-white')} whitespace-nowrap`}>{contact.source || '-'}</p>
                </div>
                <div className="text-center min-w-[80px] sm:min-w-0 flex-shrink-0 sm:flex-shrink">
                  <p className={`text-xs sm:text-sm ${crt('text-slate-400', 'text-white/40')} mb-0.5 sm:mb-1`}>Deal Value</p>
                  <p className={`text-sm sm:text-base lg:text-lg font-semibold ${crt('text-slate-900', 'text-white')} whitespace-nowrap`}>
                    {contact.deal_value ? `€${Number(contact.deal_value).toLocaleString()}` : '-'}
                  </p>
                </div>
                <div className="text-center min-w-[80px] sm:min-w-0 flex-shrink-0 sm:flex-shrink">
                  <p className={`text-xs sm:text-sm ${crt('text-slate-400', 'text-white/40')} mb-0.5 sm:mb-1`}>Seniority</p>
                  <p className={`text-sm sm:text-base lg:text-lg font-semibold ${crt('text-slate-900', 'text-white')} capitalize whitespace-nowrap`}>
                    {contact.job_seniority_level || '-'}
                  </p>
                </div>
                <div className="text-center min-w-[80px] sm:min-w-0 flex-shrink-0 sm:flex-shrink">
                  <p className={`text-xs sm:text-sm ${crt('text-slate-400', 'text-white/40')} mb-0.5 sm:mb-1`}>Department</p>
                  <p className={`text-sm sm:text-base lg:text-lg font-semibold ${crt('text-slate-900', 'text-white')} capitalize whitespace-nowrap`}>
                    {contact.job_department || '-'}
                  </p>
                </div>
                <div className="text-center min-w-[80px] sm:min-w-0 flex-shrink-0 sm:flex-shrink">
                  <p className={`text-xs sm:text-sm ${crt('text-slate-400', 'text-white/40')} mb-0.5 sm:mb-1`}>Gender</p>
                  <p className={`text-sm sm:text-base lg:text-lg font-semibold ${crt('text-slate-900', 'text-white')} capitalize whitespace-nowrap`}>
                    {contact.gender || '-'}
                  </p>
                </div>
                <div className="text-center min-w-[80px] sm:min-w-0 flex-shrink-0 sm:flex-shrink">
                  <p className={`text-xs sm:text-sm ${crt('text-slate-400', 'text-white/40')} mb-0.5 sm:mb-1`}>Age Group</p>
                  <p className={`text-sm sm:text-base lg:text-lg font-semibold ${crt('text-slate-900', 'text-white')} capitalize whitespace-nowrap`}>
                    {contact.age_group || '-'}
                  </p>
                </div>
                <div className="text-center min-w-[80px] sm:min-w-0 flex-shrink-0 sm:flex-shrink">
                  <p className={`text-xs sm:text-sm ${crt('text-slate-400', 'text-white/40')} mb-0.5 sm:mb-1`}>Enriched</p>
                  <p className={`text-sm sm:text-base lg:text-lg font-semibold ${crt('text-slate-900', 'text-white')} whitespace-nowrap`}>{formatDate(contact.enriched_at)}</p>
                </div>
                <div className="text-center min-w-[80px] sm:min-w-0 flex-shrink-0 sm:flex-shrink">
                  <p className={`text-xs sm:text-sm ${crt('text-slate-400', 'text-white/40')} mb-0.5 sm:mb-1`}>Added</p>
                  <p className={`text-sm sm:text-base lg:text-lg font-semibold ${crt('text-slate-900', 'text-white')} whitespace-nowrap`}>{formatDate(contact.created_date)}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tab Navigation - Scrollable on mobile */}
          <motion.div variants={itemVariants} className="-mx-4 px-4 sm:mx-0 sm:px-0">
            <div className={`flex gap-1 p-1.5 ${crt('bg-slate-100 border border-slate-200', 'bg-white/[0.03] border border-white/[0.06]')} rounded-xl overflow-x-auto scrollbar-hide`}>
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-shrink-0 sm:flex-1 px-4 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 sm:gap-2 active:scale-[0.98] ${
                      activeTab === tab.id
                        ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                        : `${crt('text-slate-500 hover:text-slate-900 hover:bg-white active:bg-slate-50', 'text-white/50 hover:text-white hover:bg-white/[0.04] active:bg-white/[0.08]')}`
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="whitespace-nowrap sm:hidden">{tab.mobileLabel}</span>
                    <span className="whitespace-nowrap hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-4"
              >
                {/* Contact Information */}
                <div className="lg:col-span-2 space-y-4">
                  <SectionCard icon={User} title="Contact Information" crt={crt}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 sm:gap-x-8">
                      <div>
                        <InfoRow
                          icon={Mail}
                          label="Work Email"
                          value={contact.email}
                          link={contact.email ? `mailto:${contact.email}` : null}
                          copyable
                          crt={crt}
                        />
                        <InfoRow
                          icon={Mail}
                          label="Personal Email"
                          value={contact.personal_email}
                          link={contact.personal_email ? `mailto:${contact.personal_email}` : null}
                          copyable
                          crt={crt}
                        />
                        <InfoRow
                          icon={Phone}
                          label="Work Phone"
                          value={contact.phone || contact.work_phone}
                          link={contact.phone ? `tel:${contact.phone}` : null}
                          copyable
                          crt={crt}
                        />
                        <InfoRow
                          icon={Phone}
                          label="Mobile"
                          value={contact.mobile_phone}
                          link={contact.mobile_phone ? `tel:${contact.mobile_phone}` : null}
                          copyable
                          crt={crt}
                        />
                      </div>
                      <div>
                        <InfoRow
                          icon={Linkedin}
                          label="LinkedIn"
                          value="View Profile"
                          link={contact.linkedin_url}
                          crt={crt}
                        />
                        <InfoRow icon={MapPin} label="City" value={contact.location_city} crt={crt} />
                        <InfoRow icon={MapPin} label="Region" value={contact.location_region} crt={crt} />
                        <InfoRow icon={MapPin} label="Country" value={contact.location_country} crt={crt} />
                      </div>
                    </div>
                  </SectionCard>

                  {/* Quick Company Preview */}
                  {contact.company && (
                    <SectionCard icon={Building} title="Company Overview" crt={crt}>
                      <div className="flex items-start gap-4">
                        {contact.company_logo_url ? (
                          <img
                            src={contact.company_logo_url}
                            alt={contact.company}
                            className={`w-16 h-16 rounded-xl object-contain ${crt('bg-slate-50', 'bg-white/5')} p-2`}
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center border border-cyan-500/30">
                            <Building className="w-8 h-8 text-cyan-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className={`text-lg font-semibold ${crt('text-slate-900', 'text-white')}`}>{contact.company}</h4>
                          <p className={`${crt('text-slate-500', 'text-white/60')} text-sm`}>{contact.company_industry}</p>
                          {contact.company_domain && (
                            <a
                              href={`https://${contact.company_domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mt-1"
                            >
                              {contact.company_domain} <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                        <div>
                          <p className={`text-xs ${crt('text-slate-400', 'text-white/40')}`}>Employees</p>
                          <p className={`text-sm ${crt('text-slate-900', 'text-white')} font-medium`}>
                            {contact.company_employee_count?.toLocaleString() || contact.company_size || '-'}
                          </p>
                        </div>
                        <div>
                          <p className={`text-xs ${crt('text-slate-400', 'text-white/40')}`}>Revenue</p>
                          <p className={`text-sm ${crt('text-slate-900', 'text-white')} font-medium`}>{contact.company_revenue || '-'}</p>
                        </div>
                        <div>
                          <p className={`text-xs ${crt('text-slate-400', 'text-white/40')}`}>Founded</p>
                          <p className={`text-sm ${crt('text-slate-900', 'text-white')} font-medium`}>{contact.company_founded_year || '-'}</p>
                        </div>
                        <div>
                          <p className={`text-xs ${crt('text-slate-400', 'text-white/40')}`}>Total Funding</p>
                          <p className={`text-sm ${crt('text-slate-900', 'text-white')} font-medium`}>{contact.company_funding_total || '-'}</p>
                        </div>
                      </div>
                    </SectionCard>
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  {/* Enrichment Status with Quality Score */}
                  <SectionCard icon={Sparkles} title="Enrichment Data" crt={crt}>
                    {/* Quality Score */}
                    {(() => {
                      // Calculate enrichment quality score
                      const dataPoints = [
                        contact.email,
                        contact.mobile_phone || contact.phone,
                        contact.linkedin_url,
                        contact.job_title,
                        contact.company,
                        contact.location_city || contact.location_country,
                        contact.skills?.length > 0,
                        contact.work_history?.length > 0,
                        contact.education?.length > 0,
                        contact.company_industry,
                        contact.company_size || contact.company_employee_count,
                        contact.company_revenue,
                        contact.company_description,
                        contact.company_logo_url,
                      ].filter(Boolean).length;
                      const totalPoints = 14;
                      const score = Math.round((dataPoints / totalPoints) * 100);
                      const scoreColorClasses = score >= 80
                        ? { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' }
                        : score >= 50
                        ? { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' }
                        : { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' };

                      return (
                        <div className={`mb-3 p-3 ${crt('bg-slate-50 border border-slate-100', 'bg-gradient-to-r from-white/[0.02] to-white/[0.04] border border-white/[0.06]')} rounded-xl`}>
                          <div className="flex items-center justify-between mb-2">
                            <p className={`text-sm ${crt('text-slate-500', 'text-white/50')}`}>Data Quality Score</p>
                            <Badge className={`${scoreColorClasses.bg} ${scoreColorClasses.text} ${scoreColorClasses.border}`}>
                              {score}%
                            </Badge>
                          </div>
                          <div className={`w-full ${crt('bg-slate-200', 'bg-white/[0.06]')} rounded-full h-2`}>
                            <div
                              className={`h-2 rounded-full transition-all bg-gradient-to-r ${
                                score >= 80 ? 'from-green-500 to-green-400' :
                                score >= 50 ? 'from-yellow-500 to-yellow-400' :
                                'from-red-500 to-red-400'
                              }`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <p className={`text-xs ${crt('text-slate-400', 'text-white/40')} mt-2`}>
                            {dataPoints} of {totalPoints} data points enriched
                          </p>
                        </div>
                      );
                    })()}

                    <div className="space-y-1">
                      <InfoRow icon={Clock} label="Last Enriched" value={formatDate(contact.enriched_at)} crt={crt} />
                      <InfoRow icon={Target} label="Source" value={contact.enrichment_source} crt={crt} />
                      <InfoRow icon={Hash} label="Prospect ID" value={contact.explorium_prospect_id} copyable crt={crt} />
                      <InfoRow icon={Hash} label="Business ID" value={contact.explorium_business_id} copyable crt={crt} />
                    </div>
                    <div className={`mt-3 pt-3 border-t ${crt('border-slate-100', 'border-white/[0.06]')}`}>
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className={`p-3 ${crt('bg-slate-50', 'bg-white/[0.03]')} rounded-xl`}>
                          <p className="text-2xl font-bold text-cyan-400">{contact.skills?.length || 0}</p>
                          <p className={`text-xs ${crt('text-slate-500', 'text-white/50')}`}>Skills</p>
                        </div>
                        <div className={`p-3 ${crt('bg-slate-50', 'bg-white/[0.03]')} rounded-xl`}>
                          <p className="text-2xl font-bold text-cyan-400">{contact.work_history?.length || 0}</p>
                          <p className={`text-xs ${crt('text-slate-500', 'text-white/50')}`}>Jobs</p>
                        </div>
                        <div className={`p-3 ${crt('bg-slate-50', 'bg-white/[0.03]')} rounded-xl`}>
                          <p className="text-2xl font-bold text-cyan-400">{contact.company_tech_stack?.length || 0}</p>
                          <p className={`text-xs ${crt('text-slate-500', 'text-white/50')}`}>Tech Stack</p>
                        </div>
                        <div className={`p-3 ${crt('bg-slate-50', 'bg-white/[0.03]')} rounded-xl`}>
                          <p className="text-2xl font-bold text-cyan-400">{fundingRounds.length || 0}</p>
                          <p className={`text-xs ${crt('text-slate-500', 'text-white/50')}`}>Funding Rounds</p>
                        </div>
                      </div>
                    </div>
                  </SectionCard>

                  {/* Intent Topics */}
                  {contact.intent_topics && contact.intent_topics.length > 0 && (
                    <SectionCard icon={Target} title="Intent Topics" crt={crt}>
                      <p className={`text-xs ${crt('text-slate-400', 'text-white/40')} mb-3`}>What this company is researching</p>
                      <div className="flex flex-wrap gap-2">
                        {contact.intent_topics.slice(0, 10).map((topic, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="bg-orange-500/10 border-orange-500/30 text-orange-400"
                          >
                            <Zap className="w-3 h-3 mr-1" />
                            {typeof topic === 'string' ? topic : topic.name || topic.topic}
                          </Badge>
                        ))}
                      </div>
                    </SectionCard>
                  )}
                </div>
              </motion.div>
            )}

            {/* Skills & Career Tab */}
            {activeTab === 'skills' && (
              <motion.div
                key="skills"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-4"
              >
                <div className="lg:col-span-2 space-y-4">
                  {/* Skills */}
                  <SectionCard icon={Award} title={`Skills (${contact.skills?.length || 0})`} crt={crt}>
                    {contact.skills && contact.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {contact.skills.map((skill, i) => {
                          // Handle both string and object formats
                          const skillName = typeof skill === 'object' ? (skill?.name || skill?.skill || JSON.stringify(skill)) : String(skill);
                          return (
                            <Badge
                              key={i}
                              variant="outline"
                              className="bg-cyan-500/10 border-cyan-500/30 text-cyan-400 px-3 py-1"
                            >
                              {skillName}
                            </Badge>
                          );
                        })}
                      </div>
                    ) : (
                      <p className={`${crt('text-slate-400', 'text-white/50')} text-sm`}>No skills data available</p>
                    )}
                  </SectionCard>

                  {/* Work History */}
                  <SectionCard icon={History} title={`Work History (${contact.work_history?.length || 0})`} crt={crt}>
                    {contact.work_history && contact.work_history.length > 0 ? (
                      <div className="space-y-4">
                        {contact.work_history.map((job, i) => {
                          // Handle nested object structures from Explorium API
                          const jobTitle = typeof job.title === 'object' ? job.title?.name : (job.title || job.job_title);
                          const companyName = typeof job.company === 'object' ? job.company?.name : (job.company || job.company_name);
                          const description = job.summary || job.description;

                          return (
                            <div
                              key={i}
                              className={`flex gap-3 p-3 ${crt('bg-slate-50 border border-slate-100 hover:bg-slate-100', 'bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04]')} rounded-xl transition-colors`}
                            >
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center border border-cyan-500/30 flex-shrink-0">
                                <Briefcase className="w-4 h-4 text-cyan-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`font-semibold ${crt('text-slate-900', 'text-white')}`}>{jobTitle || 'Unknown Position'}</p>
                                <p className={`text-sm ${crt('text-slate-500', 'text-white/60')}`}>{companyName || 'Unknown Company'}</p>
                                {(job.start_date || job.end_date) && (
                                  <p className={`text-xs ${crt('text-slate-400', 'text-white/40')} mt-1 flex items-center gap-1`}>
                                    <Calendar className="w-3 h-3" />
                                    {job.start_date} - {job.end_date || 'Present'}
                                  </p>
                                )}
                                {description && (
                                  <p className={`text-sm ${crt('text-slate-400', 'text-white/50')} mt-2 line-clamp-2`}>{description}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className={`${crt('text-slate-400', 'text-white/50')} text-sm`}>No work history data available</p>
                    )}
                  </SectionCard>
                </div>

                <div className="space-y-4">
                  {/* Education */}
                  <SectionCard icon={GraduationCap} title={`Education (${contact.education?.length || 0})`} crt={crt}>
                    {contact.education && contact.education.length > 0 ? (
                      <div className="space-y-4">
                        {contact.education.map((edu, i) => {
                          // Handle nested object structures from Explorium API
                          const schoolName = typeof edu.school === 'object' ? edu.school?.name : (edu.school || edu.institution);
                          const degreeName = Array.isArray(edu.degrees) ? edu.degrees.join(', ') : (edu.degree || edu.field_of_study);
                          const majorName = Array.isArray(edu.majors) ? edu.majors.join(', ') : edu.major;
                          const displayDegree = degreeName || majorName || 'Degree';

                          return (
                            <div
                              key={i}
                              className={`p-4 ${crt('bg-slate-50 border border-slate-100', 'bg-white/[0.02] border border-white/[0.04]')} rounded-xl`}
                            >
                              <p className={`font-medium ${crt('text-slate-900', 'text-white')}`}>{displayDegree}</p>
                              <p className={`text-sm ${crt('text-slate-500', 'text-white/60')}`}>{schoolName || 'Unknown Institution'}</p>
                              {(edu.year || edu.end_date || edu.graduation_year) && (
                                <p className={`text-xs ${crt('text-slate-400', 'text-white/40')} mt-1 flex items-center gap-1`}>
                                  <Calendar className="w-3 h-3" />
                                  {edu.year || edu.end_date || edu.graduation_year}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className={`${crt('text-slate-400', 'text-white/50')} text-sm`}>No education data available</p>
                    )}
                  </SectionCard>

                  {/* Certifications */}
                  <SectionCard icon={BadgeCheck} title={`Certifications (${contact.certifications?.length || 0})`} crt={crt}>
                    {contact.certifications && contact.certifications.length > 0 ? (
                      <div className="space-y-2">
                        {contact.certifications.map((cert, i) => {
                          // Handle both string and object formats
                          const certName = typeof cert === 'object' ? (cert?.name || cert?.title || JSON.stringify(cert)) : String(cert);
                          const certIssuer = typeof cert === 'object' ? cert?.issuer : null;
                          return (
                            <div
                              key={i}
                              className={`flex items-center gap-3 p-3 ${crt('bg-slate-50 border border-slate-100', 'bg-white/[0.02] border border-white/[0.04]')} rounded-xl`}
                            >
                              <BadgeCheck className="w-5 h-5 text-green-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${crt('text-slate-900', 'text-white')} truncate`}>
                                  {certName}
                                </p>
                                {certIssuer && <p className={`text-xs ${crt('text-slate-400', 'text-white/50')}`}>{certIssuer}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className={`${crt('text-slate-400', 'text-white/50')} text-sm`}>No certifications data available</p>
                    )}
                  </SectionCard>

                  {/* Interests */}
                  <SectionCard icon={Lightbulb} title={`Interests (${contact.interests?.length || 0})`} crt={crt}>
                    {contact.interests && contact.interests.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {contact.interests.map((interest, i) => {
                          // Handle both string and object formats
                          const interestName = typeof interest === 'object' ? (interest?.name || interest?.interest || JSON.stringify(interest)) : String(interest);
                          return (
                            <Badge
                              key={i}
                              variant="outline"
                              className="bg-purple-500/10 border-purple-500/30 text-purple-400"
                            >
                              {interestName}
                            </Badge>
                          );
                        })}
                      </div>
                    ) : (
                      <p className={`${crt('text-slate-400', 'text-white/50')} text-sm`}>No interests data available</p>
                    )}
                  </SectionCard>
                </div>
              </motion.div>
            )}

            {/* Company Tab */}
            {activeTab === 'company' && (
              <motion.div
                key="company"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {contact.company ? (
                  <>
                    {/* Company Header */}
                    <div className={`${crt('bg-white border border-slate-200 shadow-sm', 'bg-white/[0.03] border border-white/[0.06]')} rounded-xl p-4`}>
                      <div className="flex items-start gap-6">
                        {contact.company_logo_url ? (
                          <img
                            src={contact.company_logo_url}
                            alt={contact.company}
                            className={`w-24 h-24 rounded-2xl object-contain ${crt('bg-slate-50', 'bg-white/5')} p-3`}
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center border border-cyan-500/30">
                            <Building className="w-12 h-12 text-cyan-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h2 className={`text-2xl font-bold ${crt('text-slate-900', 'text-white')}`}>{contact.company}</h2>
                            {contact.company_is_ipo && contact.company_ticker && (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                ${contact.company_ticker}
                              </Badge>
                            )}
                          </div>
                          <p className={`${crt('text-slate-500', 'text-white/60')} text-lg`}>{contact.company_industry}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-3">
                            {contact.company_domain && (
                              <a
                                href={`https://${contact.company_domain}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                              >
                                <Globe className="w-4 h-4" />
                                {contact.company_domain}
                              </a>
                            )}
                            {contact.company_linkedin && (
                              <a
                                href={contact.company_linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                              >
                                <Linkedin className="w-4 h-4" />
                                LinkedIn
                              </a>
                            )}
                            {contact.company_hq_location && (
                              <span className={`inline-flex items-center gap-1 ${crt('text-slate-400', 'text-white/50')}`}>
                                <MapPin className="w-4 h-4" />
                                {contact.company_hq_location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Company Stats */}
                      <div className={`grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t ${crt('border-slate-200', 'border-white/[0.06]')}`}>
                        <StatCard
                          icon={Users}
                          label="Employees"
                          value={contact.company_employee_count?.toLocaleString() || contact.company_size}
                          crt={crt}
                        />
                        <StatCard
                          icon={Euro}
                          label="Revenue"
                          value={contact.company_revenue}
                          crt={crt}
                        />
                        <StatCard
                          icon={Calendar}
                          label="Founded"
                          value={contact.company_founded_year}
                          crt={crt}
                        />
                        <StatCard
                          icon={TrendingUp}
                          label="Total Funding"
                          value={contact.company_funding_total}
                          crt={crt}
                        />
                        <StatCard
                          icon={Cpu}
                          label="Tech Stack"
                          value={contact.company_tech_stack?.length || 0}
                          crt={crt}
                        />
                        <StatCard
                          icon={Building2}
                          label="Funding Rounds"
                          value={fundingRounds.length || 0}
                          crt={crt}
                        />
                      </div>
                    </div>

                    {/* Company Description */}
                    {contact.company_description && (
                      <SectionCard icon={FileText} title="About" crt={crt}>
                        <ExpandableText text={contact.company_description} maxLength={500} crt={crt} />
                      </SectionCard>
                    )}

                    {/* Industry Classification & Locations */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Industry Classification */}
                      {(contact.company_naics || contact.company_sic_code) && (
                        <SectionCard icon={Briefcase} title="Industry Classification" crt={crt}>
                          <div className="space-y-4">
                            {contact.company_naics && (
                              <div className={`p-4 ${crt('bg-slate-50 border border-slate-100', 'bg-white/[0.02] border border-white/[0.04]')} rounded-xl`}>
                                <div className="flex items-center justify-between mb-2">
                                  <p className={`text-sm ${crt('text-slate-400', 'text-white/50')}`}>NAICS Code</p>
                                  <Badge className="bg-cyan-500/10 border-cyan-500/30 text-cyan-400">
                                    {contact.company_naics}
                                  </Badge>
                                </div>
                                <p className={`text-sm ${crt('text-slate-900', 'text-white')}`}>{contact.company_naics_description || 'N/A'}</p>
                              </div>
                            )}
                            {contact.company_sic_code && (
                              <div className={`p-4 ${crt('bg-slate-50 border border-slate-100', 'bg-white/[0.02] border border-white/[0.04]')} rounded-xl`}>
                                <div className="flex items-center justify-between mb-2">
                                  <p className={`text-sm ${crt('text-slate-400', 'text-white/50')}`}>SIC Code</p>
                                  <Badge className="bg-purple-500/10 border-purple-500/30 text-purple-400">
                                    {contact.company_sic_code}
                                  </Badge>
                                </div>
                                <p className={`text-sm ${crt('text-slate-900', 'text-white')}`}>{contact.company_sic_code_description || 'N/A'}</p>
                              </div>
                            )}
                          </div>
                        </SectionCard>
                      )}

                      {/* Global Presence */}
                      {contact.company_locations_distribution && contact.company_locations_distribution.length > 0 && (
                        <SectionCard icon={Globe} title="Global Presence" crt={crt}>
                          <div className="space-y-3">
                            {contact.company_locations_distribution.map((loc, i) => (
                              <div
                                key={i}
                                className={`flex items-center justify-between p-3 ${crt('bg-slate-50 border border-slate-100', 'bg-white/[0.02] border border-white/[0.04]')} rounded-xl`}
                              >
                                <div className="flex items-center gap-3">
                                  <MapPin className={`w-4 h-4 ${crt('text-slate-400', 'text-white/40')}`} />
                                  <p className={`text-sm ${crt('text-slate-900', 'text-white')} uppercase`}>{loc.country}</p>
                                </div>
                                <Badge variant="outline" className={`${crt('bg-slate-100 border-slate-200 text-slate-600', 'bg-white/[0.04] border-white/[0.08] text-white/70')}`}>
                                  {loc.locations} {loc.locations === 1 ? 'location' : 'locations'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </SectionCard>
                      )}
                    </div>
                  </>
                ) : (
                  <div className={`${crt('bg-white border border-slate-200 shadow-sm', 'bg-white/[0.03] border border-white/[0.06]')} rounded-2xl p-12 text-center`}>
                    <Building className={`w-16 h-16 ${crt('text-slate-300', 'text-white/20')} mx-auto mb-4`} />
                    <h3 className={`text-lg font-semibold ${crt('text-slate-900', 'text-white')} mb-2`}>No Company Information</h3>
                    <p className={`${crt('text-slate-500', 'text-white/60')}`}>Company details will appear here once enriched.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Tech Stack Tab */}
            {activeTab === 'techstack' && (
              <motion.div
                key="techstack"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {hasTechData ? (
                  <>
                    {/* Tech Stack Overview */}
                    <div className={`${crt('bg-white border border-slate-200 shadow-sm', 'bg-white/[0.03] border border-white/[0.06]')} rounded-xl p-4`}>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-cyan-500/10">
                            <Cpu className="w-5 h-5 text-cyan-400" />
                          </div>
                          <div>
                            <h3 className={`text-lg font-semibold ${crt('text-slate-900', 'text-white')}`}>Technology Stack</h3>
                            <p className={`text-sm ${crt('text-slate-400', 'text-white/50')}`}>{contact.company_tech_stack?.length || 0} technologies detected</p>
                          </div>
                        </div>
                      </div>

                      {/* All Technologies */}
                      {contact.company_tech_stack?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {contact.company_tech_stack.map((tech, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="bg-blue-500/10 border-blue-500/30 text-blue-400 px-3 py-1"
                            >
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Tech by Category */}
                    {Object.keys(techCategories).length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(techCategories).map(([category, techs]) => {
                          const IconComponent = getTechCategoryIcon(category);
                          return (
                            <div
                              key={category}
                              className={`${crt('bg-white border border-slate-200 shadow-sm hover:bg-slate-50', 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05]')} rounded-xl p-4 transition-colors`}
                            >
                              <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg bg-cyan-500/10">
                                  <IconComponent className="w-4 h-4 text-cyan-400" />
                                </div>
                                <div>
                                  <h4 className={`font-medium ${crt('text-slate-900', 'text-white')} capitalize`}>{category}</h4>
                                  <p className={`text-xs ${crt('text-slate-400', 'text-white/50')}`}>{Array.isArray(techs) ? techs.length : 0} tools</p>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {Array.isArray(techs) && techs.slice(0, 8).map((tech, i) => (
                                  <Badge
                                    key={i}
                                    variant="outline"
                                    className={`${crt('bg-slate-100 border-slate-200 text-slate-600', 'bg-white/[0.04] border-white/[0.08] text-white/70')} text-xs`}
                                  >
                                    {tech}
                                  </Badge>
                                ))}
                                {Array.isArray(techs) && techs.length > 8 && (
                                  <Badge
                                    variant="outline"
                                    className={`${crt('bg-slate-100 border-slate-200 text-slate-400', 'bg-white/[0.04] border-white/[0.08] text-white/50')} text-xs`}
                                  >
                                    +{techs.length - 8} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <div className={`${crt('bg-white border border-slate-200 shadow-sm', 'bg-white/[0.03] border border-white/[0.06]')} rounded-2xl p-12 text-center`}>
                    <Cpu className={`w-16 h-16 ${crt('text-slate-300', 'text-white/20')} mx-auto mb-4`} />
                    <h3 className={`text-lg font-semibold ${crt('text-slate-900', 'text-white')} mb-2`}>No Tech Stack Data</h3>
                    <p className={`${crt('text-slate-500', 'text-white/60')}`}>Technology stack information will appear here once enriched.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Funding Tab */}
            {activeTab === 'funding' && (
              <motion.div
                key="funding"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {hasFundingData ? (
                  <>
                    {/* Funding Overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <StatCard
                        icon={Euro}
                        label="Total Funding"
                        value={contact.company_funding_total || '-'}
                        color="green"
                        crt={crt}
                      />
                      <StatCard
                        icon={TrendingUp}
                        label="Funding Rounds"
                        value={fundingRounds.length}
                        color="blue"
                        crt={crt}
                      />
                      <StatCard
                        icon={Users}
                        label="Investors"
                        value={investors.length}
                        color="purple"
                        crt={crt}
                      />
                      <StatCard
                        icon={contact.company_is_ipo ? Building2 : Building}
                        label="Company Status"
                        value={contact.company_is_ipo ? 'Public' : 'Private'}
                        color={contact.company_is_ipo ? 'green' : 'cyan'}
                        subtext={contact.company_ticker ? `$${contact.company_ticker}` : null}
                        crt={crt}
                      />
                    </div>

                    {/* Funding Rounds Timeline */}
                    {fundingRounds.length > 0 && (
                      <SectionCard icon={TrendingUp} title={`Funding Rounds (${fundingRounds.length})`} crt={crt}>
                        <div className="space-y-3">
                          {fundingRounds.map((round, i) => (
                            <div
                              key={i}
                              className={`flex gap-3 p-3 ${crt('bg-slate-50 border border-slate-100 hover:bg-slate-100', 'bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04]')} rounded-xl transition-colors`}
                            >
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center border border-green-500/30 flex-shrink-0">
                                <BadgeEuro className="w-4 h-4 text-green-400" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className={`font-semibold ${crt('text-slate-900', 'text-white')}`}>
                                    {round.series || round.type || round.round_type || `Round ${i + 1}`}
                                  </p>
                                  <p className="text-lg font-bold text-green-400">
                                    {formatCurrency(round.amount || round.raised)}
                                  </p>
                                </div>
                                {round.date && (
                                  <p className={`text-sm ${crt('text-slate-400', 'text-white/50')} flex items-center gap-1 mt-1`}>
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(round.date)}
                                  </p>
                                )}
                                {round.investors && round.investors.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {round.investors.slice(0, 5).map((investor, j) => (
                                      <Badge
                                        key={j}
                                        variant="outline"
                                        className={`${crt('bg-slate-100 border-slate-200 text-slate-600', 'bg-white/[0.04] border-white/[0.08] text-white/70')} text-xs`}
                                      >
                                        {typeof investor === 'string' ? investor : investor.name}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </SectionCard>
                    )}

                    {/* Investors */}
                    {investors.length > 0 && (
                      <SectionCard icon={Users} title={`Investors (${investors.length})`} crt={crt}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                          {investors.map((investor, i) => (
                            <div
                              key={i}
                              className={`p-2 ${crt('bg-slate-50 border border-slate-100 hover:bg-slate-100', 'bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04]')} rounded-xl transition-colors text-center`}
                            >
                              <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-1">
                                <Building2 className="w-4 h-4 text-purple-400" />
                              </div>
                              <p className={`text-sm font-medium ${crt('text-slate-900', 'text-white')} truncate`}>
                                {typeof investor === 'string' ? investor : investor.name}
                              </p>
                              {investor.type && (
                                <p className={`text-xs ${crt('text-slate-400', 'text-white/50')}`}>{investor.type}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </SectionCard>
                    )}
                  </>
                ) : (
                  <div className={`${crt('bg-white border border-slate-200 shadow-sm', 'bg-white/[0.03] border border-white/[0.06]')} rounded-2xl p-12 text-center`}>
                    <Euro className={`w-16 h-16 ${crt('text-slate-300', 'text-white/20')} mx-auto mb-4`} />
                    <h3 className={`text-lg font-semibold ${crt('text-slate-900', 'text-white')} mb-2`}>No Funding Data</h3>
                    <p className={`${crt('text-slate-500', 'text-white/60')}`}>Funding information will appear here once enriched.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Social Tab */}
            {activeTab === 'social' && (
              <motion.div
                key="social"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-4"
              >
                {/* Social Profiles */}
                <SectionCard icon={Share2} title="Social Profiles" crt={crt}>
                  {hasSocialData || contact.linkedin_url ? (
                    <div className="space-y-3">
                      {contact.linkedin_url && (
                        <a
                          href={contact.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-3 p-3 ${crt('bg-slate-50 border border-slate-100 hover:bg-blue-50 hover:border-blue-200', 'bg-white/[0.02] border border-white/[0.04] hover:bg-blue-500/10 hover:border-blue-500/30')} rounded-xl transition-all group`}
                        >
                          <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/30">
                            <Linkedin className="w-4 h-4 text-blue-400" />
                          </div>
                          <div className="flex-1">
                            <p className={`font-medium ${crt('text-slate-900', 'text-white')} group-hover:text-blue-400 transition-colors`}>LinkedIn</p>
                            <p className={`text-sm ${crt('text-slate-400', 'text-white/50')} truncate`}>{contact.linkedin_url}</p>
                          </div>
                          <ExternalLink className={`w-5 h-5 ${crt('text-slate-300', 'text-white/30')} group-hover:text-blue-400 transition-colors`} />
                        </a>
                      )}
                      {Object.entries(socialProfiles).map(([platform, url]) => {
                        if (!url) return null;
                        const IconComponent = getSocialIcon(platform);
                        return (
                          <a
                            key={platform}
                            href={url.startsWith('http') ? url : `https://${url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-3 p-3 ${crt('bg-slate-50 border border-slate-100 hover:bg-cyan-50 hover:border-cyan-200', 'bg-white/[0.02] border border-white/[0.04] hover:bg-cyan-500/10 hover:border-cyan-500/30')} rounded-xl transition-all group`}
                          >
                            <div className={`w-8 h-8 rounded-xl ${crt('bg-slate-100 border border-slate-200', 'bg-white/[0.06] border border-white/[0.08]')} flex items-center justify-center`}>
                              <IconComponent className={`w-4 h-4 ${crt('text-slate-500', 'text-white/60')}`} />
                            </div>
                            <div className="flex-1">
                              <p className={`font-medium ${crt('text-slate-900', 'text-white')} capitalize group-hover:text-cyan-400 transition-colors`}>{platform}</p>
                              <p className={`text-sm ${crt('text-slate-400', 'text-white/50')} truncate`}>{url}</p>
                            </div>
                            <ExternalLink className={`w-5 h-5 ${crt('text-slate-300', 'text-white/30')} group-hover:text-cyan-400 transition-colors`} />
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Share2 className={`w-12 h-12 ${crt('text-slate-300', 'text-white/20')} mx-auto mb-3`} />
                      <p className={`${crt('text-slate-400', 'text-white/50')}`}>No social profiles available</p>
                    </div>
                  )}
                </SectionCard>

                {/* Social Activity */}
                <SectionCard icon={BarChart3} title="Social Activity" crt={crt}>
                  {contact.social_activity && Object.keys(contact.social_activity).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(contact.social_activity).map(([key, value]) => (
                        <div key={key} className={`flex items-center justify-between p-3 ${crt('bg-slate-50', 'bg-white/[0.02]')} rounded-xl`}>
                          <p className={`text-sm ${crt('text-slate-600', 'text-white/70')} capitalize`}>{key.replace(/_/g, ' ')}</p>
                          <p className={`text-sm font-medium ${crt('text-slate-900', 'text-white')}`}>
                            {typeof value === 'number' ? value.toLocaleString() : String(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BarChart3 className={`w-12 h-12 ${crt('text-slate-300', 'text-white/20')} mx-auto mb-3`} />
                      <p className={`${crt('text-slate-400', 'text-white/50')}`}>No social activity data available</p>
                    </div>
                  )}
                </SectionCard>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </CRMPageTransition>
  );
}
