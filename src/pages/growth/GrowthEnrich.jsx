import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Plus, Search, ArrowLeft, ArrowRight, MoreHorizontal, Play, Download,
  GripVertical, Type, Zap, Brain, FunctionSquare, Columns3, Trash2,
  Edit2, Settings, ChevronDown, Check, X, Loader2, AlertCircle,
  Table2, Clock, Hash, Upload, FileUp, Database, Pencil, Filter, XCircle,
  ArrowUp, ArrowDown, ArrowUpDown, ToggleLeft, ToggleRight, Layers, Globe,
  Calendar, DollarSign, Link, Mail, CheckSquare, ListOrdered, Merge, Send, Bot, Trash,
  FlaskConical, ShieldAlert, RotateCcw, History, Camera, Undo2, ChevronRight, BookmarkPlus,
  Eye, Copy, Star, Save, Linkedin, Phone as PhoneIcon, Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { GrowthPageTransition } from '@/components/growth/ui';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { useUser } from '@/components/context/UserContext';
import { usePermissions } from '@/components/context/PermissionContext';
import SyncAvatarMini from '@/components/icons/SyncAvatarMini';
import {
  fullEnrichFromLinkedIn, fullEnrichFromEmail, enrichCompanyOnly,
  matchProspect, enrichProspectContact, enrichProspectProfile,
} from '@/lib/explorium-api';
import JourneyProgressBar from '@/components/growth/campaigns/JourneyProgressBar';

// ─── Constants ───────────────────────────────────────────────────────────────

const ROW_HEIGHT = 40;
const ROW_NUM_WIDTH = 50;
const DEFAULT_COL_WIDTH = 180;
const MIN_COL_WIDTH = 80;
const VISIBLE_BUFFER = 10;
const ENRICHMENT_BATCH_SIZE = 5;
const SANDBOX_ROW_LIMIT = 10;

const SOURCE_FIELDS = [
  { value: 'full_name', label: 'Full Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'linkedin_profile', label: 'LinkedIn Profile' },
  { value: 'job_title', label: 'Job Title' },
  { value: 'company_name', label: 'Company Name' },
  { value: 'location', label: 'Location' },
  { value: 'skills', label: 'Skills' },
  { value: 'years_experience', label: 'Years Experience' },
  { value: 'industry', label: 'Industry' },
];

const ENRICHMENT_FUNCTIONS = [
  {
    value: 'fullEnrichFromLinkedIn', label: 'Full Person + Company (from LinkedIn URL)',
    inputType: 'linkedin',
    inputLabel: 'Column with LinkedIn URLs',
    inputHint: 'Select the column that contains LinkedIn profile URLs (e.g. https://linkedin.com/in/...)',
    desc: 'Gets full contact info, work history, skills, and company data from a LinkedIn profile URL.',
  },
  {
    value: 'fullEnrichFromEmail', label: 'Full Person + Company (from Email)',
    inputType: 'email',
    inputLabel: 'Column with Email Addresses',
    inputHint: 'Select the column that contains email addresses',
    desc: 'Gets full contact info, work history, skills, and company data from an email address.',
  },
  {
    value: 'enrichCompanyOnly', label: 'Company Info Only',
    inputType: 'company',
    inputLabel: 'Column with Company Names or Domains',
    inputHint: 'Select the column that contains company names (e.g. "Google") or domains (e.g. "google.com")',
    desc: 'Gets company details like industry, size, revenue, tech stack, and funding. No person data.',
  },
  {
    value: 'matchProspect', label: 'Find Person ID (for chained lookups)',
    inputType: 'multi',
    inputLabel: 'Column with Name, Email, or LinkedIn URL',
    inputHint: 'Select a column with identifying info — name, email, or LinkedIn URL — to find the person in the database',
    desc: 'Looks up a person and returns their Explorium ID. Use this first, then use "Get Contact Details" or "Get Profile Data" with that ID.',
  },
  {
    value: 'enrichProspectContact', label: 'Get Contact Details (email, phone)',
    inputType: 'prospect_id',
    inputLabel: 'Column with Person IDs',
    inputHint: 'Select the column containing Explorium prospect IDs (from "Find Person ID" step)',
    desc: 'Gets verified email, phone numbers, and contact info. Requires a Person ID from "Find Person ID" first.',
  },
  {
    value: 'enrichProspectProfile', label: 'Get Profile Data (title, skills, history)',
    inputType: 'prospect_id',
    inputLabel: 'Column with Person IDs',
    inputHint: 'Select the column containing Explorium prospect IDs (from "Find Person ID" step)',
    desc: 'Gets job title, skills, work history, education, and seniority. Requires a Person ID from "Find Person ID" first.',
  },
];

const ENRICHMENT_OUTPUT_FIELDS = {
  fullEnrichFromLinkedIn: [
    { group: 'Contact', fields: [
      { value: 'email', label: 'Work Email' },
      { value: 'personal_email', label: 'Personal Email' },
      { value: 'phone', label: 'Phone Number' },
      { value: 'mobile_phone', label: 'Mobile Phone' },
      { value: 'work_phone', label: 'Work Phone' },
    ]},
    { group: 'Person', fields: [
      { value: 'first_name', label: 'First Name' },
      { value: 'last_name', label: 'Last Name' },
      { value: 'job_title', label: 'Job Title' },
      { value: 'job_department', label: 'Department' },
      { value: 'job_seniority_level', label: 'Seniority Level' },
      { value: 'location_city', label: 'City' },
      { value: 'location_country', label: 'Country' },
      { value: 'age_group', label: 'Age Group' },
    ]},
    { group: 'Company', fields: [
      { value: 'company', label: 'Company Name' },
      { value: 'company_domain', label: 'Company Website' },
      { value: 'company_industry', label: 'Industry' },
      { value: 'company_size', label: 'Company Size Range' },
      { value: 'company_employee_count', label: 'Employee Count' },
      { value: 'company_revenue', label: 'Revenue' },
      { value: 'company_hq_location', label: 'HQ Location' },
      { value: 'company_description', label: 'Company Description' },
      { value: 'company_founded_year', label: 'Founded Year' },
    ]},
    { group: 'Skills & Career', fields: [
      { value: 'skills', label: 'Skills (list)' },
      { value: 'interests', label: 'Interests (list)' },
      { value: 'work_history', label: 'Work History (list)' },
      { value: 'education', label: 'Education (list)' },
      { value: 'certifications', label: 'Certifications (list)' },
    ]},
    { group: 'Tech & Funding', fields: [
      { value: 'company_tech_stack', label: 'Tech Stack (list)' },
      { value: 'company_funding_total', label: 'Total Funding' },
      { value: 'company_investors', label: 'Investors (list)' },
    ]},
  ],
  fullEnrichFromEmail: 'fullEnrichFromLinkedIn', // same output fields
  enrichCompanyOnly: [
    { group: 'Company Details', fields: [
      { value: 'name', label: 'Company Name' },
      { value: 'domain', label: 'Website Domain' },
      { value: 'industry', label: 'Industry' },
      { value: 'size_range', label: 'Size Range' },
      { value: 'employee_count', label: 'Employee Count' },
      { value: 'revenue_range', label: 'Revenue Range' },
      { value: 'founded_year', label: 'Founded Year' },
      { value: 'hq_location', label: 'HQ Location' },
      { value: 'description', label: 'Description' },
      { value: 'linkedin', label: 'LinkedIn Page' },
    ]},
    { group: 'Tech & Funding', fields: [
      { value: 'tech_stack', label: 'Tech Stack (list)' },
      { value: 'funding_total', label: 'Total Funding' },
      { value: 'latest_funding', label: 'Latest Funding Round' },
    ]},
  ],
  matchProspect: [
    { group: 'Result', fields: [
      { value: 'prospect_id', label: 'Person ID (use for chained lookups)' },
    ]},
  ],
  enrichProspectContact: [
    { group: 'Contact Info', fields: [
      { value: 'data.professions_email', label: 'Work Email' },
      { value: 'data.personal_email', label: 'Personal Email' },
      { value: 'data.mobile_phone', label: 'Mobile Phone' },
      { value: 'data.work_phone', label: 'Work Phone' },
      { value: 'data.email_status', label: 'Email Status (valid/invalid)' },
    ]},
  ],
  enrichProspectProfile: [
    { group: 'Professional', fields: [
      { value: 'data.job_title', label: 'Job Title' },
      { value: 'data.job_department', label: 'Department' },
      { value: 'data.seniority', label: 'Seniority Level' },
      { value: 'data.company_name', label: 'Company Name' },
      { value: 'data.company_domain', label: 'Company Website' },
      { value: 'data.industry', label: 'Industry' },
      { value: 'data.company_size', label: 'Company Size' },
    ]},
    { group: 'Skills & Career', fields: [
      { value: 'data.skills', label: 'Skills (list)' },
      { value: 'data.education', label: 'Education (list)' },
      { value: 'data.work_history', label: 'Work History (list)' },
      { value: 'data.certifications', label: 'Certifications (list)' },
      { value: 'data.interests', label: 'Interests (list)' },
    ]},
  ],
};

function getOutputFieldsForFunction(fnValue) {
  if (!fnValue) return [];
  let fields = ENRICHMENT_OUTPUT_FIELDS[fnValue];
  if (typeof fields === 'string') fields = ENRICHMENT_OUTPUT_FIELDS[fields];
  return fields || [];
}

const COLUMN_TYPES = [
  { value: 'field', label: 'Field', icon: Type, desc: 'Map a field from source data' },
  { value: 'enrichment', label: 'Enrichment', icon: Zap, desc: 'Enrich with Explorium API' },
  { value: 'ai', label: 'AI', icon: Brain, desc: 'AI-generated content' },
  { value: 'formula', label: 'Formula', icon: FunctionSquare, desc: 'Calculated value' },
  { value: 'waterfall', label: 'Waterfall', icon: Layers, desc: 'Try multiple sources in order' },
  { value: 'http', label: 'HTTP API', icon: Globe, desc: 'Call custom API endpoints' },
  { value: 'merge', label: 'Merge', icon: Merge, desc: 'Combine multiple columns' },
  { value: 'push_to_table', label: 'Push Data', icon: Send, desc: 'Push rows to another table' },
  { value: 'pull_from_table', label: 'Pull Data', icon: Database, desc: 'Pull data from another table (VLOOKUP)' },
];

const COLUMN_TYPE_ICONS = { field: Type, enrichment: Zap, ai: Brain, formula: FunctionSquare, waterfall: Layers, http: Globe, merge: Merge, push_to_table: Send, pull_from_table: Database };
const COLUMN_TYPE_LABELS = { field: 'Field', enrichment: 'Enrichment', ai: 'AI', formula: 'Formula', waterfall: 'Waterfall', http: 'HTTP', merge: 'Merge', push_to_table: 'Push', pull_from_table: 'Pull' };
const FIELD_DATA_TYPE_LABELS = { text: 'Text', number: 'Number', currency: 'Currency', date: 'Date', url: 'URL', email: 'Email', checkbox: 'Checkbox', select: 'Select' };

const FIELD_DATA_TYPES = [
  { value: 'text', label: 'Text', icon: Type },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'currency', label: 'Currency', icon: DollarSign },
  { value: 'date', label: 'Date', icon: Calendar },
  { value: 'url', label: 'URL', icon: Link },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { value: 'select', label: 'Select', icon: ListOrdered },
];

const FIELD_DATA_TYPE_ICONS = { text: Type, number: Hash, currency: DollarSign, date: Calendar, url: Link, email: Mail, checkbox: CheckSquare, select: ListOrdered };

const CURRENCY_CODES = [
  { value: 'USD', symbol: '$' }, { value: 'EUR', symbol: '€' }, { value: 'GBP', symbol: '£' },
  { value: 'JPY', symbol: '¥' }, { value: 'CAD', symbol: 'C$' }, { value: 'AUD', symbol: 'A$' },
  { value: 'CHF', symbol: 'CHF' }, { value: 'CNY', symbol: '¥' }, { value: 'INR', symbol: '₹' },
  { value: 'BRL', symbol: 'R$' }, { value: 'SEK', symbol: 'kr' }, { value: 'NOK', symbol: 'kr' },
];

const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { value: 'MMM D, YYYY', label: 'MMM D, YYYY' },
  { value: 'D MMM YYYY', label: 'D MMM YYYY' },
];

const AI_MODELS = [
  { value: 'moonshotai/Kimi-K2-Instruct', label: 'Kimi K2', speed: 3, quality: 5, desc: 'Best overall — fast & high quality' },
  { value: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free', label: 'Llama 3.3 70B', speed: 4, quality: 4, desc: 'Fast, free tier available' },
  { value: 'Qwen/Qwen2.5-72B-Instruct-Turbo', label: 'Qwen 2.5 72B', speed: 3, quality: 4, desc: 'Strong multilingual' },
  { value: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek V3', speed: 2, quality: 5, desc: 'Top quality, slower' },
];

const AI_PROMPT_TEMPLATES = [
  { id: 'summarize', label: 'Summarize', prompt: 'Summarize what /Company does and why /Name as /Title would be relevant for outreach. Keep it to 1-2 sentences.', icon: '📝' },
  { id: 'verify_email', label: 'Verify email', prompt: 'Given /Name works at /Company (/Website), verify if /Email looks correct. Return the most likely valid email address.', icon: '📧' },
  { id: 'categorize', label: 'Categorize', prompt: 'Based on /Title at /Company, categorize this prospect as: Decision Maker, Influencer, Champion, or End User. Return only the category.', icon: '🏷️' },
  { id: 'icp_score', label: 'ICP Score', prompt: 'Rate how well /Name (/Title at /Company) fits as an ideal customer prospect. Return: Strong Fit, Moderate Fit, or Weak Fit with a one-line reason.', icon: '🎯' },
  { id: 'pitch', label: 'Pitch line', prompt: 'Write a personalized one-liner pitch for /Name who is /Title at /Company. Reference their role and company specifically.', icon: '💡' },
  { id: 'research', label: 'Research', prompt: 'Research /Company (/Website) and provide: 1) What they do 2) Industry 3) Estimated size 4) Key challenges they likely face.', icon: '🔍' },
  { id: 'clean', label: 'Clean/Format', prompt: 'Clean and standardize the following name: /Name. Fix capitalization, remove special characters. Return only the cleaned full name.', icon: '✨' },
];

// ─── Formula Engine ──────────────────────────────────────────────────────────

function evaluateFormula(expression, columnMap) {
  if (!expression) return '';
  let resolved = expression;

  // Support /ColumnName syntax (primary) and {{ColumnName}} (legacy)
  // /ColumnName — matches /word characters until space-comma-paren or end
  resolved = resolved.replace(/\/([A-Za-z0-9_][A-Za-z0-9_ ]*?)(?=\s*[,)"']|$|\s*[><=!])/g, (_, name) => {
    const val = columnMap[name.trim()] ?? '';
    return String(val);
  });
  // {{ColumnName}} legacy support
  resolved = resolved.replace(/\{\{(.+?)\}\}/g, (_, name) => {
    const val = columnMap[name.trim()] ?? '';
    return String(val);
  });

  resolved = resolved.replace(/^=/, '').trim();

  try {
    // CONCAT
    const concatMatch = resolved.match(/^CONCAT\((.+)\)$/i);
    if (concatMatch) {
      return concatMatch[1].split(',').map(s => s.trim().replace(/^"|"$/g, '')).join('');
    }
    // UPPER
    const upperMatch = resolved.match(/^UPPER\((.+)\)$/i);
    if (upperMatch) return upperMatch[1].replace(/^"|"$/g, '').toUpperCase();
    // LOWER
    const lowerMatch = resolved.match(/^LOWER\((.+)\)$/i);
    if (lowerMatch) return lowerMatch[1].replace(/^"|"$/g, '').toLowerCase();
    // TRIM
    const trimMatch = resolved.match(/^TRIM\((.+)\)$/i);
    if (trimMatch) return trimMatch[1].replace(/^"|"$/g, '').trim();
    // LEN
    const lenMatch = resolved.match(/^LEN\((.+)\)$/i);
    if (lenMatch) return String(lenMatch[1].replace(/^"|"$/g, '').length);
    // LEFT
    const leftMatch = resolved.match(/^LEFT\((.+?),\s*(\d+)\)$/i);
    if (leftMatch) return leftMatch[1].replace(/^"|"$/g, '').substring(0, parseInt(leftMatch[2]));
    // RIGHT
    const rightMatch = resolved.match(/^RIGHT\((.+?),\s*(\d+)\)$/i);
    if (rightMatch) { const s = rightMatch[1].replace(/^"|"$/g, ''); return s.substring(s.length - parseInt(rightMatch[2])); }
    // REPLACE
    const replaceMatch = resolved.match(/^REPLACE\((.+?),\s*(.+?),\s*(.+)\)$/i);
    if (replaceMatch) {
      const str = replaceMatch[1].replace(/^"|"$/g, '');
      const find = replaceMatch[2].trim().replace(/^"|"$/g, '');
      const rep = replaceMatch[3].trim().replace(/^"|"$/g, '');
      return str.replaceAll(find, rep);
    }
    // ROUND
    const roundMatch = resolved.match(/^ROUND\((.+?),?\s*(\d*)\)$/i);
    if (roundMatch) {
      const num = parseFloat(roundMatch[1]);
      const dec = parseInt(roundMatch[2] || '0');
      return isNaN(num) ? '' : num.toFixed(dec);
    }
    // CONTAINS
    const containsMatch = resolved.match(/^CONTAINS\((.+?),\s*(.+)\)$/i);
    if (containsMatch) {
      const haystack = containsMatch[1].replace(/^"|"$/g, '');
      const needle = containsMatch[2].trim().replace(/^"|"$/g, '');
      return haystack.toLowerCase().includes(needle.toLowerCase()) ? 'TRUE' : 'FALSE';
    }
    // IF — supports comparison operators
    const ifMatch = resolved.match(/^IF\((.+?),\s*(.+?),\s*(.+)\)$/i);
    if (ifMatch) {
      let cond = ifMatch[1].trim();
      const yes = ifMatch[2].trim().replace(/^"|"$/g, '');
      const no = ifMatch[3].trim().replace(/^"|"$/g, '');
      // Evaluate comparisons: >, <, >=, <=, ==, !=
      const cmpMatch = cond.match(/^(.+?)\s*(>=|<=|!=|==|>|<)\s*(.+)$/);
      if (cmpMatch) {
        const a = parseFloat(cmpMatch[1]) || cmpMatch[1].replace(/^"|"$/g, '');
        const b = parseFloat(cmpMatch[3]) || cmpMatch[3].replace(/^"|"$/g, '');
        const op = cmpMatch[2];
        const result = op === '>' ? a > b : op === '<' ? a < b : op === '>=' ? a >= b : op === '<=' ? a <= b : op === '==' ? a == b : op === '!=' ? a != b : false;
        return result ? yes : no;
      }
      cond = cond.replace(/^"|"$/g, '');
      return (cond && cond !== 'FALSE' && cond !== '0' && cond !== '') ? yes : no;
    }
    return resolved;
  } catch (err) {
    return `#ERROR: ${err.message}`;
  }
}

// ─── Enrichment Runner ───────────────────────────────────────────────────────

const ENRICHMENT_FN_MAP = {
  fullEnrichFromLinkedIn,
  fullEnrichFromEmail,
  enrichCompanyOnly,
  matchProspect,
  enrichProspectContact,
  enrichProspectProfile,
};

function extractNestedValue(obj, path) {
  if (!obj || !path) return null;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null) return null;
    current = current[part];
  }
  return current;
}

// ─── Field Data Type Formatting ──────────────────────────────────────────────

function formatFieldValue(rawValue, config) {
  const dataType = config?.data_type || 'text';
  const str = (rawValue ?? '').toString();
  if (!str) return str;

  switch (dataType) {
    case 'number': {
      const num = parseFloat(str);
      if (isNaN(num)) return str;
      const decimals = config?.decimals ?? 0;
      const useSeparator = config?.thousands_separator !== false;
      const formatted = num.toFixed(decimals);
      if (!useSeparator) return formatted;
      const [int, dec] = formatted.split('.');
      const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return dec !== undefined ? `${withSep}.${dec}` : withSep;
    }
    case 'currency': {
      const num = parseFloat(str);
      if (isNaN(num)) return str;
      const code = config?.currency_code || 'USD';
      const curr = CURRENCY_CODES.find(c => c.value === code);
      const symbol = curr?.symbol || code;
      const decimals = config?.decimals ?? 2;
      const formatted = num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return config?.symbol_position === 'after' ? `${formatted} ${symbol}` : `${symbol}${formatted}`;
    }
    case 'date': {
      const d = new Date(str);
      if (isNaN(d.getTime())) return str;
      const fmt = config?.date_format || 'YYYY-MM-DD';
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = String(d.getFullYear());
      switch (fmt) {
        case 'MM/DD/YYYY': return `${mm}/${dd}/${yyyy}`;
        case 'DD/MM/YYYY': return `${dd}/${mm}/${yyyy}`;
        case 'MMM D, YYYY': return `${months[d.getMonth()]} ${d.getDate()}, ${yyyy}`;
        case 'D MMM YYYY': return `${d.getDate()} ${months[d.getMonth()]} ${yyyy}`;
        default: return `${yyyy}-${mm}-${dd}`;
      }
    }
    case 'checkbox':
      return str === 'true' || str === '1' || str === 'yes' ? 'true' : 'false';
    default:
      return str;
  }
}

function getFieldSortValue(rawValue, config) {
  const dataType = config?.data_type || 'text';
  const str = (rawValue ?? '').toString();
  if (!str) return str;
  switch (dataType) {
    case 'number':
    case 'currency': return parseFloat(str) || 0;
    case 'date': return new Date(str).getTime() || 0;
    case 'checkbox': return str === 'true' || str === '1' || str === 'yes' ? 1 : 0;
    default: return str.toLowerCase();
  }
}

