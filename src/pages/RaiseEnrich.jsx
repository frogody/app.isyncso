import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Plus, Search, ArrowLeft, MoreHorizontal, Play, Download,
  GripVertical, Type, Zap, Brain, FunctionSquare, Columns3, Trash2,
  Edit2, Settings, ChevronDown, Check, X, Loader2, AlertCircle,
  Table2, Clock, Hash, Upload, FileUp, Database, Pencil, Filter, XCircle,
  ArrowUp, ArrowDown, ArrowUpDown, ToggleLeft, ToggleRight, Layers, Globe,
  Calendar, DollarSign, Link, Mail, CheckSquare, ListOrdered, Merge, Send, Bot, Trash,
  FlaskConical, ShieldAlert, RotateCcw
} from 'lucide-react';
import {
  RaiseCard, RaiseCardContent, RaiseCardHeader, RaiseCardTitle,
  RaiseButton, RaiseBadge, RaiseEmptyState,
} from '@/components/raise/ui';
import { MOTION_VARIANTS } from '@/tokens/raise';
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
import { RaisePageTransition } from '@/components/raise/RaisePageTransition';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { useUser } from '@/components/context/UserContext';
import { usePermissions } from '@/components/context/PermissionContext';
import {
  fullEnrichFromLinkedIn, fullEnrichFromEmail, enrichCompanyOnly,
  matchProspect, enrichProspectContact, enrichProspectProfile,
} from '@/lib/explorium-api';

// ─── Constants ───────────────────────────────────────────────────────────────

const ROW_HEIGHT = 40;
const ROW_NUM_WIDTH = 50;
const DEFAULT_COL_WIDTH = 180;
const MIN_COL_WIDTH = 80;
const VISIBLE_BUFFER = 10;
const ENRICHMENT_BATCH_SIZE = 5;

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
  { value: 'fullEnrichFromLinkedIn', label: 'Full Enrich (LinkedIn)', inputType: 'linkedin', desc: 'Full profile + company data from LinkedIn URL' },
  { value: 'fullEnrichFromEmail', label: 'Full Enrich (Email)', inputType: 'email', desc: 'Full profile + company data from email address' },
  { value: 'enrichCompanyOnly', label: 'Company Enrich', inputType: 'company', desc: 'Company data only (no person info)' },
  { value: 'matchProspect', label: 'Match Prospect', inputType: 'multi', desc: 'Find matching prospect by name/company' },
  { value: 'enrichProspectContact', label: 'Prospect Contact', inputType: 'prospect_id', desc: 'Get contact details (email, phone)' },
  { value: 'enrichProspectProfile', label: 'Prospect Profile', inputType: 'prospect_id', desc: 'Get professional profile data' },
];

const COLUMN_TYPES = [
  { value: 'field', label: 'Field', icon: Type, desc: 'Map a field from source data' },
  { value: 'enrichment', label: 'Enrichment', icon: Zap, desc: 'Enrich with Explorium API' },
  { value: 'ai', label: 'AI', icon: Brain, desc: 'AI-generated content' },
  { value: 'formula', label: 'Formula', icon: FunctionSquare, desc: 'Calculated value' },
  { value: 'waterfall', label: 'Waterfall', icon: Layers, desc: 'Try multiple sources in order' },
  { value: 'http', label: 'HTTP API', icon: Globe, desc: 'Call custom API endpoints' },
  { value: 'merge', label: 'Merge', icon: Merge, desc: 'Combine multiple columns' },
];

const COLUMN_TYPE_ICONS = { field: Type, enrichment: Zap, ai: Brain, formula: FunctionSquare, waterfall: Layers, http: Globe, merge: Merge };

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
  { id: 'summarize', label: 'Summarize', prompt: 'Summarize the following in 1-2 sentences:', icon: '📝' },
  { id: 'extract_emails', label: 'Extract emails', prompt: 'Extract all email addresses from the following text. Return only the emails, one per line:', icon: '📧' },
  { id: 'categorize', label: 'Categorize', prompt: 'Categorize the following into one of these categories: [define categories]. Return only the category name:', icon: '🏷️' },
  { id: 'sentiment', label: 'Sentiment', prompt: 'Analyze the sentiment of the following text. Return only: Positive, Negative, or Neutral:', icon: '😊' },
  { id: 'translate', label: 'Translate', prompt: 'Translate the following to English. Return only the translation:', icon: '🌍' },
  { id: 'extract_data', label: 'Extract data', prompt: 'Extract the key information from the following and return as JSON with relevant fields:', icon: '🔍' },
  { id: 'clean', label: 'Clean/Format', prompt: 'Clean and format the following data. Fix typos, standardize formatting:', icon: '✨' },
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

// ─── Main Component ──────────────────────────────────────────────────────────

