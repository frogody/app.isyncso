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
  DollarSign,
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

// Reusable components
const StatCard = ({ label, value, icon: Icon, color = 'cyan', subtext }) => (
  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 hover:bg-white/[0.05] transition-colors">
    <div className="flex items-start justify-between mb-3">
      <div className={`p-2.5 rounded-xl bg-${color}-500/10`}>
        <Icon className={`w-5 h-5 text-${color}-400`} />
      </div>
    </div>
    <p className="text-2xl font-bold text-white mb-1">{value || '-'}</p>
    <p className="text-sm text-white/50">{label}</p>
    {subtext && <p className="text-xs text-white/30 mt-1">{subtext}</p>}
  </div>
);

const InfoRow = ({ icon: Icon, label, value, link }) => {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/[0.04] last:border-0">
      <div className="p-2 rounded-lg bg-white/[0.04]">
        <Icon className="w-4 h-4 text-white/40" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/40">{label}</p>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-cyan-400 hover:text-cyan-300 truncate flex items-center gap-1"
          >
            {value} <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <p className="text-sm text-white truncate">{value}</p>
        )}
      </div>
    </div>
  );
};

const SectionCard = ({ icon: Icon, title, children }) => (
  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2.5 rounded-xl bg-cyan-500/10">
        <Icon className="w-5 h-5 text-cyan-400" />
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
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

export default function CRMContactProfile() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contactId = searchParams.get('id');

  const [contact, setContact] = useState(null);
  const [company, setCompany] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

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

  if (!contact) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Contact Not Found</h2>
          <p className="text-white/60 mb-6">This contact may have been deleted or you don't have access.</p>
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
    { id: 'overview', label: 'Overview' },
    { id: 'company', label: 'Company' },
    { id: 'activity', label: 'Activity' },
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
    'New Lead': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Contacted: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Qualified: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    Proposal: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    Negotiation: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    Won: 'bg-green-500/20 text-green-400 border-green-500/30',
    Lost: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <div className="min-h-screen bg-black">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full px-6 lg:px-8 py-6 space-y-6"
      >
        {/* Back Navigation */}
        <motion.div variants={itemVariants}>
          <Link
            to={createPageUrl('CRMContacts')}
            className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Contacts
          </Link>
        </motion.div>

        {/* Hero Section */}
        <motion.div
          variants={itemVariants}
          className="bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/[0.06] rounded-3xl p-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            {/* Avatar & Basic Info */}
            <div className="flex items-center gap-5 flex-1">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-cyan-500/20">
                {initials}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">{fullName}</h1>
                <p className="text-white/60 text-lg mb-3">{contact.job_title || 'No title'}</p>
                <div className="flex flex-wrap items-center gap-3">
                  {contact.company && (
                    <Badge className="bg-white/10 text-white/70 border-white/10">
                      <Building className="w-3 h-3 mr-1" />
                      {contact.company}
                    </Badge>
                  )}
                  {contact.location && (
                    <Badge className="bg-white/10 text-white/70 border-white/10">
                      <MapPin className="w-3 h-3 mr-1" />
                      {contact.location}
                    </Badge>
                  )}
                  {contact.stage && (
                    <Badge className={stageBadgeColor[contact.stage] || 'bg-white/10 text-white/70'}>
                      {contact.stage}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800">
                <MessageSquare className="w-4 h-4 mr-2" />
                Message
              </Button>
              <Button className="bg-cyan-600 hover:bg-cyan-700">
                <Mail className="w-4 h-4 mr-2" />
                Send Email
              </Button>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mt-8 pt-8 border-t border-white/[0.06]">
            <div className="text-center">
              <p className="text-sm text-white/40 mb-1">Contact Type</p>
              <p className="text-lg font-semibold text-white capitalize">
                {contact.contact_type || 'Lead'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-white/40 mb-1">Source</p>
              <p className="text-lg font-semibold text-white">{contact.source || '-'}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-white/40 mb-1">Deal Value</p>
              <p className="text-lg font-semibold text-white">
                {contact.deal_value ? `$${Number(contact.deal_value).toLocaleString()}` : '-'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-white/40 mb-1">Seniority</p>
              <p className="text-lg font-semibold text-white capitalize">
                {contact.job_seniority_level || '-'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-white/40 mb-1">Department</p>
              <p className="text-lg font-semibold text-white capitalize">
                {contact.job_department || '-'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-white/40 mb-1">Added</p>
              <p className="text-lg font-semibold text-white">{formatDate(contact.created_date)}</p>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div variants={itemVariants}>
          <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-6 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Skills */}
              {contact.skills && contact.skills.length > 0 && (
                <SectionCard icon={Award} title="Skills">
                  <div className="flex flex-wrap gap-2">
                    {contact.skills.map((skill, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Work History */}
              {contact.work_history && contact.work_history.length > 0 && (
                <SectionCard icon={History} title="Work History">
                  <div className="space-y-4">
                    {contact.work_history.slice(0, 5).map((job, i) => (
                      <div
                        key={i}
                        className="flex gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]"
                      >
                        <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-white/40" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-white">{job.title || job.job_title}</p>
                          <p className="text-sm text-white/60">{job.company || job.company_name}</p>
                          {(job.start_date || job.end_date) && (
                            <p className="text-xs text-white/40 mt-1">
                              {job.start_date} - {job.end_date || 'Present'}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Education */}
              {contact.education && contact.education.length > 0 && (
                <SectionCard icon={GraduationCap} title="Education">
                  <div className="space-y-4">
                    {contact.education.map((edu, i) => (
                      <div
                        key={i}
                        className="flex gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]"
                      >
                        <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center">
                          <GraduationCap className="w-5 h-5 text-white/40" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-white">{edu.degree || edu.field_of_study}</p>
                          <p className="text-sm text-white/60">{edu.school || edu.institution}</p>
                          {edu.year && <p className="text-xs text-white/40 mt-1">{edu.year}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Interests */}
              {contact.interests && contact.interests.length > 0 && (
                <SectionCard icon={Lightbulb} title="Interests">
                  <div className="flex flex-wrap gap-2">
                    {contact.interests.map((interest, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="bg-purple-500/10 border-purple-500/30 text-purple-400"
                      >
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </SectionCard>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contact Information */}
              <SectionCard icon={User} title="Contact Information">
                <div className="space-y-1">
                  <InfoRow
                    icon={Mail}
                    label="Email"
                    value={contact.email}
                    link={contact.email ? `mailto:${contact.email}` : null}
                  />
                  <InfoRow
                    icon={Mail}
                    label="Personal Email"
                    value={contact.personal_email}
                    link={contact.personal_email ? `mailto:${contact.personal_email}` : null}
                  />
                  <InfoRow
                    icon={Phone}
                    label="Phone"
                    value={contact.phone}
                    link={contact.phone ? `tel:${contact.phone}` : null}
                  />
                  <InfoRow
                    icon={Phone}
                    label="Mobile"
                    value={contact.mobile_phone}
                    link={contact.mobile_phone ? `tel:${contact.mobile_phone}` : null}
                  />
                  <InfoRow
                    icon={Linkedin}
                    label="LinkedIn"
                    value="View Profile"
                    link={contact.linkedin_url}
                  />
                  <InfoRow icon={MapPin} label="City" value={contact.location_city} />
                  <InfoRow icon={MapPin} label="Region" value={contact.location_region} />
                  <InfoRow icon={MapPin} label="Country" value={contact.location_country} />
                  <InfoRow icon={Calendar} label="Age Group" value={contact.age_group} />
                </div>
              </SectionCard>

              {/* Enrichment Info */}
              {contact.enriched_at && (
                <SectionCard icon={Sparkles} title="Enrichment">
                  <div className="space-y-1">
                    <InfoRow icon={Clock} label="Enriched At" value={formatDate(contact.enriched_at)} />
                    <InfoRow icon={Target} label="Source" value={contact.enrichment_source} />
                    <InfoRow icon={User} label="Explorium ID" value={contact.explorium_prospect_id} />
                  </div>
                </SectionCard>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'company' && (
          <motion.div variants={itemVariants} className="space-y-6">
            {company ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Company Overview */}
                <div className="lg:col-span-2 space-y-6">
                  <SectionCard icon={Building} title="Company Overview">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center border border-cyan-500/30">
                        <Building className="w-8 h-8 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{company.name}</h3>
                        <p className="text-white/60">{company.industry}</p>
                        {company.domain && (
                          <a
                            href={`https://${company.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mt-1"
                          >
                            {company.domain} <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    {company.description && (
                      <ExpandableText text={company.description} maxLength={500} />
                    )}
                  </SectionCard>

                  {/* Company Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard
                      icon={Users}
                      label="Employees"
                      value={company.employee_count?.toLocaleString() || company.company_size}
                    />
                    <StatCard
                      icon={DollarSign}
                      label="Revenue"
                      value={company.annual_revenue || company.revenue_range}
                    />
                    <StatCard
                      icon={Calendar}
                      label="Founded"
                      value={company.founded_year}
                    />
                    <StatCard
                      icon={TrendingUp}
                      label="Funding"
                      value={company.funding_total}
                    />
                  </div>

                  {/* Tech Stack */}
                  {company.tech_stack && company.tech_stack.length > 0 && (
                    <SectionCard icon={Globe} title="Technology Stack">
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
                </div>

                {/* Company Sidebar */}
                <div className="space-y-6">
                  <SectionCard icon={MapPin} title="Location">
                    <div className="space-y-1">
                      <InfoRow icon={MapPin} label="Headquarters" value={company.hq_location} />
                      <InfoRow icon={Globe} label="Website" value={company.domain} link={company.website || (company.domain ? `https://${company.domain}` : null)} />
                      <InfoRow
                        icon={Linkedin}
                        label="LinkedIn"
                        value="View Page"
                        link={company.linkedin_url}
                      />
                    </div>
                  </SectionCard>

                  {/* View Company Profile */}
                  <Button
                    onClick={() => navigate(createPageUrl('CRMCompanyProfile') + `?id=${company.id}`)}
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                  >
                    <Building className="w-4 h-4 mr-2" />
                    View Full Company Profile
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            ) : contact.company ? (
              // No linked company but we have company name from enrichment
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-white/[0.06] flex items-center justify-center">
                    <Building className="w-8 h-8 text-white/30" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white">{contact.company}</h3>
                    {contact.company_industry && (
                      <p className="text-white/60">{contact.company_industry}</p>
                    )}
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

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                      {contact.company_size && (
                        <div>
                          <p className="text-xs text-white/40">Size</p>
                          <p className="text-sm text-white">{contact.company_size}</p>
                        </div>
                      )}
                      {contact.company_employee_count && (
                        <div>
                          <p className="text-xs text-white/40">Employees</p>
                          <p className="text-sm text-white">{contact.company_employee_count.toLocaleString()}</p>
                        </div>
                      )}
                      {contact.company_revenue && (
                        <div>
                          <p className="text-xs text-white/40">Revenue</p>
                          <p className="text-sm text-white">{contact.company_revenue}</p>
                        </div>
                      )}
                      {contact.company_founded_year && (
                        <div>
                          <p className="text-xs text-white/40">Founded</p>
                          <p className="text-sm text-white">{contact.company_founded_year}</p>
                        </div>
                      )}
                    </div>

                    {contact.company_description && (
                      <div className="mt-6 pt-6 border-t border-white/[0.06]">
                        <ExpandableText text={contact.company_description} maxLength={300} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-12 text-center">
                <Building className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Company Information</h3>
                <p className="text-white/60">Company details will appear here once enriched.</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'activity' && (
          <motion.div variants={itemVariants}>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-12 text-center">
              <Clock className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Activity Timeline Coming Soon</h3>
              <p className="text-white/60">
                Track emails, calls, meetings, and notes related to this contact.
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