function relativeTime(dateStr) {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = Math.max(0, now - d);
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const HISTORY_ACTION_ICONS = {
  add_column: Plus, delete_column: Trash2, edit_column: Settings,
  add_row: Plus, delete_row: Trash2, edit_cell: Edit2,
  import_csv: Upload, import_nest: Database, run_all: Play,
  run_column: Zap, clear_data: Trash, snapshot_restore: RotateCcw,
};

const HISTORY_ACTION_COLORS = {
  add_column: 'text-indigo-400', delete_column: 'text-red-400', edit_column: 'text-indigo-400',
  add_row: 'text-indigo-400', delete_row: 'text-red-400', edit_cell: 'text-amber-400',
  import_csv: 'text-green-400', import_nest: 'text-green-400', run_all: 'text-purple-400',
  run_column: 'text-purple-400', clear_data: 'text-red-400', snapshot_restore: 'text-amber-400',
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function GrowthEnrich() {
  const { theme, toggleTheme, rt } = useTheme();
  const { user } = useUser();
  const { hasPermission } = usePermissions();
  const { campaignId } = useParams();
  const navigate = useNavigate();

  const orgId = user?.company_id || user?.organization_id;

  // Campaign journey mode
  const [campaign, setCampaign] = useState(null);
  const [campaignLoading, setCampaignLoading] = useState(!!campaignId);
  const [campaignLoadingStatus, setCampaignLoadingStatus] = useState('');
  const [savingCampaign, setSavingCampaign] = useState(false);
  const isCampaignMode = !!campaignId;

  // View state
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);

  // Workspace list
  const [workspaces, setWorkspaces] = useState([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsNestId, setNewWsNestId] = useState('');
  const [nests, setNests] = useState([]);
  const [nestsLoading, setNestsLoading] = useState(false);

  // Workspace detail
  const [workspace, setWorkspace] = useState(null);
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [cells, setCells] = useState({});
  const [wsLoading, setWsLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [wsName, setWsName] = useState('');

  // Column dialog
  const [colDialogOpen, setColDialogOpen] = useState(false);
  const [colType, setColType] = useState('field');
  const [colName, setColName] = useState('');
  const [colConfig, setColConfig] = useState({});
  const [httpTestResult, setHttpTestResult] = useState(null); // { loading, data, error }

  // Slash-command column selector
  const [slashMenu, setSlashMenu] = useState({ open: false, field: null, caretPos: 0, filter: '', selectedIndex: 0 });
  const promptRef = useRef(null);
  const formulaRef = useRef(null);

  const handleSlashInput = useCallback((e, field) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    // Find the last "/" before cursor
    const before = val.slice(0, pos);
    const slashIdx = before.lastIndexOf('/');
    if (slashIdx !== -1 && (slashIdx === 0 || /[\s,("']/.test(before[slashIdx - 1]))) {
      const partial = before.slice(slashIdx + 1);
      if (!/[,)"'\n]/.test(partial)) {
        const newFilter = partial.toLowerCase();
        setSlashMenu(prev => ({ open: true, field, caretPos: pos, filter: newFilter, selectedIndex: prev.filter !== newFilter ? 0 : prev.selectedIndex }));
        return;
      }
    }
    setSlashMenu(prev => prev.open ? { ...prev, open: false, selectedIndex: 0 } : prev);
  }, []);

  const insertColumnRef = useCallback((colName) => {
    const field = slashMenu.field;
    const ref = field === 'prompt' ? promptRef.current : formulaRef.current;
    if (!ref) return;
    const val = ref.value;
    const pos = slashMenu.caretPos;
    const before = val.slice(0, pos);
    const slashIdx = before.lastIndexOf('/');
    const newVal = val.slice(0, slashIdx) + '/' + colName + ' ' + val.slice(pos);
    if (field === 'prompt') {
      setColConfig(prev => ({ ...prev, prompt: newVal }));
    } else {
      setColConfig({ expression: newVal });
    }
    setSlashMenu({ open: false, field: null, caretPos: 0, filter: '', selectedIndex: 0 });
    // Re-focus after React re-render
    setTimeout(() => {
      if (ref) {
        const newPos = slashIdx + 1 + colName.length + 1; // +1 for the trailing space
        ref.focus();
        ref.setSelectionRange(newPos, newPos);
      }
    }, 0);
  }, [slashMenu]);

  const slashMenuColumns = useMemo(() => {
    if (!slashMenu.open) return [];
    const firstRow = rows[0];
    return columns.filter(c => c.name.toLowerCase().includes(slashMenu.filter)).map(c => ({
      ...c,
      sampleValue: (() => {
        if (!firstRow) return '';
        const cell = cells[`${firstRow.id}:${c.id}`];
        if (!cell) return '';
        const v = cell.value;
        if (v == null) return '';
        if (typeof v === 'object') return v.v != null ? String(v.v) : JSON.stringify(v);
        return String(v);
      })(),
    }));
  }, [slashMenu.open, slashMenu.filter, columns, rows, cells]);

  const handleSlashKeyDown = useCallback((e, field) => {
    if (!slashMenu.open || slashMenu.field !== field) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setSlashMenu(prev => ({ ...prev, open: false, selectedIndex: 0 }));
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSlashMenu(prev => ({ ...prev, selectedIndex: Math.min(prev.selectedIndex + 1, slashMenuColumns.length - 1) }));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSlashMenu(prev => ({ ...prev, selectedIndex: Math.max(prev.selectedIndex - 1, 0) }));
      return;
    }
    if ((e.key === 'Enter' || e.key === 'Tab') && slashMenuColumns.length > 0) {
      e.preventDefault();
      insertColumnRef(slashMenuColumns[slashMenu.selectedIndex]?.name || slashMenuColumns[0].name);
      return;
    }
  }, [slashMenu, slashMenuColumns, insertColumnRef]);

  // ─── Chip-based prompt editor (contenteditable) ───────────────────────
  const promptEditorRef = useRef(null);
  const isPromptUserInput = useRef(false);

  const escapeHtml = useCallback((str) => {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  }, []);

  const promptToHtml = useCallback((text) => {
    if (!text) return '';
    const colNames = columns.map(c => c.name);
    if (colNames.length === 0) return escapeHtml(text);
    const sorted = [...colNames].sort((a, b) => b.length - a.length);
    const escapedNames = sorted.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`/(${escapedNames.join('|')})(?=[\\s,.:;!?"'\\n)\\]]|$)`, 'gi');
    let html = '';
    let last = 0;
    let m;
    while ((m = regex.exec(text)) !== null) {
      html += escapeHtml(text.slice(last, m.index));
      html += `<span data-col="${m[1]}" contenteditable="false" class="inline-flex items-center h-[18px] px-1.5 mx-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[11px] font-medium border border-indigo-500/30 align-baseline whitespace-nowrap cursor-default">${escapeHtml(m[1])}</span>`;
      last = m.index + m[0].length;
    }
    html += escapeHtml(text.slice(last));
    return html;
  }, [columns, escapeHtml]);

  const htmlToPrompt = useCallback((el) => {
    let text = '';
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.nodeName === 'BR') {
        text += '\n';
      } else if (node.dataset?.col) {
        text += '/' + node.dataset.col;
      } else if (node.nodeName === 'DIV' || node.nodeName === 'P') {
        if (text.length > 0 && !text.endsWith('\n')) text += '\n';
        node.childNodes.forEach(walk);
      } else {
        node.childNodes.forEach(walk);
      }
    };
    el.childNodes.forEach(walk);
    return text;
  }, []);

  const handlePromptEditorInput = useCallback((e) => {
    const el = e.currentTarget;
    const text = htmlToPrompt(el);
    isPromptUserInput.current = true;
    setColConfig(prev => ({ ...prev, prompt: text }));
    // Slash menu detection
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.startContainer.nodeType !== Node.TEXT_NODE) {
      setSlashMenu(prev => prev.open ? { ...prev, open: false } : prev);
      return;
    }
    const textBefore = range.startContainer.textContent.slice(0, range.startOffset);
    const slashIdx = textBefore.lastIndexOf('/');
    if (slashIdx !== -1 && (slashIdx === 0 || /[\s,("']/.test(textBefore[slashIdx - 1]))) {
      const partial = textBefore.slice(slashIdx + 1);
      if (!/[,)"'\n]/.test(partial)) {
        const newFilter = partial.toLowerCase();
        setSlashMenu(prev => ({ open: true, field: 'prompt', caretPos: 0, filter: newFilter, selectedIndex: prev.filter !== newFilter ? 0 : prev.selectedIndex }));
        return;
      }
    }
    setSlashMenu(prev => prev.open ? { ...prev, open: false, selectedIndex: 0 } : prev);
  }, [htmlToPrompt]);

  const insertColumnRefChip = useCallback((colName) => {
    const el = promptEditorRef.current;
    if (!el) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      // No selection - append chip at end
      const chip = document.createElement('span');
      chip.dataset.col = colName;
      chip.contentEditable = 'false';
      chip.className = 'inline-flex items-center h-[18px] px-1.5 mx-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[11px] font-medium border border-indigo-500/30 align-baseline whitespace-nowrap cursor-default';
      chip.textContent = colName;
      el.appendChild(chip);
      const space = document.createTextNode(' ');
      el.appendChild(space);
    } else {
      const range = sel.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        const cursorPos = range.startOffset;
        const before = text.slice(0, cursorPos);
        const slashIdx = before.lastIndexOf('/');
        if (slashIdx !== -1) {
          const textBefore = text.slice(0, slashIdx);
          const textAfter = text.slice(cursorPos);
          const chip = document.createElement('span');
          chip.dataset.col = colName;
          chip.contentEditable = 'false';
          chip.className = 'inline-flex items-center h-[18px] px-1.5 mx-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[11px] font-medium border border-indigo-500/30 align-baseline whitespace-nowrap cursor-default';
          chip.textContent = colName;
          const parent = node.parentNode;
          const beforeNode = document.createTextNode(textBefore);
          const afterNode = document.createTextNode(' ' + textAfter);
          parent.insertBefore(beforeNode, node);
          parent.insertBefore(chip, node);
          parent.insertBefore(afterNode, node);
          parent.removeChild(node);
          const newRange = document.createRange();
          newRange.setStart(afterNode, 1);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
        }
      }
    }
    const prompt = htmlToPrompt(el);
    isPromptUserInput.current = true;
    setColConfig(prev => ({ ...prev, prompt: prompt }));
    setSlashMenu({ open: false, field: null, caretPos: 0, filter: '', selectedIndex: 0 });
    el.focus();
  }, [htmlToPrompt]);

  const handlePromptEditorKeyDown = useCallback((e) => {
    if (!slashMenu.open || slashMenu.field !== 'prompt') return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setSlashMenu(prev => ({ ...prev, open: false, selectedIndex: 0 }));
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSlashMenu(prev => ({ ...prev, selectedIndex: Math.min(prev.selectedIndex + 1, slashMenuColumns.length - 1) }));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSlashMenu(prev => ({ ...prev, selectedIndex: Math.max(prev.selectedIndex - 1, 0) }));
      return;
    }
    if ((e.key === 'Enter' || e.key === 'Tab') && slashMenuColumns.length > 0) {
      e.preventDefault();
      insertColumnRefChip(slashMenuColumns[slashMenu.selectedIndex]?.name || slashMenuColumns[0].name);
      return;
    }
  }, [slashMenu, slashMenuColumns, insertColumnRefChip]);

  const handlePromptEditorPaste = useCallback((e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  // Sync contenteditable when prompt changes from outside (template click, etc.)
  useEffect(() => {
    if (isPromptUserInput.current) {
      isPromptUserInput.current = false;
      return;
    }
    const el = promptEditorRef.current;
    if (el) {
      el.innerHTML = promptToHtml(colConfig.prompt || '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colConfig.prompt]);

  // Cell editing
  const [editingCell, setEditingCell] = useState(null); // { rowId, colId }
  const [editingValue, setEditingValue] = useState('');
  const [selectedCell, setSelectedCell] = useState(null);

  // Virtual scroll
  const scrollRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  // CSV import
  const csvInputRef = useRef(null);

  // Filters
  const [filters, setFilters] = useState([]); // [{ id, columnId, operator, value, valueTo }]
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  // Sorts
  const [sorts, setSorts] = useState([]); // [{ id, columnId, direction: 'asc'|'desc' }]
  const [sortPanelOpen, setSortPanelOpen] = useState(false);
  const [dragSort, setDragSort] = useState(null); // index being dragged

  // Global search
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);
  const searchTimerRef = useRef(null);

  // Auto-run
  const [autoRun, setAutoRun] = useState(false);
  const [autoRunPulse, setAutoRunPulse] = useState(false);
  const [autoRunConfirmOpen, setAutoRunConfirmOpen] = useState(false);
  const autoRunTimerRef = useRef(null);
  const autoRunRunningRef = useRef(false);
  const prevRowCountRef = useRef(0);
  const prevColCountRef = useRef(0);

  // Sandbox mode
  const [sandboxMode, setSandboxMode] = useState(true);
  const [sandboxCells, setSandboxCells] = useState({});
  const [sandboxExportWarn, setSandboxExportWarn] = useState(false);

  // History & snapshots
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotDesc, setSnapshotDesc] = useState('');
  const [expandedHistory, setExpandedHistory] = useState({});
  const historyGroupRef = useRef(null); // current group_id for batch ops

  // Views
  const [views, setViews] = useState([]);
  const [activeViewId, setActiveViewId] = useState(null); // null = Default View
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [viewSaveDialogOpen, setViewSaveDialogOpen] = useState(false);
  const [viewSaveName, setViewSaveName] = useState('');
  const [viewSaveMode, setViewSaveMode] = useState('new'); // 'new' | 'overwrite'
  const [viewRenamingId, setViewRenamingId] = useState(null);
  const [viewRenameValue, setViewRenameValue] = useState('');
  const [viewHasUnsaved, setViewHasUnsaved] = useState(false);
  const viewDropdownRef = useRef(null);

  // Multi-table tabs
  const [tables, setTables] = useState([]);
  const [activeTableId, setActiveTableId] = useState(null);
  const [tabContextMenu, setTabContextMenu] = useState(null); // { tableId, x, y }
  const [renamingTabId, setRenamingTabId] = useState(null);
  const [renameTabValue, setRenameTabValue] = useState('');
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef(null);
  const [targetTableCols, setTargetTableCols] = useState([]); // for push/pull config

  // AI Chat assistant
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]); // [{ role: 'user'|'assistant', content, actions?, timestamp }]
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const chatInputRef = useRef(null);

  // Column resize
  const [resizing, setResizing] = useState(null);
  const resizeStartX = useRef(0);
  const resizeStartW = useRef(0);

  // ─── Cell key helper ────────────────────────────────────────────────────

  const cellKey = useCallback((rowId, colId) => `${rowId}:${colId}`, []);

  // ─── History tracking ─────────────────────────────────────────────────

  const trackChange = useCallback(async (actionType, description, { beforeValue, afterValue, metadata, groupId } = {}) => {
    if (!activeWorkspaceId) return;
    const entry = {
      workspace_id: activeWorkspaceId,
      action_type: actionType,
      description,
      group_id: groupId || historyGroupRef.current || null,
      before_value: beforeValue || null,
      after_value: afterValue || null,
      metadata: metadata || {},
    };
    // Optimistic local add
    const tempId = crypto.randomUUID();
    const localEntry = { ...entry, id: tempId, created_at: new Date().toISOString() };
    setHistoryEntries(prev => [localEntry, ...prev].slice(0, 100));
    // Persist
    try {
      await supabase.from('enrich_history').insert(entry);
    } catch (err) {
      console.error('History track error:', err);
    }
  }, [activeWorkspaceId]);

  const loadHistory = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setHistoryLoading(true);
    try {
      const { data } = await supabase
        .from('enrich_history')
        .select('*')
        .eq('workspace_id', activeWorkspaceId)
        .order('created_at', { ascending: false })
        .limit(100);
      setHistoryEntries(data || []);
    } catch (err) {
      console.error('Load history error:', err);
    }
    setHistoryLoading(false);
  }, [activeWorkspaceId]);

  const loadSnapshots = useCallback(async () => {
    if (!activeWorkspaceId) return;
    try {
      const { data } = await supabase
        .from('enrich_snapshots')
        .select('id, name, description, created_at')
        .eq('workspace_id', activeWorkspaceId)
        .order('created_at', { ascending: false });
      setSnapshots(data || []);
    } catch (err) {
      console.error('Load snapshots error:', err);
    }
  }, [activeWorkspaceId]);

  // ─── Views system ─────────────────────────────────────────────────────────

  const buildViewConfig = useCallback(() => ({
    visible_columns: columns.map(c => c.id),
    column_order: columns.map(c => c.id),
    column_widths: columns.reduce((acc, c) => { if (c.width) acc[c.id] = c.width; return acc; }, {}),
    filters,
    sorts,
    search: searchInput || '',
  }), [columns, filters, sorts, searchInput]);

  const loadViews = useCallback(async () => {
    if (!activeWorkspaceId) return;
    try {
      const { data, error } = await supabase
        .from('enrich_views')
        .select('*')
        .eq('workspace_id', activeWorkspaceId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setViews(data || []);
    } catch (err) {
      console.error('Load views error:', err);
    }
  }, [activeWorkspaceId]);

  const applyViewConfig = useCallback((config) => {
    if (!config) return;
    // Apply filters
    if (Array.isArray(config.filters)) setFilters(config.filters);
    else setFilters([]);
    // Apply sorts
    if (Array.isArray(config.sorts)) setSorts(config.sorts);
    else setSorts([]);
    // Apply search
    if (typeof config.search === 'string') setSearchInput(config.search);
    else setSearchInput('');
    // Apply column widths
    if (config.column_widths && typeof config.column_widths === 'object') {
      setColumns(prev => prev.map(c => ({
        ...c,
        width: config.column_widths[c.id] || c.width,
      })));
    }
    // Apply column order
    if (Array.isArray(config.column_order) && config.column_order.length > 0) {
      setColumns(prev => {
        const colMap = {};
        prev.forEach(c => { colMap[c.id] = c; });
        const ordered = config.column_order
          .filter(id => colMap[id])
          .map(id => colMap[id]);
        // Append any columns not in the saved order (new columns added since view was saved)
        prev.forEach(c => { if (!config.column_order.includes(c.id)) ordered.push(c); });
        return ordered;
      });
    }
  }, []);

  const saveView = useCallback(async (name, viewId) => {
    if (!activeWorkspaceId) return;
    const config = buildViewConfig();
    try {
      if (viewId) {
        // Update existing view
        await supabase.from('enrich_views').update({ config, updated_at: new Date().toISOString() }).eq('id', viewId);
        setViews(prev => prev.map(v => v.id === viewId ? { ...v, config, updated_at: new Date().toISOString() } : v));
        toast.success('View saved');
      } else {
        // Create new view
        const { data, error } = await supabase.from('enrich_views').insert({
          workspace_id: activeWorkspaceId,
          name: name || 'Untitled View',
          config,
        }).select().single();
        if (error) throw error;
        setViews(prev => [...prev, data]);
        setActiveViewId(data.id);
        toast.success(`View "${data.name}" created`);
      }
      setViewHasUnsaved(false);
    } catch (err) {
      console.error('Save view error:', err);
      toast.error('Failed to save view');
    }
  }, [activeWorkspaceId, buildViewConfig]);

  const deleteView = useCallback(async (viewId) => {
    try {
      await supabase.from('enrich_views').delete().eq('id', viewId);
      setViews(prev => prev.filter(v => v.id !== viewId));
      if (activeViewId === viewId) {
        setActiveViewId(null);
        // Reset to default
        setFilters([]);
        setSorts([]);
        setSearchInput('');
      }
      toast.success('View deleted');
    } catch (err) {
      console.error('Delete view error:', err);
      toast.error('Failed to delete view');
    }
  }, [activeViewId]);

  const renameView = useCallback(async (viewId, newName) => {
    if (!newName.trim()) return;
    try {
      await supabase.from('enrich_views').update({ name: newName.trim(), updated_at: new Date().toISOString() }).eq('id', viewId);
      setViews(prev => prev.map(v => v.id === viewId ? { ...v, name: newName.trim() } : v));
      setViewRenamingId(null);
    } catch (err) {
      console.error('Rename view error:', err);
    }
  }, []);

  const setDefaultView = useCallback(async (viewId) => {
    if (!activeWorkspaceId) return;
    try {
      // Clear existing default
      await supabase.from('enrich_views').update({ is_default: false }).eq('workspace_id', activeWorkspaceId);
      // Set new default
      if (viewId) {
        await supabase.from('enrich_views').update({ is_default: true }).eq('id', viewId);
      }
      setViews(prev => prev.map(v => ({ ...v, is_default: v.id === viewId })));
      toast.success(viewId ? 'Default view updated' : 'Default view cleared');
    } catch (err) {
      console.error('Set default view error:', err);
    }
  }, [activeWorkspaceId]);

  const duplicateView = useCallback(async (viewId) => {
    const view = views.find(v => v.id === viewId);
    if (!view) return;
    await saveView(`${view.name} (copy)`, null);
  }, [views, saveView]);

  const switchView = useCallback((viewId) => {
    if (viewId === null) {
      // Default view — reset everything
      setActiveViewId(null);
      setFilters([]);
      setSorts([]);
      setSearchInput('');
      setViewHasUnsaved(false);
    } else {
      const view = views.find(v => v.id === viewId);
      if (!view) return;
      setActiveViewId(viewId);
      applyViewConfig(view.config);
      setViewHasUnsaved(false);
    }
    setViewDropdownOpen(false);
  }, [views, applyViewConfig]);

  // Detect unsaved changes
  const activeView = useMemo(() => views.find(v => v.id === activeViewId), [views, activeViewId]);
  useEffect(() => {
    if (!activeViewId || !activeView) { setViewHasUnsaved(false); return; }
    const current = buildViewConfig();
    const saved = activeView.config;
    const changed = JSON.stringify(current.filters) !== JSON.stringify(saved.filters || [])
      || JSON.stringify(current.sorts) !== JSON.stringify(saved.sorts || [])
      || current.search !== (saved.search || '');
    setViewHasUnsaved(changed);
  }, [activeViewId, activeView, filters, sorts, searchInput, buildViewConfig]);

  // Keyboard shortcuts: Ctrl+1..5 for first 5 views, Ctrl+0 for default
  useEffect(() => {
    if (!activeWorkspaceId) return;
    const handleKeyDown = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === '0') { e.preventDefault(); switchView(null); return; }
      const num = parseInt(e.key);
      if (num >= 1 && num <= 5 && views[num - 1]) {
        e.preventDefault();
        switchView(views[num - 1].id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeWorkspaceId, views, switchView]);

  // Close view dropdown on outside click
  useEffect(() => {
    if (!viewDropdownOpen) return;
    const handleClick = (e) => {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(e.target)) setViewDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [viewDropdownOpen]);

  // Close more menu on outside click
  useEffect(() => {
    if (!moreMenuOpen) return;
    const handleClick = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) setMoreMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [moreMenuOpen]);

  // Close panels on Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key !== 'Escape') return;
      if (tabContextMenu) { setTabContextMenu(null); return; }
      if (moreMenuOpen) { setMoreMenuOpen(false); return; }
      if (colDialogOpen) { setColDialogOpen(false); return; }
      if (filterPanelOpen) { setFilterPanelOpen(false); return; }
      if (sortPanelOpen) { setSortPanelOpen(false); return; }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [colDialogOpen, filterPanelOpen, sortPanelOpen, tabContextMenu, moreMenuOpen]);

  // ─── Load workspace detail (moved before snapshot/revert to avoid forward ref) ───

  const loadWorkspaceDetail = useCallback(async (wsId, forceTableId) => {
    setWsLoading(true);
    try {
      const { data: ws, error: wsErr } = await supabase
        .from('enrich_workspaces')
        .select('*')
        .eq('id', wsId)
        .single();
      if (wsErr) throw wsErr;
      setWorkspace(ws);
      setWsName(ws.name);
      setAutoRun(ws.auto_run === true);

      // Fetch tables
      const { data: tbls, error: tblErr } = await supabase
        .from('enrich_tables')
        .select('*')
        .eq('workspace_id', wsId)
        .order('position', { ascending: true });
      if (tblErr) throw tblErr;
      setTables(tbls || []);

      // Determine active table
      const targetTableId = forceTableId || (tbls?.find(t => t.id === activeTableId) ? activeTableId : tbls?.[0]?.id);
      if (targetTableId && targetTableId !== activeTableId) setActiveTableId(targetTableId);
      if (!targetTableId) {
        setColumns([]); setRows([]); setCells({}); setWsLoading(false);
        return;
      }

      // Fetch columns for active table
      const { data: cols, error: colErr } = await supabase
        .from('enrich_columns')
        .select('*')
        .eq('table_id', targetTableId)
        .order('position', { ascending: true });
      if (colErr) throw colErr;
      setColumns(cols || []);

      // Fetch rows for active table (paginate — Supabase default limit = 1000)
      let rws = [];
      const ROW_PAGE = 1000;
      for (let off = 0; ; off += ROW_PAGE) {
        const { data: page, error: rwErr } = await supabase
          .from('enrich_rows')
          .select('*')
          .eq('table_id', targetTableId)
          .order('position', { ascending: true })
          .range(off, off + ROW_PAGE - 1);
        if (rwErr) throw rwErr;
        if (!page || page.length === 0) break;
        rws = rws.concat(page);
        if (page.length < ROW_PAGE) break;
      }
      setRows(rws);

      // Fetch cells (paginate by row batches to avoid query size limits)
      if (rws.length && cols?.length) {
        const cellMap = {};
        const CELL_BATCH = 500;
        for (let b = 0; b < rws.length; b += CELL_BATCH) {
          const batchIds = rws.slice(b, b + CELL_BATCH).map(r => r.id);
          const { data: cellData, error: cellErr } = await supabase
            .from('enrich_cells')
            .select('*')
            .in('row_id', batchIds);
          if (cellErr) throw cellErr;
          (cellData || []).forEach(c => { cellMap[`${c.row_id}:${c.column_id}`] = c; });
        }
        setCells(cellMap);
      } else {
        setCells({});
      }
    } catch (err) {
      console.error('Error loading workspace:', err);
      toast.error('Failed to load workspace');
    } finally {
      setWsLoading(false);
    }
  }, [activeTableId]);

  // ─── Multi-table management ───────────────────────────────────────────────

  const switchTable = useCallback(async (tableId) => {
    if (!activeWorkspaceId || !tableId || tableId === activeTableId) return;
    setActiveTableId(tableId);
    try {
      const { data: cols } = await supabase.from('enrich_columns').select('*').eq('table_id', tableId).order('position', { ascending: true });
      setColumns(cols || []);
      let rws = [];
      for (let off = 0; ; off += 1000) {
        const { data: page } = await supabase.from('enrich_rows').select('*').eq('table_id', tableId).order('position', { ascending: true }).range(off, off + 999);
        if (!page || page.length === 0) break;
        rws = rws.concat(page);
        if (page.length < 1000) break;
      }
      setRows(rws);
      if (rws.length && cols?.length) {
        const cellMap = {};
        for (let b = 0; b < rws.length; b += 500) {
          const batchIds = rws.slice(b, b + 500).map(r => r.id);
          const { data: cellData } = await supabase.from('enrich_cells').select('*').in('row_id', batchIds);
          (cellData || []).forEach(c => { cellMap[`${c.row_id}:${c.column_id}`] = c; });
        }
        setCells(cellMap);
      } else { setCells({}); }
    } catch (err) { console.error('Switch table error:', err); toast.error('Failed to switch table'); }
  }, [activeWorkspaceId, activeTableId]);

  const createNewTable = useCallback(async () => {
    if (!activeWorkspaceId) return;
    try {
      const { data: newTable, error } = await supabase.from('enrich_tables').insert({
        workspace_id: activeWorkspaceId, name: `Table ${tables.length + 1}`, position: tables.length,
      }).select().single();
      if (error) throw error;
      setTables(prev => [...prev, newTable]);
      switchTable(newTable.id);
      toast.success(`Created ${newTable.name}`);
    } catch (err) { console.error('Create table error:', err); toast.error('Failed to create table'); }
  }, [activeWorkspaceId, tables.length, switchTable]);

  const renameTable = useCallback(async (tableId, newName) => {
    if (!newName?.trim()) return;
    try {
      await supabase.from('enrich_tables').update({ name: newName.trim(), updated_at: new Date().toISOString() }).eq('id', tableId);
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, name: newName.trim() } : t));
    } catch (err) { toast.error('Failed to rename table'); }
  }, []);

  const duplicateTable = useCallback(async (tableId) => {
    const src = tables.find(t => t.id === tableId);
    if (!src) return;
    try {
      const { data: newTable, error } = await supabase.from('enrich_tables').insert({
        workspace_id: activeWorkspaceId, name: `${src.name} (Copy)`, position: tables.length,
      }).select().single();
      if (error) throw error;
      // Copy columns
      const { data: srcCols } = await supabase.from('enrich_columns').select('*').eq('table_id', tableId);
      if (srcCols?.length) {
        await supabase.from('enrich_columns').insert(srcCols.map(({ id, created_at, updated_at, ...c }) => ({ ...c, table_id: newTable.id })));
      }
      // Copy rows
      const { data: srcRows } = await supabase.from('enrich_rows').select('*').eq('table_id', tableId);
      if (srcRows?.length) {
        await supabase.from('enrich_rows').insert(srcRows.map(({ id, created_at, updated_at, ...r }) => ({ ...r, table_id: newTable.id })));
      }
      setTables(prev => [...prev, newTable]);
      toast.success('Table duplicated');
    } catch (err) { console.error('Duplicate table error:', err); toast.error('Failed to duplicate table'); }
  }, [tables, activeWorkspaceId]);

  const deleteTable = useCallback(async (tableId) => {
    if (tables.length <= 1) { toast.error('Cannot delete the last table'); return; }
    if (!window.confirm('Delete this table and all its data?')) return;
    try {
      await supabase.from('enrich_tables').delete().eq('id', tableId);
      const remaining = tables.filter(t => t.id !== tableId);
      setTables(remaining);
      if (activeTableId === tableId) switchTable(remaining[0].id);
      toast.success('Table deleted');
    } catch (err) { toast.error('Failed to delete table'); }
  }, [tables, activeTableId, switchTable]);

  // Table keyboard shortcuts (must be after switchTable/createNewTable definitions)
  useEffect(() => {
    const handleTableKeys = (e) => {
      if (e.ctrlKey && e.key === 'PageUp' && tables.length > 1) {
        e.preventDefault();
        const idx = tables.findIndex(t => t.id === activeTableId);
        if (idx > 0) switchTable(tables[idx - 1].id);
      }
      if (e.ctrlKey && e.key === 'PageDown' && tables.length > 1) {
        e.preventDefault();
        const idx = tables.findIndex(t => t.id === activeTableId);
        if (idx < tables.length - 1) switchTable(tables[idx + 1].id);
      }
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        createNewTable();
      }
    };
    window.addEventListener('keydown', handleTableKeys);
    return () => window.removeEventListener('keydown', handleTableKeys);
  }, [tables, activeTableId, switchTable, createNewTable]);

  const createSnapshot = useCallback(async () => {
    if (!snapshotName.trim() || !activeWorkspaceId) return;
    try {
      const snapshotData = {
        columns: columns.map(c => ({ id: c.id, name: c.name, type: c.type, config: c.config, position: c.position, width: c.width })),
        rows: rows.map(r => ({ id: r.id, position: r.position })),
        cells: { ...cells },
      };
      await supabase.from('enrich_snapshots').insert({
        workspace_id: activeWorkspaceId,
        name: snapshotName.trim(),
        description: snapshotDesc.trim() || null,
        snapshot_data: snapshotData,
      });
      toast.success(`Snapshot "${snapshotName}" created`);
      setSnapshotDialogOpen(false);
      setSnapshotName('');
      setSnapshotDesc('');
      loadSnapshots();
      trackChange('snapshot_create', `Created snapshot "${snapshotName}"`);
    } catch (err) {
      console.error('Create snapshot error:', err);
      toast.error('Failed to create snapshot');
    }
  }, [snapshotName, snapshotDesc, activeWorkspaceId, columns, rows, cells, loadSnapshots, trackChange]);

  const restoreSnapshot = useCallback(async (snapshotId) => {
    if (!window.confirm('Restore this snapshot? Current data will be overwritten.')) return;
    try {
      const { data: snap } = await supabase.from('enrich_snapshots').select('*').eq('id', snapshotId).single();
      if (!snap?.snapshot_data) { toast.error('Snapshot data not found'); return; }
      const sd = snap.snapshot_data;

      // Delete current data
      const rowIds = rows.map(r => r.id);
      if (rowIds.length) await supabase.from('enrich_cells').delete().in('row_id', rowIds);
      await supabase.from('enrich_rows').delete().eq('workspace_id', activeWorkspaceId);
      await supabase.from('enrich_columns').delete().eq('workspace_id', activeWorkspaceId);

      // Restore columns
      if (sd.columns?.length) {
        await supabase.from('enrich_columns').insert(sd.columns.map(c => ({ ...c, workspace_id: activeWorkspaceId })));
      }
      // Restore rows
      if (sd.rows?.length) {
        await supabase.from('enrich_rows').insert(sd.rows.map(r => ({ ...r, workspace_id: activeWorkspaceId })));
      }
      // Restore cells — flatten cells object into array
      const cellArr = [];
      for (const [, cellData] of Object.entries(sd.cells || {})) {
        if (cellData?.row_id && cellData?.column_id) {
          cellArr.push({ row_id: cellData.row_id, column_id: cellData.column_id, value: cellData.value, status: cellData.status || 'complete' });
        }
      }
      if (cellArr.length) {
        // Batch insert cells in chunks
        for (let i = 0; i < cellArr.length; i += 50) {
          await supabase.from('enrich_cells').insert(cellArr.slice(i, i + 50));
        }
      }

      toast.success(`Restored snapshot "${snap.name}"`);
      trackChange('snapshot_restore', `Restored snapshot "${snap.name}"`);
      loadWorkspaceDetail(activeWorkspaceId);
    } catch (err) {
      console.error('Restore snapshot error:', err);
      toast.error('Failed to restore snapshot');
    }
  }, [activeWorkspaceId, rows, trackChange, loadWorkspaceDetail]);

  const deleteSnapshot = useCallback(async (snapshotId) => {
    if (!window.confirm('Delete this snapshot?')) return;
    await supabase.from('enrich_snapshots').delete().eq('id', snapshotId);
    loadSnapshots();
    toast.success('Snapshot deleted');
  }, [loadSnapshots]);

  const revertChange = useCallback(async (entry) => {
    if (!entry.before_value && !entry.after_value) {
      toast.error('No revert data available for this change');
      return;
    }
    const meta = entry.metadata || {};

    if (entry.action_type === 'edit_cell' && meta.row_id && meta.column_id) {
      const oldVal = entry.before_value?.v ?? '';
      const key = cellKey(meta.row_id, meta.column_id);
      setCells(prev => ({ ...prev, [key]: { ...prev[key], value: { v: oldVal }, status: 'complete' } }));
      await supabase.from('enrich_cells').upsert({
        row_id: meta.row_id, column_id: meta.column_id, value: { v: oldVal }, status: 'complete', updated_at: new Date().toISOString(),
      }, { onConflict: 'row_id,column_id' });
      toast.success('Cell reverted');
      trackChange('edit_cell', `Reverted: ${entry.description}`, { beforeValue: entry.after_value, afterValue: entry.before_value, metadata: meta });
    } else if (entry.action_type === 'delete_column' && entry.before_value) {
      // Re-add deleted column
      const colData = entry.before_value;
      await supabase.from('enrich_columns').insert({ workspace_id: activeWorkspaceId, name: colData.name, type: colData.type, config: colData.config, position: colData.position, width: colData.width });
      toast.success(`Column "${colData.name}" restored`);
      loadWorkspaceDetail(activeWorkspaceId);
      trackChange('add_column', `Restored column "${colData.name}" (undo)`);
    } else if (entry.action_type === 'add_column' && meta.column_id) {
      await supabase.from('enrich_cells').delete().eq('column_id', meta.column_id);
      await supabase.from('enrich_columns').delete().eq('id', meta.column_id);
      toast.success('Column addition reverted');
      loadWorkspaceDetail(activeWorkspaceId);
      trackChange('delete_column', `Reverted: ${entry.description}`);
    } else {
      toast.info('This change type cannot be individually reverted');
    }
  }, [cellKey, activeWorkspaceId, loadWorkspaceDetail, trackChange]);

  // ─── Load workspaces ───────────────────────────────────────────────────

  const loadWorkspaces = useCallback(async () => {
    if (!orgId) return;
    setWorkspacesLoading(true);
    try {
      const { data, error } = await supabase
        .from('enrich_workspaces')
        .select('*, enrich_columns(count), enrich_rows(count)')
        .eq('organization_id', orgId)
        .eq('module', 'growth')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setWorkspaces(data || []);
    } catch (err) {
      console.error('Error loading workspaces:', err);
      toast.error('Failed to load workspaces');
    } finally {
      setWorkspacesLoading(false);
    }
  }, [orgId]);

  useEffect(() => { loadWorkspaces(); }, [loadWorkspaces]);

  // ─── Campaign mode: auto-load/create workspace ────────────────────────

  useEffect(() => {
    if (!campaignId || !orgId || !user?.id) return;
    let cancelled = false;

    async function initCampaignMode() {
      setCampaignLoading(true);
      setCampaignLoadingStatus('Loading campaign...');
      try {
        // Load campaign
        const { data: camp, error: campErr } = await supabase
          .from('growth_campaigns')
          .select('*')
          .eq('id', campaignId)
          .single();
        if (campErr || !camp) { toast.error('Campaign not found'); return; }
        if (cancelled) return;
        setCampaign(camp);

        // If campaign already has a workspace, check if it has data
        if (camp.enrich_workspace_id) {
          const { count } = await supabase
            .from('enrich_rows')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', camp.enrich_workspace_id);

          if (count > 0 || !camp.selected_nest_ids?.length) {
            // Workspace has data or no nests to import — just load it
            setActiveWorkspaceId(camp.enrich_workspace_id);
            setCampaignLoading(false);
            return;
          }
          // Workspace is empty but campaign has nests — delete and recreate with import
          await supabase.from('enrich_workspaces').delete().eq('id', camp.enrich_workspace_id);
          await supabase.from('growth_campaigns').update({ enrich_workspace_id: null }).eq('id', campaignId);
        }

        // Auto-create workspace for this campaign
        setCampaignLoadingStatus('Creating enrichment workspace...');
        const selectedNestIds = camp.selected_nest_ids || [];
        const wsName = `${camp.name || 'Campaign'} - Enrichment`;
        const { data: ws, error: wsErr } = await supabase
          .from('enrich_workspaces')
          .insert({
            organization_id: orgId,
            name: wsName,
            created_by: user.id,
            module: 'growth',
            // nest_id FK references nests table — growth nests are separate, so leave null
            nest_id: null,
          })
          .select()
          .single();
        if (wsErr) throw wsErr;

        // Create Table 1
        const { data: tbl } = await supabase
          .from('enrich_tables')
          .insert({ workspace_id: ws.id, name: 'Table 1', position: 0 })
          .select('id')
          .single();

        // Link workspace to campaign
        await supabase
          .from('growth_campaigns')
          .update({ enrich_workspace_id: ws.id, journey_phase: 'enrich' })
          .eq('id', campaignId);

        if (cancelled) return;

        // Auto-import prospects from ALL selected nests
        if (selectedNestIds.length > 0) {
          try {
            const tableId = tbl?.id || null;
            let allProspects = [];

            // Growth nests: paginate growth_nest_items→prospects (default limit = 1000)
            setCampaignLoadingStatus('Loading prospects from nests...');
            const PAGE = 1000;
            let nestItems = [];
            for (let off = 0; ; off += PAGE) {
              const { data: page, error: pageErr } = await supabase
                .from('growth_nest_items')
                .select('id, prospect_id, prospects(first_name, last_name, email, linkedin_url, job_title, company, location, phone, website)')
                .in('growth_nest_id', selectedNestIds)
                .range(off, off + PAGE - 1);
              if (pageErr) { console.error('Nest items page error:', pageErr); break; }
              if (!page || page.length === 0) break;
              nestItems = nestItems.concat(page);
              if (page.length < PAGE) break;
            }

            if (nestItems.length) {
              allProspects = nestItems.filter(ni => ni.prospects).map(ni => {
                const p = ni.prospects;
                return {
                  nestItemId: ni.id,
                  sourceData: {
                    full_name: [p.first_name, p.last_name].filter(Boolean).join(' ') || '',
                    email: p.email || '',
                    linkedin_profile: p.linkedin_url || '',
                    job_title: p.job_title || '',
                    company_name: p.company || '',
                    location: p.location || '',
                    phone: p.phone || '',
                    website: p.website || '',
                  },
                };
              });
            }

            // Fallback: load preview_data from growth_nests
            if (allProspects.length === 0) {
              const { data: nestData } = await supabase
                .from('growth_nests')
                .select('id, preview_data')
                .in('id', selectedNestIds);
              if (nestData) {
                for (const nest of nestData) {
                  if (Array.isArray(nest.preview_data)) {
                    for (const p of nest.preview_data) {
                      allProspects.push({
                        nestItemId: null,
                        sourceData: {
                          full_name: p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || p.name || '',
                          email: p.email || '',
                          linkedin_profile: p.linkedin_url || p.linkedin_profile || '',
                          job_title: p.job_title || p.title || '',
                          company_name: p.company_name || p.company || '',
                          location: p.location || p.city || '',
                          ...p,
                        },
                      });
                    }
                  }
                }
              }
            }

            if (allProspects.length > 0) {
              // Create default columns first
              const defaultCols = [
                { name: 'Name', type: 'field', config: { source_field: 'full_name' }, position: 0 },
                { name: 'LinkedIn', type: 'field', config: { source_field: 'linkedin_profile' }, position: 1 },
                { name: 'Title', type: 'field', config: { source_field: 'job_title' }, position: 2 },
                { name: 'Company', type: 'field', config: { source_field: 'company_name' }, position: 3 },
                { name: 'Website', type: 'field', config: { source_field: 'website' }, position: 4 },
                { name: 'Email', type: 'field', config: { source_field: 'email' }, position: 5 },
                { name: 'Phone', type: 'field', config: { source_field: 'phone' }, position: 6 },
                { name: 'Location', type: 'field', config: { source_field: 'location' }, position: 7 },
              ].map(c => ({ ...c, workspace_id: ws.id, table_id: tableId, width: DEFAULT_COL_WIDTH }));

              const { data: newCols, error: colErr } = await supabase
                .from('enrich_columns')
                .insert(defaultCols)
                .select();
              if (colErr) throw colErr;

              // Insert rows in batches of 300 (2885 at once exceeds request limits)
              setCampaignLoadingStatus(`Importing ${allProspects.length} prospects...`);
              const ROW_BATCH = 300;
              let allNewRows = [];
              for (let b = 0; b < allProspects.length; b += ROW_BATCH) {
                const batch = allProspects.slice(b, b + ROW_BATCH);
                const rowInserts = batch.map((item, idx) => ({
                  workspace_id: ws.id,
                  table_id: tableId,
                  // nest_item_id FK references nest_items(id) — growth nest items are separate, so leave null
                  nest_item_id: null,
                  source_data: item.sourceData,
                  position: b + idx,
                }));
                const { data: batchRows, error: rowErr } = await supabase
                  .from('enrich_rows')
                  .insert(rowInserts)
                  .select();
                if (rowErr) throw rowErr;
                if (batchRows) allNewRows = allNewRows.concat(batchRows);
              }

              // Pre-populate field cells in batches
              const cellInserts = [];
              for (const row of allNewRows) {
                for (const col of (newCols || [])) {
                  const sourceField = col.config?.source_field;
                  if (sourceField && row.source_data) {
                    const val = row.source_data[sourceField];
                    if (val != null && val !== '') {
                      cellInserts.push({
                        row_id: row.id,
                        column_id: col.id,
                        value: typeof val === 'object' ? val : { v: val },
                        status: 'complete',
                      });
                    }
                  }
                }
              }
              setCampaignLoadingStatus('Populating cells...');
              if (cellInserts.length) {
                for (let i = 0; i < cellInserts.length; i += 500) {
                  await supabase.from('enrich_cells').upsert(cellInserts.slice(i, i + 500));
                }
              }
              toast.success(`Imported ${allNewRows.length} prospects from ${selectedNestIds.length} nest${selectedNestIds.length > 1 ? 's' : ''}`);
            } else {
              toast.info('No prospect data found in selected nests. Import data manually or upload a CSV.');
            }
          } catch (importErr) {
            console.error('Auto-import from nests failed:', importErr);
            toast.error('Failed to auto-import nest data');
          }
        }

        setActiveWorkspaceId(ws.id);
        loadWorkspaces();
      } catch (err) {
        console.error('Campaign mode init error:', err);
        toast.error('Failed to initialize enrichment workspace');
      } finally {
        if (!cancelled) setCampaignLoading(false);
      }
    }

    initCampaignMode();
    return () => { cancelled = true; };
  }, [campaignId, orgId, user?.id]);

  // Campaign continue handler
  const handleContinueToFlow = useCallback(async () => {
    if (!campaignId || !activeWorkspaceId) return;
    setSavingCampaign(true);
    try {
      await supabase
        .from('growth_campaigns')
        .update({
          enrich_workspace_id: activeWorkspaceId,
          journey_phase: 'flow',
          updated_date: new Date().toISOString(),
        })
        .eq('id', campaignId);
      navigate(`/growth/campaign/${campaignId}/flow`);
      toast.success('Enrichment saved! Building your flow...');
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSavingCampaign(false);
    }
  }, [campaignId, activeWorkspaceId, navigate]);

  // ─── SYNC Suggestions for campaign mode ────────────────────────────────

  const campaignSuggestions = useMemo(() => {
    if (!campaign) return [];
    const channels = campaign.campaign_goals?.channels || {};
    const suggestions = [];
    if (channels.email) {
      suggestions.push({ id: 'email_waterfall', icon: Mail, label: 'Add Email Waterfall', desc: 'Find verified email addresses using multiple providers', colConfig: { type: 'waterfall', name: 'Email (Waterfall)' } });
    }
    if (channels.linkedin) {
      suggestions.push({ id: 'linkedin_enrich', icon: Linkedin, label: 'Add LinkedIn Enrichment', desc: 'Enrich profiles from LinkedIn URLs', colConfig: { type: 'enrichment', name: 'LinkedIn Enrichment' } });
    }
    if (channels.phone) {
      suggestions.push({ id: 'phone_enrich', icon: PhoneIcon, label: 'Add Phone Number', desc: 'Find direct phone numbers', colConfig: { type: 'enrichment', name: 'Phone Number' } });
    }
    suggestions.push({ id: 'ai_research', icon: Brain, label: 'Add AI Research', desc: 'AI-powered research on each prospect', colConfig: { type: 'ai', name: 'AI Research' } });
    return suggestions;
  }, [campaign]);

  // ─── Load nests for picker ─────────────────────────────────────────────

  const loadNests = useCallback(async () => {
    if (!orgId) return;
    setNestsLoading(true);
    try {
      // Get nests the user has purchased
      const { data: purchases } = await supabase
        .from('growth_nest_purchases')
        .select('nest_id')
        .eq('user_id', user?.id)
        .eq('status', 'completed');
      const purchasedNestIds = (purchases || []).map(p => p.nest_id);

      let query = supabase.from('growth_nests').select('id, name, lead_count').order('created_at', { ascending: false });
      if (purchasedNestIds.length) {
        query = query.in('id', purchasedNestIds);
      } else {
        // No purchased nests — show active marketplace nests
        query = query.eq('is_active', true).limit(20);
      }
      const { data, error } = await query;
      if (error) throw error;
      setNests(data || []);
    } catch (err) {
      console.error('Error loading nests:', err);
    } finally {
      setNestsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (createDialogOpen) loadNests();
  }, [createDialogOpen, loadNests]);

  // ─── Create workspace ──────────────────────────────────────────────────

  const handleCreateWorkspace = useCallback(async () => {
    if (!newWsName.trim()) { toast.error('Enter a workspace name'); return; }
    try {
      const { data, error } = await supabase
        .from('enrich_workspaces')
        .insert({
          organization_id: orgId,
          name: newWsName.trim(),
          nest_id: newWsNestId || null,
          created_by: user?.id,
          module: 'growth',
        })
        .select()
        .single();
      if (error) throw error;
      // Auto-create Table 1
      await supabase.from('enrich_tables').insert({ workspace_id: data.id, name: 'Table 1', position: 0 });
      toast.success('Workspace created');
      setCreateDialogOpen(false);
      setNewWsName('');
      setNewWsNestId('');
      loadWorkspaces();
      setActiveWorkspaceId(data.id);
    } catch (err) {
      console.error('Error creating workspace:', err);
      toast.error('Failed to create workspace');
    }
  }, [newWsName, newWsNestId, orgId, user?.id, loadWorkspaces]);

  useEffect(() => {
    if (activeWorkspaceId) {
      loadWorkspaceDetail(activeWorkspaceId);
      loadHistory();
      loadSnapshots();
      loadViews().then(() => {
        // Apply default view if one exists (after views loaded)
      });
    }
  }, [activeWorkspaceId, loadWorkspaceDetail, loadHistory, loadSnapshots, loadViews]);

  // Apply default view after views load
  useEffect(() => {
    if (views.length > 0 && !activeViewId && columns.length > 0) {
      const defaultView = views.find(v => v.is_default);
      if (defaultView) {
        setActiveViewId(defaultView.id);
        applyViewConfig(defaultView.config);
      }
    }
  }, [views, columns.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Update workspace name ─────────────────────────────────────────────

  const saveWorkspaceName = useCallback(async () => {
    if (!wsName.trim() || !workspace) return;
    setEditingName(false);
    try {
      await supabase.from('enrich_workspaces').update({ name: wsName.trim(), updated_at: new Date().toISOString() }).eq('id', workspace.id);
    } catch (err) {
      console.error('Error updating name:', err);
    }
  }, [wsName, workspace]);

  // ─── Import from nest ──────────────────────────────────────────────────

  const importFromNest = useCallback(async () => {
    if (!workspace?.nest_id) return;
    const loadingToast = toast.loading('Importing candidates from nest...');
    try {
      const { data: nestItems, error: niErr } = await supabase
        .from('nest_items')
        .select('id, candidate_id, candidates(*)')
        .eq('nest_id', workspace.nest_id);
      if (niErr) throw niErr;
      if (!nestItems?.length) { toast.dismiss(loadingToast); toast.info('No candidates in this nest'); return; }

      // Create rows
      const rowInserts = nestItems.map((ni, idx) => ({
        workspace_id: workspace.id,
        nest_item_id: ni.id,
        source_data: ni.candidates || {},
        position: idx,
      }));
      const { data: newRows, error: rowErr } = await supabase
        .from('enrich_rows')
        .insert(rowInserts)
        .select();
      if (rowErr) throw rowErr;

      // Create default columns
      const defaultCols = [
        { name: 'Name', type: 'field', config: { source_field: 'full_name' }, position: 0 },
        { name: 'Email', type: 'field', config: { source_field: 'email' }, position: 1 },
        { name: 'LinkedIn', type: 'field', config: { source_field: 'linkedin_profile' }, position: 2 },
        { name: 'Title', type: 'field', config: { source_field: 'job_title' }, position: 3 },
        { name: 'Company', type: 'field', config: { source_field: 'company_name' }, position: 4 },
        { name: 'Location', type: 'field', config: { source_field: 'location' }, position: 5 },
      ].map(c => ({ ...c, workspace_id: workspace.id, width: DEFAULT_COL_WIDTH }));

      const { data: newCols, error: colErr } = await supabase
        .from('enrich_columns')
        .insert(defaultCols)
        .select();
      if (colErr) throw colErr;

      // Pre-populate field cells
      const cellInserts = [];
      for (const row of newRows) {
        for (const col of newCols) {
          const sourceField = col.config?.source_field;
          if (sourceField && row.source_data) {
            const val = row.source_data[sourceField];
            if (val != null && val !== '') {
              cellInserts.push({
                row_id: row.id,
                column_id: col.id,
                value: typeof val === 'object' ? val : { v: val },
                status: 'complete',
              });
            }
          }
        }
      }
      if (cellInserts.length) {
        await supabase.from('enrich_cells').upsert(cellInserts);
      }

      toast.dismiss(loadingToast);
      toast.success(`Imported ${newRows.length} candidates with ${newCols.length} columns`);
      loadWorkspaceDetail(workspace.id);
    } catch (err) {
      toast.dismiss(loadingToast);
      console.error('Import error:', err);
      toast.error('Failed to import from nest');
    }
  }, [workspace, loadWorkspaceDetail]);

  // ─── Import CSV ───────────────────────────────────────────────────────

  const parseCSV = useCallback((text) => {
    const lines = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        if (inQuotes && text[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        lines.push(current); current = '';
      } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
        if (current || lines.length) { lines.push(current); }
        if (lines.length) { return { firstRow: lines, rest: text.slice(i + (text[i + 1] === '\n' ? 2 : 1)) }; }
        current = ''; lines.length = 0;
      } else {
        current += ch;
      }
    }
    if (current || lines.length) lines.push(current);
    return { firstRow: lines, rest: '' };
  }, []);

  const parseCSVRows = useCallback((text, numCols) => {
    const rows = [];
    let remaining = text;
    while (remaining.trim()) {
      const cols = [];
      let current = '';
      let inQuotes = false;
      let i = 0;
      for (; i < remaining.length; i++) {
        const ch = remaining[i];
        if (ch === '"') {
          if (inQuotes && remaining[i + 1] === '"') { current += '"'; i++; }
          else { inQuotes = !inQuotes; }
        } else if (ch === ',' && !inQuotes) {
          cols.push(current); current = '';
        } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
          cols.push(current);
          remaining = remaining.slice(i + (remaining[i + 1] === '\n' ? 2 : 1));
          break;
        } else {
          current += ch;
        }
      }
      if (i >= remaining.length) { cols.push(current); remaining = ''; }
      if (cols.some(c => c.trim())) rows.push(cols);
    }
    return rows;
  }, []);

  const importCSV = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeWorkspaceId) return;
    e.target.value = '';

    const loadingToast = toast.loading(`Importing ${file.name}...`);
    try {
      const text = await file.text();
      const { firstRow: headers, rest } = parseCSV(text);
      if (!headers?.length) throw new Error('No headers found');

      // Clean headers: skip empty first col (like "Find companies")
      const cleanHeaders = headers.map(h => h.trim()).filter(h => h);
      const headerIndexMap = headers.map((h, i) => ({ header: h.trim(), index: i })).filter(h => h.header);

      // Parse data rows
      const dataRows = parseCSVRows(rest, headers.length);
      if (!dataRows.length) throw new Error('No data rows found');

      // Create columns for each header
      const colInserts = cleanHeaders.map((h, pos) => ({
        workspace_id: activeWorkspaceId,
        table_id: activeTableId || null,
        name: h,
        type: 'field',
        position: pos,
        config: { source_field: h.toLowerCase().replace(/\s+/g, '_') },
        width: h.toLowerCase().includes('description') ? 300 : DEFAULT_COL_WIDTH,
      }));
      const { data: newCols, error: colErr } = await supabase
        .from('enrich_columns')
        .insert(colInserts)
        .select();
      if (colErr) throw colErr;

      // Create rows with source_data from CSV
      const rowInserts = dataRows.map((csvRow, idx) => {
        const sourceData = {};
        headerIndexMap.forEach(({ header, index }) => {
          const key = header.toLowerCase().replace(/\s+/g, '_');
          sourceData[key] = csvRow[index]?.trim() || '';
        });
        // Also store raw named fields
        headerIndexMap.forEach(({ header, index }) => {
          sourceData[header] = csvRow[index]?.trim() || '';
        });
        return {
          workspace_id: activeWorkspaceId,
          table_id: activeTableId || null,
          source_data: sourceData,
          position: idx,
        };
      });

      // Batch insert rows (max 500 at a time for Supabase)
      const allNewRows = [];
      for (let i = 0; i < rowInserts.length; i += 500) {
        const batch = rowInserts.slice(i, i + 500);
        const { data: batchRows, error: rwErr } = await supabase
          .from('enrich_rows')
          .insert(batch)
          .select();
        if (rwErr) throw rwErr;
        allNewRows.push(...(batchRows || []));
        toast.loading(`Importing ${file.name}: ${Math.min(i + 500, rowInserts.length)}/${rowInserts.length} rows...`, { id: loadingToast });
      }

      // Pre-populate cells for field columns
      const cellInserts = [];
      for (const row of allNewRows) {
        for (const col of newCols) {
          const key = col.config?.source_field;
          const val = key ? (row.source_data?.[key] || '') : '';
          if (val) {
            cellInserts.push({
              row_id: row.id,
              column_id: col.id,
              value: { v: val },
              status: 'complete',
            });
          }
        }
      }
      // Batch insert cells
      for (let i = 0; i < cellInserts.length; i += 500) {
        await supabase.from('enrich_cells').upsert(cellInserts.slice(i, i + 500));
      }

      toast.dismiss(loadingToast);
      toast.success(`Imported ${allNewRows.length} rows with ${newCols.length} columns from ${file.name}`);
      trackChange('import_csv', `Imported CSV "${file.name}" — ${allNewRows.length} rows, ${newCols.length} columns`, { metadata: { filename: file.name, rows: allNewRows.length, columns: newCols.length } });
      loadWorkspaceDetail(activeWorkspaceId);
    } catch (err) {
      toast.dismiss(loadingToast);
      console.error('CSV import error:', err);
      toast.error(`Failed to import CSV: ${err.message}`);
    }
  }, [activeWorkspaceId, activeTableId, parseCSV, parseCSVRows, loadWorkspaceDetail, trackChange]);

  // ─── Add column ────────────────────────────────────────────────────────

  const handleAddColumn = useCallback(async () => {
    let finalName = colName.trim();
    if (!finalName) {
      // Auto-generate name from config
      if (colType === 'ai' && colConfig.prompt) {
        finalName = colConfig.prompt.replace(/\/\w+/g, '').trim().slice(0, 40).trim();
        if (finalName.length > 30) finalName = finalName.slice(0, finalName.lastIndexOf(' ')) || finalName.slice(0, 30);
      } else if (colType === 'enrichment' && colConfig.output_field) {
        // Auto-name from the selected output field label
        const groups = getOutputFieldsForFunction(colConfig.function);
        const fieldDef = groups.flatMap(g => g.fields).find(f => f.value === colConfig.output_field);
        finalName = fieldDef?.label || colConfig.output_field.replace(/\./g, ' ').replace(/_/g, ' ');
      } else {
        toast.error('Enter a column name'); return;
      }
    }
    // Validate enrichment columns have required config
    if (colType === 'enrichment') {
      if (!colConfig.function) { toast.error('Select an enrichment type'); return; }
      if (!colConfig.input_column_id) { toast.error('Select an input column'); return; }
      if (!colConfig.output_field) { toast.error('Select what data you want back'); return; }
    }
    if (colType === 'ai' && !colConfig.prompt) { toast.error('Enter a prompt for the AI column'); return; }
    if (colType === 'waterfall' && (!colConfig.sources || colConfig.sources.length === 0)) { toast.error('Add at least one source for waterfall'); return; }

    try {
      const pos = columns.length;
      const { error } = await supabase.from('enrich_columns').insert({
        workspace_id: activeWorkspaceId,
        table_id: activeTableId,
        name: finalName,
        type: colType,
        position: pos,
        config: colConfig,
        width: DEFAULT_COL_WIDTH,
      });
      if (error) throw error;
      toast.success('Column added');
      trackChange('add_column', `Added column "${finalName}" (${colType})`, { afterValue: { name: finalName, type: colType, config: colConfig } });
      setColDialogOpen(false);
      setColName('');
      setColType('field');
      setColConfig({});
      setHttpTestResult(null);
      loadWorkspaceDetail(activeWorkspaceId);
    } catch (err) {
      console.error('Error adding column:', err);
      toast.error('Failed to add column');
    }
  }, [colName, colType, colConfig, columns.length, activeWorkspaceId, loadWorkspaceDetail, trackChange]);

  // ─── Delete column ─────────────────────────────────────────────────────

  const deleteColumn = useCallback(async (colId) => {
    const col = columns.find(c => c.id === colId);
    if (!window.confirm(`Delete column "${col?.name || 'Untitled'}" and all its data?`)) return;
    try {
      await supabase.from('enrich_cells').delete().eq('column_id', colId);
      await supabase.from('enrich_columns').delete().eq('id', colId);
      toast.success('Column deleted');
      trackChange('delete_column', `Deleted column "${col?.name}"`, { beforeValue: col ? { name: col.name, type: col.type, config: col.config, position: col.position, width: col.width } : null, metadata: { column_id: colId } });
      loadWorkspaceDetail(activeWorkspaceId);
    } catch (err) {
      console.error('Error deleting column:', err);
      toast.error('Failed to delete column');
    }
  }, [activeWorkspaceId, loadWorkspaceDetail, columns, trackChange]);

  // ─── Cell value helpers ────────────────────────────────────────────────

  const getCellDisplayValue = useCallback((rowId, col) => {
    const cell = cells[cellKey(rowId, col.id)];
    if (col.type === 'field') {
      let raw = '';
      if (cell?.value) raw = typeof cell.value === 'object' ? (cell.value.v ?? JSON.stringify(cell.value)) : String(cell.value);
      else {
        const row = rows.find(r => r.id === rowId);
        if (row?.source_data && col.config?.source_field) {
          const val = row.source_data[col.config.source_field];
          if (val != null) raw = typeof val === 'object' ? JSON.stringify(val) : String(val);
        }
      }
      return col.config?.data_type && col.config.data_type !== 'text' ? formatFieldValue(raw, col.config) : raw;
    }
    if (col.type === 'formula') {
      const row = rows.find(r => r.id === rowId);
      const columnMap = {};
      columns.forEach(c => {
        const cv = getCellRawValue(rowId, c);
        columnMap[c.name] = cv;
      });
      return evaluateFormula(col.config?.expression, columnMap);
    }
    if (col.type === 'merge') {
      const srcColIds = col.config?.source_columns || [];
      const separator = col.config?.separator ?? ', ';
      const emptyHandling = col.config?.empty_handling || 'skip';
      const placeholder = col.config?.placeholder || '';
      const outputFormat = col.config?.output_format || 'plain';
      const values = srcColIds.map(cid => {
        const srcCol = columns.find(c => c.id === cid);
        if (!srcCol) return null;
        return getCellRawValue(rowId, srcCol);
      });
      const processed = values.map(v => {
        if (!v && v !== 0) {
          if (emptyHandling === 'skip') return null;
          if (emptyHandling === 'placeholder') return placeholder;
          return '';
        }
        return String(v);
      }).filter(v => v !== null);
      if (outputFormat === 'bulleted') return processed.map(v => `• ${v}`).join('\n');
      return processed.join(separator);
    }
    if (cell?.value) {
      return typeof cell.value === 'object' ? (cell.value.v ?? JSON.stringify(cell.value)) : String(cell.value);
    }
    return '';
  }, [cells, rows, columns, cellKey]);

  const getCellRawValue = useCallback((rowId, col) => {
    const cell = cells[cellKey(rowId, col.id)];
    if (cell?.value) return typeof cell.value === 'object' ? (cell.value.v ?? '') : String(cell.value);
    if (col.type === 'field') {
      const row = rows.find(r => r.id === rowId);
      if (row?.source_data && col.config?.source_field) {
        const val = row.source_data[col.config.source_field];
        return val != null ? String(val) : '';
      }
    }
    return '';
  }, [cells, rows, cellKey]);

  const getCellStatus = useCallback((rowId, colId) => {
    return cells[cellKey(rowId, colId)]?.status || 'empty';
  }, [cells, cellKey]);

  // ─── Save cell ─────────────────────────────────────────────────────────

  const saveCell = useCallback(async (rowId, colId, value) => {
    const key = cellKey(rowId, colId);
    const existing = cells[key];
    const oldValue = existing?.value?.v ?? (typeof existing?.value === 'object' ? JSON.stringify(existing?.value) : existing?.value);
    const newCell = {
      row_id: rowId,
      column_id: colId,
      value: { v: value },
      status: 'complete',
    };
    setCells(prev => ({
      ...prev,
      [key]: { ...existing, ...newCell },
    }));
    try {
      if (existing?.id) {
        await supabase.from('enrich_cells').update({ value: { v: value }, status: 'complete', updated_at: new Date().toISOString() }).eq('id', existing.id);
      } else {
        const { data } = await supabase.from('enrich_cells').upsert(newCell, { onConflict: 'row_id,column_id' }).select().single();
        if (data) setCells(prev => ({ ...prev, [key]: data }));
      }
      // Track manual cell edits
      const col = columns.find(c => c.id === colId);
      const rowIdx = rows.findIndex(r => r.id === rowId);
      if (col && oldValue !== value) {
        trackChange('edit_cell', `Edited row ${rowIdx + 1}, column "${col.name}"`, {
          beforeValue: { v: oldValue || '' }, afterValue: { v: value },
          metadata: { row_id: rowId, column_id: colId, column_name: col.name, row_index: rowIdx + 1 },
        });
      }
    } catch (err) {
      console.error('Error saving cell:', err);
      toast.error('Failed to save cell');
    }
  }, [cells, cellKey, columns, rows, trackChange]);

  // ─── Sandbox mock data generator ──────────────────────────────────────

  const generateMockData = useCallback((col, rowId, rowIdx) => {
    const seed = `${rowId}-${col.id}`;
    const hash = seed.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
    const pick = (arr) => arr[Math.abs(hash) % arr.length];
    const num = (min, max) => min + (Math.abs(hash) % (max - min));

    const fnName = col.config?.function || '';
    const colName = col.name.toLowerCase();

    if (col.type === 'enrichment') {
      const outputField = col.config?.output_field || '';
      const of = outputField.toLowerCase();
      if (of.includes('email') || colName.includes('email')) return { v: pick(['j.smith', 'a.jones', 'm.lee', 'r.patel', 's.chen']) + '@' + pick(['acme.com', 'globex.io', 'initech.co', 'hooli.com', 'piedpiper.net']) };
      if (of.includes('phone') || colName.includes('phone')) return { v: `+1 (${num(200,999)}) ${num(100,999)}-${num(1000,9999)}` };
      if (of.includes('title') || of.includes('job') || colName.includes('title')) return { v: pick(['VP of Engineering', 'Head of Growth', 'Senior PM', 'CTO', 'Director of Sales', 'Staff Engineer', 'Chief of Staff']) };
      if (of.includes('company') || of.includes('employer') || colName.includes('company')) return { v: pick(['Acme Corp', 'Globex Inc', 'Initech', 'Hooli', 'Pied Piper', 'Umbrella Co', 'Stark Industries']) };
      if (of.includes('industry')) return { v: pick(['SaaS', 'FinTech', 'Healthcare', 'E-commerce', 'AI/ML', 'Cybersecurity', 'EdTech']) };
      if (of.includes('employee') || of.includes('size')) return { v: String(pick([50, 120, 350, 800, 2500, 5000, 15000])) };
      if (of.includes('revenue')) return { v: `\u20AC${pick([1, 5, 12, 25, 50, 100])}M` };
      if (of.includes('location') || of.includes('city') || colName.includes('location')) return { v: pick(['San Francisco, CA', 'New York, NY', 'Austin, TX', 'London, UK', 'Amsterdam, NL', 'Berlin, DE']) };
      if (of.includes('linkedin')) return { v: `https://linkedin.com/in/${pick(['jsmith', 'ajones', 'mlee', 'rpatel'])}${num(100,999)}` };
      return { v: `Mock: ${pick(['Alpha', 'Beta', 'Gamma', 'Delta'])} ${num(100, 999)}` };
    }

    if (col.type === 'ai') {
      const prompt = (col.config?.prompt || '').toLowerCase();
      if (prompt.includes('summar')) return { v: pick(['A seasoned leader with 10+ years in SaaS growth.', 'Technical expert focused on scalable infrastructure.', 'Results-driven PM with track record in product-led growth.', 'Cross-functional leader experienced in AI/ML deployment.']) };
      if (prompt.includes('sentiment')) return { v: pick(['Positive', 'Neutral', 'Negative']) };
      if (prompt.includes('categor')) return { v: pick(['Category A', 'Category B', 'Category C', 'Uncategorized']) };
      if (prompt.includes('extract') && prompt.includes('email')) return { v: pick(['john@example.com', 'info@company.io, sales@company.io', 'no emails found']) };
      if (prompt.includes('translat')) return { v: pick(['The meeting is scheduled for tomorrow.', 'Please review the attached document.', 'We look forward to the collaboration.']) };
      return { v: pick(['AI-generated sample output for testing.', 'This is sandbox data — not a real AI response.', 'Mock result based on prompt template configuration.', 'Sample output for workflow validation purposes.']) };
    }

    if (col.type === 'waterfall') {
      const sources = col.config?.sources || [];
      const sourceUsed = sources.length > 0 ? pick(sources.map(s => s.label || s.function || 'Source')) : 'Mock Source';
      return { v: pick(['Data from fallback', 'Primary source hit', 'Secondary enrichment result']), _meta: { source_used: sourceUsed, attempts: num(1, sources.length + 1) } };
    }

    if (col.type === 'http') {
      return { v: `{ "status": "ok", "id": ${num(1000, 9999)}, "sandbox": true }` };
    }

    return { v: `sandbox-${num(100, 999)}` };
  }, []);

  const runSandboxColumn = useCallback(async (col) => {
    const total = rows.length;
    const toastId = toast.loading(`Sandbox: ${col.name} 0/${total}`);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const key = cellKey(row.id, col.id);
      const mockValue = generateMockData(col, row.id, i);

      setSandboxCells(prev => ({ ...prev, [key]: { status: 'complete', value: mockValue, _sandbox: true } }));

      // Simulate slight delay for realism
      if (i % 5 === 4) await new Promise(r => setTimeout(r, 80));
      toast.loading(`Sandbox: ${col.name} ${i + 1}/${total}`, { id: toastId });
    }

    toast.dismiss(toastId);
    toast.success(`Sandbox: ${col.name} — ${total} rows filled with mock data`);
  }, [rows, cellKey, generateMockData]);

  const clearSandboxData = useCallback(() => {
    setSandboxCells({});
    toast.success('Sandbox data cleared');
  }, []);

  // convertSandboxToLive is defined after runAllColumns — see below

  // ─── Run enrichment column ─────────────────────────────────────────────

  const runEnrichmentColumn = useCallback(async (col) => {
    if (col.type !== 'enrichment') return;
    const fnName = col.config?.function;
    const fn = ENRICHMENT_FN_MAP[fnName];
    if (!fn) { toast.error(`Unknown enrichment function: ${fnName}`); return; }

    const inputColId = col.config?.input_column_id;
    const outputField = col.config?.output_field;
    const inputCol = columns.find(c => c.id === inputColId);

    const effectiveRows = sandboxMode ? rows.slice(0, SANDBOX_ROW_LIMIT) : rows;
    if (sandboxMode && rows.length > SANDBOX_ROW_LIMIT) {
      toast.info(`Sandbox: limited to ${SANDBOX_ROW_LIMIT} rows (${rows.length} total). Turn off sandbox to run all.`);
    }
    const total = effectiveRows.length;
    let completed = 0;
    let errors = 0;
    const toastId = toast.loading(`Running ${col.name}: 0/${total}${sandboxMode ? ' (sandbox)' : ''}`);

    // Process in batches
    for (let i = 0; i < effectiveRows.length; i += ENRICHMENT_BATCH_SIZE) {
      const batch = effectiveRows.slice(i, i + ENRICHMENT_BATCH_SIZE);
      await Promise.all(batch.map(async (row) => {
        const key = cellKey(row.id, col.id);
        try {
          // Set pending
          setCells(prev => ({ ...prev, [key]: { ...prev[key], status: 'pending' } }));
          await supabase.from('enrich_cells').upsert({ row_id: row.id, column_id: col.id, status: 'pending', value: null }, { onConflict: 'row_id,column_id' });

          // Get input value
          let inputValue = '';
          if (inputCol) {
            inputValue = getCellRawValue(row.id, inputCol);
          }
          if (!inputValue) {
            setCells(prev => ({ ...prev, [key]: { ...prev[key], status: 'empty', value: null } }));
            completed++;
            return;
          }

          // Call enrichment function
          let result;
          if (fnName === 'fullEnrichFromLinkedIn') {
            result = await fn(inputValue);
          } else if (fnName === 'fullEnrichFromEmail') {
            const companyVal = getCellRawValue(row.id, columns.find(c => c.config?.source_field === 'company_name'));
            result = await fn(inputValue, companyVal || undefined);
          } else if (fnName === 'enrichCompanyOnly') {
            result = await fn({ company_name: inputValue });
          } else if (fnName === 'matchProspect') {
            // Detect input type: LinkedIn URL, email, or name
            const params = {};
            if (inputValue.includes('linkedin.com')) params.linkedin = inputValue;
            else if (inputValue.includes('@')) params.email = inputValue;
            else params.full_name = inputValue;
            result = await fn(params);
          } else if (fnName === 'enrichProspectContact' || fnName === 'enrichProspectProfile') {
            result = await fn(inputValue);
          } else {
            result = await fn(inputValue);
          }

          // Extract output field
          let displayValue = result;
          if (outputField && result && typeof result === 'object') {
            displayValue = extractNestedValue(result, outputField);
          }
          // Always store as { v: string } for consistent cell display
          let cellValue;
          if (displayValue == null) {
            cellValue = { v: '' };
          } else if (Array.isArray(displayValue)) {
            cellValue = { v: displayValue.join(', ') };
          } else if (typeof displayValue === 'object') {
            cellValue = { v: JSON.stringify(displayValue) };
          } else {
            cellValue = { v: String(displayValue) };
          }

          setCells(prev => ({ ...prev, [key]: { ...prev[key], status: 'complete', value: cellValue } }));
          await supabase.from('enrich_cells').upsert({
            row_id: row.id, column_id: col.id, status: 'complete', value: cellValue, updated_at: new Date().toISOString(),
          }, { onConflict: 'row_id,column_id' });
          completed++;
        } catch (err) {
          console.error(`Enrichment error row ${row.id}:`, err);
          errors++;
          completed++;
          setCells(prev => ({ ...prev, [key]: { ...prev[key], status: 'error', error_message: err.message } }));
          await supabase.from('enrich_cells').upsert({
            row_id: row.id, column_id: col.id, status: 'error', error_message: err.message, updated_at: new Date().toISOString(),
          }, { onConflict: 'row_id,column_id' });
        }
        toast.loading(`Running ${col.name}: ${completed}/${total}`, { id: toastId });
      }));
    }
    toast.dismiss(toastId);
    if (errors > 0) {
      toast.warning(`${col.name}: ${completed - errors} succeeded, ${errors} failed`);
    } else {
      toast.success(`${col.name}: All ${total} rows enriched`);
    }
  }, [columns, rows, cells, cellKey, getCellRawValue, sandboxMode]);

  // ─── Column ref replacer (used by AI + HTTP columns) ──────────────────

  const replaceColumnRefs = useCallback((template, rowId) => {
    if (!template) return template;
    // Sort columns by name length descending so longer names match first
    // (e.g. "Company Name" matches before "Company")
    const sortedCols = [...columns].sort((a, b) => b.name.length - a.name.length);
    let result = template;
    for (const col of sortedCols) {
      // Match /ColumnName followed by end-of-string, whitespace, punctuation, or newline
      const escaped = col.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\/${escaped}(?=[\\s,.:;!?)"'\\n]|$)`, 'gi');
      result = result.replace(regex, () => getCellRawValue(rowId, col) || '');
    }
    return result;
  }, [columns, getCellRawValue]);

  // Render preview with chips for resolved values
  const renderPreviewWithChips = useCallback((template, rowId) => {
    if (!template) return null;
    const sortedCols = [...columns].sort((a, b) => b.name.length - a.name.length);
    const escapedNames = sortedCols.map(c => c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (escapedNames.length === 0) return template;
    const regex = new RegExp(`/(${escapedNames.join('|')})(?=[\\s,.:;!?"'\\n)\\]]|$)`, 'gi');
    const parts = [];
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(template)) !== null) {
      if (match.index > lastIndex) parts.push(<span key={`t-${lastIndex}`}>{template.slice(lastIndex, match.index)}</span>);
      const colName = match[1];
      const col = columns.find(c => c.name.toLowerCase() === colName.toLowerCase());
      const value = col ? (getCellRawValue(rowId, col) || colName) : colName;
      parts.push(
        <span key={`v-${match.index}`} className="inline-flex items-center px-1 py-0.5 mx-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-medium border border-purple-500/30">
          {String(value).slice(0, 60)}
        </span>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < template.length) parts.push(<span key={`t-${lastIndex}`}>{template.slice(lastIndex)}</span>);
    return parts.length > 0 ? parts : template;
  }, [columns, getCellRawValue]);

  // ─── Run AI column ───────────────────────────────────────────────────

  const runAIColumn = useCallback(async (col) => {
    if (col.type !== 'ai') return;
    const cfg = col.config || {};
    const promptTemplate = cfg.prompt;
    if (!promptTemplate) { toast.error('No prompt configured for AI column'); return; }

    const model = cfg.model || 'moonshotai/Kimi-K2-Instruct';
    const temperature = cfg.temperature ?? 0.7;
    const maxTokens = cfg.max_tokens || 500;
    const systemPrompt = cfg.system_prompt || 'You are a data enrichment tool. Your ONLY job is to return the requested data point or value. Rules:\n- Return ONLY the answer — no explanations, no introductions, no conversational filler.\n- Do NOT say "Sure!", "Here is...", "Based on...", "I found that..." or similar phrases.\n- If the answer is unknown, return "N/A".\n- Be factual and precise. One data point per request.';
    const outputFormat = cfg.output_format || 'text';
    const outputPath = cfg.output_path || '';
    const batchSize = cfg.batch_size || 5;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co';
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4';

    let formatInstruction = '';
    if (outputFormat === 'json') formatInstruction = '\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation, no other text.';
    else if (outputFormat === 'list') formatInstruction = '\n\nIMPORTANT: Respond with a plain list, one item per line. No numbering, no bullets, no explanation.';
    else formatInstruction = '\n\nIMPORTANT: Return ONLY the requested value or data point. No conversation, no explanation.';

    const effectiveRows = sandboxMode ? rows.slice(0, SANDBOX_ROW_LIMIT) : rows;
    if (sandboxMode && rows.length > SANDBOX_ROW_LIMIT) {
      toast.info(`Sandbox: limited to ${SANDBOX_ROW_LIMIT} rows (${rows.length} total). Turn off sandbox to run all.`);
    }
    const total = effectiveRows.length;
    let completed = 0;
    let errors = 0;
    const toastId = toast.loading(`Running ${col.name}: 0/${total}${sandboxMode ? ' (sandbox)' : ''}`);

    for (let i = 0; i < effectiveRows.length; i += batchSize) {
      const batch = effectiveRows.slice(i, i + batchSize);
      await Promise.all(batch.map(async (row) => {
        const key = cellKey(row.id, col.id);
        try {
          setCells(prev => ({ ...prev, [key]: { ...prev[key], status: 'pending' } }));
          await supabase.from('enrich_cells').upsert({ row_id: row.id, column_id: col.id, status: 'pending', value: null }, { onConflict: 'row_id,column_id' });

          // Build prompt with column refs replaced
          const filledPrompt = replaceColumnRefs(promptTemplate, row.id);
          if (!filledPrompt.trim()) { completed++; return; }

          const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: filledPrompt + formatInstruction },
          ];

          // Call raise-chat edge function
          let retries = 0;
          let result = null;
          while (retries < 3) {
            try {
              const resp = await fetch(`${supabaseUrl}/functions/v1/raise-chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
                body: JSON.stringify({ messages, model, temperature, max_tokens: maxTokens, stream: false }),
              });
              if (resp.status === 429) {
                retries++;
                await new Promise(r => setTimeout(r, 2000 * retries));
                continue;
              }
              if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
              // Handle streaming or JSON response
              const ct = resp.headers.get('content-type') || '';
              if (ct.includes('text/event-stream')) {
                const reader = resp.body.getReader();
                const decoder = new TextDecoder();
                let content = '';
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  const chunk = decoder.decode(value, { stream: true });
                  for (const line of chunk.split('\n')) {
                    if (line.startsWith('data: ') && line.slice(6) !== '[DONE]') {
                      try {
                        const d = JSON.parse(line.slice(6));
                        content += d.choices?.[0]?.delta?.content || '';
                      } catch {}
                    }
                  }
                }
                result = content.trim();
              } else {
                const data = await resp.json();
                result = data.choices?.[0]?.message?.content?.trim() || data.content || '';
              }
              break;
            } catch (e) {
              if (retries >= 2) throw e;
              retries++;
              await new Promise(r => setTimeout(r, 1000 * retries));
            }
          }

          // Parse output based on format
          let displayValue = result || '';
          if (outputFormat === 'json' && outputPath && result) {
            try {
              const parsed = JSON.parse(result);
              displayValue = extractNestedValue(parsed, outputPath);
              if (typeof displayValue === 'object') displayValue = JSON.stringify(displayValue);
            } catch { displayValue = result; }
          } else if (outputFormat === 'list' && cfg.list_separator && result) {
            displayValue = result.split('\n').filter(Boolean).join(cfg.list_separator);
          }

          const cellValue = { v: String(displayValue || '') };
          setCells(prev => ({ ...prev, [key]: { ...prev[key], status: 'complete', value: cellValue } }));
          await supabase.from('enrich_cells').upsert({
            row_id: row.id, column_id: col.id, status: 'complete', value: cellValue, updated_at: new Date().toISOString(),
          }, { onConflict: 'row_id,column_id' });
          completed++;
        } catch (err) {
          errors++;
          completed++;
          setCells(prev => ({ ...prev, [key]: { ...prev[key], status: 'error', error_message: err.message } }));
          await supabase.from('enrich_cells').upsert({
            row_id: row.id, column_id: col.id, status: 'error', error_message: err.message, updated_at: new Date().toISOString(),
          }, { onConflict: 'row_id,column_id' });
        }
        toast.loading(`Running ${col.name}: ${completed}/${total}`, { id: toastId });
      }));
    }
    toast.dismiss(toastId);
    if (errors > 0) toast.warning(`${col.name}: ${completed - errors} succeeded, ${errors} failed`);
    else toast.success(`${col.name}: All ${total} rows processed`);
  }, [columns, rows, cells, cellKey, replaceColumnRefs, sandboxMode]);

  // ─── Run waterfall column ─────────────────────────────────────────────

  const runWaterfallColumn = useCallback(async (col) => {
    if (col.type !== 'waterfall') return;
    const sources = (col.config?.sources || []).sort((a, b) => (a.priority || 0) - (b.priority || 0));
    const stopOnSuccess = col.config?.stopOnSuccess !== false;
    if (sources.length === 0) { toast.error('No sources configured for waterfall'); return; }

    const effectiveRows = sandboxMode ? rows.slice(0, SANDBOX_ROW_LIMIT) : rows;
    if (sandboxMode && rows.length > SANDBOX_ROW_LIMIT) {
      toast.info(`Sandbox: limited to ${SANDBOX_ROW_LIMIT} rows (${rows.length} total). Turn off sandbox to run all.`);
    }
    const total = effectiveRows.length;
    let completed = 0;
    let errors = 0;
    const toastId = toast.loading(`Running ${col.name}: 0/${total}${sandboxMode ? ' (sandbox)' : ''}`);

    for (let i = 0; i < effectiveRows.length; i += ENRICHMENT_BATCH_SIZE) {
      const batch = effectiveRows.slice(i, i + ENRICHMENT_BATCH_SIZE);
      await Promise.all(batch.map(async (row) => {
        const key = cellKey(row.id, col.id);
        try {
          setCells(prev => ({ ...prev, [key]: { ...prev[key], status: 'pending' } }));
          await supabase.from('enrich_cells').upsert({ row_id: row.id, column_id: col.id, status: 'pending', value: null }, { onConflict: 'row_id,column_id' });

          let finalValue = null;
          let sourceUsed = null;
          let attempts = 0;

          for (const source of sources) {
            attempts++;
            const fn = ENRICHMENT_FN_MAP[source.function];
            if (!fn) continue;

            const inputCol = columns.find(c => c.id === source.input_column_id);
            const inputValue = inputCol ? getCellRawValue(row.id, inputCol) : '';
            if (!inputValue) continue;

            try {
              let result;
              const fnName = source.function;
              if (fnName === 'fullEnrichFromLinkedIn') result = await fn(inputValue);
              else if (fnName === 'fullEnrichFromEmail') {
                const companyVal = getCellRawValue(row.id, columns.find(c => c.config?.source_field === 'company_name'));
                result = await fn(inputValue, companyVal || undefined);
              } else if (fnName === 'enrichCompanyOnly') result = await fn({ company_name: inputValue });
              else if (fnName === 'matchProspect') {
                const params = {};
                if (inputValue.includes('linkedin.com')) params.linkedin = inputValue;
                else if (inputValue.includes('@')) params.email = inputValue;
                else params.full_name = inputValue;
                result = await fn(params);
              }
              else result = await fn(inputValue);

              let displayValue = result;
              if (source.output_field && result && typeof result === 'object') displayValue = extractNestedValue(result, source.output_field);

              if (displayValue != null && displayValue !== '' && displayValue !== undefined) {
                if (Array.isArray(displayValue)) finalValue = { v: displayValue.join(', ') };
                else if (typeof displayValue === 'object') finalValue = { v: JSON.stringify(displayValue) };
                else finalValue = { v: String(displayValue) };
                sourceUsed = source.function;
                if (stopOnSuccess) break;
              }
            } catch { /* source failed, try next */ }
          }

          if (finalValue) {
            finalValue._meta = { source_used: sourceUsed, attempts };
            setCells(prev => ({ ...prev, [key]: { ...prev[key], status: 'complete', value: finalValue } }));
            await supabase.from('enrich_cells').upsert({
              row_id: row.id, column_id: col.id, status: 'complete', value: finalValue, updated_at: new Date().toISOString(),
            }, { onConflict: 'row_id,column_id' });
          } else {
            setCells(prev => ({ ...prev, [key]: { ...prev[key], status: 'error', error_message: `All ${attempts} sources failed` } }));
            await supabase.from('enrich_cells').upsert({
              row_id: row.id, column_id: col.id, status: 'error', error_message: `All ${attempts} sources failed`, updated_at: new Date().toISOString(),
            }, { onConflict: 'row_id,column_id' });
            errors++;
          }
          completed++;
        } catch (err) {
          errors++;
          completed++;
          setCells(prev => ({ ...prev, [key]: { ...prev[key], status: 'error', error_message: err.message } }));
          await supabase.from('enrich_cells').upsert({
            row_id: row.id, column_id: col.id, status: 'error', error_message: err.message, updated_at: new Date().toISOString(),
          }, { onConflict: 'row_id,column_id' });
        }
        toast.loading(`Running ${col.name}: ${completed}/${total}`, { id: toastId });
      }));
    }
    toast.dismiss(toastId);
    if (errors > 0) toast.warning(`${col.name}: ${completed - errors} succeeded, ${errors} failed`);
    else toast.success(`${col.name}: All ${total} rows enriched via waterfall`);
  }, [columns, rows, cells, cellKey, getCellRawValue, sandboxMode]);

  // ─── Run HTTP column ────────────────────────────────────────────────

  const runHTTPColumn = useCallback(async (col) => {
    if (col.type !== 'http') return;
    const cfg = col.config || {};
    if (!cfg.url) { toast.error('No URL configured'); return; }

    const effectiveRows = sandboxMode ? rows.slice(0, SANDBOX_ROW_LIMIT) : rows;
    if (sandboxMode && rows.length > SANDBOX_ROW_LIMIT) {
      toast.info(`Sandbox: limited to ${SANDBOX_ROW_LIMIT} rows (${rows.length} total). Turn off sandbox to run all.`);
    }
    const total = effectiveRows.length;
    let completed = 0;
    let errors = 0;
    const toastId = toast.loading(`Running ${col.name}: 0/${total}${sandboxMode ? ' (sandbox)' : ''}`);

    for (let i = 0; i < effectiveRows.length; i += ENRICHMENT_BATCH_SIZE) {
      const batch = effectiveRows.slice(i, i + ENRICHMENT_BATCH_SIZE);
      await Promise.all(batch.map(async (row) => {
        const key = cellKey(row.id, col.id);
        try {
          setCells(prev => ({ ...prev, [key]: { ...prev[key], status: 'pending' } }));
          await supabase.from('enrich_cells').upsert({ row_id: row.id, column_id: col.id, status: 'pending', value: null }, { onConflict: 'row_id,column_id' });

          // Build request
          const url = replaceColumnRefs(cfg.url, row.id);
          const method = cfg.method || 'GET';
          const headers = {};
          for (const h of (cfg.headers || [])) {
            if (h.key) headers[replaceColumnRefs(h.key, row.id)] = replaceColumnRefs(h.value, row.id);
          }
          // Auth
          if (cfg.auth?.type === 'bearer' && cfg.auth.token) {
            headers['Authorization'] = `Bearer ${cfg.auth.token}`;
          } else if (cfg.auth?.type === 'basic' && cfg.auth.username) {
            headers['Authorization'] = `Basic ${btoa(`${cfg.auth.username}:${cfg.auth.password || ''}`)}`;
          }

          const fetchOpts = { method, headers };
          if ((method === 'POST' || method === 'PUT') && cfg.body) {
            fetchOpts.body = replaceColumnRefs(cfg.body, row.id);
            if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
          }

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 30000);
          fetchOpts.signal = controller.signal;

          const resp = await fetch(url, fetchOpts);
          clearTimeout(timeout);

          if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);

          let result;
          const ct = resp.headers.get('content-type') || '';
          if (ct.includes('application/json')) result = await resp.json();
          else result = { v: await resp.text() };

          let displayValue = result;
          if (cfg.outputPath && result) displayValue = extractNestedValue(result, cfg.outputPath);

          const cellValue = displayValue != null ? (typeof displayValue === 'object' ? displayValue : { v: String(displayValue) }) : { v: '' };

          setCells(prev => ({ ...prev, [key]: { ...prev[key], status: 'complete', value: cellValue } }));
          await supabase.from('enrich_cells').upsert({
            row_id: row.id, column_id: col.id, status: 'complete', value: cellValue, updated_at: new Date().toISOString(),
          }, { onConflict: 'row_id,column_id' });
          completed++;
        } catch (err) {
          errors++;
          completed++;
          const msg = err.name === 'AbortError' ? 'Request timed out (30s)' : err.message;
          setCells(prev => ({ ...prev, [key]: { ...prev[key], status: 'error', error_message: msg } }));
          await supabase.from('enrich_cells').upsert({
            row_id: row.id, column_id: col.id, status: 'error', error_message: msg, updated_at: new Date().toISOString(),
          }, { onConflict: 'row_id,column_id' });
        }
        toast.loading(`Running ${col.name}: ${completed}/${total}`, { id: toastId });
      }));
    }
    toast.dismiss(toastId);
    if (errors > 0) toast.warning(`${col.name}: ${completed - errors} succeeded, ${errors} failed`);
    else toast.success(`${col.name}: All ${total} rows completed`);
  }, [columns, rows, cells, cellKey, replaceColumnRefs, sandboxMode]);

  // ─── Run all columns ───────────────────────────────────────────────────

  const runAllColumns = useCallback(async () => {
    const enrichCols = columns.filter(c => c.type === 'enrichment' || c.type === 'ai' || c.type === 'waterfall' || c.type === 'http');
    if (enrichCols.length === 0) return;
    const effectiveRowCount = sandboxMode ? Math.min(rows.length, SANDBOX_ROW_LIMIT) : rows.length;
    const gId = `run_all_${Date.now()}`;
    historyGroupRef.current = gId;
    trackChange('run_all', `Run All — ${enrichCols.length} column${enrichCols.length > 1 ? 's' : ''} × ${effectiveRowCount} rows${sandboxMode ? ' (sandbox)' : ''}`, { groupId: gId, metadata: { column_count: enrichCols.length, row_count: effectiveRowCount, sandbox: sandboxMode } });
    // Always run real enrichments — sandbox mode limits rows inside each runner
    for (const col of enrichCols) {
      if (col.type === 'enrichment') await runEnrichmentColumn(col);
      else if (col.type === 'ai') await runAIColumn(col);
      else if (col.type === 'waterfall') await runWaterfallColumn(col);
      else if (col.type === 'http') await runHTTPColumn(col);
    }
    historyGroupRef.current = null;
  }, [columns, rows.length, sandboxMode, runEnrichmentColumn, runAIColumn, runWaterfallColumn, runHTTPColumn, trackChange]);

  const convertSandboxToLive = useCallback(async () => {
    setSandboxCells({});
    setSandboxMode(false);
    toast.info('Sandbox off — running live enrichments...');
    // Small delay so state updates before runAllColumns triggers
    setTimeout(async () => {
      for (const col of columns) {
        if (col.type === 'enrichment') await runEnrichmentColumn(col);
        else if (col.type === 'ai') await runAIColumn(col);
        else if (col.type === 'waterfall') await runWaterfallColumn(col);
        else if (col.type === 'http') await runHTTPColumn(col);
      }
    }, 100);
  }, [columns, runEnrichmentColumn, runAIColumn, runWaterfallColumn, runHTTPColumn]);

  // ─── Auto-run ──────────────────────────────────────────────────────────

  const toggleAutoRun = useCallback(() => {
    if (!autoRun) {
      setAutoRunConfirmOpen(true);
    } else {
      setAutoRun(false);
      if (workspace?.id) {
        supabase.from('enrich_workspaces').update({ auto_run: false, updated_at: new Date().toISOString() }).eq('id', workspace.id).then(() => {});
      }
    }
  }, [autoRun, workspace?.id]);

  const confirmAutoRun = useCallback(async () => {
    setAutoRun(true);
    setAutoRunConfirmOpen(false);
    if (workspace?.id) {
      await supabase.from('enrich_workspaces').update({ auto_run: true, updated_at: new Date().toISOString() }).eq('id', workspace.id);
    }
  }, [workspace?.id]);

  const runIncompleteEnrichments = useCallback(async () => {
    if (autoRunRunningRef.current) return;
    const enrichCols = columns.filter(c => c.type === 'enrichment' || c.type === 'ai' || c.type === 'waterfall' || c.type === 'http');
    if (enrichCols.length === 0) return;

    // Find rows with incomplete cells
    const pendingWork = [];
    for (const col of enrichCols) {
      for (const row of rows) {
        const cell = cells[cellKey(row.id, col.id)];
        const status = cell?.status;
        if (status !== 'complete' && status !== 'pending') {
          // Check if input column has a value
          if (col.type === 'enrichment' && col.config?.input_column_id) {
            const inputCol = columns.find(c => c.id === col.config.input_column_id);
            if (inputCol) {
              const inputVal = getCellRawValue(row.id, inputCol);
              if (!inputVal) continue; // no input, skip
            }
          }
          pendingWork.push({ row, col });
        }
      }
    }

    if (pendingWork.length === 0) return;

    autoRunRunningRef.current = true;
    setAutoRunPulse(true);
    setTimeout(() => setAutoRunPulse(false), 1500);

    // Group by column for batch processing
    const colGroups = {};
    for (const { row, col } of pendingWork) {
      if (!colGroups[col.id]) colGroups[col.id] = { col, rows: [] };
      colGroups[col.id].rows.push(row);
    }

    const totalRows = pendingWork.length;
    toast.info(`Auto-run: Processing ${totalRows} cell${totalRows > 1 ? 's' : ''}...`);

    try {
      for (const { col } of Object.values(colGroups)) {
        if (sandboxMode) {
          await runSandboxColumn(col);
        } else if (col.type === 'enrichment') await runEnrichmentColumn(col);
        else if (col.type === 'ai') await runAIColumn(col);
        else if (col.type === 'waterfall') await runWaterfallColumn(col);
        else if (col.type === 'http') await runHTTPColumn(col);
      }
    } finally {
      autoRunRunningRef.current = false;
    }
  }, [columns, rows, cells, cellKey, getCellRawValue, sandboxMode, runSandboxColumn, runEnrichmentColumn, runAIColumn, runWaterfallColumn, runHTTPColumn]);

  // Watch for changes that should trigger auto-run
  useEffect(() => {
    if (!autoRun || !activeWorkspaceId) return;
    const currentRowCount = rows.length;
    const enrichColCount = columns.filter(c => c.type === 'enrichment' || c.type === 'ai' || c.type === 'waterfall' || c.type === 'http').length;

    const rowsAdded = currentRowCount > prevRowCountRef.current && prevRowCountRef.current > 0;
    const colsAdded = enrichColCount > prevColCountRef.current && prevColCountRef.current > 0;

    prevRowCountRef.current = currentRowCount;
    prevColCountRef.current = enrichColCount;

    if (rowsAdded || colsAdded) {
      clearTimeout(autoRunTimerRef.current);
      autoRunTimerRef.current = setTimeout(() => {
        runIncompleteEnrichments();
      }, 2000);
    }

    return () => clearTimeout(autoRunTimerRef.current);
  }, [autoRun, activeWorkspaceId, rows.length, columns, runIncompleteEnrichments]);

  // Also trigger auto-run when a cell is saved and auto-run is on (input column changes)
  const saveCellWithAutoRun = useCallback(async (rowId, colId, value) => {
    await saveCell(rowId, colId, value);
    if (!autoRun) return;
    // Check if this column is an input to any enrichment column
    const dependentCols = columns.filter(c =>
      (c.type === 'enrichment' || c.type === 'ai' || c.type === 'waterfall' || c.type === 'http') && c.config?.input_column_id === colId
    );
    if (dependentCols.length > 0) {
      clearTimeout(autoRunTimerRef.current);
      autoRunTimerRef.current = setTimeout(() => {
        runIncompleteEnrichments();
      }, 2000);
    }
  }, [saveCell, autoRun, columns, runIncompleteEnrichments]);

  // ─── Export CSV ────────────────────────────────────────────────────────

  const doExportCSV = useCallback(() => {
    const headers = columns.map(c => c.name);
    const csvRows = [headers.join(',')];
    for (const row of rows) {
      const vals = columns.map(col => {
        const ck = cellKey(row.id, col.id);
        const sbCell = sandboxCells[ck];
        if (sbCell) {
          const sv = typeof sbCell.value === 'object' && sbCell.value?.v != null ? String(sbCell.value.v) : String(sbCell.value || '');
          return `"${sv.replace(/"/g, '""')}"`;
        }
        const v = getCellDisplayValue(row.id, col);
        return `"${String(v).replace(/"/g, '""')}"`;
      });
      csvRows.push(vals.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workspace?.name || 'enrich'}${sandboxMode ? '-SANDBOX' : ''}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(sandboxMode ? 'CSV exported (contains sandbox data)' : 'CSV exported');
  }, [columns, rows, getCellDisplayValue, workspace, sandboxMode, sandboxCells, cellKey]);

  const exportCSV = useCallback(() => {
    if (sandboxMode && Object.keys(sandboxCells).length > 0) {
      setSandboxExportWarn(true);
      return;
    }
    doExportCSV();
  }, [sandboxMode, sandboxCells, doExportCSV]);

  // ─── Column resize handlers ────────────────────────────────────────────

  const onResizeStart = useCallback((e, col) => {
    e.preventDefault();
    e.stopPropagation();
    resizeStartX.current = e.clientX;
    resizeStartW.current = col.width || DEFAULT_COL_WIDTH;
    setResizing(col.id);

    const onMove = (ev) => {
      const diff = ev.clientX - resizeStartX.current;
      const newW = Math.max(MIN_COL_WIDTH, resizeStartW.current + diff);
      setColumns(prev => prev.map(c => c.id === col.id ? { ...c, width: newW } : c));
    };
    const onUp = async (ev) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      setResizing(null);
      const diff = ev.clientX - resizeStartX.current;
      const newW = Math.max(MIN_COL_WIDTH, resizeStartW.current + diff);
      await supabase.from('enrich_columns').update({ width: newW }).eq('id', col.id);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  // ─── Filter helpers ────────────────────────────────────────────────────

  const TEXT_OPERATORS = [
    { value: 'contains', label: 'Contains' },
    { value: 'equals', label: 'Equals' },
    { value: 'starts_with', label: 'Starts with' },
    { value: 'ends_with', label: 'Ends with' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ];

  const NUMBER_OPERATORS = [
    { value: 'eq', label: 'Equals' },
    { value: 'gt', label: 'Greater than' },
    { value: 'lt', label: 'Less than' },
    { value: 'between', label: 'Between' },
  ];

  const addFilter = useCallback(() => {
    const firstCol = columns[0];
    if (!firstCol) return;
    setFilters(prev => [...prev, {
      id: crypto.randomUUID(),
      columnId: firstCol.id,
      operator: 'contains',
      value: '',
      valueTo: '',
    }]);
  }, [columns]);

  const updateFilter = useCallback((id, updates) => {
    setFilters(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  const removeFilter = useCallback((id) => {
    setFilters(prev => prev.filter(f => f.id !== id));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters([]);
  }, []);

  const applyFilter = useCallback((cellValue, filter) => {
    const v = (cellValue ?? '').toString().toLowerCase();
    const fv = (filter.value ?? '').toString().toLowerCase();

    switch (filter.operator) {
      case 'contains': return v.includes(fv);
      case 'equals': return v === fv;
      case 'starts_with': return v.startsWith(fv);
      case 'ends_with': return v.endsWith(fv);
      case 'is_empty': return v === '';
      case 'is_not_empty': return v !== '';
      case 'eq': return parseFloat(v) === parseFloat(fv);
      case 'gt': return parseFloat(v) > parseFloat(fv);
      case 'lt': return parseFloat(v) < parseFloat(fv);
      case 'between': {
        const num = parseFloat(v);
        return num >= parseFloat(fv) && num <= parseFloat(filter.valueTo ?? '');
      }
      case 'is_true': return v === 'true' || v === '1' || v === 'yes';
      case 'is_false': return v !== 'true' && v !== '1' && v !== 'yes';
      case 'date_before': return new Date(v).getTime() < new Date(fv).getTime();
      case 'date_after': return new Date(v).getTime() > new Date(fv).getTime();
      case 'date_between': {
        const dt = new Date(v).getTime();
        return dt >= new Date(fv).getTime() && dt <= new Date(filter.valueTo ?? '').getTime();
      }
      default: return true;
    }
  }, []);

  const filteredRows = useMemo(() => {
    if (filters.length === 0) return rows;
    return rows.filter(row => {
      return filters.every(filter => {
        const col = columns.find(c => c.id === filter.columnId);
        if (!col) return true;
        const cellValue = getCellDisplayValue(row.id, col);
        return applyFilter(cellValue, filter);
      });
    });
  }, [rows, filters, columns, getCellDisplayValue, applyFilter]);

  const activeFilterCount = filters.length;

  // ─── Global search ────────────────────────────────────────────────────

  // Debounce search input
  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchInput]);

  // Cmd/Ctrl+F keyboard shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchInput('');
    setDebouncedSearch('');
    searchRef.current?.blur();
  }, []);

  // Apply search to filteredRows → searchFilteredRows
  const searchFilteredRows = useMemo(() => {
    if (!debouncedSearch) return filteredRows;
    return filteredRows.filter(row =>
      columns.some(col => {
        const val = getCellDisplayValue(row.id, col);
        return val.toString().toLowerCase().includes(debouncedSearch);
      })
    );
  }, [filteredRows, debouncedSearch, columns, getCellDisplayValue]);

  // Match stats
  const searchMatchStats = useMemo(() => {
    if (!debouncedSearch) return null;
    let matchingCells = 0;
    for (const row of searchFilteredRows) {
      for (const col of columns) {
        const val = getCellDisplayValue(row.id, col);
        if (val.toString().toLowerCase().includes(debouncedSearch)) matchingCells++;
      }
    }
    return { rows: searchFilteredRows.length, cells: matchingCells };
  }, [debouncedSearch, searchFilteredRows, columns, getCellDisplayValue]);

  // Highlight helper — splits text into fragments with match spans
  const highlightMatch = useCallback((text, term) => {
    if (!term || !text) return text;
    const str = String(text);
    const lower = str.toLowerCase();
    const idx = lower.indexOf(term);
    if (idx === -1) return str;
    const parts = [];
    let last = 0;
    let pos = idx;
    // Find all occurrences
    while (pos !== -1) {
      if (pos > last) parts.push(<span key={`t${last}`}>{str.slice(last, pos)}</span>);
      parts.push(
        <mark key={`m${pos}`} className="bg-indigo-400/30 text-inherit rounded-sm px-px">{str.slice(pos, pos + term.length)}</mark>
      );
      last = pos + term.length;
      pos = lower.indexOf(term, last);
    }
    if (last < str.length) parts.push(<span key={`t${last}`}>{str.slice(last)}</span>);
    return parts;
  }, []);

  // ─── Sort helpers ─────────────────────────────────────────────────────

  const DATE_RE = /^\d{4}-\d{2}-\d{2}|^\d{1,2}\/\d{1,2}\/\d{2,4}/;

  const detectValueType = useCallback((val) => {
    if (val === '' || val == null) return 'text';
    if (!isNaN(parseFloat(val)) && isFinite(val)) return 'number';
    if (DATE_RE.test(String(val))) return 'date';
    return 'text';
  }, []);

  const compareValues = useCallback((a, b, direction) => {
    const aStr = (a ?? '').toString();
    const bStr = (b ?? '').toString();
    const typeA = detectValueType(aStr);
    const typeB = detectValueType(bStr);

    // Empty values always sort last
    if (aStr === '' && bStr === '') return 0;
    if (aStr === '') return 1;
    if (bStr === '') return -1;

    let result = 0;
    if (typeA === 'number' && typeB === 'number') {
      result = parseFloat(aStr) - parseFloat(bStr);
    } else if (typeA === 'date' && typeB === 'date') {
      result = new Date(aStr).getTime() - new Date(bStr).getTime();
    } else {
      result = aStr.toLowerCase().localeCompare(bStr.toLowerCase());
    }
    return direction === 'desc' ? -result : result;
  }, [detectValueType]);

  const toggleColumnSort = useCallback((colId, shiftKey) => {
    setSorts(prev => {
      const existing = prev.find(s => s.columnId === colId);
      if (existing) {
        // Cycle: asc → desc → remove
        if (existing.direction === 'asc') {
          return prev.map(s => s.columnId === colId ? { ...s, direction: 'desc' } : s);
        }
        return prev.filter(s => s.columnId !== colId);
      }
      const newSort = { id: crypto.randomUUID(), columnId: colId, direction: 'asc' };
      if (shiftKey) {
        return [...prev, newSort]; // multi-column
      }
      return [newSort]; // replace
    });
  }, []);

  const addSortFromPanel = useCallback(() => {
    const firstCol = columns[0];
    if (!firstCol) return;
    setSorts(prev => [...prev, { id: crypto.randomUUID(), columnId: firstCol.id, direction: 'asc' }]);
  }, [columns]);

  const updateSort = useCallback((id, updates) => {
    setSorts(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const removeSort = useCallback((id) => {
    setSorts(prev => prev.filter(s => s.id !== id));
  }, []);

  const clearAllSorts = useCallback(() => {
    setSorts([]);
  }, []);

  const handleSortDragStart = useCallback((idx) => {
    setDragSort(idx);
  }, []);

  const handleSortDragOver = useCallback((e, idx) => {
    e.preventDefault();
    if (dragSort === null || dragSort === idx) return;
    setSorts(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragSort, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragSort(idx);
  }, [dragSort]);

  const handleSortDragEnd = useCallback(() => {
    setDragSort(null);
  }, []);

  const getColumnSortState = useCallback((colId) => {
    const idx = sorts.findIndex(s => s.columnId === colId);
    if (idx === -1) return null;
    return { direction: sorts[idx].direction, priority: idx + 1, isMulti: sorts.length > 1 };
  }, [sorts]);

  const sortedRows = useMemo(() => {
    if (sorts.length === 0) return searchFilteredRows;
    return [...searchFilteredRows].sort((rowA, rowB) => {
      for (const sort of sorts) {
        const col = columns.find(c => c.id === sort.columnId);
        if (!col) continue;
        // Use typed sort values for field columns with data_type
        if (col.type === 'field' && col.config?.data_type && col.config.data_type !== 'text') {
          const rawA = getCellRawValue(rowA.id, col);
          const rawB = getCellRawValue(rowB.id, col);
          if (rawA === '' && rawB === '') continue;
          if (rawA === '') return 1;
          if (rawB === '') return -1;
          const sA = getFieldSortValue(rawA, col.config);
          const sB = getFieldSortValue(rawB, col.config);
          const cmp = typeof sA === 'number' && typeof sB === 'number' ? sA - sB : String(sA).localeCompare(String(sB));
          if (cmp !== 0) return sort.direction === 'desc' ? -cmp : cmp;
        } else {
          const valA = getCellDisplayValue(rowA.id, col);
          const valB = getCellDisplayValue(rowB.id, col);
          const cmp = compareValues(valA, valB, sort.direction);
          if (cmp !== 0) return cmp;
        }
      }
      return 0;
    });
  }, [searchFilteredRows, sorts, columns, getCellDisplayValue, getCellRawValue, compareValues]);

  const activeSortCount = sorts.length;

  // ─── Virtual scroll ────────────────────────────────────────────────────

  const totalHeight = sortedRows.length * ROW_HEIGHT;
  const containerHeight = scrollRef.current?.clientHeight || 600;
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - VISIBLE_BUFFER);
  const endIdx = Math.min(sortedRows.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + VISIBLE_BUFFER);
  const visibleRows = sortedRows.slice(startIdx, endIdx);

  const onScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  // ─── Total grid width ──────────────────────────────────────────────────

  const totalGridWidth = useMemo(() => {
    return ROW_NUM_WIDTH + columns.reduce((sum, c) => sum + (c.width || DEFAULT_COL_WIDTH), 0) + 44;
  }, [columns]);

  // ─── Status dot component ──────────────────────────────────────────────

  const StatusDot = ({ status, errorMessage }) => {
    if (status === 'pending') return <span title="Processing..." className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />;
    if (status === 'error') return <span title={errorMessage || 'Error — click to retry'} className="inline-block w-2 h-2 rounded-full bg-red-400" />;
    if (status === 'complete') return <span title="Complete" className="inline-block w-2 h-2 rounded-full bg-green-400" />;
    return null;
  };

  // ─── AI Chat assistant ────────────────────────────────────────────────

  // Load chat history from DB
  useEffect(() => {
    if (!activeWorkspaceId) return;
    supabase.from('enrich_workspaces').select('chat_history').eq('id', activeWorkspaceId).single()
      .then(({ data }) => {
        if (data?.chat_history && Array.isArray(data.chat_history)) setChatMessages(data.chat_history);
      });
  }, [activeWorkspaceId]);

  // Save chat history to DB
  const saveChatHistory = useCallback(async (messages) => {
    if (!activeWorkspaceId) return;
    await supabase.from('enrich_workspaces').update({ chat_history: messages, updated_at: new Date().toISOString() }).eq('id', activeWorkspaceId);
  }, [activeWorkspaceId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // In campaign mode, auto-open the Sync chat with suggestions
  const campaignChatSeeded = useRef(false);
  useEffect(() => {
    if (isCampaignMode && campaign && campaignSuggestions.length > 0 && !campaignChatSeeded.current && chatMessages.length === 0) {
      campaignChatSeeded.current = true;
      const channels = campaign.campaign_goals?.channels || {};
      const channelList = [channels.email && 'email', channels.linkedin && 'LinkedIn', channels.phone && 'phone'].filter(Boolean);
      const syncMsg = {
        role: 'assistant',
        content: `I've analyzed your campaign **${campaign.name}**${channelList.length ? ` with ${channelList.join(', ')} channels` : ''}. Here are the enrichment columns I recommend to prepare your prospects for outreach:`,
        timestamp: Date.now(),
        suggestions: campaignSuggestions,
      };
      setChatMessages([syncMsg]);
      setChatOpen(true);
    }
  }, [isCampaignMode, campaign, campaignSuggestions, chatMessages.length]);

  // Build workspace context for AI
  const buildChatContext = useCallback(() => {
    const colSummary = columns.map(c => {
      let desc = `"${c.name}" (type: ${c.type}`;
      if (c.type === 'field' && c.config?.data_type) desc += `, data_type: ${c.config.data_type}`;
      if (c.type === 'field' && c.config?.source_field) desc += `, source: ${c.config.source_field}`;
      if (c.type === 'enrichment' && c.config?.function) desc += `, function: ${c.config.function}`;
      if (c.type === 'formula' && c.config?.expression) desc += `, expr: ${c.config.expression}`;
      if (c.type === 'merge' && c.config?.source_columns) {
        const names = c.config.source_columns.map(id => columns.find(cc => cc.id === id)?.name).filter(Boolean);
        desc += `, merging: [${names.join(', ')}]`;
      }
      desc += ')';
      return desc;
    }).join('\n  ');
    const sampleRow = rows[0];
    let sampleData = '';
    if (sampleRow) {
      sampleData = columns.map(c => `${c.name}: "${getCellDisplayValue(sampleRow.id, c)}"`).join(', ');
    }
    return {
      workspace: workspace?.name || 'Untitled',
      columnCount: columns.length,
      rowCount: rows.length,
      columns: colSummary,
      sampleRow: sampleData,
      availableTypes: 'field, enrichment, ai, formula, waterfall, http, merge',
      enrichmentFunctions: 'fullEnrichFromLinkedIn, fullEnrichFromEmail, enrichCompanyOnly, matchProspect, enrichProspectContact, enrichProspectProfile',
      fieldDataTypes: 'text, number, currency, date, url, email, checkbox, select',
    };
  }, [columns, rows, workspace, getCellDisplayValue]);

  const CHAT_QUICK_PROMPTS = [
    { label: 'Add a column', prompt: 'Suggest a useful column I could add to enrich this data further.' },
    { label: 'Create a formula', prompt: 'Help me create a formula column. What formulas would be useful given my current columns?' },
    { label: 'Enrich this data', prompt: 'What enrichment columns should I add to get more value from my data?' },
    { label: 'Filter rows', prompt: 'Suggest filters I should apply to clean up or focus my data.' },
  ];

  const sendChatMessage = useCallback(async (content) => {
    if (!content.trim() || chatLoading) return;
    const userMsg = { role: 'user', content: content.trim(), timestamp: Date.now() };
    const updated = [...chatMessages, userMsg];
    setChatMessages(updated);
    setChatInput('');
    setChatLoading(true);

    try {
      const ctx = buildChatContext();
      const systemPrompt = `You are Sync, an AI assistant for the RaiseEnrich data enrichment workspace. You help users build and configure their enrichment table.

Current workspace: "${ctx.workspace}"
Rows: ${ctx.rowCount} | Columns: ${ctx.columnCount}

Columns:
  ${ctx.columns}

${ctx.sampleRow ? `Sample row data: ${ctx.sampleRow}` : 'No data rows yet.'}

Available column types: ${ctx.availableTypes}
Available enrichment functions: ${ctx.enrichmentFunctions}
Field data types: ${ctx.fieldDataTypes}

You can suggest:
- Adding columns (specify type, name, and config)
- Creating formulas (use /ColumnName syntax for column references)
- Setting up enrichments with specific functions
- Applying filters
- Building waterfall or HTTP API columns
- Merging columns together

When suggesting an action, include a JSON block with the action details:
\`\`\`action
{"type": "add_column", "name": "...", "column_type": "...", "config": {...}}
\`\`\`
or
\`\`\`action
{"type": "add_filter", "column": "...", "operator": "...", "value": "..."}
\`\`\`

Keep responses concise and practical. Focus on actionable suggestions.`;

      const messagesPayload = [
        { role: 'system', content: systemPrompt },
        ...updated.slice(-20).map(m => ({ role: m.role, content: m.content })),
      ];

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co';
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4';

      const resp = await fetch(`${supabaseUrl}/functions/v1/raise-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
        body: JSON.stringify({ messages: messagesPayload }),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      // Try streaming
      let assistantContent = '';
      if (resp.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        const assistantMsg = { role: 'assistant', content: '', timestamp: Date.now() };
        setChatMessages(prev => [...prev, assistantMsg]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content || parsed.content || '';
                assistantContent += delta;
                setChatMessages(prev => {
                  const copy = [...prev];
                  copy[copy.length - 1] = { ...copy[copy.length - 1], content: assistantContent };
                  return copy;
                });
              } catch {}
            }
          }
        }
      } else {
        const data = await resp.json();
        assistantContent = data.choices?.[0]?.message?.content || data.content || data.message || 'Sorry, I couldn\'t generate a response.';
        setChatMessages(prev => [...prev, { role: 'assistant', content: assistantContent, timestamp: Date.now() }]);
      }

      // Parse actions from response
      const actionMatch = assistantContent.match(/```action\n([\s\S]*?)\n```/);
      if (actionMatch) {
        try {
          const action = JSON.parse(actionMatch[1]);
          setChatMessages(prev => {
            const copy = [...prev];
            copy[copy.length - 1] = { ...copy[copy.length - 1], action };
            return copy;
          });
        } catch {}
      }

      // Save history
      const finalMessages = [...updated, { role: 'assistant', content: assistantContent, timestamp: Date.now() }];
      saveChatHistory(finalMessages);
    } catch (err) {
      console.error('Chat error:', err);
      const errMsg = { role: 'assistant', content: `Sorry, I encountered an error: ${err.message}. Make sure the raise-chat edge function is deployed.`, timestamp: Date.now() };
      setChatMessages(prev => [...prev, errMsg]);
    } finally {
      setChatLoading(false);
    }
  }, [chatMessages, chatLoading, buildChatContext, saveChatHistory]);

  const applyChatAction = useCallback((action) => {
    try {
      if (action.type === 'add_column') {
        // Open Add Column dialog pre-configured so user can review & complete setup
        setColType(action.column_type || 'enrichment');
        setColName(action.name || '');
        setColConfig(action.config || {});
        setColDialogOpen(true);
        toast.success(`Configure "${action.name}" column and click Add Column`);
      } else if (action.type === 'add_filter') {
        const col = columns.find(c => c.name === action.column);
        if (col) {
          setFilters(prev => [...prev, { id: crypto.randomUUID(), columnId: col.id, operator: action.operator || 'contains', value: action.value || '' }]);
          toast.success('Filter applied');
        }
      }
    } catch (err) {
      toast.error(`Failed to apply: ${err.message}`);
    }
  }, [columns]);

  const clearChat = useCallback(() => {
    setChatMessages([]);
    saveChatHistory([]);
  }, [saveChatHistory]);

  // ─── Progress indicators ──────────────────────────────────────────────

  const enrichableColumns = useMemo(() => columns.filter(c => c.type === 'enrichment' || c.type === 'ai' || c.type === 'waterfall' || c.type === 'http'), [columns]);

  const columnProgress = useMemo(() => {
    const result = {};
    for (const col of enrichableColumns) {
      let complete = 0;
      const total = rows.length;
      for (const row of rows) {
        const cell = cells[cellKey(row.id, col.id)];
        if (cell?.status === 'complete') complete++;
      }
      result[col.id] = { complete, total, percentage: total > 0 ? Math.round((complete / total) * 100) : 0 };
    }
    return result;
  }, [enrichableColumns, rows, cells, cellKey]);

  const globalProgress = useMemo(() => {
    if (enrichableColumns.length === 0) return null;
    let complete = 0;
    let total = 0;
    for (const col of enrichableColumns) {
      const p = columnProgress[col.id];
      if (p) { complete += p.complete; total += p.total; }
    }
    return { complete, total, percentage: total > 0 ? Math.round((complete / total) * 100) : 0 };
  }, [enrichableColumns, columnProgress]);

  const rowErrors = useMemo(() => {
    const result = {};
    for (const row of rows) {
      let count = 0;
      for (const col of columns) {
        const cell = cells[cellKey(row.id, col.id)];
        if (cell?.status === 'error') count++;
      }
      if (count > 0) result[row.id] = count;
    }
    return result;
  }, [rows, columns, cells, cellKey]);

  // ─── Permission check ───────────────────────────────────────────────────

  if (!hasPermission('finance.view')) {
    return (
      <GrowthPageTransition>
        <div className={rt('min-h-screen bg-gray-50', 'min-h-screen bg-black')}>
          <div className="w-full px-6 py-12">
            <div className="text-center py-20">
              <AlertCircle className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-white mb-2">Access Denied</h2>
              <p className="text-zinc-400 text-sm">You do not have permission to view this page.</p>
            </div>
          </div>
        </div>
      </GrowthPageTransition>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: Campaign Loading
  // ═══════════════════════════════════════════════════════════════════════

  if (campaignLoading && isCampaignMode) {
    return (
      <GrowthPageTransition>
        <div className="min-h-screen bg-black flex flex-col">
          {campaignId && (
            <div className="flex-shrink-0 px-4 pt-3">
              <JourneyProgressBar campaignId={campaignId} currentPhase="enrich" />
            </div>
          )}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-white mb-2">Setting up enrichment workspace</h2>
              <p className="text-sm text-zinc-400">{campaignLoadingStatus || 'Initializing...'}</p>
            </div>
          </div>
        </div>
      </GrowthPageTransition>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: Workspace List
  // ═══════════════════════════════════════════════════════════════════════

  if (!activeWorkspaceId) {
    return (
      <GrowthPageTransition>
        <div className={rt('min-h-screen bg-gray-50', 'min-h-screen bg-black')}>
          <div className="w-full px-6 py-6">
            <PageHeader
              title="Enrich"
              subtitle="Clay-like enrichment workspaces for your lead data"
              icon={Sparkles}
              color="indigo"
              actions={
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-1.5" /> New Workspace
                </Button>
              }
            />

            <div className="mt-8">
              {workspacesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={rt(
                      'h-36 rounded-2xl bg-gray-100 animate-pulse',
                      'h-36 rounded-2xl bg-zinc-900/50 animate-pulse'
                    )} />
                  ))}
                </div>
              ) : workspaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                    <Table2 className="w-6 h-6 text-zinc-500" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-1">No workspaces yet</h3>
                  <p className="text-sm text-zinc-400 mb-4 max-w-md">Create your first enrichment workspace to start enriching candidate data</p>
                  <Button onClick={() => setCreateDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                    Create Workspace
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {workspaces.map((ws, idx) => (
                    <motion.div
                      key={ws.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <div
                        onClick={() => setActiveWorkspaceId(ws.id)}
                        className={rt(
                          'p-5 rounded-2xl border border-gray-200 bg-white hover:border-indigo-300 cursor-pointer transition-all group/card',
                          'p-5 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 hover:border-indigo-500/40 cursor-pointer transition-all group/card'
                        )}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                              <Sparkles className="w-4 h-4 text-indigo-400" />
                            </div>
                            <h3 className={rt('text-sm font-semibold text-gray-900', 'text-sm font-semibold text-white')}>{ws.name}</h3>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!window.confirm(`Delete workspace "${ws.name}" and all its data?`)) return;
                              (async () => {
                                try {
                                  await supabase.from('enrich_cells').delete().eq('row_id', 'dummy').or(`column_id.in.(select id from enrich_columns where workspace_id='${ws.id}')`);
                                  await supabase.from('enrich_cells').delete().in('row_id', (await supabase.from('enrich_rows').select('id').eq('workspace_id', ws.id)).data?.map(r => r.id) || []);
                                  await supabase.from('enrich_rows').delete().eq('workspace_id', ws.id);
                                  await supabase.from('enrich_columns').delete().eq('workspace_id', ws.id);
                                  await supabase.from('enrich_workspaces').delete().eq('id', ws.id);
                                  toast.success('Workspace deleted');
                                  loadWorkspaces();
                                } catch (err) {
                                  console.error('Error deleting workspace:', err);
                                  toast.error('Failed to delete workspace');
                                }
                              })();
                            }}
                            className="p-1.5 rounded-lg opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-red-500/10 text-zinc-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Columns3 className="w-3 h-3" />
                            {ws.enrich_columns?.[0]?.count ?? 0} cols
                          </span>
                          <span className="flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            {ws.enrich_rows?.[0]?.count ?? 0} rows
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {ws.updated_at ? new Date(ws.updated_at).toLocaleDateString() : '--'}
                          </span>
                        </div>
                        {ws.nest_id && (
                          <div className="mt-2">
                            <RaiseBadge variant="outline" className="text-[10px]">Linked to Nest</RaiseBadge>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Create Dialog */}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogContent className={rt('bg-white', 'bg-zinc-900 border-zinc-800')}>
              <DialogHeader>
                <DialogTitle className={rt('text-gray-900', 'text-white')}>New Workspace</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label className={rt('text-gray-700', 'text-zinc-300')}>Name</Label>
                  <Input
                    value={newWsName}
                    onChange={e => setNewWsName(e.target.value)}
                    placeholder="e.g. Q1 Outreach Enrichment"
                    className={rt('', 'bg-zinc-800 border-zinc-700 text-white')}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreateWorkspace(); }}
                  />
                </div>
                <div>
                  <Label className={rt('text-gray-700', 'text-zinc-300')}>Link to Nest (optional)</Label>
                  <Select value={newWsNestId} onValueChange={setNewWsNestId}>
                    <SelectTrigger className={rt('', 'bg-zinc-800 border-zinc-700 text-white')}>
                      <SelectValue placeholder={nestsLoading ? 'Loading...' : 'Select a nest'} />
                    </SelectTrigger>
                    <SelectContent className={rt('', 'bg-zinc-800 border-zinc-700')}>
                      {nests.map(n => (
                        <SelectItem key={n.id} value={n.id} className={rt('', 'text-white hover:bg-zinc-700')}>
                          {n.name} ({n.lead_count ?? 0} leads)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateWorkspace}>Create</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </GrowthPageTransition>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: Workspace Detail (Spreadsheet)
  // ═══════════════════════════════════════════════════════════════════════

  const nestName = workspace?.nest_id ? nests.find(n => n.id === workspace.nest_id)?.name : null;

  return (
    <GrowthPageTransition>
      <div className={rt('min-h-screen bg-gray-50', 'min-h-screen bg-black')} style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* Campaign Journey Progress Bar */}
        {isCampaignMode && campaignId && (
          <div className="flex-shrink-0 px-4 pt-3">
            <JourneyProgressBar campaignId={campaignId} currentPhase="enrich" />
          </div>
        )}
        {/* Toolbar */}
        <div className={rt(
          'flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-white',
          'flex-shrink-0 px-4 py-3 border-b border-zinc-800 bg-zinc-950'
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setActiveWorkspaceId(null); setWorkspace(null); setColumns([]); setRows([]); setCells({}); loadWorkspaces(); }}
                className={rt('p-1.5 rounded-lg hover:bg-gray-100 text-gray-500', 'p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400')}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              {editingName ? (
                <input
                  autoFocus
                  value={wsName}
                  onChange={e => setWsName(e.target.value)}
                  onBlur={saveWorkspaceName}
                  onKeyDown={e => { if (e.key === 'Enter') saveWorkspaceName(); if (e.key === 'Escape') { setWsName(workspace?.name || ''); setEditingName(false); }}}
                  className={rt(
                    'text-sm font-semibold bg-transparent border-b border-indigo-400 outline-none text-gray-900 px-1',
                    'text-sm font-semibold bg-transparent border-b border-indigo-400 outline-none text-white px-1'
                  )}
                />
              ) : (
                <div className="flex items-center gap-1.5 group/name cursor-pointer" onClick={() => setEditingName(true)}>
                  <h2
                    className={rt(
                      'text-sm font-semibold text-gray-900 hover:text-indigo-600',
                      'text-sm font-semibold text-white hover:text-indigo-400'
                    )}
                  >
                    {wsName}
                  </h2>
                  <Pencil className="w-3 h-3 text-zinc-500 opacity-0 group-hover/name:opacity-100 transition-opacity" />
                </div>
              )}
              {nestName && (
                <RaiseBadge variant="outline" className="text-[10px]">{nestName}</RaiseBadge>
              )}
              {sandboxMode && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
                  <FlaskConical className="w-3 h-3" /> SANDBOX
                </span>
              )}
              {/* Views dropdown */}
              <div className="relative" ref={viewDropdownRef}>
                <button
                  onClick={() => setViewDropdownOpen(prev => !prev)}
                  title={activeView ? activeView.name : 'Views'}
                  className={rt(
                    `relative flex items-center gap-1 px-1.5 py-1 rounded-md text-[11px] font-medium border transition-all ${activeViewId ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'text-gray-500 hover:bg-gray-100 border-gray-200'}`,
                    `relative flex items-center gap-1 px-1.5 py-1 rounded-md text-[11px] font-medium border transition-all ${activeViewId ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' : 'text-zinc-400 hover:bg-zinc-800 border-zinc-700'}`
                  )}
                >
                  <Eye className="w-3 h-3" />
                  {activeView ? activeView.name : 'Views'}
                  {viewHasUnsaved && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />}
                  <ChevronDown className={`w-2.5 h-2.5 transition-transform ${viewDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {viewDropdownOpen && (
                  <div className={rt(
                    'absolute top-full left-0 mt-1 w-72 rounded-xl border border-gray-200 bg-white shadow-lg z-50 overflow-hidden',
                    'absolute top-full left-0 mt-1 w-72 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl z-50 overflow-hidden'
                  )}>
                    {/* Default View */}
                    <button
                      onClick={() => switchView(null)}
                      className={rt(
                        `w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${!activeViewId ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`,
                        `w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${!activeViewId ? 'bg-indigo-500/10 text-indigo-400 font-medium' : 'text-zinc-300 hover:bg-zinc-800'}`
                      )}
                    >
                      <Table2 className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="flex-1">Default View</span>
                      {!activeViewId && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      <span className={rt('text-[10px] text-gray-400', 'text-[10px] text-zinc-500')}>Ctrl+0</span>
                    </button>
                    {views.length > 0 && (
                      <div className={rt('border-t border-gray-100', 'border-t border-zinc-800')}>
                        {views.map((view, idx) => (
                          <div
                            key={view.id}
                            className={rt(
                              `flex items-center gap-2 px-3 py-2 text-xs transition-colors group ${activeViewId === view.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`,
                              `flex items-center gap-2 px-3 py-2 text-xs transition-colors group ${activeViewId === view.id ? 'bg-indigo-500/10 text-indigo-400 font-medium' : 'text-zinc-300 hover:bg-zinc-800'}`
                            )}
                          >
                            {view.is_default && <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
                            {!view.is_default && <Eye className="w-3 h-3 flex-shrink-0 text-zinc-500" />}
                            {viewRenamingId === view.id ? (
                              <input
                                autoFocus
                                value={viewRenameValue}
                                onChange={e => setViewRenameValue(e.target.value)}
                                onBlur={() => renameView(view.id, viewRenameValue)}
                                onKeyDown={e => { if (e.key === 'Enter') renameView(view.id, viewRenameValue); if (e.key === 'Escape') setViewRenamingId(null); }}
                                className={rt(
                                  'flex-1 bg-transparent border-b border-indigo-400 outline-none text-xs px-0.5',
                                  'flex-1 bg-transparent border-b border-indigo-400 outline-none text-xs px-0.5 text-white'
                                )}
                                onClick={e => e.stopPropagation()}
                              />
                            ) : (
                              <button onClick={() => switchView(view.id)} className="flex-1 text-left truncate">
                                {view.name}
                              </button>
                            )}
                            {activeViewId === view.id && <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />}
                            {idx < 5 && <span className={rt('text-[10px] text-gray-400', 'text-[10px] text-zinc-500')}>Ctrl+{idx + 1}</span>}
                            {/* Hover actions */}
                            <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
                              <button
                                onClick={(e) => { e.stopPropagation(); setViewRenamingId(view.id); setViewRenameValue(view.name); }}
                                className={rt('p-0.5 rounded hover:bg-gray-200', 'p-0.5 rounded hover:bg-zinc-700')}
                                title="Rename"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); duplicateView(view.id); }}
                                className={rt('p-0.5 rounded hover:bg-gray-200', 'p-0.5 rounded hover:bg-zinc-700')}
                                title="Duplicate"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDefaultView(view.is_default ? null : view.id); }}
                                className={rt('p-0.5 rounded hover:bg-gray-200', 'p-0.5 rounded hover:bg-zinc-700')}
                                title={view.is_default ? 'Remove as default' : 'Set as default'}
                              >
                                <Star className={`w-3 h-3 ${view.is_default ? 'text-amber-400 fill-amber-400' : ''}`} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); if (window.confirm(`Delete view "${view.name}"?`)) deleteView(view.id); }}
                                className="p-0.5 rounded hover:bg-red-500/20 text-red-400"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Actions */}
                    <div className={rt('border-t border-gray-100 p-1.5', 'border-t border-zinc-800 p-1.5')}>
                      {viewHasUnsaved && activeViewId && (
                        <button
                          onClick={() => { saveView(null, activeViewId); setViewDropdownOpen(false); }}
                          className={rt(
                            'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-indigo-600 hover:bg-indigo-50 font-medium',
                            'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-indigo-400 hover:bg-indigo-500/10 font-medium'
                          )}
                        >
                          <Save className="w-3.5 h-3.5" /> Save Changes
                        </button>
                      )}
                      <button
                        onClick={() => { setViewSaveMode('new'); setViewSaveName(''); setViewSaveDialogOpen(true); setViewDropdownOpen(false); }}
                        className={rt(
                          'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-50',
                          'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-zinc-800'
                        )}
                      >
                        <Plus className="w-3.5 h-3.5" /> Save as New View
                      </button>
                      {activeViewId && (
                        <button
                          onClick={() => switchView(null)}
                          className={rt(
                            'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-50',
                            'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-500 hover:bg-zinc-800'
                          )}
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Reset to Default
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {/* Save indicator for unsaved view changes */}
              {viewHasUnsaved && activeViewId && (
                <button
                  onClick={() => saveView(null, activeViewId)}
                  className={rt(
                    'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors',
                    'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 transition-colors'
                  )}
                >
                  <Save className="w-3 h-3" /> Save
                </button>
              )}
              {/* Global progress ring */}
              {globalProgress && globalProgress.total > 0 && (
                <div className="flex items-center gap-1.5" title={`${globalProgress.complete} of ${globalProgress.total} rows complete (${globalProgress.percentage}%)`}>
                  <svg width="20" height="20" viewBox="0 0 20 20" className="flex-shrink-0">
                    <circle cx="10" cy="10" r="8" fill="none" stroke={rt('#e5e7eb', '#3f3f46')} strokeWidth="2.5" />
                    <circle
                      cx="10" cy="10" r="8" fill="none"
                      stroke={globalProgress.percentage === 100 ? '#4ade80' : globalProgress.percentage > 0 ? '#fbbf24' : '#71717a'}
                      strokeWidth="2.5"
                      strokeDasharray={`${globalProgress.percentage * 0.5027} 50.27`}
                      strokeLinecap="round"
                      transform="rotate(-90 10 10)"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <span className={`text-[10px] font-medium ${globalProgress.percentage === 100 ? 'text-green-400' : globalProgress.percentage > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                    {globalProgress.percentage}%
                  </span>
                </div>
              )}
              {/* Global search */}
              <div className="relative flex items-center">
                <Search className={`absolute left-2.5 w-3.5 h-3.5 pointer-events-none transition-colors ${searchFocused || searchInput ? 'text-indigo-400' : 'text-zinc-500'}`} />
                <input
                  ref={searchRef}
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  onKeyDown={e => { if (e.key === 'Escape') clearSearch(); }}
                  placeholder="Search..."
                  className={rt(
                    `pl-8 pr-8 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 outline-none transition-all placeholder:text-gray-400 text-gray-900 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/30 ${searchFocused || searchInput ? 'w-64' : 'w-40'}`,
                    `pl-8 pr-8 py-1.5 text-xs rounded-lg border border-zinc-700 bg-zinc-800/60 outline-none transition-all placeholder:text-zinc-500 text-white focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 ${searchFocused || searchInput ? 'w-64' : 'w-40'}`
                  )}
                />
                {searchInput && (
                  <button onClick={clearSearch} className="absolute right-2 p-0.5 rounded hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-200">
                    <X className="w-3 h-3" />
                  </button>
                )}
                {searchMatchStats && (
                  <div className="absolute -bottom-5 left-0 whitespace-nowrap">
                    <span className="text-[10px] text-indigo-400/80">{searchMatchStats.cells} matches in {searchMatchStats.rows} rows</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto flex-shrink min-w-0" style={{ scrollbarWidth: 'none' }}>
              {workspace?.nest_id && rows.length === 0 && (
                <Button variant="ghost" size="sm" onClick={importFromNest} className="flex-shrink-0">
                  <Upload className="w-3.5 h-3.5 mr-1" /> Import from Nest
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => csvInputRef.current?.click()} title="Import CSV file" className="flex-shrink-0">
                <FileUp className="w-3.5 h-3.5 mr-1" /> <span className="hidden xl:inline">Import</span> CSV
              </Button>
              <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={importCSV} />
              <Button variant="ghost" size="sm" onClick={() => { setColDialogOpen(true); setColType('field'); setColName(''); setColConfig({}); setFilterPanelOpen(false); setSortPanelOpen(false); }} title="Add a new column" className="flex-shrink-0">
                <Plus className="w-3.5 h-3.5 mr-1" /> <span className="hidden lg:inline">Add</span> Column
              </Button>
              <Button variant="ghost" size="sm" onClick={runAllColumns} title="Run all enrichment columns (Ctrl+Enter)" className="flex-shrink-0">
                <Play className="w-3.5 h-3.5 mr-1" /> Run All
              </Button>
              <button
                onClick={toggleAutoRun}
                className={`flex-shrink-0 whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  autoRun
                    ? rt('bg-green-50 text-green-700 border border-green-200', 'bg-green-500/10 text-green-400 border border-green-500/30')
                    : rt('text-gray-500 hover:bg-gray-100 border border-transparent', 'text-zinc-500 hover:bg-zinc-800 border border-transparent')
                } ${autoRunPulse ? 'ring-2 ring-green-400/50 ring-offset-1 ring-offset-transparent' : ''}`}
              >
                {autoRun ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4" />}
                Auto-run
                {autoRun && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
              </button>
              {/* Sandbox toggle */}
              <button
                onClick={() => {
                  if (!sandboxMode) {
                    setSandboxMode(true);
                    toast.success(`Sandbox ON — enrichments limited to ${SANDBOX_ROW_LIMIT} rows`);
                  } else {
                    setSandboxMode(false);
                    toast.info(`Sandbox OFF — enrichments will run on all ${rows.length} rows`);
                  }
                }}
                className={`flex-shrink-0 whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  sandboxMode
                    ? rt('bg-amber-50 text-amber-700 border border-amber-300', 'bg-amber-500/10 text-amber-400 border border-amber-500/40')
                    : rt('text-gray-500 hover:bg-gray-100 border border-transparent', 'text-zinc-500 hover:bg-zinc-800 border border-transparent')
                }`}
              >
                <FlaskConical className={`w-3.5 h-3.5 ${sandboxMode ? 'text-amber-400' : ''}`} />
                Sandbox
                {sandboxMode && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
              </button>
              {sandboxMode && (
                <>
                  <button onClick={clearSandboxData} className={`text-[10px] px-2 py-1 rounded-lg ${rt('text-gray-500 hover:bg-gray-100', 'text-zinc-500 hover:bg-zinc-800')}`} title="Clear all sandbox data">
                    <Trash className="w-3 h-3" />
                  </button>
                  <button onClick={convertSandboxToLive} className={`text-[10px] px-2 py-1.5 rounded-lg flex items-center gap-1 ${rt('text-indigo-600 hover:bg-indigo-50 border border-indigo-200', 'text-indigo-400 hover:bg-indigo-500/10 border border-indigo-500/30')}`} title="Clear sandbox data and run live enrichments">
                    <RotateCcw className="w-3 h-3" /> Go Live
                  </button>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={() => { setSortPanelOpen(prev => !prev); setFilterPanelOpen(false); setColDialogOpen(false); }} className="relative flex-shrink-0" title="Sort columns">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1" /> Sort
                {activeSortCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-[10px] font-bold text-white flex items-center justify-center">
                    {activeSortCount}
                  </span>
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setFilterPanelOpen(prev => !prev); setSortPanelOpen(false); setColDialogOpen(false); }} className="relative flex-shrink-0" title="Filter rows">
                <Filter className="w-3.5 h-3.5 mr-1" /> Filters
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-[10px] font-bold text-white flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              {/* More menu (Export, History, Delete) */}
              <div className="relative flex-shrink-0" ref={moreMenuRef}>
                <Button variant="ghost" size="sm" onClick={() => setMoreMenuOpen(prev => !prev)} title="More actions" className="relative">
                  <MoreHorizontal className="w-4 h-4" />
                  {historyEntries.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-indigo-500" />
                  )}
                </Button>
                {moreMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMoreMenuOpen(false)} />
                    <div className={rt(
                      'absolute top-full right-0 mt-1 w-52 rounded-xl border border-gray-200 bg-white shadow-lg z-50 py-1',
                      'absolute top-full right-0 mt-1 w-52 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl z-50 py-1'
                    )}>
                      <button onClick={() => { exportCSV(); setMoreMenuOpen(false); }} className={rt(
                        'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-gray-50',
                        'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-zinc-300 hover:bg-zinc-800'
                      )}>
                        <Download className="w-4 h-4 text-zinc-500" /> Export CSV
                      </button>
                      <button onClick={() => { setHistoryPanelOpen(prev => !prev); if (!historyPanelOpen) { loadHistory(); loadSnapshots(); } setMoreMenuOpen(false); }} className={rt(
                        'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-gray-50',
                        'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-zinc-300 hover:bg-zinc-800'
                      )}>
                        <History className="w-4 h-4 text-zinc-500" /> History
                        {historyEntries.length > 0 && <span className="ml-auto text-[10px] text-indigo-400">{historyEntries.length}</span>}
                      </button>
                      <div className={rt('border-t border-gray-100 my-1', 'border-t border-zinc-800 my-1')} />
                      <button onClick={() => {
                        setMoreMenuOpen(false);
                        if (!window.confirm(`Delete workspace "${wsName}" and all its data? This cannot be undone.`)) return;
                        (async () => {
                          try {
                            const rowIds = rows.map(r => r.id);
                            if (rowIds.length) await supabase.from('enrich_cells').delete().in('row_id', rowIds);
                            await supabase.from('enrich_rows').delete().eq('workspace_id', activeWorkspaceId);
                            await supabase.from('enrich_columns').delete().eq('workspace_id', activeWorkspaceId);
                            await supabase.from('enrich_workspaces').delete().eq('id', activeWorkspaceId);
                            toast.success('Workspace deleted');
                            setActiveWorkspaceId(null); setWorkspace(null); setColumns([]); setRows([]); setCells({});
                            loadWorkspaces();
                          } catch (err) { toast.error('Failed to delete workspace'); }
                        })();
                      }} className={rt(
                        'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50',
                        'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-red-400 hover:bg-red-500/10'
                      )}>
                        <Trash2 className="w-4 h-4" /> Delete Workspace
                      </button>
                    </div>
                  </>
                )}
              </div>
              {/* Campaign mode: Continue button */}
              {isCampaignMode && (
                <Button
                  onClick={handleContinueToFlow}
                  disabled={savingCampaign}
                  className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white ml-2"
                  size="sm"
                >
                  {savingCampaign ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <ArrowRight className="w-3.5 h-3.5 mr-1" />}
                  Continue to Flow
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Campaign suggestions now appear in the Sync chat panel */}

        {/* Spreadsheet */}
        {wsLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        ) : rows.length === 0 && columns.length === 0 ? (
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center">
              <Table2 className={rt('w-10 h-10 text-gray-300 mx-auto mb-3', 'w-10 h-10 text-zinc-600 mx-auto mb-3')} />
              <h3 className={rt('text-sm font-semibold text-gray-900 mb-1', 'text-sm font-semibold text-white mb-1')}>Empty workspace</h3>
              <p className="text-xs text-zinc-500 mb-6">Get started by importing data or adding columns</p>
              <div className="flex items-center gap-3 justify-center">
                {workspace?.nest_id && (
                  <button
                    onClick={importFromNest}
                    className={rt(
                      'flex flex-col items-center gap-2 p-5 rounded-2xl border border-gray-200 bg-white hover:border-indigo-300 transition-all w-44',
                      'flex flex-col items-center gap-2 p-5 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 hover:border-indigo-500/40 transition-all w-44'
                    )}
                  >
                    <Database className="w-5 h-5 text-indigo-400" />
                    <span className={rt('text-xs font-medium text-gray-900', 'text-xs font-medium text-white')}>Import from Nest</span>
                    <span className="text-[10px] text-zinc-500">Pull candidates from linked nest</span>
                  </button>
                )}
                <button
                  onClick={() => csvInputRef.current?.click()}
                  className={rt(
                    'flex flex-col items-center gap-2 p-5 rounded-2xl border border-gray-200 bg-white hover:border-indigo-300 transition-all w-44',
                    'flex flex-col items-center gap-2 p-5 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 hover:border-indigo-500/40 transition-all w-44'
                  )}
                >
                  <FileUp className="w-5 h-5 text-indigo-400" />
                  <span className={rt('text-xs font-medium text-gray-900', 'text-xs font-medium text-white')}>Upload CSV</span>
                  <span className="text-[10px] text-zinc-500">Import rows from a CSV file</span>
                </button>
                <button
                  onClick={() => { setColDialogOpen(true); setColType('field'); setColName(''); setColConfig({}); }}
                  className={rt(
                    'flex flex-col items-center gap-2 p-5 rounded-2xl border border-gray-200 bg-white hover:border-indigo-300 transition-all w-44',
                    'flex flex-col items-center gap-2 p-5 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 hover:border-indigo-500/40 transition-all w-44'
                  )}
                >
                  <Plus className="w-5 h-5 text-indigo-400" />
                  <span className={rt('text-xs font-medium text-gray-900', 'text-xs font-medium text-white')}>Add Column</span>
                  <span className="text-[10px] text-zinc-500">Start building your schema</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className={`flex-1 overflow-auto ${sandboxMode ? 'ring-2 ring-amber-500/40 ring-inset rounded-lg' : ''}`}
            style={{ position: 'relative' }}
          >
            {/* Header */}
            <div
              className={rt(
                'sticky top-0 z-20 flex bg-gray-50 border-b border-gray-200',
                'sticky top-0 z-20 flex bg-zinc-900/80 border-b border-zinc-800'
              )}
              style={{ minWidth: totalGridWidth }}
            >
              {/* Row # header */}
              <div
                className={rt(
                  'flex-shrink-0 flex items-center justify-center text-xs font-medium text-gray-400 border-r border-gray-200',
                  'flex-shrink-0 flex items-center justify-center text-xs font-medium text-zinc-500 border-r border-zinc-800/60'
                )}
                style={{ width: ROW_NUM_WIDTH, height: ROW_HEIGHT }}
              >
                #
              </div>
              {columns.map(col => {
                const Icon = col.type === 'field' && col.config?.data_type ? (FIELD_DATA_TYPE_ICONS[col.config.data_type] || Type) : (COLUMN_TYPE_ICONS[col.type] || Type);
                const sortState = getColumnSortState(col.id);
                const colProg = columnProgress[col.id];
                const isEnrichable = col.type === 'enrichment' || col.type === 'ai' || col.type === 'waterfall' || col.type === 'http';
                return (
                  <div
                    key={col.id}
                    className={rt(
                      `flex-shrink-0 flex flex-col justify-center px-2 text-xs font-medium border-r border-gray-200 relative group cursor-pointer select-none ${sortState ? 'text-indigo-600 bg-indigo-50/50' : 'text-gray-600'}`,
                      `flex-shrink-0 flex flex-col justify-center px-2 text-xs font-medium border-r border-zinc-800/60 relative group cursor-pointer select-none ${sortState ? 'text-indigo-400 bg-indigo-500/5' : 'text-zinc-300'}`
                    )}
                    style={{ width: col.width || DEFAULT_COL_WIDTH, height: ROW_HEIGHT }}
                    onClick={(e) => { if (!e.target.closest('[data-no-sort]')) toggleColumnSort(col.id, e.shiftKey); }}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Icon
                        className={`w-3.5 h-3.5 flex-shrink-0 ${col.type === 'field' ? 'text-indigo-400' : col.type === 'enrichment' ? 'text-amber-400' : col.type === 'ai' ? 'text-purple-400' : col.type === 'waterfall' ? 'text-indigo-400' : col.type === 'http' ? 'text-emerald-400' : col.type === 'merge' ? 'text-pink-400' : 'text-green-400'}`}
                        title={col.type === 'field' && col.config?.data_type ? FIELD_DATA_TYPE_LABELS[col.config.data_type] || col.config.data_type : COLUMN_TYPE_LABELS[col.type] || col.type}
                      />
                      <span className="truncate flex-1">{col.name}</span>
                      {/* Sort indicator */}
                      {sortState ? (
                        <span className="flex items-center gap-0.5 flex-shrink-0">
                          {sortState.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />}
                          {sortState.isMulti && <span className="text-[9px] text-indigo-400 font-bold">{sortState.priority}</span>}
                        </span>
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-zinc-500 opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0" />
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button data-no-sort className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-700/50">
                            <MoreHorizontal className="w-3 h-3 text-zinc-400" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className={rt('', 'bg-zinc-800 border-zinc-700')}>
                          {col.type === 'enrichment' && (
                            <DropdownMenuItem onClick={() => sandboxMode ? runSandboxColumn(col) : runEnrichmentColumn(col)} className={rt('', 'text-white hover:bg-zinc-700')}>
                              <Play className="w-3 h-3 mr-2" /> {sandboxMode ? 'Run (Sandbox)' : 'Run Column'}
                            </DropdownMenuItem>
                          )}
                          {col.type === 'ai' && (
                            <DropdownMenuItem onClick={() => sandboxMode ? runSandboxColumn(col) : runAIColumn(col)} className={rt('', 'text-white hover:bg-zinc-700')}>
                              <Brain className="w-3 h-3 mr-2" /> {sandboxMode ? 'Run (Sandbox)' : 'Run AI'}
                            </DropdownMenuItem>
                          )}
                          {col.type === 'waterfall' && (
                            <DropdownMenuItem onClick={() => sandboxMode ? runSandboxColumn(col) : runWaterfallColumn(col)} className={rt('', 'text-white hover:bg-zinc-700')}>
                              <Layers className="w-3 h-3 mr-2" /> {sandboxMode ? 'Run (Sandbox)' : 'Run Waterfall'}
                            </DropdownMenuItem>
                          )}
                          {col.type === 'http' && (
                            <DropdownMenuItem onClick={() => sandboxMode ? runSandboxColumn(col) : runHTTPColumn(col)} className={rt('', 'text-white hover:bg-zinc-700')}>
                              <Globe className="w-3 h-3 mr-2" /> {sandboxMode ? 'Run (Sandbox)' : 'Run HTTP'}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => deleteColumn(col.id)} className="text-red-400 hover:bg-red-500/10">
                            <Trash2 className="w-3 h-3 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {/* Column progress bar */}
                    {isEnrichable && colProg && colProg.total > 0 && (
                      <div
                        className={rt('w-full h-[2px] rounded-full bg-gray-200 mt-0.5', 'w-full h-[2px] rounded-full bg-zinc-700 mt-0.5')}
                        title={`${colProg.percentage}% — ${colProg.complete}/${colProg.total} complete`}
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${colProg.percentage === 100 ? 'bg-green-400' : colProg.percentage > 0 ? 'bg-amber-400' : 'bg-zinc-500'}`}
                          style={{ width: `${colProg.percentage}%` }}
                        />
                      </div>
                    )}
                    {/* Resize handle */}
                    <div
                      data-no-sort
                      onMouseDown={(e) => onResizeStart(e, col)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-500/50 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    />
                  </div>
                );
              })}
              {/* Add column button */}
              <div
                className={rt(
                  'flex-shrink-0 flex items-center justify-center cursor-pointer hover:bg-gray-100',
                  'flex-shrink-0 flex items-center justify-center cursor-pointer hover:bg-zinc-800/50'
                )}
                style={{ width: 44, height: ROW_HEIGHT }}
                onClick={() => { setColDialogOpen(true); setColType('field'); setColName(''); setColConfig({}); }}
              >
                <Plus className="w-3.5 h-3.5 text-zinc-500" />
              </div>
            </div>

            {/* Body with virtual scrolling */}
            <div style={{ height: totalHeight, position: 'relative', minWidth: totalGridWidth }}>
              {visibleRows.map((row) => {
                const rowIdx = sortedRows.indexOf(row);
                const isBeyondSandbox = sandboxMode && rowIdx >= SANDBOX_ROW_LIMIT;
                const isSandboxBoundary = sandboxMode && rowIdx === SANDBOX_ROW_LIMIT - 1;
                return (
                  <div
                    key={row.id}
                    className="flex absolute w-full"
                    style={{
                      top: rowIdx * ROW_HEIGHT,
                      height: ROW_HEIGHT,
                      opacity: isBeyondSandbox ? 0.35 : 1,
                      ...(isSandboxBoundary ? { boxShadow: '0 2px 0 0 rgba(99, 102, 241, 0.6)' } : {}),
                    }}
                  >
                    {/* Row number */}
                    <div
                      className={rt(
                        'flex-shrink-0 flex items-center justify-center gap-1 text-xs text-gray-400 border-r border-b border-gray-200 bg-gray-50/50',
                        'flex-shrink-0 flex items-center justify-center gap-1 text-xs text-zinc-500 border-r border-b border-zinc-800/60 bg-zinc-950/50'
                      )}
                      style={{ width: ROW_NUM_WIDTH }}
                    >
                      {rowErrors[row.id] && (
                        <span
                          title={`${rowErrors[row.id]} error${rowErrors[row.id] > 1 ? 's' : ''} in this row`}
                          className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0"
                        />
                      )}
                      {rowIdx + 1}
                    </div>
                    {columns.map(col => {
                      const isEditing = editingCell?.rowId === row.id && editingCell?.colId === col.id;
                      const isSelected = selectedCell?.rowId === row.id && selectedCell?.colId === col.id;
                      const ck = cellKey(row.id, col.id);
                      const sandboxCell = sandboxCells[ck];
                      const cellObj = sandboxCell || cells[ck];
                      const status = cellObj?.status || 'empty';
                      const isSandboxData = !!sandboxCell;
                      const displayVal = isSandboxData
                        ? (typeof sandboxCell.value === 'object' && sandboxCell.value?.v != null ? String(sandboxCell.value.v) : typeof sandboxCell.value === 'object' ? JSON.stringify(sandboxCell.value) : String(sandboxCell.value || ''))
                        : getCellDisplayValue(row.id, col);

                      return (
                        <div
                          key={col.id}
                          className={`flex-shrink-0 flex items-center px-2 font-mono text-sm border-r border-b ${
                            isSandboxData
                              ? rt(
                                  'border-amber-300 border-dashed bg-amber-50/30',
                                  'border-amber-500/30 border-dashed bg-amber-500/5'
                                )
                              : rt(
                                  `border-gray-200 ${isEditing ? 'ring-2 ring-indigo-400 ring-inset bg-indigo-50/20' : isSelected ? 'ring-2 ring-indigo-400 ring-inset bg-indigo-50/10' : 'bg-white'}`,
                                  `border-zinc-800/60 ${isEditing ? 'ring-2 ring-indigo-400 ring-inset bg-white/10' : isSelected ? 'ring-2 ring-indigo-400 ring-inset bg-indigo-500/5' : ''}`
                                )
                          }`}
                          title={isSandboxData ? 'Sandbox data — not real' : undefined}
                          style={{ width: col.width || DEFAULT_COL_WIDTH }}
                          onClick={() => {
                            setSelectedCell({ rowId: row.id, colId: col.id });
                            // Checkbox toggle on single click
                            if (col.type === 'field' && col.config?.data_type === 'checkbox') {
                              const raw = getCellRawValue(row.id, col);
                              const next = (raw === 'true' || raw === '1' || raw === 'yes') ? 'false' : 'true';
                              saveCellWithAutoRun(row.id, col.id, next);
                            }
                          }}
                          onDoubleClick={() => {
                            if (col.type === 'formula' || col.type === 'merge') return;
                            if (col.type === 'field' && col.config?.data_type === 'checkbox') return;
                            setEditingCell({ rowId: row.id, colId: col.id });
                            // For editing, use raw value (not formatted)
                            const rawVal = getCellRawValue(row.id, col);
                            setEditingValue(rawVal || displayVal);
                          }}
                        >
                          {/* Checkbox type - inline toggle */}
                          {col.type === 'field' && col.config?.data_type === 'checkbox' ? (
                            <div className="flex items-center justify-center w-full">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-colors ${
                                (getCellRawValue(row.id, col) === 'true' || getCellRawValue(row.id, col) === '1' || getCellRawValue(row.id, col) === 'yes')
                                  ? rt('bg-indigo-500 border-indigo-500', 'bg-indigo-500 border-indigo-500')
                                  : rt('border-gray-300', 'border-zinc-600')
                              }`}>
                                {(getCellRawValue(row.id, col) === 'true' || getCellRawValue(row.id, col) === '1' || getCellRawValue(row.id, col) === 'yes') && <Check className="w-3 h-3 text-white" />}
                              </div>
                            </div>
                          ) : isEditing && col.type === 'field' && col.config?.data_type === 'select' ? (
                            /* Select type - dropdown editing */
                            <select
                              autoFocus
                              value={editingValue}
                              onChange={e => { saveCellWithAutoRun(row.id, col.id, e.target.value); setEditingCell(null); }}
                              onBlur={() => { saveCellWithAutoRun(row.id, col.id, editingValue); setEditingCell(null); }}
                              onKeyDown={e => { if (e.key === 'Escape') setEditingCell(null); }}
                              className={rt(
                                'w-full h-full bg-transparent outline-none text-sm font-mono text-gray-900',
                                'w-full h-full bg-zinc-900 outline-none text-sm font-mono text-white border-none'
                              )}
                            >
                              <option value="">—</option>
                              {(col.config?.select_options || []).map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : isEditing ? (
                            <input
                              autoFocus
                              type={col.type === 'field' && (col.config?.data_type === 'number' || col.config?.data_type === 'currency') ? 'number' : col.type === 'field' && col.config?.data_type === 'date' ? 'date' : 'text'}
                              value={editingValue}
                              onChange={e => setEditingValue(e.target.value)}
                              onBlur={() => {
                                saveCellWithAutoRun(row.id, col.id, editingValue);
                                setEditingCell(null);
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { saveCellWithAutoRun(row.id, col.id, editingValue); setEditingCell(null); }
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              className={rt(
                                'w-full h-full bg-transparent outline-none text-sm font-mono text-gray-900',
                                'w-full h-full bg-transparent outline-none text-sm font-mono text-white'
                              )}
                            />
                          ) : (
                            <div className="flex items-center gap-1.5 w-full min-w-0">
                              {status !== 'empty' && status !== 'complete' && <StatusDot status={status} errorMessage={cellObj?.error_message} />}
                              {/* URL type - clickable */}
                              {col.type === 'field' && col.config?.data_type === 'url' && displayVal ? (
                                <a href={displayVal.startsWith('http') ? displayVal : `https://${displayVal}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="truncate text-indigo-400 hover:underline">{debouncedSearch ? highlightMatch(displayVal, debouncedSearch) : displayVal}</a>
                              ) : col.type === 'field' && col.config?.data_type === 'email' && displayVal ? (
                                <a href={`mailto:${displayVal}`} onClick={e => e.stopPropagation()} className="truncate text-indigo-400 hover:underline">{debouncedSearch ? highlightMatch(displayVal, debouncedSearch) : displayVal}</a>
                              ) : (
                                <span className={`truncate ${col.type === 'field' && (col.config?.data_type === 'number' || col.config?.data_type === 'currency') ? 'tabular-nums text-right w-full' : ''} ${rt('text-gray-700', 'text-zinc-300')}`}>
                                  {debouncedSearch ? highlightMatch(displayVal, debouncedSearch) : displayVal}
                                </span>
                              )}
                              {status === 'error' && <StatusDot status="error" errorMessage={cellObj?.error_message} />}
                              {col.type === 'waterfall' && cellObj?.value?._meta?.source_used && (
                                <span title={`Source: ${cellObj.value._meta.source_used} (${cellObj.value._meta.attempts} tried)`} className="ml-auto text-[9px] px-1 py-0.5 rounded bg-indigo-500/10 text-indigo-400 flex-shrink-0">
                                  #{cellObj.value._meta.attempts}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {/* Spacer for add column */}
                    <div className="flex-shrink-0" style={{ width: 44 }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Table Tabs Bar */}
        {activeWorkspaceId && tables.length > 0 && (
          <div className={rt(
            'flex-shrink-0 border-t border-gray-200 bg-white px-2',
            'flex-shrink-0 border-t border-zinc-800 bg-zinc-950 px-2'
          )}>
            <div className="flex items-center gap-0.5 overflow-x-auto py-1" style={{ scrollbarWidth: 'none' }}>
              {tables.map((table) => {
                const isActive = table.id === activeTableId;
                return (
                  <button
                    key={table.id}
                    onClick={() => switchTable(table.id)}
                    onDoubleClick={() => { setRenamingTabId(table.id); setRenameTabValue(table.name); }}
                    onContextMenu={(e) => { e.preventDefault(); setTabContextMenu({ tableId: table.id, x: e.clientX, y: e.clientY }); }}
                    className={rt(
                      `relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-lg transition-all whitespace-nowrap ${isActive ? 'text-indigo-600 bg-indigo-50 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`,
                      `relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-lg transition-all whitespace-nowrap ${isActive ? 'text-indigo-400 bg-indigo-500/10 border-b-2 border-indigo-500' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`
                    )}
                  >
                    {renamingTabId === table.id ? (
                      <input
                        autoFocus
                        value={renameTabValue}
                        onChange={e => setRenameTabValue(e.target.value)}
                        onBlur={() => { renameTable(table.id, renameTabValue); setRenamingTabId(null); }}
                        onKeyDown={e => { if (e.key === 'Enter') { renameTable(table.id, renameTabValue); setRenamingTabId(null); } if (e.key === 'Escape') setRenamingTabId(null); }}
                        onClick={e => e.stopPropagation()}
                        className={`bg-transparent border-b outline-none text-xs w-20 ${rt('border-indigo-400 text-gray-900', 'border-indigo-400 text-white')}`}
                      />
                    ) : (
                      <>
                        <Table2 className="w-3 h-3" />
                        <span>{table.name}</span>
                        {isActive && rows.length > 0 && <span className={rt('text-[10px] text-gray-400', 'text-[10px] text-zinc-600')}>({rows.length})</span>}
                      </>
                    )}
                  </button>
                );
              })}
              <button
                onClick={createNewTable}
                className={rt(
                  'flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-colors whitespace-nowrap',
                  'flex items-center gap-1 px-2.5 py-1.5 text-xs text-zinc-600 hover:text-indigo-400 hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap'
                )}
                title="New Table (Ctrl+T)"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Tab Context Menu */}
        {tabContextMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setTabContextMenu(null)} />
            <div
              className={rt(
                'fixed z-50 w-44 rounded-lg border border-gray-200 bg-white shadow-xl py-1',
                'fixed z-50 w-44 rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl py-1'
              )}
              style={{ left: tabContextMenu.x, top: tabContextMenu.y - 120 }}
            >
              <button onClick={() => { const t = tables.find(t => t.id === tabContextMenu.tableId); setRenamingTabId(t.id); setRenameTabValue(t.name); setTabContextMenu(null); }} className={rt('w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50', 'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800')}>
                <Edit2 className="w-3.5 h-3.5" /> Rename
              </button>
              <button onClick={() => { duplicateTable(tabContextMenu.tableId); setTabContextMenu(null); }} className={rt('w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50', 'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800')}>
                <Copy className="w-3.5 h-3.5" /> Duplicate
              </button>
              {tables.length > 1 && (
                <button onClick={() => { deleteTable(tabContextMenu.tableId); setTabContextMenu(null); }} className={rt('w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50', 'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10')}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </div>
          </>
        )}

        {/* Filter Panel - slides in from right */}
        <AnimatePresence>
          {filterPanelOpen && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className={rt(
                'fixed top-0 right-0 h-full min-w-[320px] w-80 z-50 border-l border-gray-200 bg-white shadow-xl flex flex-col',
                'fixed top-0 right-0 h-full min-w-[320px] w-80 z-50 border-l border-zinc-800 bg-zinc-950 shadow-xl flex flex-col'
              )}
            >
              {/* Header */}
              <div className={rt(
                'flex items-center justify-between px-4 py-3 border-b border-gray-200',
                'flex items-center justify-between px-4 py-3 border-b border-zinc-800'
              )}>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-indigo-400" />
                  <span className={rt('text-sm font-semibold text-gray-900', 'text-sm font-semibold text-white')}>Filters</span>
                  {activeFilterCount > 0 && (
                    <RaiseBadge className="text-[10px]">{activeFilterCount} active</RaiseBadge>
                  )}
                </div>
                <button onClick={() => setFilterPanelOpen(false)} className={rt('p-1 rounded-lg hover:bg-gray-100 text-gray-500', 'p-1 rounded-lg hover:bg-zinc-800 text-zinc-400')}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Filter list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {filters.length === 0 ? (
                  <div className="text-center py-8">
                    <Filter className={rt('w-8 h-8 text-gray-300 mx-auto mb-2', 'w-8 h-8 text-zinc-600 mx-auto mb-2')} />
                    <p className="text-xs text-zinc-500">No filters applied</p>
                    <p className="text-[10px] text-zinc-600 mt-1">Add a filter to narrow down rows</p>
                  </div>
                ) : (
                  filters.map((filter, idx) => {
                    const col = columns.find(c => c.id === filter.columnId);
                    const isNumberOp = ['eq', 'gt', 'lt', 'between'].includes(filter.operator);
                    const needsValue = !['is_empty', 'is_not_empty'].includes(filter.operator);
                    return (
                      <React.Fragment key={filter.id}>
                      <div
                        className={rt(
                          'p-3 rounded-xl border border-gray-200 bg-gray-50 space-y-2',
                          'p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-2'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{idx === 0 ? 'Where' : 'And'}</span>
                          <button onClick={() => removeFilter(filter.id)} className="p-0.5 rounded hover:bg-red-500/10 text-zinc-500 hover:text-red-400">
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {/* Column select */}
                        <Select value={filter.columnId} onValueChange={v => updateFilter(filter.id, { columnId: v })}>
                          <SelectTrigger className={rt('h-8 text-xs', 'h-8 text-xs bg-zinc-800 border-zinc-700 text-white')}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className={rt('', 'bg-zinc-800 border-zinc-700')}>
                            {columns.map(c => (
                              <SelectItem key={c.id} value={c.id} className={rt('text-xs', 'text-xs text-white hover:bg-zinc-700')}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {/* Operator select */}
                        <Select
                          value={filter.operator}
                          onValueChange={v => updateFilter(filter.id, { operator: v })}
                        >
                          <SelectTrigger className={rt('h-8 text-xs', 'h-8 text-xs bg-zinc-800 border-zinc-700 text-white')}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className={rt('', 'bg-zinc-800 border-zinc-700')}>
                            <SelectItem value="_text_label" disabled className="text-[10px] text-zinc-500 font-semibold">Text</SelectItem>
                            {TEXT_OPERATORS.map(op => (
                              <SelectItem key={op.value} value={op.value} className={rt('text-xs', 'text-xs text-white hover:bg-zinc-700')}>{op.label}</SelectItem>
                            ))}
                            <SelectItem value="_num_label" disabled className="text-[10px] text-zinc-500 font-semibold">Number</SelectItem>
                            {NUMBER_OPERATORS.map(op => (
                              <SelectItem key={op.value} value={op.value} className={rt('text-xs', 'text-xs text-white hover:bg-zinc-700')}>{op.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {/* Value input(s) */}
                        {needsValue && (
                          <div className={filter.operator === 'between' ? 'flex items-center gap-2' : ''}>
                            <Input
                              value={filter.value}
                              onChange={e => updateFilter(filter.id, { value: e.target.value })}
                              placeholder={isNumberOp ? '0' : 'Value...'}
                              type={isNumberOp ? 'number' : 'text'}
                              className={rt('h-8 text-xs', 'h-8 text-xs bg-zinc-800 border-zinc-700 text-white')}
                            />
                            {filter.operator === 'between' && (
                              <>
                                <span className="text-xs text-zinc-500">to</span>
                                <Input
                                  value={filter.valueTo}
                                  onChange={e => updateFilter(filter.id, { valueTo: e.target.value })}
                                  placeholder="0"
                                  type="number"
                                  className={rt('h-8 text-xs', 'h-8 text-xs bg-zinc-800 border-zinc-700 text-white')}
                                />
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      {idx < filters.length - 1 && <div className={rt('border-b border-gray-100 mt-1', 'border-b border-zinc-800/40 mt-1')} />}
                      </React.Fragment>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className={rt(
                'flex-shrink-0 px-4 py-3 border-t border-gray-200 space-y-2',
                'flex-shrink-0 px-4 py-3 border-t border-zinc-800 space-y-2'
              )}>
                <Button variant="ghost" size="sm" className="w-full justify-center" onClick={addFilter}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Filter
                </Button>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="w-full text-center text-xs text-red-400 hover:text-red-300 py-1"
                  >
                    Clear all filters
                  </button>
                )}
                {activeFilterCount > 0 && (
                  <div className="text-center text-[10px] text-zinc-500">
                    Showing {filteredRows.length} of {rows.length} rows
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Backdrop for filter panel */}
        <AnimatePresence>
          {filterPanelOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setFilterPanelOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Sort Panel - slides in from right */}
        <AnimatePresence>
          {sortPanelOpen && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className={rt(
                'fixed top-0 right-0 h-full w-80 z-50 border-l border-gray-200 bg-white shadow-xl flex flex-col',
                'fixed top-0 right-0 h-full w-80 z-50 border-l border-zinc-800 bg-zinc-950 shadow-xl flex flex-col'
              )}
            >
              {/* Header */}
              <div className={rt(
                'flex items-center justify-between px-4 py-3 border-b border-gray-200',
                'flex items-center justify-between px-4 py-3 border-b border-zinc-800'
              )}>
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-indigo-400" />
                  <span className={rt('text-sm font-semibold text-gray-900', 'text-sm font-semibold text-white')}>Sort</span>
                  {activeSortCount > 0 && (
                    <RaiseBadge className="text-[10px]">{activeSortCount} active</RaiseBadge>
                  )}
                </div>
                <button onClick={() => setSortPanelOpen(false)} className={rt('p-1 rounded-lg hover:bg-gray-100 text-gray-500', 'p-1 rounded-lg hover:bg-zinc-800 text-zinc-400')}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sort list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {sorts.length === 0 ? (
                  <div className="text-center py-8">
                    <ArrowUpDown className={rt('w-8 h-8 text-gray-300 mx-auto mb-2', 'w-8 h-8 text-zinc-600 mx-auto mb-2')} />
                    <p className="text-xs text-zinc-500">No sorts applied</p>
                    <p className="text-[10px] text-zinc-600 mt-1">Click column headers or add a sort below</p>
                  </div>
                ) : (
                  sorts.map((sort, idx) => {
                    const col = columns.find(c => c.id === sort.columnId);
                    return (
                      <div
                        key={sort.id}
                        draggable
                        onDragStart={() => handleSortDragStart(idx)}
                        onDragOver={(e) => handleSortDragOver(e, idx)}
                        onDragEnd={handleSortDragEnd}
                        className={rt(
                          `p-3 rounded-xl border bg-gray-50 space-y-2 transition-all ${dragSort === idx ? 'border-indigo-400 opacity-70' : 'border-gray-200'}`,
                          `p-3 rounded-xl border bg-zinc-900/60 space-y-2 transition-all ${dragSort === idx ? 'border-indigo-500 opacity-70' : 'border-zinc-800'}`
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <GripVertical className="w-3 h-3 text-zinc-500 cursor-grab active:cursor-grabbing" />
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{idx === 0 ? 'Sort by' : 'Then by'}</span>
                          </div>
                          <button onClick={() => removeSort(sort.id)} className="p-0.5 rounded hover:bg-red-500/10 text-zinc-500 hover:text-red-400">
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {/* Column select */}
                        <Select value={sort.columnId} onValueChange={v => updateSort(sort.id, { columnId: v })}>
                          <SelectTrigger className={rt('h-8 text-xs', 'h-8 text-xs bg-zinc-800 border-zinc-700 text-white')}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className={rt('', 'bg-zinc-800 border-zinc-700')}>
                            {columns.map(c => (
                              <SelectItem key={c.id} value={c.id} className={rt('text-xs', 'text-xs text-white hover:bg-zinc-700')}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {/* Direction toggle */}
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => updateSort(sort.id, { direction: 'asc' })}
                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              sort.direction === 'asc'
                                ? rt('bg-indigo-100 text-indigo-600 border border-indigo-300', 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/40')
                                : rt('bg-gray-100 text-gray-500 border border-gray-200', 'bg-zinc-800 text-zinc-500 border border-zinc-700')
                            }`}
                          >
                            <ArrowUp className="w-3 h-3" /> Asc
                          </button>
                          <button
                            onClick={() => updateSort(sort.id, { direction: 'desc' })}
                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              sort.direction === 'desc'
                                ? rt('bg-indigo-100 text-indigo-600 border border-indigo-300', 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/40')
                                : rt('bg-gray-100 text-gray-500 border border-gray-200', 'bg-zinc-800 text-zinc-500 border border-zinc-700')
                            }`}
                          >
                            <ArrowDown className="w-3 h-3" /> Desc
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className={rt(
                'flex-shrink-0 px-4 py-3 border-t border-gray-200 space-y-2',
                'flex-shrink-0 px-4 py-3 border-t border-zinc-800 space-y-2'
              )}>
                <Button variant="ghost" size="sm" className="w-full justify-center" onClick={addSortFromPanel}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Sort
                </Button>
                {activeSortCount > 0 && (
                  <button
                    onClick={clearAllSorts}
                    className="w-full text-center text-xs text-red-400 hover:text-red-300 py-1"
                  >
                    Clear all sorts
                  </button>
                )}
                {activeSortCount > 0 && (
                  <p className="text-[10px] text-zinc-500 text-center">Drag to reorder priority. Shift+click headers for multi-sort.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Backdrop for sort panel */}
        <AnimatePresence>
          {sortPanelOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setSortPanelOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Auto-run Confirmation Dialog */}
        <Dialog open={autoRunConfirmOpen} onOpenChange={setAutoRunConfirmOpen}>
          <DialogContent className={rt('bg-white max-w-sm', 'bg-zinc-900 border-zinc-800 max-w-sm')}>
            <DialogHeader>
              <DialogTitle className={rt('text-gray-900', 'text-zinc-100')}>Enable Auto-run?</DialogTitle>
            </DialogHeader>
            <p className={`text-sm ${rt('text-gray-600', 'text-zinc-400')}`}>
              Auto-run will automatically process enrichments when data changes. This will use credits. Continue?
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setAutoRunConfirmOpen(false)} className={`px-3 py-1.5 rounded-lg text-sm ${rt('text-gray-600 hover:bg-gray-100', 'text-zinc-400 hover:bg-zinc-800')}`}>Cancel</button>
              <button onClick={confirmAutoRun} className="px-3 py-1.5 rounded-lg text-sm bg-green-600 text-white hover:bg-green-700">Enable</button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sandbox Export Warning Dialog */}
        <Dialog open={sandboxExportWarn} onOpenChange={setSandboxExportWarn}>
          <DialogContent className={rt('bg-white max-w-sm', 'bg-zinc-900 border-zinc-800 max-w-sm')}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <span className={rt('text-gray-900', 'text-zinc-100')}>Export contains sandbox data</span>
              </DialogTitle>
            </DialogHeader>
            <p className={`text-sm ${rt('text-gray-600', 'text-zinc-400')}`}>
              Some cells contain mock sandbox data that is not real. The exported CSV will include "SANDBOX" in the filename. Continue?
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setSandboxExportWarn(false)} className={`px-3 py-1.5 rounded-lg text-sm ${rt('text-gray-600 hover:bg-gray-100', 'text-zinc-400 hover:bg-zinc-800')}`}>Cancel</button>
              <button onClick={() => { setSandboxExportWarn(false); doExportCSV(); }} className="px-3 py-1.5 rounded-lg text-sm bg-amber-600 text-white hover:bg-amber-700">Export Anyway</button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Column Panel - slides in from right */}
        <AnimatePresence>
          {colDialogOpen && (
            <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[49]"
              onClick={() => setColDialogOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className={rt(
                'fixed top-0 right-0 h-full w-full sm:w-[450px] z-50 border-l border-gray-200 bg-white shadow-xl flex flex-col',
                'fixed top-0 right-0 h-full w-full sm:w-[450px] z-50 border-l border-zinc-800 bg-zinc-950 shadow-xl flex flex-col'
              )}
            >
              {/* Header */}
              <div className={`flex items-center justify-between px-4 py-3 border-b ${rt('border-gray-200', 'border-zinc-800')}`}>
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-400" />
                  <h3 className={`text-sm font-semibold ${rt('text-gray-900', 'text-white')}`}>Add Column</h3>
                </div>
                <button onClick={() => setColDialogOpen(false)} className={`p-1.5 rounded-lg transition-colors ${rt('hover:bg-gray-100 text-gray-400', 'hover:bg-zinc-800 text-zinc-500')}`}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Column name */}
              <div>
                <Label className={rt('text-gray-700', 'text-zinc-300')}>Column Name</Label>
                <Input
                  value={colName}
                  onChange={e => setColName(e.target.value)}
                  placeholder="e.g. Verified Email"
                  className={rt('', 'bg-zinc-800 border-zinc-700 text-white')}
                />
              </div>

              {/* Type selector */}
              <div>
                <Label className={rt('text-gray-700', 'text-zinc-300')}>Type</Label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {COLUMN_TYPES.map(ct => {
                    const CTIcon = ct.icon;
                    return (
                      <button
                        key={ct.value}
                        onClick={() => { setColType(ct.value); setColConfig({}); }}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                          colType === ct.value
                            ? rt('border-indigo-400 bg-indigo-50', 'border-indigo-500/50 bg-indigo-500/10')
                            : rt('border-gray-200 hover:border-gray-300', 'border-zinc-700 hover:border-zinc-600')
                        }`}
                      >
                        <CTIcon className={`w-4 h-4 flex-shrink-0 ${colType === ct.value ? 'text-indigo-400' : rt('text-gray-400', 'text-zinc-500')}`} />
                        <div className="min-w-0">
                          <div className={`text-xs font-semibold ${rt('text-gray-900', 'text-white')}`}>{ct.label}</div>
                          <div className={`text-[10px] leading-tight ${rt('text-gray-500', 'text-zinc-500')}`}>{ct.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Type-specific config */}
              {colType === 'field' && (
                <div className="space-y-3">
                  <div>
                    <Label className={rt('text-gray-700', 'text-zinc-300')}>Source Field</Label>
                    <Select value={colConfig.source_field || ''} onValueChange={v => setColConfig(prev => ({ ...prev, source_field: v }))}>
                      <SelectTrigger className={rt('', 'bg-zinc-800 border-zinc-700 text-white')}>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent className={rt('', 'bg-zinc-800 border-zinc-700')}>
                        {SOURCE_FIELDS.map(f => (
                          <SelectItem key={f.value} value={f.value} className={rt('', 'text-white hover:bg-zinc-700')}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className={rt('text-gray-700', 'text-zinc-300')}>Data Type</Label>
                    <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                      {FIELD_DATA_TYPES.map(dt => {
                        const DTIcon = dt.icon;
                        const selected = (colConfig.data_type || 'text') === dt.value;
                        return (
                          <button
                            key={dt.value}
                            onClick={() => setColConfig(prev => ({ ...prev, data_type: dt.value }))}
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all ${
                              selected
                                ? rt('border-indigo-400 bg-indigo-50', 'border-indigo-500/50 bg-indigo-500/10')
                                : rt('border-gray-200 hover:border-gray-300', 'border-zinc-700 hover:border-zinc-600')
                            }`}
                          >
                            <DTIcon className={`w-3.5 h-3.5 ${selected ? 'text-indigo-400' : 'text-zinc-500'}`} />
                            <span className={`text-[10px] ${selected ? rt('text-indigo-600', 'text-indigo-400') : 'text-zinc-500'}`}>{dt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Number options */}
                  {colConfig.data_type === 'number' && (
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Label className={`text-[11px] ${rt('text-gray-600', 'text-zinc-400')}`}>Decimal Places</Label>
                        <Select value={String(colConfig.decimals ?? 0)} onValueChange={v => setColConfig(prev => ({ ...prev, decimals: parseInt(v) }))}>
                          <SelectTrigger className={`h-8 text-xs ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`}><SelectValue /></SelectTrigger>
                          <SelectContent className={rt('', 'bg-zinc-800 border-zinc-700')}>
                            {[0,1,2,3,4].map(n => <SelectItem key={n} value={String(n)} className={rt('', 'text-white hover:bg-zinc-700')}>{n}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer pt-5">
                        <input type="checkbox" checked={colConfig.thousands_separator !== false} onChange={e => setColConfig(prev => ({ ...prev, thousands_separator: e.target.checked }))} className="rounded border-zinc-600" />
                        <span className={`text-xs ${rt('text-gray-700', 'text-zinc-300')}`}>Thousands separator</span>
                      </label>
                    </div>
                  )}

                  {/* Currency options */}
                  {colConfig.data_type === 'currency' && (
                    <div className="space-y-2">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <Label className={`text-[11px] ${rt('text-gray-600', 'text-zinc-400')}`}>Currency</Label>
                          <Select value={colConfig.currency_code || 'USD'} onValueChange={v => setColConfig(prev => ({ ...prev, currency_code: v }))}>
                            <SelectTrigger className={`h-8 text-xs ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`}><SelectValue /></SelectTrigger>
                            <SelectContent className={rt('', 'bg-zinc-800 border-zinc-700')}>
                              {CURRENCY_CODES.map(c => <SelectItem key={c.value} value={c.value} className={rt('', 'text-white hover:bg-zinc-700')}>{c.symbol} {c.value}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1">
                          <Label className={`text-[11px] ${rt('text-gray-600', 'text-zinc-400')}`}>Decimals</Label>
                          <Select value={String(colConfig.decimals ?? 2)} onValueChange={v => setColConfig(prev => ({ ...prev, decimals: parseInt(v) }))}>
                            <SelectTrigger className={`h-8 text-xs ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`}><SelectValue /></SelectTrigger>
                            <SelectContent className={rt('', 'bg-zinc-800 border-zinc-700')}>
                              {[0,1,2,3,4].map(n => <SelectItem key={n} value={String(n)} className={rt('', 'text-white hover:bg-zinc-700')}>{n}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className={`text-[11px] ${rt('text-gray-600', 'text-zinc-400')}`}>Symbol Position</Label>
                        <div className="flex gap-2 mt-1">
                          {['before', 'after'].map(pos => (
                            <button key={pos} onClick={() => setColConfig(prev => ({ ...prev, symbol_position: pos }))} className={`text-xs px-3 py-1 rounded-lg border ${(colConfig.symbol_position || 'before') === pos ? rt('border-indigo-400 bg-indigo-50 text-indigo-600', 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400') : rt('border-gray-200 text-gray-500', 'border-zinc-700 text-zinc-500')}`}>
                              {pos === 'before' ? `${(CURRENCY_CODES.find(c => c.value === (colConfig.currency_code || 'EUR'))?.symbol || '\u20AC')}100` : `100 ${CURRENCY_CODES.find(c => c.value === (colConfig.currency_code || 'EUR'))?.symbol || '\u20AC'}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Date options */}
                  {colConfig.data_type === 'date' && (
                    <div>
                      <Label className={`text-[11px] ${rt('text-gray-600', 'text-zinc-400')}`}>Display Format</Label>
                      <Select value={colConfig.date_format || 'YYYY-MM-DD'} onValueChange={v => setColConfig(prev => ({ ...prev, date_format: v }))}>
                        <SelectTrigger className={`h-8 text-xs ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`}><SelectValue /></SelectTrigger>
                        <SelectContent className={rt('', 'bg-zinc-800 border-zinc-700')}>
                          {DATE_FORMATS.map(f => <SelectItem key={f.value} value={f.value} className={rt('', 'text-white hover:bg-zinc-700')}>{f.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Select options */}
                  {colConfig.data_type === 'select' && (
                    <div>
                      <Label className={`text-[11px] ${rt('text-gray-600', 'text-zinc-400')}`}>Options</Label>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {(colConfig.select_options || []).map((opt, idx) => (
                          <span key={idx} className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${rt('bg-gray-100 text-gray-700', 'bg-zinc-800 text-zinc-300')}`}>
                            {opt}
                            <button onClick={() => setColConfig(prev => ({ ...prev, select_options: prev.select_options.filter((_, i) => i !== idx) }))} className="text-zinc-500 hover:text-red-400"><X className="w-2.5 h-2.5" /></button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-1.5 mt-1.5">
                        <Input
                          placeholder="New option"
                          onKeyDown={e => {
                            if (e.key === 'Enter' && e.target.value.trim()) {
                              setColConfig(prev => ({ ...prev, select_options: [...(prev.select_options || []), e.target.value.trim()] }));
                              e.target.value = '';
                            }
                          }}
                          className={`h-8 text-xs flex-1 ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`}
                        />
                        <p className="text-[10px] text-zinc-500 self-center">Press Enter to add</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {colType === 'enrichment' && (() => {
                const selectedFn = ENRICHMENT_FUNCTIONS.find(f => f.value === colConfig.function);
                const outputGroups = getOutputFieldsForFunction(colConfig.function);
                return (
                <div className="space-y-3">
                  <div>
                    <Label className={rt('text-gray-700', 'text-zinc-300')}>What do you want to enrich?</Label>
                    <Select value={colConfig.function || ''} onValueChange={v => setColConfig(prev => ({ ...prev, function: v, provider: 'explorium', output_field: '' }))}>
                      <SelectTrigger className={rt('', 'bg-zinc-800 border-zinc-700 text-white')}>
                        <SelectValue placeholder="Choose an enrichment type..." />
                      </SelectTrigger>
                      <SelectContent className={rt('', 'bg-zinc-800 border-zinc-700')}>
                        {ENRICHMENT_FUNCTIONS.map(f => (
                          <SelectItem key={f.value} value={f.value} className={rt('', 'text-white hover:bg-zinc-700')}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedFn && (
                      <p className="text-[10px] text-zinc-500 mt-1">{selectedFn.desc}</p>
                    )}
                  </div>

                  {selectedFn && (
                    <div>
                      <Label className={rt('text-gray-700', 'text-zinc-300')}>{selectedFn.inputLabel}</Label>
                      <Select value={colConfig.input_column_id || ''} onValueChange={v => setColConfig(prev => ({ ...prev, input_column_id: v }))}>
                        <SelectTrigger className={rt('', 'bg-zinc-800 border-zinc-700 text-white')}>
                          <SelectValue placeholder="Select a column..." />
                        </SelectTrigger>
                        <SelectContent className={rt('', 'bg-zinc-800 border-zinc-700')}>
                          {columns.map(c => (
                            <SelectItem key={c.id} value={c.id} className={rt('', 'text-white hover:bg-zinc-700')}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-zinc-500 mt-1">{selectedFn.inputHint}</p>
                    </div>
                  )}

                  {selectedFn && outputGroups.length > 0 && (
                    <div>
                      <Label className={rt('text-gray-700', 'text-zinc-300')}>What data do you want back?</Label>
                      <Select value={colConfig.output_field || ''} onValueChange={v => setColConfig(prev => ({ ...prev, output_field: v }))}>
                        <SelectTrigger className={rt('', 'bg-zinc-800 border-zinc-700 text-white')}>
                          <SelectValue placeholder="Pick the field to extract..." />
                        </SelectTrigger>
                        <SelectContent className={`${rt('', 'bg-zinc-800 border-zinc-700')} max-h-60`}>
                          {outputGroups.map(group => (
                            <React.Fragment key={group.group}>
                              <SelectItem value={`__group_${group.group}`} disabled className={`text-[10px] uppercase tracking-wide font-semibold ${rt('text-gray-400', 'text-zinc-500')} pointer-events-none`}>
                                {group.group}
                              </SelectItem>
                              {group.fields.map(f => (
                                <SelectItem key={f.value} value={f.value} className={rt('', 'text-white hover:bg-zinc-700')}>
                                  {f.label}
                                </SelectItem>
                              ))}
                            </React.Fragment>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-zinc-500 mt-1">Each enrichment column extracts one field. Add multiple columns for multiple fields.</p>
                    </div>
                  )}
                </div>
                );
              })()}

              {colType === 'ai' && (
                <div className="space-y-3">
                  {/* Template selector */}
                  <div>
                    <Label className={rt('text-gray-700', 'text-zinc-300')}>Quick Templates</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {AI_PROMPT_TEMPLATES.map(t => (
                        <button key={t.id} onClick={() => { setColConfig(prev => ({ ...prev, prompt: t.prompt })); if (!colName.trim()) setColName(t.label); }}
                          className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${rt('border-gray-200 text-gray-600 hover:border-indigo-400 hover:bg-indigo-50', 'border-zinc-700 text-zinc-400 hover:border-indigo-500/50 hover:bg-indigo-500/10')}`}>
                          {t.icon} {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Prompt — contenteditable with chips */}
                  <div className="relative">
                    <Label className={rt('text-gray-700', 'text-zinc-300')}>Prompt</Label>
                    <div
                      ref={promptEditorRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={handlePromptEditorInput}
                      onKeyDown={handlePromptEditorKeyDown}
                      onPaste={handlePromptEditorPaste}
                      data-placeholder="Type / to insert column references&#10;e.g. Based on /Company and /Title, write a one-line pitch"
                      className={`min-h-[80px] max-h-[160px] overflow-y-auto w-full rounded-md border px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-background ${rt(
                        'border-input bg-white text-gray-900 [&:empty]:before:text-gray-400',
                        'bg-zinc-800 border-zinc-700 text-white [&:empty]:before:text-zinc-500'
                      )} [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:whitespace-pre-wrap [&:empty]:before:pointer-events-none`}
                    />
                    {slashMenu.open && slashMenu.field === 'prompt' && slashMenuColumns.length > 0 && (
                      <div className={`absolute z-50 left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-lg border shadow-xl ${rt('border-gray-200 bg-white', 'border-zinc-700 bg-zinc-800')}`}>
                        {slashMenuColumns.map((c, idx) => (
                          <button key={c.id} onClick={() => insertColumnRefChip(c.name)}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 min-w-0 ${rt(
                              idx === slashMenu.selectedIndex ? 'bg-indigo-50 text-gray-900' : 'text-gray-700 hover:bg-gray-50',
                              idx === slashMenu.selectedIndex ? 'bg-zinc-600 text-white' : 'text-white hover:bg-zinc-700'
                            )}`}>
                            <span className="text-indigo-400 font-mono text-xs shrink-0">/</span>
                            <span className="shrink-0">{c.name}</span>
                            {c.sampleValue && <span className={`text-xs truncate ml-auto ${rt('text-gray-400', 'text-zinc-500')}`}>{String(c.sampleValue).slice(0, 40)}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-zinc-500 mt-1">Type <span className="font-mono text-indigo-400">/</span> to insert column references. Use <span className="font-mono text-indigo-400">&uarr;&darr;</span> to navigate, <span className="font-mono text-indigo-400">Enter</span> or <span className="font-mono text-indigo-400">Tab</span> to select.</p>
                  </div>

                  {/* Model selector */}
                  <div>
                    <Label className={rt('text-gray-700', 'text-zinc-300')}>Model</Label>
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      {AI_MODELS.map(m => (
                        <button key={m.value} onClick={() => setColConfig(prev => ({ ...prev, model: m.value }))}
                          className={`text-left p-2 rounded-lg border transition-all ${(colConfig.model || 'moonshotai/Kimi-K2-Instruct') === m.value
                            ? rt('border-indigo-400 bg-indigo-50', 'border-indigo-500/50 bg-indigo-500/10')
                            : rt('border-gray-200 hover:border-gray-300', 'border-zinc-700 hover:border-zinc-600')}`}>
                          <div className={`text-xs font-medium ${rt('text-gray-800', 'text-white')}`}>{m.label}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-zinc-500">Speed</span>
                            <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <div key={i} className={`w-1 h-1 rounded-full ${i <= m.speed ? 'bg-indigo-400' : rt('bg-gray-200', 'bg-zinc-700')}`} />)}</div>
                            <span className="text-[9px] text-zinc-500 ml-1">Quality</span>
                            <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <div key={i} className={`w-1 h-1 rounded-full ${i <= m.quality ? 'bg-purple-400' : rt('bg-gray-200', 'bg-zinc-700')}`} />)}</div>
                          </div>
                          <div className="text-[9px] text-zinc-500 mt-0.5">{m.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Input Columns */}
                  <div>
                    <Label className={rt('text-gray-700', 'text-zinc-300')}>Input Columns</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {columns.map(c => {
                        const selected = (colConfig.input_columns || []).includes(c.id);
                        return (
                          <button key={c.id} onClick={() => setColConfig(prev => ({
                            ...prev,
                            input_columns: selected ? (prev.input_columns || []).filter(id => id !== c.id) : [...(prev.input_columns || []), c.id],
                          }))}
                            className={`text-[10px] px-2 py-1 rounded-full border transition-all ${selected
                              ? rt('border-indigo-400 bg-indigo-50 text-indigo-600', 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400')
                              : rt('border-gray-200 text-gray-500', 'border-zinc-700 text-zinc-500')}`}>
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Advanced options (collapsible) */}
                  <div className={`rounded-lg border ${rt('border-gray-200', 'border-zinc-700')}`}>
                    <button onClick={() => setColConfig(prev => ({ ...prev, _showAdvanced: !prev._showAdvanced }))}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs ${rt('text-gray-600', 'text-zinc-400')}`}>
                      <span>Advanced Options</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${colConfig._showAdvanced ? 'rotate-180' : ''}`} />
                    </button>
                    {colConfig._showAdvanced && (
                      <div className="px-3 pb-3 space-y-3 border-t border-zinc-700/50">
                        {/* System prompt */}
                        <div className="pt-2">
                          <Label className={`text-[11px] ${rt('text-gray-600', 'text-zinc-400')}`}>System Prompt</Label>
                          <Textarea value={colConfig.system_prompt || ''} onChange={e => setColConfig(prev => ({ ...prev, system_prompt: e.target.value }))}
                            placeholder="Optional system instructions (e.g. You are a data analyst...)" rows={2}
                            className={`text-xs mt-1 ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                        </div>
                        {/* Temperature */}
                        <div>
                          <div className="flex items-center justify-between">
                            <Label className={`text-[11px] ${rt('text-gray-600', 'text-zinc-400')}`}>Temperature</Label>
                            <span className={`text-[11px] font-mono ${rt('text-gray-500', 'text-zinc-500')}`}>{(colConfig.temperature ?? 0.7).toFixed(1)}</span>
                          </div>
                          <input type="range" min="0" max="1" step="0.1" value={colConfig.temperature ?? 0.7}
                            onChange={e => setColConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                            className="w-full h-1.5 mt-1 accent-purple-500" />
                          <div className="flex justify-between text-[9px] text-zinc-500"><span>Precise</span><span>Creative</span></div>
                        </div>
                        {/* Max tokens */}
                        <div>
                          <Label className={`text-[11px] ${rt('text-gray-600', 'text-zinc-400')}`}>Max Tokens</Label>
                          <Select value={String(colConfig.max_tokens || 500)} onValueChange={v => setColConfig(prev => ({ ...prev, max_tokens: parseInt(v) }))}>
                            <SelectTrigger className={`h-8 text-xs ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`}><SelectValue /></SelectTrigger>
                            <SelectContent className={rt('', 'bg-zinc-800 border-zinc-700')}>
                              {[100, 250, 500, 1000, 2000].map(n => <SelectItem key={n} value={String(n)} className={rt('', 'text-white hover:bg-zinc-700')}>{n}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        {/* Output format */}
                        <div>
                          <Label className={`text-[11px] ${rt('text-gray-600', 'text-zinc-400')}`}>Output Format</Label>
                          <div className="flex gap-1.5 mt-1">
                            {['text', 'json', 'list'].map(fmt => (
                              <button key={fmt} onClick={() => setColConfig(prev => ({ ...prev, output_format: fmt }))}
                                className={`text-[10px] px-2.5 py-1 rounded-lg border ${(colConfig.output_format || 'text') === fmt
                                  ? rt('border-purple-400 bg-purple-50 text-purple-600', 'border-purple-500/50 bg-purple-500/10 text-purple-400')
                                  : rt('border-gray-200 text-gray-500', 'border-zinc-700 text-zinc-500')}`}>
                                {fmt.charAt(0).toUpperCase() + fmt.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                        {colConfig.output_format === 'json' && (
                          <div>
                            <Label className={`text-[11px] ${rt('text-gray-600', 'text-zinc-400')}`}>JSON Output Path</Label>
                            <Input value={colConfig.output_path || ''} onChange={e => setColConfig(prev => ({ ...prev, output_path: e.target.value }))}
                              placeholder="e.g. result.value or items[0].name" className={`h-8 text-xs ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                          </div>
                        )}
                        {colConfig.output_format === 'list' && (
                          <div>
                            <Label className={`text-[11px] ${rt('text-gray-600', 'text-zinc-400')}`}>List Separator</Label>
                            <Input value={colConfig.list_separator || ', '} onChange={e => setColConfig(prev => ({ ...prev, list_separator: e.target.value }))}
                              placeholder=", " className={`h-8 text-xs ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                          </div>
                        )}
                        {/* Batch size */}
                        <div>
                          <Label className={`text-[11px] ${rt('text-gray-600', 'text-zinc-400')}`}>Batch Size</Label>
                          <Select value={String(colConfig.batch_size || 5)} onValueChange={v => setColConfig(prev => ({ ...prev, batch_size: parseInt(v) }))}>
                            <SelectTrigger className={`h-8 text-xs ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`}><SelectValue /></SelectTrigger>
                            <SelectContent className={rt('', 'bg-zinc-800 border-zinc-700')}>
                              {[1, 3, 5, 10, 20].map(n => <SelectItem key={n} value={String(n)} className={rt('', 'text-white hover:bg-zinc-700')}>{n} rows at a time</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Live preview */}
                  {colConfig.prompt && rows.length > 0 && (
                    <div className={`rounded-lg border p-2.5 ${rt('border-gray-200 bg-gray-50', 'border-zinc-700 bg-zinc-800/50')}`}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Brain className="w-3 h-3 text-purple-400" />
                        <span className={`text-[10px] font-medium ${rt('text-gray-600', 'text-zinc-400')}`}>Preview (Row 1)</span>
                      </div>
                      <p className={`text-[11px] leading-relaxed ${rt('text-gray-700', 'text-zinc-300')} whitespace-pre-wrap break-words`}>
                        {renderPreviewWithChips(colConfig.prompt, rows[0]?.id)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {colType === 'formula' && (
                <div className="relative">
                  <Label className={rt('text-gray-700', 'text-zinc-300')}>Expression</Label>
                  <Input
                    ref={formulaRef}
                    value={colConfig.expression || ''}
                    onChange={e => { setColConfig({ expression: e.target.value }); handleSlashInput(e, 'formula'); }}
                    onKeyDown={e => handleSlashKeyDown(e, 'formula')}
                    placeholder='Type / to insert column refs. e.g. =CONCAT(/First Name, " ", /Last Name)'
                    className={rt('font-mono', 'bg-zinc-800 border-zinc-700 text-white font-mono')}
                  />
                  {slashMenu.open && slashMenu.field === 'formula' && slashMenuColumns.length > 0 && (
                    <div className={`absolute z-50 left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-lg border shadow-xl ${rt('border-gray-200 bg-white', 'border-zinc-700 bg-zinc-800')}`}>
                      {slashMenuColumns.map((c, idx) => (
                        <button key={c.id} onClick={() => insertColumnRef(c.name)}
                          className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${rt(
                            idx === slashMenu.selectedIndex ? 'bg-indigo-50 text-gray-900' : 'text-gray-700 hover:bg-gray-50',
                            idx === slashMenu.selectedIndex ? 'bg-zinc-600 text-white' : 'text-white hover:bg-zinc-700'
                          )}`}>
                          <span className="text-indigo-400 font-mono text-xs">/</span>{c.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-zinc-500 mt-1">Type <span className="font-mono text-indigo-400">/</span> for column refs. Functions: CONCAT, IF, UPPER, LOWER, TRIM, LEN, LEFT, RIGHT, REPLACE, ROUND, CONTAINS</p>
                </div>
              )}

              {colType === 'http' && (
                <div className="space-y-3">
                  {/* URL */}
                  <div>
                    <Label className={rt('text-gray-700', 'text-zinc-300')}>URL</Label>
                    <Input
                      value={colConfig.url || ''}
                      onChange={e => setColConfig(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://api.example.com/endpoint?id=/CompanyId"
                      className={rt('font-mono text-xs', 'bg-zinc-800 border-zinc-700 text-white font-mono text-xs')}
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">Use <span className="font-mono text-indigo-400">/ColumnName</span> to insert column values</p>
                  </div>

                  {/* Method */}
                  <div>
                    <Label className={rt('text-gray-700', 'text-zinc-300')}>Method</Label>
                    <Select value={colConfig.method || 'GET'} onValueChange={v => setColConfig(prev => ({ ...prev, method: v }))}>
                      <SelectTrigger className={rt('', 'bg-zinc-800 border-zinc-700 text-white')}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={rt('', 'bg-zinc-800 border-zinc-700')}>
                        {['GET', 'POST', 'PUT'].map(m => (
                          <SelectItem key={m} value={m} className={rt('', 'text-white hover:bg-zinc-700')}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Headers */}
                  <div>
                    <Label className={rt('text-gray-700', 'text-zinc-300')}>Headers</Label>
                    <div className="space-y-1.5 mt-1">
                      {(colConfig.headers || []).map((h, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <Input
                            value={h.key}
                            onChange={e => setColConfig(prev => ({ ...prev, headers: prev.headers.map((hh, i) => i === idx ? { ...hh, key: e.target.value } : hh) }))}
                            placeholder="Key"
                            className={`h-8 text-xs flex-1 ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`}
                          />
                          <Input
                            value={h.value}
                            onChange={e => setColConfig(prev => ({ ...prev, headers: prev.headers.map((hh, i) => i === idx ? { ...hh, value: e.target.value } : hh) }))}
                            placeholder="Value"
                            className={`h-8 text-xs flex-1 ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`}
                          />
                          <button onClick={() => setColConfig(prev => ({ ...prev, headers: prev.headers.filter((_, i) => i !== idx) }))} className="p-1 text-zinc-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-1.5">
                      <button
                        onClick={() => setColConfig(prev => ({ ...prev, headers: [...(prev.headers || []), { key: '', value: '' }] }))}
                        className={`text-[10px] px-2 py-1 rounded border ${rt('border-gray-200 text-gray-600', 'border-zinc-700 text-zinc-400')}`}
                      >
                        + Add Header
                      </button>
                      <button
                        onClick={() => setColConfig(prev => ({
                          ...prev,
                          headers: [...(prev.headers || []).filter(h => h.key !== 'Content-Type'), { key: 'Content-Type', value: 'application/json' }],
                        }))}
                        className={`text-[10px] px-2 py-1 rounded border ${rt('border-gray-200 text-gray-600', 'border-zinc-700 text-zinc-400')}`}
                      >
                        + JSON Content-Type
                      </button>
                    </div>
                  </div>

                  {/* Body (POST/PUT only) */}
                  {(colConfig.method === 'POST' || colConfig.method === 'PUT') && (
                    <div>
                      <Label className={rt('text-gray-700', 'text-zinc-300')}>Request Body</Label>
                      <Textarea
                        value={colConfig.body || ''}
                        onChange={e => setColConfig(prev => ({ ...prev, body: e.target.value }))}
                        placeholder={'{\n  "email": "/Email",\n  "company": "/Company"\n}'}
                        rows={4}
                        className={rt('font-mono text-xs', 'bg-zinc-800 border-zinc-700 text-white font-mono text-xs')}
                      />
                    </div>
                  )}

                  {/* Authentication */}
                  <div>
                    <Label className={rt('text-gray-700', 'text-zinc-300')}>Authentication</Label>
                    <Select value={colConfig.auth?.type || 'none'} onValueChange={v => setColConfig(prev => ({ ...prev, auth: { ...prev.auth, type: v } }))}>
                      <SelectTrigger className={`h-8 text-xs ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={rt('', 'bg-zinc-800 border-zinc-700')}>
                        <SelectItem value="none" className={rt('', 'text-white hover:bg-zinc-700')}>None</SelectItem>
                        <SelectItem value="bearer" className={rt('', 'text-white hover:bg-zinc-700')}>Bearer Token</SelectItem>
                        <SelectItem value="basic" className={rt('', 'text-white hover:bg-zinc-700')}>Basic Auth</SelectItem>
                      </SelectContent>
                    </Select>
                    {colConfig.auth?.type === 'bearer' && (
                      <Input
                        value={colConfig.auth?.token || ''}
                        onChange={e => setColConfig(prev => ({ ...prev, auth: { ...prev.auth, token: e.target.value } }))}
                        placeholder="Bearer token"
                        type="password"
                        className={`mt-1.5 h-8 text-xs ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`}
                      />
                    )}
                    {colConfig.auth?.type === 'basic' && (
                      <div className="flex gap-1.5 mt-1.5">
                        <Input
                          value={colConfig.auth?.username || ''}
                          onChange={e => setColConfig(prev => ({ ...prev, auth: { ...prev.auth, username: e.target.value } }))}
                          placeholder="Username"
                          className={`h-8 text-xs flex-1 ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`}
                        />
                        <Input
                          value={colConfig.auth?.password || ''}
                          onChange={e => setColConfig(prev => ({ ...prev, auth: { ...prev.auth, password: e.target.value } }))}
                          placeholder="Password"
                          type="password"
                          className={`h-8 text-xs flex-1 ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`}
                        />
                      </div>
                    )}
                  </div>

                  {/* Output Path */}
                  <div>
                    <Label className={rt('text-gray-700', 'text-zinc-300')}>Output Path</Label>
                    <Input
                      value={colConfig.outputPath || ''}
                      onChange={e => setColConfig(prev => ({ ...prev, outputPath: e.target.value }))}
                      placeholder="data.result.email"
                      className={`h-8 text-xs font-mono ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`}
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">Use dot notation to extract nested values from the JSON response</p>
                  </div>

                  {/* Test Request */}
                  <div>
                    <button
                      onClick={async () => {
                        if (!colConfig.url) { toast.error('Enter a URL first'); return; }
                        const firstRow = rows[0];
                        if (!firstRow) { toast.error('No rows to test with'); return; }
                        setHttpTestResult({ loading: true });
                        try {
                          const url = replaceColumnRefs(colConfig.url, firstRow.id);
                          const method = colConfig.method || 'GET';
                          const headers = {};
                          for (const h of (colConfig.headers || [])) {
                            if (h.key) headers[replaceColumnRefs(h.key, firstRow.id)] = replaceColumnRefs(h.value, firstRow.id);
                          }
                          if (colConfig.auth?.type === 'bearer' && colConfig.auth.token) headers['Authorization'] = `Bearer ${colConfig.auth.token}`;
                          else if (colConfig.auth?.type === 'basic' && colConfig.auth.username) headers['Authorization'] = `Basic ${btoa(`${colConfig.auth.username}:${colConfig.auth.password || ''}`)}`;
                          const opts = { method, headers };
                          if ((method === 'POST' || method === 'PUT') && colConfig.body) {
                            opts.body = replaceColumnRefs(colConfig.body, firstRow.id);
                            if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
                          }
                          const resp = await fetch(url, opts);
                          const text = await resp.text();
                          let parsed;
                          try { parsed = JSON.parse(text); } catch { parsed = text; }
                          let extracted = parsed;
                          if (colConfig.outputPath && typeof parsed === 'object') extracted = extractNestedValue(parsed, colConfig.outputPath);
                          setHttpTestResult({ loading: false, status: resp.status, data: parsed, extracted });
                        } catch (err) {
                          setHttpTestResult({ loading: false, error: err.message });
                        }
                      }}
                      disabled={httpTestResult?.loading}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${rt('border-gray-200 text-gray-600 hover:bg-gray-50', 'border-zinc-700 text-zinc-400 hover:bg-zinc-800')}`}
                    >
                      {httpTestResult?.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      Test Request (Row 1)
                    </button>
                    {httpTestResult && !httpTestResult.loading && (
                      <div className={`mt-2 p-2 rounded-lg text-xs font-mono max-h-32 overflow-auto ${httpTestResult.error ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-zinc-800/50 border border-zinc-700 text-zinc-300'}`}>
                        {httpTestResult.error ? (
                          <span>Error: {httpTestResult.error}</span>
                        ) : (
                          <div>
                            <div className="text-zinc-500 mb-1">Status: {httpTestResult.status}</div>
                            {colConfig.outputPath && (
                              <div className="mb-1"><span className="text-emerald-400">Extracted:</span> {JSON.stringify(httpTestResult.extracted, null, 2)}</div>
                            )}
                            <div className="text-zinc-500">Full: {JSON.stringify(httpTestResult.data, null, 2).slice(0, 500)}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Security note */}
                  <div className={`flex items-start gap-2 p-2 rounded-lg text-[10px] ${rt('bg-amber-50 text-amber-700', 'bg-amber-500/5 text-amber-400/80')}`}>
                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>API credentials are stored in your workspace. Use environment variables for sensitive tokens when possible.</span>
                  </div>
                </div>
              )}

              {colType === 'merge' && (
                <div className="space-y-3">
                  {/* Source columns */}
                  <div>
                    <Label className={rt('text-gray-700', 'text-zinc-300')}>Source Columns</Label>
                    <p className={`text-[10px] ${rt('text-gray-500', 'text-zinc-500')} mb-2`}>Select columns to merge. Drag to reorder.</p>
                    {/* Selected columns as draggable badges */}
                    <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                      {(colConfig.source_columns || []).map((cid, idx) => {
                        const srcCol = columns.find(c => c.id === cid);
                        if (!srcCol) return null;
                        return (
                          <span
                            key={cid}
                            draggable
                            onDragStart={e => e.dataTransfer.setData('mergeIdx', String(idx))}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => {
                              const fromIdx = parseInt(e.dataTransfer.getData('mergeIdx'));
                              if (isNaN(fromIdx)) return;
                              setColConfig(prev => {
                                const arr = [...(prev.source_columns || [])];
                                const [item] = arr.splice(fromIdx, 1);
                                arr.splice(idx, 0, item);
                                return { ...prev, source_columns: arr };
                              });
                            }}
                            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full cursor-grab active:cursor-grabbing ${rt('bg-indigo-50 text-indigo-700 border border-indigo-200', 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30')}`}
                          >
                            <GripVertical className="w-2.5 h-2.5 opacity-50" />
                            {srcCol.name}
                            <button onClick={() => setColConfig(prev => ({ ...prev, source_columns: prev.source_columns.filter(id => id !== cid) }))} className="hover:text-red-400"><X className="w-2.5 h-2.5" /></button>
                          </span>
                        );
                      })}
                      {(colConfig.source_columns || []).length === 0 && (
                        <span className="text-[10px] text-zinc-500 italic">No columns selected</span>
                      )}
                    </div>
                    {/* Available columns to add */}
                    <div className="flex flex-wrap gap-1.5">
                      {columns.filter(c => !(colConfig.source_columns || []).includes(c.id)).map(c => (
                        <button
                          key={c.id}
                          onClick={() => setColConfig(prev => ({ ...prev, source_columns: [...(prev.source_columns || []), c.id] }))}
                          className={`text-[10px] px-2 py-1 rounded-full border transition-all ${rt('border-gray-200 text-gray-500 hover:border-gray-400', 'border-zinc-700 text-zinc-500 hover:border-zinc-500')}`}
                        >
                          + {c.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Label className={rt('text-gray-700', 'text-zinc-300')}>Separator</Label>
                      <Input
                        value={colConfig.separator ?? ', '}
                        onChange={e => setColConfig(prev => ({ ...prev, separator: e.target.value }))}
                        placeholder=", "
                        className={`h-8 text-xs font-mono ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`}
                      />
                    </div>
                    <div className="flex-1">
                      <Label className={rt('text-gray-700', 'text-zinc-300')}>Output Format</Label>
                      <Select value={colConfig.output_format || 'plain'} onValueChange={v => setColConfig(prev => ({ ...prev, output_format: v }))}>
                        <SelectTrigger className={`h-8 text-xs ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`}><SelectValue /></SelectTrigger>
                        <SelectContent className={rt('', 'bg-zinc-800 border-zinc-700')}>
                          <SelectItem value="plain" className={rt('', 'text-white hover:bg-zinc-700')}>Plain text</SelectItem>
                          <SelectItem value="bulleted" className={rt('', 'text-white hover:bg-zinc-700')}>Bulleted list</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Empty handling */}
                  <div>
                    <Label className={rt('text-gray-700', 'text-zinc-300')}>Empty Values</Label>
                    <Select value={colConfig.empty_handling || 'skip'} onValueChange={v => setColConfig(prev => ({ ...prev, empty_handling: v }))}>
                      <SelectTrigger className={`h-8 text-xs ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`}><SelectValue /></SelectTrigger>
                      <SelectContent className={rt('', 'bg-zinc-800 border-zinc-700')}>
                        <SelectItem value="skip" className={rt('', 'text-white hover:bg-zinc-700')}>Skip empty</SelectItem>
                        <SelectItem value="include" className={rt('', 'text-white hover:bg-zinc-700')}>Include empty</SelectItem>
                        <SelectItem value="placeholder" className={rt('', 'text-white hover:bg-zinc-700')}>Use placeholder</SelectItem>
                      </SelectContent>
                    </Select>
                    {colConfig.empty_handling === 'placeholder' && (
                      <Input
                        value={colConfig.placeholder || ''}
                        onChange={e => setColConfig(prev => ({ ...prev, placeholder: e.target.value }))}
                        placeholder="e.g. N/A"
                        className={`mt-1.5 h-8 text-xs ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`}
                      />
                    )}
                  </div>

                  {/* Live preview */}
                  {(colConfig.source_columns || []).length > 0 && rows.length > 0 && (
                    <div>
                      <Label className={rt('text-gray-700', 'text-zinc-300')}>Preview (Row 1)</Label>
                      <div className={`mt-1 p-2 rounded-lg text-xs font-mono whitespace-pre-wrap ${rt('bg-gray-50 border border-gray-200 text-gray-700', 'bg-zinc-800/50 border border-zinc-700 text-zinc-300')}`}>
                        {(() => {
                          const srcVals = (colConfig.source_columns || []).map(cid => {
                            const srcCol = columns.find(c => c.id === cid);
                            if (!srcCol) return null;
                            return getCellRawValue(rows[0].id, srcCol);
                          });
                          const sep = colConfig.separator ?? ', ';
                          const eh = colConfig.empty_handling || 'skip';
                          const ph = colConfig.placeholder || '';
                          const processed = srcVals.map(v => {
                            if (!v && v !== 0) {
                              if (eh === 'skip') return null;
                              if (eh === 'placeholder') return ph;
                              return '';
                            }
                            return String(v);
                          }).filter(v => v !== null);
                          if (processed.length === 0) return <span className="text-zinc-500 italic">No values</span>;
                          if (colConfig.output_format === 'bulleted') return processed.map(v => `• ${v}`).join('\n');
                          return processed.join(sep);
                        })()}
                      </div>
                      {/* Template */}
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-zinc-500">
                        <span>Template:</span>
                        {(colConfig.source_columns || []).map((cid, i) => {
                          const srcCol = columns.find(c => c.id === cid);
                          return (
                            <span key={cid}>
                              {i > 0 && <span className="text-indigo-400 font-mono mx-0.5">{colConfig.output_format === 'bulleted' ? ' • ' : (colConfig.separator ?? ', ')}</span>}
                              <span className="text-indigo-400 font-mono">/{srcCol?.name || '?'}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {colType === 'waterfall' && (
                <div className="space-y-3">
                  <div>
                    <Label className={rt('text-gray-700', 'text-zinc-300')}>Enrichment Sources</Label>
                    <p className={`text-[10px] ${rt('text-gray-500', 'text-zinc-500')} mb-2`}>Sources are tried in order. If one fails or returns empty, the next source is tried.</p>
                    <div className="space-y-2">
                      {(colConfig.sources || []).map((src, idx) => (
                        <div key={src.id} className={`flex items-start gap-2 p-2.5 rounded-lg border ${rt('border-gray-200 bg-gray-50', 'border-zinc-700 bg-zinc-800/50')}`}>
                          <div className="flex items-center gap-1 pt-1">
                            <GripVertical className="w-3 h-3 text-zinc-500" />
                            <span className={`text-xs font-bold w-4 text-center ${rt('text-gray-400', 'text-zinc-500')}`}>{idx + 1}</span>
                          </div>
                          <div className="flex-1 space-y-2 min-w-0">
                            <Select value={src.function || ''} onValueChange={v => {
                              setColConfig(prev => ({
                                ...prev,
                                sources: prev.sources.map((s, i) => i === idx ? { ...s, function: v, output_field: '' } : s),
                              }));
                            }}>
                              <SelectTrigger className={`h-8 text-xs ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`}>
                                <SelectValue placeholder="Enrichment type..." />
                              </SelectTrigger>
                              <SelectContent className={rt('', 'bg-zinc-800 border-zinc-700')}>
                                {ENRICHMENT_FUNCTIONS.map(f => (
                                  <SelectItem key={f.value} value={f.value} className={rt('', 'text-white hover:bg-zinc-700')}>{f.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {(() => {
                              const srcFn = ENRICHMENT_FUNCTIONS.find(f => f.value === src.function);
                              return srcFn ? (
                                <Select value={src.input_column_id || ''} onValueChange={v => {
                                  setColConfig(prev => ({
                                    ...prev,
                                    sources: prev.sources.map((s, i) => i === idx ? { ...s, input_column_id: v } : s),
                                  }));
                                }}>
                                  <SelectTrigger className={`h-8 text-xs ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`}>
                                    <SelectValue placeholder={srcFn.inputLabel} />
                                  </SelectTrigger>
                                  <SelectContent className={rt('', 'bg-zinc-800 border-zinc-700')}>
                                    {columns.map(c => (
                                      <SelectItem key={c.id} value={c.id} className={rt('', 'text-white hover:bg-zinc-700')}>{c.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Select value={src.input_column_id || ''} onValueChange={v => {
                                  setColConfig(prev => ({
                                    ...prev,
                                    sources: prev.sources.map((s, i) => i === idx ? { ...s, input_column_id: v } : s),
                                  }));
                                }}>
                                  <SelectTrigger className={`h-8 text-xs ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`}>
                                    <SelectValue placeholder="Select input column" />
                                  </SelectTrigger>
                                  <SelectContent className={rt('', 'bg-zinc-800 border-zinc-700')}>
                                    {columns.map(c => (
                                      <SelectItem key={c.id} value={c.id} className={rt('', 'text-white hover:bg-zinc-700')}>{c.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              );
                            })()}
                            {(() => {
                              const srcOutputGroups = getOutputFieldsForFunction(src.function);
                              return srcOutputGroups.length > 0 ? (
                                <Select value={src.output_field || ''} onValueChange={v => {
                                  setColConfig(prev => ({
                                    ...prev,
                                    sources: prev.sources.map((s, i) => i === idx ? { ...s, output_field: v } : s),
                                  }));
                                }}>
                                  <SelectTrigger className={`h-8 text-xs ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`}>
                                    <SelectValue placeholder="Data to extract..." />
                                  </SelectTrigger>
                                  <SelectContent className={`${rt('', 'bg-zinc-800 border-zinc-700')} max-h-60`}>
                                    {srcOutputGroups.map(group => (
                                      <React.Fragment key={group.group}>
                                        <SelectItem value={`__group_${group.group}`} disabled className={`text-[10px] uppercase tracking-wide font-semibold ${rt('text-gray-400', 'text-zinc-500')} pointer-events-none`}>
                                          {group.group}
                                        </SelectItem>
                                        {group.fields.map(f => (
                                          <SelectItem key={f.value} value={f.value} className={rt('', 'text-white hover:bg-zinc-700')}>
                                            {f.label}
                                          </SelectItem>
                                        ))}
                                      </React.Fragment>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  value={src.output_field || ''}
                                  onChange={e => {
                                    setColConfig(prev => ({
                                      ...prev,
                                      sources: prev.sources.map((s, i) => i === idx ? { ...s, output_field: e.target.value } : s),
                                    }));
                                  }}
                                  placeholder="Data field to extract..."
                                  className={`h-8 text-xs ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`}
                                />
                              );
                            })()}
                          </div>
                          <button
                            onClick={() => setColConfig(prev => ({ ...prev, sources: prev.sources.filter((_, i) => i !== idx) }))}
                            className="p-1 rounded hover:bg-red-500/10 text-zinc-500 hover:text-red-400 mt-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        setColConfig(prev => ({
                          ...prev,
                          sources: [...(prev.sources || []), { id: crypto.randomUUID(), function: '', input_column_id: '', output_field: '', priority: (prev.sources || []).length }],
                        }));
                      }}
                      className={`mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${rt('border-gray-200 text-gray-600 hover:bg-gray-50', 'border-zinc-700 text-zinc-400 hover:bg-zinc-800')}`}
                    >
                      <Plus className="w-3 h-3" /> Add Source
                    </button>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={colConfig.stopOnSuccess !== false}
                      onChange={e => setColConfig(prev => ({ ...prev, stopOnSuccess: e.target.checked }))}
                      className="rounded border-zinc-600"
                    />
                    <span className={`text-xs ${rt('text-gray-700', 'text-zinc-300')}`}>Stop on first success</span>
                  </label>
                </div>
              )}

              {colType === 'push_to_table' && (
                <div className="space-y-3">
                  <div>
                    <Label className={rt('text-gray-700', 'text-zinc-300')}>Target Table</Label>
                    <Select value={colConfig.target_table_id || ''} onValueChange={async (val) => {
                      setColConfig(prev => ({ ...prev, target_table_id: val, column_mapping: {} }));
                      const { data } = await supabase.from('enrich_columns').select('*').eq('table_id', val).order('position');
                      setTargetTableCols(data || []);
                    }}>
                      <SelectTrigger className={rt('', 'bg-zinc-800 border-zinc-700')}><SelectValue placeholder="Select table" /></SelectTrigger>
                      <SelectContent>
                        {tables.filter(t => t.id !== activeTableId).map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {colConfig.target_table_id && targetTableCols.length > 0 && (
                    <div>
                      <Label className={rt('text-gray-700', 'text-zinc-300')}>Column Mapping</Label>
                      <div className="space-y-2 mt-1">
                        {columns.filter(c => c.type !== 'push_to_table' && c.type !== 'pull_from_table').map(col => (
                          <div key={col.id} className="flex items-center gap-2 text-xs">
                            <span className={`flex-1 truncate ${rt('text-gray-600', 'text-zinc-400')}`}>{col.name}</span>
                            <span className="text-zinc-600">&rarr;</span>
                            <Select value={colConfig.column_mapping?.[col.id] || '_skip'} onValueChange={(val) => setColConfig(prev => ({ ...prev, column_mapping: { ...prev.column_mapping, [col.id]: val } }))}>
                              <SelectTrigger className={`w-36 h-7 text-xs ${rt('', 'bg-zinc-800 border-zinc-700')}`}><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_skip">Skip</SelectItem>
                                {targetTableCols.map(tc => <SelectItem key={tc.id} value={tc.id}>{tc.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className={`text-[10px] ${rt('text-gray-400', 'text-zinc-600')}`}>Use "Push Selected" or "Push All" from the toolbar after creating this column.</p>
                </div>
              )}

              {colType === 'pull_from_table' && (
                <div className="space-y-3">
                  <div>
                    <Label className={rt('text-gray-700', 'text-zinc-300')}>Source Table</Label>
                    <Select value={colConfig.source_table_id || ''} onValueChange={async (val) => {
                      setColConfig(prev => ({ ...prev, source_table_id: val, match_column_id: '', value_column_id: '' }));
                      const { data } = await supabase.from('enrich_columns').select('*').eq('table_id', val).order('position');
                      setTargetTableCols(data || []);
                    }}>
                      <SelectTrigger className={rt('', 'bg-zinc-800 border-zinc-700')}><SelectValue placeholder="Select table" /></SelectTrigger>
                      <SelectContent>
                        {tables.filter(t => t.id !== activeTableId).map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {colConfig.source_table_id && (
                    <>
                      <div>
                        <Label className={rt('text-gray-700', 'text-zinc-300')}>Match Column (this table)</Label>
                        <Select value={colConfig.match_column_id || ''} onValueChange={(val) => setColConfig(prev => ({ ...prev, match_column_id: val }))}>
                          <SelectTrigger className={rt('', 'bg-zinc-800 border-zinc-700')}><SelectValue placeholder="Column to match on" /></SelectTrigger>
                          <SelectContent>
                            {columns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className={rt('text-gray-700', 'text-zinc-300')}>Match Column (source table)</Label>
                        <Select value={colConfig.source_match_column_id || ''} onValueChange={(val) => setColConfig(prev => ({ ...prev, source_match_column_id: val }))}>
                          <SelectTrigger className={rt('', 'bg-zinc-800 border-zinc-700')}><SelectValue placeholder="Column to match against" /></SelectTrigger>
                          <SelectContent>
                            {targetTableCols.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className={rt('text-gray-700', 'text-zinc-300')}>Value Column (to pull)</Label>
                        <Select value={colConfig.value_column_id || ''} onValueChange={(val) => setColConfig(prev => ({ ...prev, value_column_id: val }))}>
                          <SelectTrigger className={rt('', 'bg-zinc-800 border-zinc-700')}><SelectValue placeholder="Column to pull value from" /></SelectTrigger>
                          <SelectContent>
                            {targetTableCols.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                  <p className={`text-[10px] ${rt('text-gray-400', 'text-zinc-600')}`}>Works like VLOOKUP -- matches rows by a key column and pulls the value.</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setColDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddColumn} className="bg-indigo-600 hover:bg-indigo-700 text-white">Add Column</Button>
              </div>
            </div>
            </motion.div>
            </>
          )}
        </AnimatePresence>
        {/* History Panel */}
        <AnimatePresence>
          {historyPanelOpen && (
            <motion.div
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className={`fixed top-0 left-0 h-full w-[380px] z-40 flex flex-col shadow-2xl ${rt('bg-white border-r border-gray-200', 'bg-zinc-950 border-r border-zinc-800')}`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between px-4 py-3 border-b ${rt('border-gray-200', 'border-zinc-800')}`}>
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-400" />
                  <h3 className={`text-sm font-semibold ${rt('text-gray-900', 'text-white')}`}>History & Snapshots</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setSnapshotDialogOpen(true)} className={`p-1.5 rounded-lg transition-colors ${rt('hover:bg-gray-100 text-gray-600', 'hover:bg-zinc-800 text-zinc-400')}`} title="Create snapshot">
                    <Camera className="w-4 h-4" />
                  </button>
                  <button onClick={() => setHistoryPanelOpen(false)} className={`p-1.5 rounded-lg transition-colors ${rt('hover:bg-gray-100', 'hover:bg-zinc-800')}`}>
                    <X className={`w-4 h-4 ${rt('text-gray-500', 'text-zinc-400')}`} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* Snapshots section */}
                {snapshots.length > 0 && (
                  <div className={`px-4 py-3 border-b ${rt('border-gray-100', 'border-zinc-800/50')}`}>
                    <h4 className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${rt('text-gray-500', 'text-zinc-500')}`}>Snapshots</h4>
                    <div className="space-y-1.5">
                      {snapshots.map(snap => (
                        <div key={snap.id} className={`flex items-center gap-2 p-2 rounded-lg ${rt('bg-gray-50 hover:bg-gray-100', 'bg-zinc-900 hover:bg-zinc-800/80')} transition-colors group`}>
                          <BookmarkPlus className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs font-medium truncate ${rt('text-gray-800', 'text-zinc-200')}`}>{snap.name}</div>
                            {snap.description && <div className="text-[10px] text-zinc-500 truncate">{snap.description}</div>}
                            <div className="text-[10px] text-zinc-500">{relativeTime(snap.created_at)}</div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button onClick={() => restoreSnapshot(snap.id)} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20" title="Restore">
                              <RotateCcw className="w-3 h-3" />
                            </button>
                            <button onClick={() => deleteSnapshot(snap.id)} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20" title="Delete">
                              <Trash className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Create snapshot CTA when empty */}
                {snapshots.length === 0 && (
                  <div className={`px-4 py-3 border-b ${rt('border-gray-100', 'border-zinc-800/50')}`}>
                    <button onClick={() => setSnapshotDialogOpen(true)} className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed text-xs ${rt('border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600', 'border-zinc-700 text-zinc-500 hover:border-indigo-500/50 hover:text-indigo-400')} transition-colors`}>
                      <Camera className="w-3.5 h-3.5" /> Create your first snapshot
                    </button>
                  </div>
                )}

                {/* History entries */}
                <div className="px-4 py-3">
                  <h4 className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${rt('text-gray-500', 'text-zinc-500')}`}>Changes</h4>
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                    </div>
                  ) : historyEntries.length === 0 ? (
                    <div className={`text-center py-8 text-xs ${rt('text-gray-400', 'text-zinc-500')}`}>
                      No changes recorded yet
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {historyEntries.map(entry => {
                        const ActionIcon = HISTORY_ACTION_ICONS[entry.action_type] || Edit2;
                        const iconColor = HISTORY_ACTION_COLORS[entry.action_type] || 'text-zinc-400';
                        const isExpanded = expandedHistory[entry.id];
                        const hasDetails = entry.before_value || entry.after_value;
                        const canRevert = entry.action_type === 'edit_cell' || entry.action_type === 'delete_column' || entry.action_type === 'add_column';

                        return (
                          <div key={entry.id} className={`rounded-lg border transition-colors ${rt('border-gray-100 hover:border-gray-200', 'border-zinc-800/50 hover:border-zinc-700')}`}>
                            <div className="flex items-start gap-2 p-2.5 cursor-pointer" onClick={() => hasDetails && setExpandedHistory(prev => ({ ...prev, [entry.id]: !prev[entry.id] }))}>
                              <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${rt('bg-gray-100', 'bg-zinc-800')}`}>
                                <ActionIcon className={`w-3 h-3 ${iconColor}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs leading-snug ${rt('text-gray-700', 'text-zinc-300')}`}>{entry.description}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-zinc-500">{relativeTime(entry.created_at)}</span>
                                  {entry.group_id && <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/10 text-purple-400">batch</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {canRevert && (
                                  <button
                                    onClick={e => { e.stopPropagation(); revertChange(entry); }}
                                    className={`p-1 rounded transition-colors ${rt('hover:bg-gray-100 text-gray-400 hover:text-gray-600', 'hover:bg-zinc-800 text-zinc-600 hover:text-zinc-300')}`}
                                    title="Undo this change"
                                  >
                                    <Undo2 className="w-3 h-3" />
                                  </button>
                                )}
                                {hasDetails && (
                                  <ChevronRight className={`w-3 h-3 text-zinc-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                )}
                              </div>
                            </div>
                            {/* Expanded detail */}
                            {isExpanded && hasDetails && (
                              <div className={`px-2.5 pb-2.5 ml-8`}>
                                <div className={`rounded-md p-2 text-[11px] font-mono space-y-1 ${rt('bg-gray-50', 'bg-zinc-900')}`}>
                                  {entry.before_value && (
                                    <div className="flex gap-2">
                                      <span className="text-red-400 flex-shrink-0">−</span>
                                      <span className={rt('text-gray-600', 'text-zinc-400')}>{typeof entry.before_value === 'object' ? (entry.before_value.v ?? JSON.stringify(entry.before_value)) : String(entry.before_value)}</span>
                                    </div>
                                  )}
                                  {entry.after_value && (
                                    <div className="flex gap-2">
                                      <span className="text-green-400 flex-shrink-0">+</span>
                                      <span className={rt('text-gray-600', 'text-zinc-400')}>{typeof entry.after_value === 'object' ? (entry.after_value.v ?? JSON.stringify(entry.after_value)) : String(entry.after_value)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Snapshot Create Dialog */}
        <Dialog open={snapshotDialogOpen} onOpenChange={setSnapshotDialogOpen}>
          <DialogContent className={rt('bg-white max-w-sm', 'bg-zinc-900 border-zinc-800 max-w-sm')}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-400" />
                <span className={rt('text-gray-900', 'text-zinc-100')}>Create Snapshot</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label className={rt('text-gray-700', 'text-zinc-300')}>Name</Label>
                <Input value={snapshotName} onChange={e => setSnapshotName(e.target.value)} placeholder="e.g. Before enrichment run" className={rt('', 'bg-zinc-800 border-zinc-700 text-white')} />
              </div>
              <div>
                <Label className={rt('text-gray-700', 'text-zinc-300')}>Description (optional)</Label>
                <Textarea value={snapshotDesc} onChange={e => setSnapshotDesc(e.target.value)} placeholder="What state does this capture?" rows={2} className={rt('', 'bg-zinc-800 border-zinc-700 text-white')} />
              </div>
              <div className={`rounded-lg p-2.5 ${rt('bg-gray-50', 'bg-zinc-800/50')}`}>
                <p className="text-[11px] text-zinc-500">This will save the current state: {columns.length} columns, {rows.length} rows, {Object.keys(cells).length} cells</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setSnapshotDialogOpen(false)} className={`px-3 py-1.5 rounded-lg text-sm ${rt('text-gray-600 hover:bg-gray-100', 'text-zinc-400 hover:bg-zinc-800')}`}>Cancel</button>
              <button onClick={createSnapshot} disabled={!snapshotName.trim()} className={`px-3 py-1.5 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40`}>Create Snapshot</button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Save View Dialog */}
        <Dialog open={viewSaveDialogOpen} onOpenChange={setViewSaveDialogOpen}>
          <DialogContent className={rt('bg-white max-w-sm', 'bg-zinc-900 border-zinc-800 max-w-sm')}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-400" />
                <span className={rt('text-gray-900', 'text-zinc-100')}>Save View</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label className={rt('text-gray-700', 'text-zinc-300')}>View name</Label>
                <Input
                  value={viewSaveName}
                  onChange={e => setViewSaveName(e.target.value)}
                  placeholder="e.g. Enriched Only, Missing Emails"
                  className={rt('', 'bg-zinc-800 border-zinc-700 text-white')}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter' && viewSaveName.trim()) { saveView(viewSaveName.trim()); setViewSaveDialogOpen(false); }}}
                />
              </div>
              <div className={`rounded-lg p-2.5 ${rt('bg-gray-50', 'bg-zinc-800/50')}`}>
                <p className="text-[11px] text-zinc-500">
                  Saves: {filters.length > 0 ? `${filters.length} filter${filters.length > 1 ? 's' : ''}` : 'no filters'}
                  {sorts.length > 0 ? `, ${sorts.length} sort${sorts.length > 1 ? 's' : ''}` : ''}
                  {searchInput ? `, search "${searchInput}"` : ''}
                  , column order & widths
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setViewSaveDialogOpen(false)} className={`px-3 py-1.5 rounded-lg text-sm ${rt('text-gray-600 hover:bg-gray-100', 'text-zinc-400 hover:bg-zinc-800')}`}>Cancel</button>
              <button
                onClick={() => { saveView(viewSaveName.trim()); setViewSaveDialogOpen(false); }}
                disabled={!viewSaveName.trim()}
                className="px-3 py-1.5 rounded-lg text-sm bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40"
              >
                Save View
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* AI Chat Floating Button */}
        <button
          onClick={() => { setChatOpen(prev => !prev); setTimeout(() => chatInputRef.current?.focus(), 100); }}
          className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${
            chatOpen
              ? rt('bg-gray-200 text-gray-600', 'bg-zinc-700 text-zinc-300')
              : 'hover:shadow-xl hover:scale-105'
          }`}
        >
          {chatOpen ? <X className="w-5 h-5" /> : (
            <SyncAvatarMini size={48} state="idle" />
          )}
        </button>

        {/* AI Chat Panel */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[420px] z-40 flex flex-col shadow-2xl bg-zinc-950 border-l border-zinc-800"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3c-1.2 0-2.4.6-3 1.7A3.6 3.6 0 0 0 4.6 9c-1 .6-1.7 1.8-1.7 3s.7 2.4 1.7 3c-.3 1.2 0 2.5.9 3.4.8.8 2.1 1.2 3.3.9.6 1 1.8 1.7 3 1.7s2.4-.6 3-1.7c1.2.3 2.5 0 3.4-.9.8-.8 1.2-2.1.9-3.3 1-1 1.7-1.8 1.7-3s-.7-2.4-1.7-3c.3-1.2 0-2.5-.9-3.4-.8-.8-2.1-1.2-3.3-.9A3.6 3.6 0 0 0 12 3Z" />
                      <circle cx="12" cy="12" r="2" fill="currentColor" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Sync</h3>
                    <p className="text-[10px] text-zinc-500">Your AI workspace assistant</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={clearChat} title="Clear conversation" className="p-1.5 rounded-lg transition-colors hover:bg-zinc-800 text-zinc-500">
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setChatOpen(false)} className="p-1.5 rounded-lg transition-colors hover:bg-zinc-800 text-zinc-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3c-1.2 0-2.4.6-3 1.7A3.6 3.6 0 0 0 4.6 9c-1 .6-1.7 1.8-1.7 3s.7 2.4 1.7 3c-.3 1.2 0 2.5.9 3.4.8.8 2.1 1.2 3.3.9.6 1 1.8 1.7 3 1.7s2.4-.6 3-1.7c1.2.3 2.5 0 3.4-.9.8-.8 1.2-2.1.9-3.3 1-1 1.7-1.8 1.7-3s-.7-2.4-1.7-3c.3-1.2 0-2.5-.9-3.4-.8-.8-2.1-1.2-3.3-.9A3.6 3.6 0 0 0 12 3Z" />
                        <circle cx="12" cy="12" r="2" fill="currentColor" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-medium mb-1 text-white">Hi, I'm Sync</h4>
                    <p className="text-xs mb-4 text-zinc-500">Your AI workspace assistant. I can help you build and configure enrichments.</p>
                    <div className="space-y-2">
                      {CHAT_QUICK_PROMPTS.map((qp, i) => (
                        <button
                          key={i}
                          onClick={() => sendChatMessage(qp.prompt)}
                          className="w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all truncate bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
                          title={qp.prompt}
                        >
                          <span className="text-purple-400 mr-1">→</span> {qp.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-zinc-900 text-zinc-200'
                    }`}>
                      {/* Render message with basic markdown */}
                      <div className="whitespace-pre-wrap break-words">
                        {msg.content.split('```').map((block, bi) => {
                          if (bi % 2 === 1) {
                            const lines = block.split('\n');
                            const lang = lines[0];
                            const code = lang === 'action' ? lines.slice(1).join('\n') : block;
                            if (lang === 'action') return null;
                            return <pre key={bi} className="my-1.5 p-2 rounded text-[10px] font-mono overflow-x-auto bg-zinc-800">{code}</pre>;
                          }
                          // Handle **bold** in text blocks
                          const parts = block.split(/\*\*(.*?)\*\*/g);
                          return <span key={bi}>{parts.map((p, pi) => pi % 2 === 1 ? <strong key={pi} className="font-semibold">{p}</strong> : p)}</span>;
                        })}
                      </div>
                      {/* Action button */}
                      {msg.action && (
                        <button
                          onClick={() => applyChatAction(msg.action)}
                          className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-purple-500 text-white hover:bg-purple-600 transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          Apply: {msg.action.type === 'add_column' ? `Add "${msg.action.name}"` : msg.action.type === 'add_filter' ? 'Apply Filter' : 'Apply'}
                        </button>
                      )}
                      {/* Campaign suggestion buttons */}
                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {msg.suggestions.map(s => {
                            const SIcon = s.icon;
                            return (
                              <button
                                key={s.id}
                                onClick={() => {
                                  setColType(s.colConfig.type);
                                  setColName(s.colConfig.name);
                                  setColConfig({});
                                  setColDialogOpen(true);
                                  // Add a user-style message to the chat
                                  setChatMessages(prev => [...prev, { role: 'user', content: `Add ${s.label.replace('Add ', '')} column`, timestamp: Date.now() }]);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-400/50 hover:bg-indigo-500/20 text-left transition-all group"
                              >
                                <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                  <SIcon className="w-3 h-3 text-indigo-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[11px] font-medium text-indigo-300 group-hover:text-indigo-200">{s.label}</div>
                                  <div className="text-[10px] text-zinc-500 truncate">{s.desc}</div>
                                </div>
                                <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-indigo-400 flex-shrink-0" />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl px-3 py-2 bg-zinc-900">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Quick prompts when conversation exists */}
              {chatMessages.length > 0 && (
                <div className="px-4 py-2 flex gap-1.5 overflow-x-auto border-t border-zinc-800/50">
                  {CHAT_QUICK_PROMPTS.map((qp, i) => (
                    <button
                      key={i}
                      onClick={() => sendChatMessage(qp.prompt)}
                      className="flex-shrink-0 text-[10px] px-2.5 py-1 rounded-full border transition-all border-zinc-800 text-zinc-500 hover:bg-zinc-900"
                    >
                      {qp.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="px-4 py-3 border-t border-zinc-800">
                <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-zinc-900 border border-zinc-800">
                  <input
                    ref={chatInputRef}
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(chatInput); } }}
                    placeholder="Ask Sync anything..."
                    disabled={chatLoading}
                    className="flex-1 bg-transparent outline-none text-xs text-white placeholder:text-zinc-600"
                  />
                  <button
                    onClick={() => sendChatMessage(chatInput)}
                    disabled={!chatInput.trim() || chatLoading}
                    className={`p-1.5 rounded-lg transition-colors ${chatInput.trim() ? 'bg-purple-500 text-white hover:bg-purple-600' : 'text-zinc-700'}`}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GrowthPageTransition>
  );
}