export default function RaiseEnrich() {
  const { theme, toggleTheme, rt } = useTheme();
  const { user } = useUser();
  const { hasPermission } = usePermissions();

  const orgId = user?.company_id || user?.organization_id;

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
  const [slashMenu, setSlashMenu] = useState({ open: false, field: null, caretPos: 0, filter: '' });
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
        setSlashMenu({ open: true, field, caretPos: pos, filter: partial.toLowerCase() });
        return;
      }
    }
    setSlashMenu(prev => prev.open ? { ...prev, open: false } : prev);
  }, []);

  const insertColumnRef = useCallback((colName) => {
    const field = slashMenu.field;
    const ref = field === 'prompt' ? promptRef.current : formulaRef.current;
    if (!ref) return;
    const val = ref.value;
    const pos = slashMenu.caretPos;
    const before = val.slice(0, pos);
    const slashIdx = before.lastIndexOf('/');
    const newVal = val.slice(0, slashIdx) + '/' + colName + val.slice(pos);
    if (field === 'prompt') {
      setColConfig(prev => ({ ...prev, prompt: newVal }));
    } else {
      setColConfig({ expression: newVal });
    }
    setSlashMenu({ open: false, field: null, caretPos: 0, filter: '' });
    // Re-focus after React re-render
    setTimeout(() => {
      if (ref) {
        const newPos = slashIdx + 1 + colName.length;
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
  const [sandboxMode, setSandboxMode] = useState(false);
  const [sandboxCells, setSandboxCells] = useState({});
  const [sandboxExportWarn, setSandboxExportWarn] = useState(false);

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

  // ─── Load workspaces ───────────────────────────────────────────────────

  const loadWorkspaces = useCallback(async () => {
    if (!orgId) return;
    setWorkspacesLoading(true);
    try {
      const { data, error } = await supabase
        .from('enrich_workspaces')
        .select('*, enrich_columns(count), enrich_rows(count)')
        .eq('organization_id', orgId)
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

  // ─── Load nests for picker ─────────────────────────────────────────────

  const loadNests = useCallback(async () => {
    if (!orgId) return;
    setNestsLoading(true);
    try {
      // Get nests the org has purchased
      const { data: purchases } = await supabase
        .from('nest_purchases')
        .select('nest_id')
        .eq('organization_id', orgId)
        .eq('status', 'completed');
      const purchasedNestIds = (purchases || []).map(p => p.nest_id);

      let query = supabase.from('nests').select('id, name, item_count').order('created_at', { ascending: false });
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
        })
        .select()
        .single();
      if (error) throw error;
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

  // ─── Load workspace detail ─────────────────────────────────────────────

  const loadWorkspaceDetail = useCallback(async (wsId) => {
    setWsLoading(true);
    try {
      // Fetch workspace
      const { data: ws, error: wsErr } = await supabase
        .from('enrich_workspaces')
        .select('*')
        .eq('id', wsId)
        .single();
      if (wsErr) throw wsErr;
      setWorkspace(ws);
      setWsName(ws.name);
      setAutoRun(ws.auto_run === true);

      // Fetch columns
      const { data: cols, error: colErr } = await supabase
        .from('enrich_columns')
        .select('*')
        .eq('workspace_id', wsId)
        .order('position', { ascending: true });
      if (colErr) throw colErr;
      setColumns(cols || []);

      // Fetch rows
      const { data: rws, error: rwErr } = await supabase
        .from('enrich_rows')
        .select('*')
        .eq('workspace_id', wsId)
        .order('position', { ascending: true });
      if (rwErr) throw rwErr;
      setRows(rws || []);

      // Fetch all cells for these rows
      if (rws?.length && cols?.length) {
        const rowIds = rws.map(r => r.id);
        const { data: cellData, error: cellErr } = await supabase
          .from('enrich_cells')
          .select('*')
          .in('row_id', rowIds);
        if (cellErr) throw cellErr;
        const cellMap = {};
        (cellData || []).forEach(c => {
          cellMap[`${c.row_id}:${c.column_id}`] = c;
        });
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
  }, []);

  useEffect(() => {
    if (activeWorkspaceId) loadWorkspaceDetail(activeWorkspaceId);
  }, [activeWorkspaceId, loadWorkspaceDetail]);

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
      loadWorkspaceDetail(activeWorkspaceId);
    } catch (err) {
      toast.dismiss(loadingToast);
      console.error('CSV import error:', err);
      toast.error(`Failed to import CSV: ${err.message}`);
    }
  }, [activeWorkspaceId, parseCSV, parseCSVRows, loadWorkspaceDetail]);

  // ─── Add column ────────────────────────────────────────────────────────

  const handleAddColumn = useCallback(async () => {
    if (!colName.trim()) { toast.error('Enter a column name'); return; }
    try {
      const pos = columns.length;
      const { error } = await supabase.from('enrich_columns').insert({
        workspace_id: activeWorkspaceId,
        name: colName.trim(),
        type: colType,
        position: pos,
        config: colConfig,
        width: DEFAULT_COL_WIDTH,
      });
      if (error) throw error;
      toast.success('Column added');
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
  }, [colName, colType, colConfig, columns.length, activeWorkspaceId, loadWorkspaceDetail]);

  // ─── Delete column ─────────────────────────────────────────────────────

  const deleteColumn = useCallback(async (colId) => {
    const col = columns.find(c => c.id === colId);
    if (!window.confirm(`Delete column "${col?.name || 'Untitled'}" and all its data?`)) return;
    try {
      await supabase.from('enrich_cells').delete().eq('column_id', colId);
      await supabase.from('enrich_columns').delete().eq('id', colId);
      toast.success('Column deleted');
      loadWorkspaceDetail(activeWorkspaceId);
    } catch (err) {
      console.error('Error deleting column:', err);
      toast.error('Failed to delete column');
    }
  }, [activeWorkspaceId, loadWorkspaceDetail, columns]);

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
    } catch (err) {
      console.error('Error saving cell:', err);
      toast.error('Failed to save cell');
    }
  }, [cells, cellKey]);

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
      if (of.includes('revenue')) return { v: `$${pick([1, 5, 12, 25, 50, 100])}M` };
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

    const total = rows.length;
    let completed = 0;
    let errors = 0;
    const toastId = toast.loading(`Running ${col.name}: 0/${total}`);

    // Process in batches
    for (let i = 0; i < rows.length; i += ENRICHMENT_BATCH_SIZE) {
      const batch = rows.slice(i, i + ENRICHMENT_BATCH_SIZE);
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
            result = await fn({ linkedin: inputValue });
          } else if (fnName === 'enrichProspectContact' || fnName === 'enrichProspectProfile') {
            result = await fn(inputValue);
          } else {
            result = await fn(inputValue);
          }

          // Extract output field
          let displayValue = result;
          if (outputField && result) {
            displayValue = extractNestedValue(result, outputField);
          }
          const cellValue = displayValue != null ? (typeof displayValue === 'object' ? displayValue : { v: String(displayValue) }) : { v: '' };

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
  }, [columns, rows, cells, cellKey, getCellRawValue]);

  // ─── Run AI column (placeholder) ───────────────────────────────────────

  const runAIColumn = useCallback(async (col) => {
    if (col.type !== 'ai') return;
    const cfg = col.config || {};
    const promptTemplate = cfg.prompt;
    if (!promptTemplate) { toast.error('No prompt configured for AI column'); return; }

    const model = cfg.model || 'moonshotai/Kimi-K2-Instruct';
    const temperature = cfg.temperature ?? 0.7;
    const maxTokens = cfg.max_tokens || 500;
    const systemPrompt = cfg.system_prompt || '';
    const outputFormat = cfg.output_format || 'text';
    const outputPath = cfg.output_path || '';
    const batchSize = cfg.batch_size || 5;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co';
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4';

    let formatInstruction = '';
    if (outputFormat === 'json') formatInstruction = '\n\nRespond ONLY with valid JSON. No other text.';
    else if (outputFormat === 'list') formatInstruction = '\n\nRespond with a list, one item per line. No numbering or bullets.';
    else formatInstruction = '\n\nRespond concisely with plain text only.';

    const total = rows.length;
    let completed = 0;
    let errors = 0;
    const toastId = toast.loading(`Running ${col.name}: 0/${total}`);

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      await Promise.all(batch.map(async (row) => {
        const key = cellKey(row.id, col.id);
        try {
          setCells(prev => ({ ...prev, [key]: { ...prev[key], status: 'pending' } }));
          await supabase.from('enrich_cells').upsert({ row_id: row.id, column_id: col.id, status: 'pending', value: null }, { onConflict: 'row_id,column_id' });

          // Build prompt with column refs replaced
          const filledPrompt = replaceColumnRefs(promptTemplate, row.id);
          if (!filledPrompt.trim()) { completed++; return; }

          const messages = [];
          if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
          messages.push({ role: 'user', content: filledPrompt + formatInstruction });

          // Call raise-chat edge function
          let retries = 0;
          let result = null;
          while (retries < 3) {
            try {
              const resp = await fetch(`${supabaseUrl}/functions/v1/raise-chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
                body: JSON.stringify({ messages, model, temperature, max_tokens: maxTokens }),
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
  }, [columns, rows, cells, cellKey, replaceColumnRefs]);

  // ─── Run waterfall column ─────────────────────────────────────────────

  const runWaterfallColumn = useCallback(async (col) => {
    if (col.type !== 'waterfall') return;
    const sources = (col.config?.sources || []).sort((a, b) => (a.priority || 0) - (b.priority || 0));
    const stopOnSuccess = col.config?.stopOnSuccess !== false;
    if (sources.length === 0) { toast.error('No sources configured for waterfall'); return; }

    const total = rows.length;
    let completed = 0;
    let errors = 0;
    const toastId = toast.loading(`Running ${col.name}: 0/${total}`);

    for (let i = 0; i < rows.length; i += ENRICHMENT_BATCH_SIZE) {
      const batch = rows.slice(i, i + ENRICHMENT_BATCH_SIZE);
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
              else if (fnName === 'matchProspect') result = await fn({ linkedin: inputValue });
              else result = await fn(inputValue);

              let displayValue = result;
              if (source.output_field && result) displayValue = extractNestedValue(result, source.output_field);

              if (displayValue != null && displayValue !== '' && displayValue !== undefined) {
                finalValue = typeof displayValue === 'object' ? displayValue : { v: String(displayValue) };
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
  }, [columns, rows, cells, cellKey, getCellRawValue]);

  // ─── HTTP column ref replacer ─────────────────────────────────────────

  const replaceColumnRefs = useCallback((template, rowId) => {
    if (!template) return template;
    return template.replace(/\/([A-Za-z0-9_ -]+)/g, (match, colName) => {
      const col = columns.find(c => c.name === colName);
      if (!col) return match;
      return getCellRawValue(rowId, col) || '';
    });
  }, [columns, getCellRawValue]);

  // ─── Run HTTP column ────────────────────────────────────────────────

  const runHTTPColumn = useCallback(async (col) => {
    if (col.type !== 'http') return;
    const cfg = col.config || {};
    if (!cfg.url) { toast.error('No URL configured'); return; }

    const total = rows.length;
    let completed = 0;
    let errors = 0;
    const toastId = toast.loading(`Running ${col.name}: 0/${total}`);

    for (let i = 0; i < rows.length; i += ENRICHMENT_BATCH_SIZE) {
      const batch = rows.slice(i, i + ENRICHMENT_BATCH_SIZE);
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
  }, [columns, rows, cells, cellKey, replaceColumnRefs]);

  // ─── Run all columns ───────────────────────────────────────────────────

  const runAllColumns = useCallback(async () => {
    if (sandboxMode) {
      for (const col of columns) {
        if (col.type === 'enrichment' || col.type === 'ai' || col.type === 'waterfall' || col.type === 'http') {
          await runSandboxColumn(col);
        }
      }
      return;
    }
    for (const col of columns) {
      if (col.type === 'enrichment') await runEnrichmentColumn(col);
      else if (col.type === 'ai') await runAIColumn(col);
      else if (col.type === 'waterfall') await runWaterfallColumn(col);
      else if (col.type === 'http') await runHTTPColumn(col);
    }
  }, [columns, sandboxMode, runSandboxColumn, runEnrichmentColumn, runAIColumn, runWaterfallColumn, runHTTPColumn]);

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

  const exportCSV = useCallback(() => {
    // Warn if sandbox data present
    if (sandboxMode && Object.keys(sandboxCells).length > 0) {
      setSandboxExportWarn(true);
      return;
    }
    doExportCSV();
  }, [sandboxMode, sandboxCells]);

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
        <mark key={`m${pos}`} className="bg-orange-400/30 text-inherit rounded-sm px-px">{str.slice(pos, pos + term.length)}</mark>
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
      const systemPrompt = `You are Sculptor, an AI assistant for the RaiseEnrich data enrichment workspace. You help users build and configure their enrichment table.

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

  const applyChatAction = useCallback(async (action) => {
    try {
      if (action.type === 'add_column') {
        const pos = columns.length;
        const { error } = await supabase.from('enrich_columns').insert({
          workspace_id: activeWorkspaceId,
          name: action.name,
          type: action.column_type,
          position: pos,
          config: action.config || {},
          width: DEFAULT_COL_WIDTH,
        });
        if (error) throw error;
        toast.success(`Column "${action.name}" added`);
        loadWorkspaceDetail(activeWorkspaceId);
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
  }, [columns, activeWorkspaceId, loadWorkspaceDetail]);

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
      <RaisePageTransition>
        <div className={rt('min-h-screen bg-gray-50', 'min-h-screen bg-black')}>
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="text-center py-20">
              <AlertCircle className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-white mb-2">Access Denied</h2>
              <p className="text-zinc-400 text-sm">You do not have permission to view this page.</p>
            </div>
          </div>
        </div>
      </RaisePageTransition>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: Workspace List
  // ═══════════════════════════════════════════════════════════════════════

  if (!activeWorkspaceId) {
    return (
      <RaisePageTransition>
        <div className={rt('min-h-screen bg-gray-50', 'min-h-screen bg-black')}>
          <div className="max-w-7xl mx-auto px-6 py-6">
            <PageHeader
              title="Enrich"
              subtitle="Clay-like enrichment workspaces for your candidate data"
              icon={Sparkles}
              color="orange"
              actions={
                <RaiseButton onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-1.5" /> New Workspace
                </RaiseButton>
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
                <RaiseEmptyState
                  icon={<Table2 className="w-6 h-6" />}
                  title="No workspaces yet"
                  message="Create your first enrichment workspace to start enriching candidate data"
                  action={{ label: 'Create Workspace', onClick: () => setCreateDialogOpen(true) }}
                />
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
                          'p-5 rounded-2xl border border-gray-200 bg-white hover:border-orange-300 cursor-pointer transition-all group/card',
                          'p-5 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 hover:border-orange-500/40 cursor-pointer transition-all group/card'
                        )}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                              <Sparkles className="w-4 h-4 text-orange-400" />
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
                          {n.name} ({n.item_count ?? 0} items)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <RaiseButton variant="ghost" onClick={() => setCreateDialogOpen(false)}>Cancel</RaiseButton>
                  <RaiseButton onClick={handleCreateWorkspace}>Create</RaiseButton>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </RaisePageTransition>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: Workspace Detail (Spreadsheet)
  // ═══════════════════════════════════════════════════════════════════════

  const nestName = workspace?.nest_id ? nests.find(n => n.id === workspace.nest_id)?.name : null;

  return (
    <RaisePageTransition>
      <div className={rt('min-h-screen bg-gray-50', 'min-h-screen bg-black')} style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
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
                    'text-sm font-semibold bg-transparent border-b border-orange-400 outline-none text-gray-900 px-1',
                    'text-sm font-semibold bg-transparent border-b border-orange-400 outline-none text-white px-1'
                  )}
                />
              ) : (
                <div className="flex items-center gap-1.5 group/name cursor-pointer" onClick={() => setEditingName(true)}>
                  <h2
                    className={rt(
                      'text-sm font-semibold text-gray-900 hover:text-orange-600',
                      'text-sm font-semibold text-white hover:text-orange-400'
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
              {/* Global progress ring */}
              {globalProgress && globalProgress.total > 0 && (
                <div className="flex items-center gap-1.5" title={`${globalProgress.complete} of ${globalProgress.total} cells enriched`}>
                  <svg width="20" height="20" viewBox="0 0 20 20" className="flex-shrink-0">
                    <circle cx="10" cy="10" r="8" fill="none" stroke={rt('#e5e7eb', '#3f3f46')} strokeWidth="2.5" />
                    <circle
                      cx="10" cy="10" r="8" fill="none"
                      stroke={globalProgress.percentage === 100 ? '#4ade80' : globalProgress.percentage > 0 ? '#fbbf24' : '#71717a'}
                      strokeWidth="2.5"
                      strokeDasharray={`${globalProgress.percentage * 0.5027} 50.27`}
                      strokeLinecap="round"
                      transform="rotate(-90 10 10)"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <span className={`text-[10px] font-medium ${globalProgress.percentage === 100 ? 'text-green-400' : globalProgress.percentage > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                    {globalProgress.percentage}%
                  </span>
                </div>
              )}
              {/* Global search */}
              <div className="relative flex items-center">
                <Search className={`absolute left-2.5 w-3.5 h-3.5 pointer-events-none transition-colors ${searchFocused || searchInput ? 'text-orange-400' : 'text-zinc-500'}`} />
                <input
                  ref={searchRef}
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  onKeyDown={e => { if (e.key === 'Escape') clearSearch(); }}
                  placeholder="Search..."
                  className={rt(
                    `pl-8 pr-8 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 outline-none transition-all placeholder:text-gray-400 text-gray-900 focus:border-orange-400 focus:ring-1 focus:ring-orange-400/30 ${searchFocused || searchInput ? 'w-64' : 'w-40'}`,
                    `pl-8 pr-8 py-1.5 text-xs rounded-lg border border-zinc-700 bg-zinc-800/60 outline-none transition-all placeholder:text-zinc-500 text-white focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 ${searchFocused || searchInput ? 'w-64' : 'w-40'}`
                  )}
                />
                {searchInput && (
                  <button onClick={clearSearch} className="absolute right-2 p-0.5 rounded hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-200">
                    <X className="w-3 h-3" />
                  </button>
                )}
                {searchMatchStats && (
                  <div className="absolute -bottom-5 left-0 whitespace-nowrap">
                    <span className="text-[10px] text-orange-400/80">{searchMatchStats.cells} matches in {searchMatchStats.rows} rows</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {workspace?.nest_id && rows.length === 0 && (
                <RaiseButton variant="ghost" size="sm" onClick={importFromNest}>
                  <Upload className="w-3.5 h-3.5 mr-1" /> Import from Nest
                </RaiseButton>
              )}
              <RaiseButton variant="ghost" size="sm" onClick={() => csvInputRef.current?.click()}>
                <FileUp className="w-3.5 h-3.5 mr-1" /> Import CSV
              </RaiseButton>
              <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={importCSV} />
              <RaiseButton variant="ghost" size="sm" onClick={() => { setColDialogOpen(true); setColType('field'); setColName(''); setColConfig({}); }}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Column
              </RaiseButton>
              <RaiseButton variant="ghost" size="sm" onClick={runAllColumns}>
                <Play className="w-3.5 h-3.5 mr-1" /> Run All
              </RaiseButton>
              <button
                onClick={toggleAutoRun}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
                    toast.success('Sandbox mode ON — enrichments use mock data');
                  } else {
                    setSandboxMode(false);
                    toast.info('Sandbox mode OFF');
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
                  <button onClick={convertSandboxToLive} className={`text-[10px] px-2 py-1.5 rounded-lg flex items-center gap-1 ${rt('text-cyan-600 hover:bg-cyan-50 border border-cyan-200', 'text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/30')}`} title="Clear sandbox data and run live enrichments">
                    <RotateCcw className="w-3 h-3" /> Go Live
                  </button>
                </>
              )}
              <RaiseButton variant="ghost" size="sm" onClick={() => setSortPanelOpen(prev => !prev)} className="relative">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1" /> Sort
                {activeSortCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-[10px] font-bold text-white flex items-center justify-center">
                    {activeSortCount}
                  </span>
                )}
              </RaiseButton>
              <RaiseButton variant="ghost" size="sm" onClick={() => setFilterPanelOpen(prev => !prev)} className="relative">
                <Filter className="w-3.5 h-3.5 mr-1" /> Filters
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-[10px] font-bold text-white flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </RaiseButton>
              <RaiseButton variant="ghost" size="sm" onClick={exportCSV}>
                <Download className="w-3.5 h-3.5 mr-1" /> CSV
              </RaiseButton>
              <RaiseButton variant="ghost" size="sm" onClick={() => {
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
                  } catch (err) {
                    console.error('Error deleting workspace:', err);
                    toast.error('Failed to delete workspace');
                  }
                })();
              }} className="text-red-400 hover:text-red-300">
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </RaiseButton>
            </div>
          </div>
        </div>

        {/* Spreadsheet */}
        {wsLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
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
                      'flex flex-col items-center gap-2 p-5 rounded-2xl border border-gray-200 bg-white hover:border-orange-300 transition-all w-44',
                      'flex flex-col items-center gap-2 p-5 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 hover:border-orange-500/40 transition-all w-44'
                    )}
                  >
                    <Database className="w-5 h-5 text-orange-400" />
                    <span className={rt('text-xs font-medium text-gray-900', 'text-xs font-medium text-white')}>Import from Nest</span>
                    <span className="text-[10px] text-zinc-500">Pull candidates from linked nest</span>
                  </button>
                )}
                <button
                  onClick={() => csvInputRef.current?.click()}
                  className={rt(
                    'flex flex-col items-center gap-2 p-5 rounded-2xl border border-gray-200 bg-white hover:border-orange-300 transition-all w-44',
                    'flex flex-col items-center gap-2 p-5 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 hover:border-orange-500/40 transition-all w-44'
                  )}
                >
                  <FileUp className="w-5 h-5 text-orange-400" />
                  <span className={rt('text-xs font-medium text-gray-900', 'text-xs font-medium text-white')}>Upload CSV</span>
                  <span className="text-[10px] text-zinc-500">Import rows from a CSV file</span>
                </button>
                <button
                  onClick={() => { setColDialogOpen(true); setColType('field'); setColName(''); setColConfig({}); }}
                  className={rt(
                    'flex flex-col items-center gap-2 p-5 rounded-2xl border border-gray-200 bg-white hover:border-orange-300 transition-all w-44',
                    'flex flex-col items-center gap-2 p-5 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 hover:border-orange-500/40 transition-all w-44'
                  )}
                >
                  <Plus className="w-5 h-5 text-orange-400" />
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
                      `flex-shrink-0 flex flex-col justify-center px-2 text-xs font-medium border-r border-gray-200 relative group cursor-pointer select-none ${sortState ? 'text-orange-600 bg-orange-50/50' : 'text-gray-600'}`,
                      `flex-shrink-0 flex flex-col justify-center px-2 text-xs font-medium border-r border-zinc-800/60 relative group cursor-pointer select-none ${sortState ? 'text-orange-400 bg-orange-500/5' : 'text-zinc-300'}`
                    )}
                    style={{ width: col.width || DEFAULT_COL_WIDTH, height: ROW_HEIGHT }}
                    onClick={(e) => { if (!e.target.closest('[data-no-sort]')) toggleColumnSort(col.id, e.shiftKey); }}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Icon className={`w-3 h-3 flex-shrink-0 ${col.type === 'field' ? 'text-blue-400' : col.type === 'enrichment' ? 'text-amber-400' : col.type === 'ai' ? 'text-purple-400' : col.type === 'waterfall' ? 'text-cyan-400' : col.type === 'http' ? 'text-emerald-400' : col.type === 'merge' ? 'text-pink-400' : 'text-green-400'}`} />
                      <span className="truncate flex-1">{col.name}</span>
                      {/* Sort indicator */}
                      {sortState ? (
                        <span className="flex items-center gap-0.5 flex-shrink-0">
                          {sortState.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-orange-400" /> : <ArrowDown className="w-3 h-3 text-orange-400" />}
                          {sortState.isMulti && <span className="text-[9px] text-orange-400 font-bold">{sortState.priority}</span>}
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
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-orange-500/50 opacity-0 group-hover:opacity-100 transition-opacity z-10"
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
                return (
                  <div
                    key={row.id}
                    className="flex absolute w-full"
                    style={{ top: rowIdx * ROW_HEIGHT, height: ROW_HEIGHT }}
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
                                  `border-gray-200 ${isEditing ? 'ring-2 ring-cyan-400 ring-inset bg-cyan-50/20' : isSelected ? 'ring-2 ring-cyan-400 ring-inset bg-cyan-50/10' : 'bg-white'}`,
                                  `border-zinc-800/60 ${isEditing ? 'ring-2 ring-cyan-400 ring-inset bg-white/10' : isSelected ? 'ring-2 ring-cyan-400 ring-inset bg-cyan-500/5' : ''}`
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
                                  ? rt('bg-cyan-500 border-cyan-500', 'bg-cyan-500 border-cyan-500')
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
                                <a href={displayVal.startsWith('http') ? displayVal : `https://${displayVal}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="truncate text-cyan-400 hover:underline">{debouncedSearch ? highlightMatch(displayVal, debouncedSearch) : displayVal}</a>
                              ) : col.type === 'field' && col.config?.data_type === 'email' && displayVal ? (
                                <a href={`mailto:${displayVal}`} onClick={e => e.stopPropagation()} className="truncate text-cyan-400 hover:underline">{debouncedSearch ? highlightMatch(displayVal, debouncedSearch) : displayVal}</a>
                              ) : (
                                <span className={`truncate ${col.type === 'field' && (col.config?.data_type === 'number' || col.config?.data_type === 'currency') ? 'tabular-nums text-right w-full' : ''} ${rt('text-gray-700', 'text-zinc-300')}`}>
                                  {debouncedSearch ? highlightMatch(displayVal, debouncedSearch) : displayVal}
                                </span>
                              )}
                              {status === 'error' && <StatusDot status="error" errorMessage={cellObj?.error_message} />}
                              {col.type === 'waterfall' && cellObj?.value?._meta?.source_used && (
                                <span title={`Source: ${cellObj.value._meta.source_used} (${cellObj.value._meta.attempts} tried)`} className="ml-auto text-[9px] px-1 py-0.5 rounded bg-cyan-500/10 text-cyan-400 flex-shrink-0">
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

        {/* Filter Panel - slides in from right */}
        <AnimatePresence>
          {filterPanelOpen && (
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
                  <Filter className="w-4 h-4 text-orange-400" />
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
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                      <div
                        key={filter.id}
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
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className={rt(
                'flex-shrink-0 px-4 py-3 border-t border-gray-200 space-y-2',
                'flex-shrink-0 px-4 py-3 border-t border-zinc-800 space-y-2'
              )}>
                <RaiseButton variant="ghost" size="sm" className="w-full justify-center" onClick={addFilter}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Filter
                </RaiseButton>
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
                  <ArrowUpDown className="w-4 h-4 text-orange-400" />
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
                          `p-3 rounded-xl border bg-gray-50 space-y-2 transition-all ${dragSort === idx ? 'border-orange-400 opacity-70' : 'border-gray-200'}`,
                          `p-3 rounded-xl border bg-zinc-900/60 space-y-2 transition-all ${dragSort === idx ? 'border-orange-500 opacity-70' : 'border-zinc-800'}`
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
                                ? rt('bg-orange-100 text-orange-600 border border-orange-300', 'bg-orange-500/15 text-orange-400 border border-orange-500/40')
                                : rt('bg-gray-100 text-gray-500 border border-gray-200', 'bg-zinc-800 text-zinc-500 border border-zinc-700')
                            }`}
                          >
                            <ArrowUp className="w-3 h-3" /> Asc
                          </button>
                          <button
                            onClick={() => updateSort(sort.id, { direction: 'desc' })}
                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              sort.direction === 'desc'
                                ? rt('bg-orange-100 text-orange-600 border border-orange-300', 'bg-orange-500/15 text-orange-400 border border-orange-500/40')
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
                <RaiseButton variant="ghost" size="sm" className="w-full justify-center" onClick={addSortFromPanel}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Sort
                </RaiseButton>
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

        {/* Add Column Dialog */}
        <Dialog open={colDialogOpen} onOpenChange={setColDialogOpen}>
          <DialogContent className={rt('bg-white max-w-lg', 'bg-zinc-900 border-zinc-800 max-w-lg')}>
            <DialogHeader>
              <DialogTitle className={rt('text-gray-900', 'text-white')}>Add Column</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
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
                            ? rt('border-orange-400 bg-orange-50', 'border-orange-500/50 bg-orange-500/10')
                            : rt('border-gray-200 hover:border-gray-300', 'border-zinc-700 hover:border-zinc-600')
                        }`}
                      >
                        <CTIcon className={`w-4 h-4 ${colType === ct.value ? 'text-orange-400' : 'text-zinc-500'}`} />
                        <div>
                          <div className={rt('text-xs font-medium text-gray-900', 'text-xs font-medium text-white')}>{ct.label}</div>
                          <div className="text-[10px] text-zinc-500">{ct.desc}</div>
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
                                ? rt('border-orange-400 bg-orange-50', 'border-orange-500/50 bg-orange-500/10')
                                : rt('border-gray-200 hover:border-gray-300', 'border-zinc-700 hover:border-zinc-600')
                            }`}
                          >
                            <DTIcon className={`w-3.5 h-3.5 ${selected ? 'text-orange-400' : 'text-zinc-500'}`} />
                            <span className={`text-[10px] ${selected ? rt('text-orange-600', 'text-orange-400') : 'text-zinc-500'}`}>{dt.label}</span>
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
                            <button key={pos} onClick={() => setColConfig(prev => ({ ...prev, symbol_position: pos }))} className={`text-xs px-3 py-1 rounded-lg border ${(colConfig.symbol_position || 'before') === pos ? rt('border-orange-400 bg-orange-50 text-orange-600', 'border-orange-500/50 bg-orange-500/10 text-orange-400') : rt('border-gray-200 text-gray-500', 'border-zinc-700 text-zinc-500')}`}>
                              {pos === 'before' ? `${(CURRENCY_CODES.find(c => c.value === (colConfig.currency_code || 'USD'))?.symbol || '$')}100` : `100 ${CURRENCY_CODES.find(c => c.value === (colConfig.currency_code || 'USD'))?.symbol || '$'}`}
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

              {colType === 'enrichment' && (
                <div className="space-y-3">
                  <div>
                    <Label className={rt('text-gray-700', 'text-zinc-300')}>Enrichment Function</Label>
                    <Select value={colConfig.function || ''} onValueChange={v => setColConfig(prev => ({ ...prev, function: v, provider: 'explorium' }))}>
                      <SelectTrigger className={rt('', 'bg-zinc-800 border-zinc-700 text-white')}>
                        <SelectValue placeholder="Select function" />
                      </SelectTrigger>
                      <SelectContent className={rt('', 'bg-zinc-800 border-zinc-700')}>
                        {ENRICHMENT_FUNCTIONS.map(f => (
                          <SelectItem key={f.value} value={f.value} className={rt('', 'text-white hover:bg-zinc-700')}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {colConfig.function && (
                      <p className="text-[10px] text-zinc-500 mt-1">{ENRICHMENT_FUNCTIONS.find(f => f.value === colConfig.function)?.desc}</p>
                    )}
                  </div>
                  <div>
                    <Label className={rt('text-gray-700', 'text-zinc-300')}>Input Column</Label>
                    <Select value={colConfig.input_column_id || ''} onValueChange={v => setColConfig(prev => ({ ...prev, input_column_id: v }))}>
                      <SelectTrigger className={rt('', 'bg-zinc-800 border-zinc-700 text-white')}>
                        <SelectValue placeholder="Select input column" />
                      </SelectTrigger>
                      <SelectContent className={rt('', 'bg-zinc-800 border-zinc-700')}>
                        {columns.map(c => (
                          <SelectItem key={c.id} value={c.id} className={rt('', 'text-white hover:bg-zinc-700')}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className={rt('text-gray-700', 'text-zinc-300')}>Output Field (dot notation)</Label>
                    <Input
                      value={colConfig.output_field || ''}
                      onChange={e => setColConfig(prev => ({ ...prev, output_field: e.target.value }))}
                      placeholder="e.g. verified_email or company.name"
                      className={rt('', 'bg-zinc-800 border-zinc-700 text-white')}
                    />
                  </div>
                </div>
              )}

              {colType === 'ai' && (
                <div className="space-y-3">
                  {/* Template selector */}
                  <div>
                    <Label className={rt('text-gray-700', 'text-zinc-300')}>Quick Templates</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {AI_PROMPT_TEMPLATES.map(t => (
                        <button key={t.id} onClick={() => setColConfig(prev => ({ ...prev, prompt: t.prompt }))}
                          className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${rt('border-gray-200 text-gray-600 hover:border-purple-400 hover:bg-purple-50', 'border-zinc-700 text-zinc-400 hover:border-purple-500/50 hover:bg-purple-500/10')}`}>
                          {t.icon} {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Prompt */}
                  <div className="relative">
                    <Label className={rt('text-gray-700', 'text-zinc-300')}>Prompt</Label>
                    <Textarea
                      ref={promptRef}
                      value={colConfig.prompt || ''}
                      onChange={e => { setColConfig(prev => ({ ...prev, prompt: e.target.value })); handleSlashInput(e, 'prompt'); }}
                      onKeyDown={e => {
                        if (slashMenu.open && slashMenu.field === 'prompt') {
                          if (e.key === 'Escape') { e.preventDefault(); setSlashMenu(prev => ({ ...prev, open: false })); }
                          if (e.key === 'Enter' && slashMenuColumns.length > 0) { e.preventDefault(); insertColumnRef(slashMenuColumns[0].name); }
                        }
                      }}
                      placeholder={'Type / to insert a column reference\ne.g. Based on /Company and /Title, write a one-line pitch'}
                      rows={3}
                      className={rt('', 'bg-zinc-800 border-zinc-700 text-white')}
                    />
                    {slashMenu.open && slashMenu.field === 'prompt' && slashMenuColumns.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl">
                        {slashMenuColumns.map(c => (
                          <button key={c.id} onClick={() => insertColumnRef(c.name)} className="w-full text-left px-3 py-2 text-sm text-white hover:bg-zinc-700 flex items-center gap-2 min-w-0">
                            <span className="text-cyan-400 font-mono text-xs shrink-0">/</span>
                            <span className="shrink-0">{c.name}</span>
                            {c.sampleValue && <span className="text-zinc-500 text-xs truncate ml-auto">{String(c.sampleValue).slice(0, 40)}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-zinc-500 mt-1">Type <span className="font-mono text-cyan-400">/</span> to insert column references</p>
                  </div>

                  {/* Model selector */}
                  <div>
                    <Label className={rt('text-gray-700', 'text-zinc-300')}>Model</Label>
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      {AI_MODELS.map(m => (
                        <button key={m.value} onClick={() => setColConfig(prev => ({ ...prev, model: m.value }))}
                          className={`text-left p-2 rounded-lg border transition-all ${(colConfig.model || 'moonshotai/Kimi-K2-Instruct') === m.value
                            ? rt('border-purple-400 bg-purple-50', 'border-purple-500/50 bg-purple-500/10')
                            : rt('border-gray-200 hover:border-gray-300', 'border-zinc-700 hover:border-zinc-600')}`}>
                          <div className={`text-xs font-medium ${rt('text-gray-800', 'text-white')}`}>{m.label}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-zinc-500">Speed</span>
                            <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <div key={i} className={`w-1 h-1 rounded-full ${i <= m.speed ? 'bg-cyan-400' : rt('bg-gray-200', 'bg-zinc-700')}`} />)}</div>
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
                              ? rt('border-orange-400 bg-orange-50 text-orange-600', 'border-orange-500/50 bg-orange-500/10 text-orange-400')
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
                      <p className={`text-[11px] ${rt('text-gray-700', 'text-zinc-300')} whitespace-pre-wrap break-words`}>
                        {replaceColumnRefs(colConfig.prompt, rows[0]?.id)}
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
                    onKeyDown={e => {
                      if (slashMenu.open && slashMenu.field === 'formula') {
                        if (e.key === 'Escape') { e.preventDefault(); setSlashMenu(prev => ({ ...prev, open: false })); }
                        if (e.key === 'Enter' && slashMenuColumns.length > 0) { e.preventDefault(); insertColumnRef(slashMenuColumns[0].name); }
                      }
                    }}
                    placeholder='Type / to insert column refs. e.g. =CONCAT(/First Name, " ", /Last Name)'
                    className={rt('font-mono', 'bg-zinc-800 border-zinc-700 text-white font-mono')}
                  />
                  {slashMenu.open && slashMenu.field === 'formula' && slashMenuColumns.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl">
                      {slashMenuColumns.map(c => (
                        <button key={c.id} onClick={() => insertColumnRef(c.name)} className="w-full text-left px-3 py-2 text-sm text-white hover:bg-zinc-700 flex items-center gap-2">
                          <span className="text-cyan-400 font-mono text-xs">/</span>{c.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-zinc-500 mt-1">Type <span className="font-mono text-cyan-400">/</span> for column refs. Functions: CONCAT, IF, UPPER, LOWER, TRIM, LEN, LEFT, RIGHT, REPLACE, ROUND, CONTAINS</p>
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
                    <p className="text-[10px] text-zinc-500 mt-1">Use <span className="font-mono text-cyan-400">/ColumnName</span> to insert column values</p>
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
                            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full cursor-grab active:cursor-grabbing ${rt('bg-orange-50 text-orange-700 border border-orange-200', 'bg-orange-500/10 text-orange-400 border border-orange-500/30')}`}
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
                              {i > 0 && <span className="text-cyan-400 font-mono mx-0.5">{colConfig.output_format === 'bulleted' ? ' • ' : (colConfig.separator ?? ', ')}</span>}
                              <span className="text-orange-400 font-mono">/{srcCol?.name || '?'}</span>
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
                                sources: prev.sources.map((s, i) => i === idx ? { ...s, function: v } : s),
                              }));
                            }}>
                              <SelectTrigger className={`h-8 text-xs ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`}>
                                <SelectValue placeholder="Enrichment function" />
                              </SelectTrigger>
                              <SelectContent className={rt('', 'bg-zinc-800 border-zinc-700')}>
                                {ENRICHMENT_FUNCTIONS.map(f => (
                                  <SelectItem key={f.value} value={f.value} className={rt('', 'text-white hover:bg-zinc-700')}>{f.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select value={src.input_column_id || ''} onValueChange={v => {
                              setColConfig(prev => ({
                                ...prev,
                                sources: prev.sources.map((s, i) => i === idx ? { ...s, input_column_id: v } : s),
                              }));
                            }}>
                              <SelectTrigger className={`h-8 text-xs ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`}>
                                <SelectValue placeholder="Input column" />
                              </SelectTrigger>
                              <SelectContent className={rt('', 'bg-zinc-800 border-zinc-700')}>
                                {columns.map(c => (
                                  <SelectItem key={c.id} value={c.id} className={rt('', 'text-white hover:bg-zinc-700')}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              value={src.output_field || ''}
                              onChange={e => {
                                setColConfig(prev => ({
                                  ...prev,
                                  sources: prev.sources.map((s, i) => i === idx ? { ...s, output_field: e.target.value } : s),
                                }));
                              }}
                              placeholder="Output field (dot notation)"
                              className={`h-8 text-xs ${rt('', 'bg-zinc-800 border-zinc-700 text-white')}`}
                            />
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

              <div className="flex justify-end gap-2 pt-2">
                <RaiseButton variant="ghost" onClick={() => setColDialogOpen(false)}>Cancel</RaiseButton>
                <RaiseButton onClick={handleAddColumn}>Add Column</RaiseButton>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {/* AI Chat Floating Button */}
        <button
          onClick={() => { setChatOpen(prev => !prev); setTimeout(() => chatInputRef.current?.focus(), 100); }}
          className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${
            chatOpen
              ? rt('bg-gray-200 text-gray-600', 'bg-zinc-700 text-zinc-300')
              : rt('bg-gradient-to-br from-purple-500 to-pink-500 text-white hover:shadow-xl hover:scale-105', 'bg-gradient-to-br from-purple-500 to-pink-500 text-white hover:shadow-xl hover:scale-105')
          }`}
        >
          {chatOpen ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
        </button>

        {/* AI Chat Panel */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className={`fixed top-0 right-0 h-full w-[400px] z-40 flex flex-col shadow-2xl ${rt('bg-white border-l border-gray-200', 'bg-zinc-950 border-l border-zinc-800')}`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between px-4 py-3 border-b ${rt('border-gray-200', 'border-zinc-800')}`}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-semibold ${rt('text-gray-900', 'text-white')}`}>Sculptor</h3>
                    <p className="text-[10px] text-zinc-500">AI workspace assistant</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={clearChat} title="Clear conversation" className={`p-1.5 rounded-lg transition-colors ${rt('hover:bg-gray-100 text-gray-400', 'hover:bg-zinc-800 text-zinc-500')}`}>
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setChatOpen(false)} className={`p-1.5 rounded-lg transition-colors ${rt('hover:bg-gray-100 text-gray-400', 'hover:bg-zinc-800 text-zinc-500')}`}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-3">
                      <Bot className="w-6 h-6 text-purple-400" />
                    </div>
                    <h4 className={`text-sm font-medium mb-1 ${rt('text-gray-900', 'text-white')}`}>Hi, I'm Sculptor</h4>
                    <p className={`text-xs mb-4 ${rt('text-gray-500', 'text-zinc-500')}`}>I can help you build and configure your enrichment workspace.</p>
                    <div className="space-y-2">
                      {CHAT_QUICK_PROMPTS.map((qp, i) => (
                        <button
                          key={i}
                          onClick={() => sendChatMessage(qp.prompt)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${rt('bg-gray-50 hover:bg-gray-100 text-gray-700', 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300')} border ${rt('border-gray-200', 'border-zinc-800')}`}
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
                        ? rt('bg-purple-500 text-white', 'bg-purple-600 text-white')
                        : rt('bg-gray-100 text-gray-800', 'bg-zinc-900 text-zinc-200')
                    }`}>
                      {/* Render message with basic markdown */}
                      <div className="whitespace-pre-wrap break-words">
                        {msg.content.split('```').map((block, bi) => {
                          if (bi % 2 === 1) {
                            const lines = block.split('\n');
                            const lang = lines[0];
                            const code = lang === 'action' ? lines.slice(1).join('\n') : block;
                            if (lang === 'action') return null; // hide action blocks
                            return <pre key={bi} className={`my-1.5 p-2 rounded text-[10px] font-mono overflow-x-auto ${rt('bg-gray-200', 'bg-zinc-800')}`}>{code}</pre>;
                          }
                          return <span key={bi}>{block}</span>;
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
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex justify-start">
                    <div className={`rounded-2xl px-3 py-2 ${rt('bg-gray-100', 'bg-zinc-900')}`}>
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
                <div className={`px-4 py-2 flex gap-1.5 overflow-x-auto border-t ${rt('border-gray-100', 'border-zinc-800/50')}`}>
                  {CHAT_QUICK_PROMPTS.map((qp, i) => (
                    <button
                      key={i}
                      onClick={() => sendChatMessage(qp.prompt)}
                      className={`flex-shrink-0 text-[10px] px-2.5 py-1 rounded-full border transition-all ${rt('border-gray-200 text-gray-500 hover:bg-gray-50', 'border-zinc-800 text-zinc-500 hover:bg-zinc-900')}`}
                    >
                      {qp.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className={`px-4 py-3 border-t ${rt('border-gray-200', 'border-zinc-800')}`}>
                <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${rt('bg-gray-50 border border-gray-200', 'bg-zinc-900 border border-zinc-800')}`}>
                  <input
                    ref={chatInputRef}
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(chatInput); } }}
                    placeholder="Ask Sculptor anything..."
                    disabled={chatLoading}
                    className={`flex-1 bg-transparent outline-none text-xs ${rt('text-gray-900 placeholder:text-gray-400', 'text-white placeholder:text-zinc-600')}`}
                  />
                  <button
                    onClick={() => sendChatMessage(chatInput)}
                    disabled={!chatInput.trim() || chatLoading}
                    className={`p-1.5 rounded-lg transition-colors ${chatInput.trim() ? 'bg-purple-500 text-white hover:bg-purple-600' : rt('text-gray-300', 'text-zinc-700')}`}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </RaisePageTransition>
  );
}
