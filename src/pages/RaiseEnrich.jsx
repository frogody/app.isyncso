import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Plus, Search, ArrowLeft, MoreHorizontal, Play, Download,
  GripVertical, Type, Zap, Brain, FunctionSquare, Columns3, Trash2,
  Edit2, Settings, ChevronDown, Check, X, Loader2, AlertCircle,
  Table2, Clock, Hash, Upload, FileUp, Database, Pencil
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
];

const COLUMN_TYPE_ICONS = { field: Type, enrichment: Zap, ai: Brain, formula: FunctionSquare };

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
      if (cell?.value) return typeof cell.value === 'object' ? (cell.value.v ?? JSON.stringify(cell.value)) : String(cell.value);
      const row = rows.find(r => r.id === rowId);
      if (row?.source_data && col.config?.source_field) {
        const val = row.source_data[col.config.source_field];
        if (val != null) return typeof val === 'object' ? JSON.stringify(val) : String(val);
      }
      return '';
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
    const toastId = toast.loading(`Running AI column: ${col.name}...`);
    for (const row of rows) {
      const key = cellKey(row.id, col.id);
      const val = { v: '(AI not yet configured)' };
      setCells(prev => ({ ...prev, [key]: { ...prev[key], status: 'complete', value: val } }));
      await supabase.from('enrich_cells').upsert({
        row_id: row.id, column_id: col.id, status: 'complete', value: val,
      }, { onConflict: 'row_id,column_id' });
    }
    toast.dismiss(toastId);
    toast.success(`${col.name}: placeholder values set`);
  }, [rows, cellKey]);

  // ─── Run all columns ───────────────────────────────────────────────────

  const runAllColumns = useCallback(async () => {
    for (const col of columns) {
      if (col.type === 'enrichment') await runEnrichmentColumn(col);
      else if (col.type === 'ai') await runAIColumn(col);
    }
  }, [columns, runEnrichmentColumn, runAIColumn]);

  // ─── Export CSV ────────────────────────────────────────────────────────

  const exportCSV = useCallback(() => {
    const headers = columns.map(c => c.name);
    const csvRows = [headers.join(',')];
    for (const row of rows) {
      const vals = columns.map(col => {
        const v = getCellDisplayValue(row.id, col);
        return `"${String(v).replace(/"/g, '""')}"`;
      });
      csvRows.push(vals.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workspace?.name || 'enrich'}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }, [columns, rows, getCellDisplayValue, workspace]);

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

  // ─── Virtual scroll ────────────────────────────────────────────────────

  const totalHeight = rows.length * ROW_HEIGHT;
  const containerHeight = scrollRef.current?.clientHeight || 600;
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - VISIBLE_BUFFER);
  const endIdx = Math.min(rows.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + VISIBLE_BUFFER);
  const visibleRows = rows.slice(startIdx, endIdx);

  const onScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  // ─── Total grid width ──────────────────────────────────────────────────

  const totalGridWidth = useMemo(() => {
    return ROW_NUM_WIDTH + columns.reduce((sum, c) => sum + (c.width || DEFAULT_COL_WIDTH), 0) + 44;
  }, [columns]);

  // ─── Status dot component ──────────────────────────────────────────────

  const StatusDot = ({ status }) => {
    if (status === 'pending') return <span title="Enrichment pending..." className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />;
    if (status === 'error') return <span title="Error — click to retry" className="inline-block w-2 h-2 rounded-full bg-red-400" />;
    if (status === 'complete') return <span title="Complete" className="inline-block w-2 h-2 rounded-full bg-green-400" />;
    return null;
  };

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
            className="flex-1 overflow-auto"
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
                const Icon = COLUMN_TYPE_ICONS[col.type] || Type;
                return (
                  <div
                    key={col.id}
                    className={rt(
                      'flex-shrink-0 flex items-center gap-1.5 px-2 text-xs font-medium text-gray-600 border-r border-gray-200 relative group',
                      'flex-shrink-0 flex items-center gap-1.5 px-2 text-xs font-medium text-zinc-300 border-r border-zinc-800/60 relative group'
                    )}
                    style={{ width: col.width || DEFAULT_COL_WIDTH, height: ROW_HEIGHT }}
                  >
                    <Icon className={`w-3 h-3 flex-shrink-0 ${col.type === 'field' ? 'text-blue-400' : col.type === 'enrichment' ? 'text-amber-400' : col.type === 'ai' ? 'text-purple-400' : 'text-green-400'}`} />
                    <span className="truncate flex-1">{col.name}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-700/50">
                          <MoreHorizontal className="w-3 h-3 text-zinc-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className={rt('', 'bg-zinc-800 border-zinc-700')}>
                        {col.type === 'enrichment' && (
                          <DropdownMenuItem onClick={() => runEnrichmentColumn(col)} className={rt('', 'text-white hover:bg-zinc-700')}>
                            <Play className="w-3 h-3 mr-2" /> Run Column
                          </DropdownMenuItem>
                        )}
                        {col.type === 'ai' && (
                          <DropdownMenuItem onClick={() => runAIColumn(col)} className={rt('', 'text-white hover:bg-zinc-700')}>
                            <Brain className="w-3 h-3 mr-2" /> Run AI
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => deleteColumn(col.id)} className="text-red-400 hover:bg-red-500/10">
                          <Trash2 className="w-3 h-3 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {/* Resize handle */}
                    <div
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
                const rowIdx = rows.indexOf(row);
                return (
                  <div
                    key={row.id}
                    className="flex absolute w-full"
                    style={{ top: rowIdx * ROW_HEIGHT, height: ROW_HEIGHT }}
                  >
                    {/* Row number */}
                    <div
                      className={rt(
                        'flex-shrink-0 flex items-center justify-center text-xs text-gray-400 border-r border-b border-gray-200 bg-gray-50/50',
                        'flex-shrink-0 flex items-center justify-center text-xs text-zinc-500 border-r border-b border-zinc-800/60 bg-zinc-950/50'
                      )}
                      style={{ width: ROW_NUM_WIDTH }}
                    >
                      {rowIdx + 1}
                    </div>
                    {columns.map(col => {
                      const isEditing = editingCell?.rowId === row.id && editingCell?.colId === col.id;
                      const isSelected = selectedCell?.rowId === row.id && selectedCell?.colId === col.id;
                      const status = getCellStatus(row.id, col.id);
                      const displayVal = getCellDisplayValue(row.id, col);

                      return (
                        <div
                          key={col.id}
                          className={`flex-shrink-0 flex items-center px-2 font-mono text-sm border-r border-b ${
                            rt(
                              `border-gray-200 ${isEditing ? 'ring-2 ring-cyan-400 ring-inset bg-cyan-50/20' : isSelected ? 'ring-2 ring-cyan-400 ring-inset bg-cyan-50/10' : 'bg-white'}`,
                              `border-zinc-800/60 ${isEditing ? 'ring-2 ring-cyan-400 ring-inset bg-white/10' : isSelected ? 'ring-2 ring-cyan-400 ring-inset bg-cyan-500/5' : ''}`
                            )
                          }`}
                          style={{ width: col.width || DEFAULT_COL_WIDTH }}
                          onClick={() => {
                            setSelectedCell({ rowId: row.id, colId: col.id });
                            if (col.type === 'field' || col.type === 'enrichment' || col.type === 'ai') {
                              // allow editing on click for non-formula
                            }
                          }}
                          onDoubleClick={() => {
                            if (col.type !== 'formula') {
                              setEditingCell({ rowId: row.id, colId: col.id });
                              setEditingValue(displayVal);
                            }
                          }}
                        >
                          {isEditing ? (
                            <input
                              autoFocus
                              value={editingValue}
                              onChange={e => setEditingValue(e.target.value)}
                              onBlur={() => {
                                saveCell(row.id, col.id, editingValue);
                                setEditingCell(null);
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { saveCell(row.id, col.id, editingValue); setEditingCell(null); }
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              className={rt(
                                'w-full h-full bg-transparent outline-none text-sm font-mono text-gray-900',
                                'w-full h-full bg-transparent outline-none text-sm font-mono text-white'
                              )}
                            />
                          ) : (
                            <div className="flex items-center gap-1.5 w-full min-w-0">
                              {status !== 'empty' && status !== 'complete' && <StatusDot status={status} />}
                              <span className={rt(
                                'truncate text-gray-700',
                                'truncate text-zinc-300'
                              )}>
                                {displayVal}
                              </span>
                              {status === 'error' && <StatusDot status="error" />}
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
                <div className="grid grid-cols-2 gap-2 mt-1.5">
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
                <div>
                  <Label className={rt('text-gray-700', 'text-zinc-300')}>Source Field</Label>
                  <Select value={colConfig.source_field || ''} onValueChange={v => setColConfig({ source_field: v })}>
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
                  <div className="relative">
                    <Label className={rt('text-gray-700', 'text-zinc-300')}>Prompt Template</Label>
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
                      rows={4}
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
                  <div>
                    <Label className={rt('text-gray-700', 'text-zinc-300')}>Input Columns</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {columns.map(c => {
                        const selected = (colConfig.input_columns || []).includes(c.id);
                        return (
                          <button
                            key={c.id}
                            onClick={() => {
                              setColConfig(prev => ({
                                ...prev,
                                input_columns: selected
                                  ? (prev.input_columns || []).filter(id => id !== c.id)
                                  : [...(prev.input_columns || []), c.id],
                              }));
                            }}
                            className={`text-[10px] px-2 py-1 rounded-full border transition-all ${
                              selected
                                ? rt('border-orange-400 bg-orange-50 text-orange-600', 'border-orange-500/50 bg-orange-500/10 text-orange-400')
                                : rt('border-gray-200 text-gray-500', 'border-zinc-700 text-zinc-500')
                            }`}
                          >
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
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

              <div className="flex justify-end gap-2 pt-2">
                <RaiseButton variant="ghost" onClick={() => setColDialogOpen(false)}>Cancel</RaiseButton>
                <RaiseButton onClick={handleAddColumn}>Add Column</RaiseButton>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RaisePageTransition>
  );
}
