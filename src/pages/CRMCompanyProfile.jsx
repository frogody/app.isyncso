import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { createPageUrl } from '@/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Building2,
  Briefcase,
  Globe,
  Linkedin,
  ExternalLink,
  Calendar,
  Sparkles,
  Clock,
  DollarSign,
  Target,
  TrendingUp,
  Users,
  ChevronRight,
  Search,
  Plus,
  Twitter,
  Facebook,
  Instagram,
  Layers,
  Banknote,
  Award,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

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

// Reusable components - Mobile responsive
const StatCard = ({ label, value, icon: Icon, color = 'cyan', subtext }) => (
  <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg sm:rounded-xl p-3 sm:p-4 hover:bg-white/[0.05] transition-colors">
    <div className="flex items-start justify-between mb-2 sm:mb-2">
      <div className={`p-2 sm:p-2 rounded-lg sm:rounded-lg bg-${color}-500/10`}>
        <Icon className={`w-4 h-4 sm:w-4 sm:h-4 text-${color}-400`} />
      </div>
    </div>
    <p className="text-lg sm:text-lg font-bold text-white mb-0.5 sm:mb-1">{value || '-'}</p>
    <p className="text-xs sm:text-xs text-white/50">{label}</p>
    {subtext && <p className="text-[10px] sm:text-[10px] text-white/30 mt-0.5 sm:mt-1">{subtext}</p>}
  </div>
);

const InfoRow = ({ icon: Icon, label, value, link }) => {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 sm:gap-3 py-2.5 sm:py-3 border-b border-white/[0.04] last:border-0">
      <div className="p-1.5 sm:p-2 rounded-lg bg-white/[0.04] flex-shrink-0">
        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/40" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] sm:text-xs text-white/40">{label}</p>
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
          <p className="text-xs sm:text-sm text-white truncate">{value}</p>
        )}
      </div>
    </div>
  );
};

const SectionCard = ({ icon: Icon, title, children, action }) => (
  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl sm:rounded-2xl p-4 sm:p-6">
    <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-cyan-500/10 flex-shrink-0">
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
        </div>
        <h3 className="text-sm sm:text-base font-semibold text-white truncate">{title}</h3>
      </div>
      {action}
    </div>
    {children}
  </div>
);

const ExpandableText = ({ text, maxLength = 300 }) => {
  const [expanded, setExpanded] = useState(false);
  if (!text) return <p className="text-white/60 text-sm">No information available</p>;
  if (text.length <= maxLength) return <p className="text-white/70 text-sm leading-relaxed">{text}</p>;

  return (
    <div>
      <p className="text-white/70 text-sm leading-relaxed">
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

const ContactCard = ({ contact, onClick }) => {
  const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown';
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:bg-white/[0.05] hover:border-cyan-500/30 active:bg-white/[0.08] transition-all cursor-pointer group"
    >
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center text-sm sm:text-lg font-semibold text-cyan-400 border border-cyan-500/30 flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate text-sm sm:text-base">{fullName}</p>
        <p className="text-xs sm:text-sm text-white/60 truncate">{contact.job_title || 'No title'}</p>
        {contact.email && (
          <p className="text-[10px] sm:text-xs text-white/40 truncate">{contact.email}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <Badge
          className={`text-[10px] sm:text-xs ${
            contact.stage === 'Won'
              ? 'bg-green-500/20 text-green-400'
              : contact.stage === 'Lost'
              ? 'bg-red-500/20 text-red-400'
              : 'bg-cyan-500/20 text-cyan-400'
          }`}
        >
          {contact.stage || 'New'}
        </Badge>
        <ChevronRight className="w-4 h-4 text-white/40 hidden sm:block" />
      </div>
    </div>
  );
};

export default function CRMCompanyProfile() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get('id');

  const [company, setCompany] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [contactSearch, setContactSearch] = useState('');

  useEffect(() => {
    if (companyId && user?.organization_id) {
      fetchCompany();
      fetchContacts();
    }
  }, [companyId, user?.organization_id]);

  const fetchCompany = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_companies')
        .select('*')
        .eq('id', companyId)
        .eq('organization_id', user.organization_id)
        .single();

      if (error) throw error;
      setCompany(data);
    } catch (err) {
      console.error('Error fetching company:', err);
      toast.error('Failed to load company');
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .eq('crm_company_id', companyId)
        .order('created_date', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (err) {
      console.error('Error fetching contacts:', err);
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    if (!contactSearch) return true;
    const searchLower = contactSearch.toLowerCase();
    const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.toLowerCase();
    return (
      fullName.includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower) ||
      contact.job_title?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="w-full px-6 lg:px-8 py-6 space-y-6">
          <Skeleton className="h-8 w-32 bg-white/10" />
          <Skeleton className="h-64 w-full bg-white/10 rounded-3xl" />
          <Skeleton className="h-12 w-full bg-white/10 rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96 lg:col-span-2 bg-white/10 rounded-2xl" />
            <Skeleton className="h-96 bg-white/10 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Building className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Company Not Found</h2>
          <p className="text-white/60 mb-6">This company may have been deleted or you don't have access.</p>
          <Link
            to={createPageUrl('CRMContacts')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to CRM
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'contacts', label: 'Contacts', count: contacts.length },
    { id: 'deals', label: 'Deals' },
  ];

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const stageBadgeColor = {
    prospect: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    qualified: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    negotiation: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    customer: 'bg-green-500/20 text-green-400 border-green-500/30',
    churned: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  // Calculate contact stats
  const contactStats = {
    total: contacts.length,
    won: contacts.filter((c) => c.stage === 'Won').length,
    totalValue: contacts.reduce((sum, c) => sum + (Number(c.deal_value) || 0), 0),
  };

  return (
    <div className="min-h-screen bg-black">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6"
      >
        {/* Back Navigation */}
        <motion.div variants={itemVariants}>
          <Link
            to={createPageUrl('CRMContacts')}
            className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors min-h-[44px] active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm sm:text-base">Back to CRM</span>
          </Link>
        </motion.div>

        {/* Hero Section */}
        <motion.div
          variants={itemVariants}
          className="bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/[0.06] rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-start gap-4 sm:gap-6">
            {/* Logo & Basic Info */}
            <div className="flex items-start gap-4 sm:gap-5 flex-1">
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-xl sm:rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 flex-shrink-0">
                {company.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={company.name}
                    className="w-full h-full object-cover rounded-xl sm:rounded-2xl"
                  />
                ) : (
                  <Building2 className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1 truncate">{company.name}</h1>
                <p className="text-white/60 text-sm sm:text-base lg:text-lg mb-2 sm:mb-3">{company.industry || 'No industry'}</p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {company.domain && (
                    <a
                      href={`https://${company.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-sm active:scale-[0.98]"
                    >
                      <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="truncate max-w-[150px] sm:max-w-none">{company.domain}</span>
                    </a>
                  )}
                  {company.hq_location && (
                    <Badge className="bg-white/10 text-white/70 border-white/10 text-xs sm:text-sm hidden sm:flex">
                      <MapPin className="w-3 h-3 mr-1" />
                      {company.hq_location}
                    </Badge>
                  )}
                  {company.stage && (
                    <Badge className={`text-xs sm:text-sm ${stageBadgeColor[company.stage] || 'bg-white/10 text-white/70'}`}>
                      {company.stage}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-2 sm:gap-3">
              {company.linkedin_url && (
                <a
                  href={company.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 sm:p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <Linkedin className="w-5 h-5 text-white/60" />
                </a>
              )}
              {company.twitter_url && (
                <a
                  href={company.twitter_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 sm:p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <Twitter className="w-5 h-5 text-white/60" />
                </a>
              )}
              {company.facebook_url && (
                <a
                  href={company.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 sm:p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <Facebook className="w-5 h-5 text-white/60" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Stats Bar - Scrollable on mobile */}
          <div className="mt-6 sm:mt-8 pt-4 sm:pt-8 border-t border-white/[0.06]">
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible scrollbar-hide sm:grid sm:grid-cols-3 md:grid-cols-6">
              <div className="text-center min-w-[80px] sm:min-w-0 flex-shrink-0 sm:flex-shrink">
                <p className="text-xs sm:text-sm text-white/40 mb-0.5 sm:mb-1">Employees</p>
                <p className="text-sm sm:text-base lg:text-lg font-semibold text-white whitespace-nowrap">
                  {company.employee_count?.toLocaleString() || company.company_size || '-'}
                </p>
              </div>
              <div className="text-center min-w-[80px] sm:min-w-0 flex-shrink-0 sm:flex-shrink">
                <p className="text-xs sm:text-sm text-white/40 mb-0.5 sm:mb-1">Revenue</p>
                <p className="text-sm sm:text-base lg:text-lg font-semibold text-white whitespace-nowrap">{company.annual_revenue || company.revenue_range || '-'}</p>
              </div>
              <div className="text-center min-w-[80px] sm:min-w-0 flex-shrink-0 sm:flex-shrink">
                <p className="text-xs sm:text-sm text-white/40 mb-0.5 sm:mb-1">Founded</p>
                <p className="text-sm sm:text-base lg:text-lg font-semibold text-white whitespace-nowrap">{company.founded_year || '-'}</p>
              </div>
              <div className="text-center min-w-[80px] sm:min-w-0 flex-shrink-0 sm:flex-shrink">
                <p className="text-xs sm:text-sm text-white/40 mb-0.5 sm:mb-1">Funding</p>
                <p className="text-sm sm:text-base lg:text-lg font-semibold text-white whitespace-nowrap">{company.funding_total || '-'}</p>
              </div>
              <div className="text-center min-w-[80px] sm:min-w-0 flex-shrink-0 sm:flex-shrink">
                <p className="text-xs sm:text-sm text-white/40 mb-0.5 sm:mb-1">Contacts</p>
                <p className="text-sm sm:text-base lg:text-lg font-semibold text-white whitespace-nowrap">{contactStats.total}</p>
              </div>
              <div className="text-center min-w-[80px] sm:min-w-0 flex-shrink-0 sm:flex-shrink">
                <p className="text-xs sm:text-sm text-white/40 mb-0.5 sm:mb-1">Deal Value</p>
                <p className="text-sm sm:text-base lg:text-lg font-semibold text-white whitespace-nowrap">
                  {contactStats.totalValue ? `$${contactStats.totalValue.toLocaleString()}` : '-'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation - Scrollable on mobile */}
        <motion.div variants={itemVariants} className="-mx-3 px-3 sm:mx-0 sm:px-0">
          <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl sm:rounded-2xl overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[90px] px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
                  activeTab === tab.id
                    ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 text-xs rounded-full ${
                      activeTab === tab.id ? 'bg-white/20' : 'bg-cyan-500/20 text-cyan-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              {company.description && (
                <SectionCard icon={Building} title="About">
                  <ExpandableText text={company.description} maxLength={500} />
                </SectionCard>
              )}

              {/* Tech Stack */}
              {company.tech_stack && company.tech_stack.length > 0 && (
                <SectionCard icon={Layers} title="Technology Stack">
                  <div className="flex flex-wrap gap-2">
                    {company.tech_stack.map((tech, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="bg-blue-500/10 border-blue-500/30 text-blue-400"
                      >
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Key Contacts Preview */}
              {contacts.length > 0 && (
                <SectionCard
                  icon={Users}
                  title="Key Contacts"
                  action={
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab('contacts')}
                      className="text-cyan-400 hover:text-cyan-300"
                    >
                      View All ({contacts.length})
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  }
                >
                  <div className="space-y-3">
                    {contacts.slice(0, 3).map((contact) => (
                      <ContactCard
                        key={contact.id}
                        contact={contact}
                        onClick={() =>
                          navigate(createPageUrl('CRMContactProfile') + `?id=${contact.id}`)
                        }
                      />
                    ))}
                  </div>
                </SectionCard>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Company Details */}
              <SectionCard icon={Building2} title="Company Details">
                <div className="space-y-1">
                  <InfoRow icon={Globe} label="Website" value={company.domain} link={company.website || (company.domain ? `https://${company.domain}` : null)} />
                  <InfoRow
                    icon={Linkedin}
                    label="LinkedIn"
                    value="View Page"
                    link={company.linkedin_url}
                  />
                  <InfoRow icon={Briefcase} label="Industry" value={company.industry} />
                  <InfoRow icon={Briefcase} label="Sub-Industry" value={company.sub_industry} />
                  <InfoRow icon={Target} label="Company Type" value={company.company_type} />
                  <InfoRow icon={MapPin} label="Headquarters" value={company.hq_location} />
                  <InfoRow icon={Mail} label="Email" value={company.email} link={company.email ? `mailto:${company.email}` : null} />
                  <InfoRow icon={Phone} label="Phone" value={company.phone} link={company.phone ? `tel:${company.phone}` : null} />
                </div>
              </SectionCard>

              {/* Funding Info */}
              {(company.funding_total || company.funding_stage) && (
                <SectionCard icon={Banknote} title="Funding">
                  <div className="space-y-1">
                    <InfoRow icon={DollarSign} label="Total Funding" value={company.funding_total} />
                    <InfoRow icon={TrendingUp} label="Stage" value={company.funding_stage} />
                    {company.investors && company.investors.length > 0 && (
                      <div className="pt-3 mt-3 border-t border-white/[0.04]">
                        <p className="text-xs text-white/40 mb-2">Investors</p>
                        <div className="flex flex-wrap gap-1">
                          {company.investors.map((investor, i) => (
                            <Badge key={i} variant="outline" className="text-xs bg-white/5 border-white/10 text-white/70">
                              {investor}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </SectionCard>
              )}

              {/* Enrichment Info */}
              {company.enriched_at && (
                <SectionCard icon={Sparkles} title="Enrichment">
                  <div className="space-y-1">
                    <InfoRow icon={Clock} label="Enriched At" value={formatDate(company.enriched_at)} />
                    <InfoRow icon={Target} label="Source" value={company.enrichment_source} />
                    <InfoRow icon={Building} label="Explorium ID" value={company.explorium_business_id} />
                  </div>
                </SectionCard>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'contacts' && (
          <motion.div variants={itemVariants} className="space-y-6">
            {/* Search & Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  placeholder="Search contacts..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="pl-10 bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/40"
                />
              </div>
              <Button className="bg-cyan-600 hover:bg-cyan-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </div>

            {/* Contacts List */}
            {filteredContacts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredContacts.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    onClick={() =>
                      navigate(createPageUrl('CRMContactProfile') + `?id=${contact.id}`)
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-12 text-center">
                <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  {contactSearch ? 'No Contacts Found' : 'No Contacts Yet'}
                </h3>
                <p className="text-white/60 mb-6">
                  {contactSearch
                    ? 'Try adjusting your search terms.'
                    : 'Add contacts to this company to see them here.'}
                </p>
                {!contactSearch && (
                  <Button className="bg-cyan-600 hover:bg-cyan-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Contact
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'deals' && (
          <motion.div variants={itemVariants}>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-12 text-center">
              <DollarSign className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Deals Coming Soon</h3>
              <p className="text-white/60">
                Track opportunities and deals associated with this company.
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
