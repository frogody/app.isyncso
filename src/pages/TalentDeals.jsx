import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import anime from '@/lib/anime-wrapper';
const animate = anime;
import { prefersReducedMotion } from '@/lib/animations';
import { useTheme } from "@/contexts/GlobalThemeContext";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { createPageUrl } from "@/utils";
import {
  Plus, GripVertical, Building2, User, Euro, Calendar, Target, Clock,
  TrendingUp, ArrowRight, MoreHorizontal, Mail, Phone, ExternalLink, Trash2,
  Sparkles, Filter, ChevronDown, AlertCircle, CheckCircle2, Zap, Users,
  Briefcase, UserPlus, Handshake, Search, Edit2, Eye, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GlassCard, StatCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from 'sonner';

// Recruitment Pipeline Stages
const STAGES = [
  { id: 'lead', label: 'Lead', color: 'from-zinc-500 to-zinc-600', accent: 'text-zinc-400', bgAccent: 'bg-zinc-500', borderAccent: 'border-zinc-500/50', probability: 5 },
  { id: 'briefing', label: 'Briefing', color: 'from-red-600 to-red-700', accent: 'text-red-400', bgAccent: 'bg-red-500', borderAccent: 'border-red-500/50', probability: 15 },
  { id: 'agreement', label: 'Agreement', color: 'from-red-500 to-red-600', accent: 'text-red-400', bgAccent: 'bg-red-500', borderAccent: 'border-red-500/50', probability: 25 },
  { id: 'search', label: 'Search', color: 'from-red-400 to-red-500', accent: 'text-red-400', bgAccent: 'bg-red-500', borderAccent: 'border-red-500/50', probability: 35 },
  { id: 'presented', label: 'Presented', color: 'from-red-300 to-red-400', accent: 'text-red-400', bgAccent: 'bg-red-400', borderAccent: 'border-red-500/50', probability: 50 },
  { id: 'interviews', label: 'Interviews', color: 'from-red-400 to-red-500', accent: 'text-red-400', bgAccent: 'bg-red-500', borderAccent: 'border-red-500/50', probability: 65 },
  { id: 'offer', label: 'Offer', color: 'from-red-500 to-red-600', accent: 'text-red-400', bgAccent: 'bg-red-500', borderAccent: 'border-red-500/50', probability: 80 },
  { id: 'starting', label: 'Starting', color: 'from-red-600 to-red-700', accent: 'text-red-400', bgAccent: 'bg-red-600', borderAccent: 'border-red-500/50', probability: 90 },
  { id: 'probation', label: 'Probation', color: 'from-red-700 to-red-800', accent: 'text-red-400', bgAccent: 'bg-red-700', borderAccent: 'border-red-500/50', probability: 95 },
  { id: 'confirmed', label: 'Confirmed', color: 'from-red-800 to-red-900', accent: 'text-red-400', bgAccent: 'bg-red-800', borderAccent: 'border-red-500/50', probability: 100 },
];

const emptyForm = {
  title: '', description: '', client_id: '', candidate_id: '', project_id: '',
  stage: 'lead', deal_value: '', fee_type: 'percentage', fee_percentage: '20',
  fee_flat: '', candidate_salary: '', expected_start_date: '', notes: '', currency: 'EUR'
};

function DealCard({ deal, onEdit, onDelete, stageConfig, index, clients, candidates, t }) {
  const getDaysInStage = () => {
    const created = new Date(deal.updated_at || deal.created_at);
    return Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
  };

  const days = getDaysInStage();
  const probability = deal.probability || stageConfig.probability;
  const client = clients.find(c => c.id === deal.client_id);
  const candidate = candidates.find(c => c.id === deal.candidate_id);

  // Calculate deal value if percentage-based
  const displayValue = deal.deal_value || (
    deal.fee_type === 'percentage' && deal.candidate_salary && deal.fee_percentage
      ? (deal.candidate_salary * deal.fee_percentage / 100)
      : deal.fee_flat || 0
  );

  return (
    <Draggable draggableId={deal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          style={{
            ...provided.draggableProps.style,
            // Ensure smooth transform during drag
            transition: snapshot.isDragging
              ? provided.draggableProps.style?.transition
              : 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
          }}
          className={`group relative ${t("bg-white", "bg-zinc-900/60")} backdrop-blur-sm rounded-xl border ${
            snapshot.isDragging
              ? `shadow-2xl shadow-red-500/20 border-red-500/50 z-50`
              : `${t("border-gray-200", "border-zinc-800/60")} ${t("hover:border-gray-300", "hover:border-zinc-700/60")}`
          }`}
        >
          {/* Top gradient bar */}
          <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r ${stageConfig.color} opacity-60`} />

          <div className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0" onClick={() => onEdit(deal)}>
                <h4 className={`font-semibold ${t("text-gray-900", "text-white")} truncate cursor-pointer hover:text-red-400/80 transition-colors`}>
                  {deal.title || 'Untitled Deal'}
                </h4>
                {client && (
                  <p className={`${t("text-gray-400", "text-zinc-500")} text-sm flex items-center gap-1.5 mt-1`}>
                    <Building2 className="w-3 h-3" />
                    <span className="truncate">{client.name || client.company_name}</span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <div {...provided.dragHandleProps} className={`p-1 rounded ${t("hover:bg-gray-100", "hover:bg-zinc-800")} cursor-grab`}>
                  <GripVertical className="w-4 h-4 text-zinc-600" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-4 h-4 text-zinc-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className={`${t("bg-white", "bg-zinc-900")} ${t("border-gray-200", "border-zinc-800")}`}>
                    <DropdownMenuItem onClick={() => onEdit(deal)} className={`${t("text-gray-600", "text-zinc-300")} ${t("focus:text-gray-900", "focus:text-white")} ${t("focus:bg-gray-100", "focus:bg-zinc-800")}`}>
                      <ExternalLink className="w-4 h-4 mr-2" /> View Details
                    </DropdownMenuItem>
                    {client && (
                      <DropdownMenuItem asChild className={`${t("text-gray-600", "text-zinc-300")} ${t("focus:text-gray-900", "focus:text-white")} ${t("focus:bg-gray-100", "focus:bg-zinc-800")}`}>
                        <Link to={createPageUrl('CRMContacts') + '?type=client'}>
                          <Building2 className="w-4 h-4 mr-2" /> View Client
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {candidate && (
                      <DropdownMenuItem asChild className={`${t("text-gray-600", "text-zinc-300")} ${t("focus:text-gray-900", "focus:text-white")} ${t("focus:bg-gray-100", "focus:bg-zinc-800")}`}>
                        <Link to={createPageUrl('TalentCandidates')}>
                          <User className="w-4 h-4 mr-2" /> View Candidate
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className={t("bg-gray-200", "bg-zinc-800")} />
                    <DropdownMenuItem onClick={() => onDelete(deal.id)} className="text-red-400 focus:text-red-300 focus:bg-red-950/30">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Deal
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Candidate */}
            {candidate && (
              <div className={`mt-2 flex items-center gap-2 text-xs ${t("text-gray-500", "text-zinc-400")}`}>
                <User className="w-3 h-3" />
                <span className="truncate">{candidate.first_name} {candidate.last_name}</span>
              </div>
            )}

            {/* Value */}
            <div className="mt-4 flex items-center justify-between">
              <div>
                <span className={`text-2xl font-bold ${t("text-gray-900", "text-white")}`}>€{displayValue.toLocaleString()}</span>
                <span className={`${t("text-gray-300", "text-zinc-600")} text-sm ml-2`}>· {probability}%</span>
              </div>
            </div>

            {/* Progress bar for probability */}
            <div className="mt-3">
              <Progress value={probability} className={`h-1.5 ${t("bg-gray-200", "bg-zinc-800")} [&>div]:bg-red-500`} />
            </div>

            {/* Footer info */}
            <div className={`mt-4 pt-3 border-t ${t("border-gray-200", "border-zinc-800/50")} flex items-center justify-between text-xs`}>
              <div className="flex items-center gap-3">
                {deal.expected_start_date && (
                  <span className={`flex items-center gap-1 ${t("text-gray-400", "text-zinc-500")}`}>
                    <Calendar className="w-3 h-3" />
                    {new Date(deal.expected_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
                <span className={`flex items-center gap-1 ${t("text-gray-400", "text-zinc-500")}`}>
                  <Clock className="w-3 h-3" /> {days}d
                </span>
              </div>
              {deal.fee_type && (
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-400", "text-zinc-500")}`}>
                  {deal.fee_type === 'percentage' ? `${deal.fee_percentage || 20}%` : 'Flat'}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

function StageColumn({ stage, deals, onEdit, onDelete, onAddDeal, clients, candidates, t }) {
  const stageValue = deals.reduce((sum, d) => {
    const val = d.deal_value || (
      d.fee_type === 'percentage' && d.candidate_salary && d.fee_percentage
        ? (d.candidate_salary * d.fee_percentage / 100)
        : d.fee_flat || 0
    );
    return sum + val;
  }, 0);
  const weightedValue = deals.reduce((sum, d) => {
    const val = d.deal_value || (
      d.fee_type === 'percentage' && d.candidate_salary && d.fee_percentage
        ? (d.candidate_salary * d.fee_percentage / 100)
        : d.fee_flat || 0
    );
    const prob = d.probability || stage.probability;
    return sum + (val * prob / 100);
  }, 0);

  return (
    <div className="flex-shrink-0 w-72">
      <div className={`sticky top-0 z-10 pb-3 ${t("bg-gray-50", "bg-black")}`}>
        {/* Column Header */}
        <div className={`${t("bg-white/70", "bg-zinc-900/70")} backdrop-blur-xl rounded-xl border ${t("border-gray-200", "border-zinc-800/60")} p-4`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${stage.color}`} />
              <h3 className={`${t("text-gray-900", "text-white")} font-semibold text-sm`}>{stage.label}</h3>
              <Badge className={`${t("bg-gray-100", "bg-zinc-800")} ${t("text-gray-600", "text-zinc-300")} text-xs`}>{deals.length}</Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 ${t("text-gray-400", "text-zinc-500")} ${t("hover:text-gray-900", "hover:text-white")} ${t("hover:bg-gray-100", "hover:bg-zinc-800")}`}
              onClick={() => onAddDeal(stage.id)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold text-red-400/80">€{stageValue.toLocaleString()}</span>
              <span className={`text-xs ${t("text-gray-300", "text-zinc-600")}`}>total</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className={`text-sm ${t("text-gray-400", "text-zinc-500")}`}>€{Math.round(weightedValue).toLocaleString()}</span>
              <span className={`text-xs ${t("text-gray-300", "text-zinc-600")}`}>weighted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-3 min-h-[300px] rounded-xl p-2 transition-colors duration-200 ${
              snapshot.isDraggingOver
                ? `bg-red-500/5 border-2 border-dashed border-red-500/40`
                : 'border-2 border-transparent'
            }`}
          >
            {deals.map((deal, index) => (
              <DealCard
                key={deal.id}
                deal={deal}
                onEdit={onEdit}
                onDelete={onDelete}
                stageConfig={stage}
                index={index}
                clients={clients}
                candidates={candidates}
                t={t}
              />
            ))}
            {provided.placeholder}

            {deals.length === 0 && !snapshot.isDraggingOver && (
              <div
                className={`flex flex-col items-center justify-center py-8 text-center border-2 border-dashed ${t("border-gray-200", "border-zinc-800")} rounded-xl cursor-pointer ${t("hover:border-gray-300", "hover:border-zinc-700")} transition-colors`}
                onClick={() => onAddDeal(stage.id)}
              >
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${stage.color} opacity-20 flex items-center justify-center mb-3`}>
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <p className={`${t("text-gray-300", "text-zinc-600")} text-sm`}>Drop deal here</p>
                <p className={`${t("text-gray-300", "text-zinc-700")} text-xs mt-1`}>or click to add</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default function TalentDeals() {
  const { user } = useUser();
  const { t } = useTheme();
  const [deals, setDeals] = useState([]);
  const [clients, setClients] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Refs for anime.js animations
  const headerRef = useRef(null);
  const statsGridRef = useRef(null);
  const pipelineRef = useRef(null);

  useEffect(() => {
    if (user?.organization_id) {
      loadData();
    } else if (user) {
      setLoading(false);
    }
  }, [user]);

  const loadData = async () => {
    if (!user?.organization_id) {
      setLoading(false);
      return;
    }

    try {
      // Load deals
      const { data: dealsData, error: dealsError } = await supabase
        .from('talent_deals')
        .select('*')
        .eq('organization_id', user.organization_id)
        .order('created_at', { ascending: false });

      if (dealsError) throw dealsError;
      setDeals(dealsData || []);

      // Load clients (prospects with is_recruitment_client=true OR contact_type='client')
      const { data: clientsData } = await supabase
        .from('prospects')
        .select('id, first_name, last_name, company, email, phone, is_recruitment_client, recruitment_fee_percentage, recruitment_fee_flat')
        .or('is_recruitment_client.eq.true,contact_type.eq.client')
        .eq('organization_id', user.organization_id);

      setClients((clientsData || []).map(c => ({
        ...c,
        name: [c.first_name, c.last_name].filter(Boolean).join(' ') || c.company,
        company_name: c.company
      })));

      // Load candidates
      const { data: candidatesData } = await supabase
        .from('candidates')
        .select('id, first_name, last_name, email, current_title, current_company')
        .eq('organization_id', user.organization_id);

      setCandidates(candidatesData || []);

      // Load projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name, client_name')
        .eq('organization_id', user.organization_id);

      setProjects(projectsData || []);

    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load deals');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    // Dropped outside a valid droppable
    if (!destination) return;

    // Dropped in the same position
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const dealId = draggableId;
    const newStage = destination.droppableId;
    const sourceStage = source.droppableId;

    // Get deals in the destination column for position calculation
    const destDeals = deals.filter(d => d.stage === newStage);

    // Optimistic update for immediate UI feedback
    setDeals(prev => {
      const updated = prev.map(d => {
        if (d.id === dealId) {
          return { ...d, stage: newStage, updated_at: new Date().toISOString() };
        }
        return d;
      });
      return updated;
    });

    // Only update database if stage actually changed
    if (newStage !== sourceStage) {
      try {
        const stageConfig = STAGES.find(s => s.id === newStage);
        const updateData = {
          stage: newStage,
          probability: stageConfig?.probability || 50,
          updated_at: new Date().toISOString()
        };

        // If moving to confirmed, set closed_at
        if (newStage === 'confirmed') {
          updateData.closed_at = new Date().toISOString();
          updateData.confirmed_date = new Date().toISOString();
        }

        const { error } = await supabase
          .from('talent_deals')
          .update(updateData)
          .eq('id', dealId);

        if (error) throw error;
        toast.success(`Deal moved to ${STAGES.find(s => s.id === newStage)?.label}`);
      } catch (error) {
        console.error('Failed to update:', error);
        toast.error('Failed to update deal stage');
        loadData(); // Reload on error
      }
    }
  };

  const handleSave = async () => {
    if (!formData.title) {
      toast.error('Deal title is required');
      return;
    }

    setSaving(true);
    try {
      const stageConfig = STAGES.find(s => s.id === formData.stage);

      // Calculate deal_value
      let dealValue = formData.deal_value ? parseFloat(formData.deal_value) : null;
      if (!dealValue && formData.fee_type === 'percentage' && formData.candidate_salary && formData.fee_percentage) {
        dealValue = parseFloat(formData.candidate_salary) * parseFloat(formData.fee_percentage) / 100;
      } else if (!dealValue && formData.fee_type === 'flat' && formData.fee_flat) {
        dealValue = parseFloat(formData.fee_flat);
      }

      const dealData = {
        organization_id: user.organization_id,
        title: formData.title,
        description: formData.description || null,
        client_id: formData.client_id || null,
        candidate_id: formData.candidate_id || null,
        project_id: formData.project_id || null,
        stage: formData.stage,
        deal_value: dealValue,
        fee_type: formData.fee_type,
        fee_percentage: formData.fee_percentage ? parseFloat(formData.fee_percentage) : null,
        fee_flat: formData.fee_flat ? parseFloat(formData.fee_flat) : null,
        candidate_salary: formData.candidate_salary ? parseFloat(formData.candidate_salary) : null,
        expected_start_date: formData.expected_start_date || null,
        probability: stageConfig?.probability || 50,
        notes: formData.notes || null,
        currency: formData.currency || 'EUR',
      };

      if (selectedDeal) {
        const { error } = await supabase
          .from('talent_deals')
          .update(dealData)
          .eq('id', selectedDeal.id);
        if (error) throw error;
        toast.success(`Deal "${formData.title}" updated`);
      } else {
        const { error } = await supabase
          .from('talent_deals')
          .insert(dealData);
        if (error) throw error;
        toast.success(`Deal "${formData.title}" created`);
      }

      setShowModal(false);
      setSelectedDeal(null);
      setFormData(emptyForm);
      loadData();
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error(error.message || 'Failed to save deal');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this deal?')) return;
    try {
      const { error } = await supabase
        .from('talent_deals')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setDeals(prev => prev.filter(d => d.id !== id));
      toast.success('Deal deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const openEditModal = (deal) => {
    setSelectedDeal(deal);
    setFormData({
      title: deal.title || '',
      description: deal.description || '',
      client_id: deal.client_id || '',
      candidate_id: deal.candidate_id || '',
      project_id: deal.project_id || '',
      stage: deal.stage || 'lead',
      deal_value: deal.deal_value?.toString() || '',
      fee_type: deal.fee_type || 'percentage',
      fee_percentage: deal.fee_percentage?.toString() || '20',
      fee_flat: deal.fee_flat?.toString() || '',
      candidate_salary: deal.candidate_salary?.toString() || '',
      expected_start_date: deal.expected_start_date || '',
      notes: deal.notes || '',
      currency: deal.currency || 'EUR'
    });
    setShowModal(true);
  };

  const openNewModal = (stage = 'lead') => {
    setSelectedDeal(null);
    setFormData({ ...emptyForm, stage });
    setShowModal(true);
  };

  // Calculate stats
  const stats = useMemo(() => {
    const activeDeals = deals.filter(d => d.stage !== 'confirmed' && d.stage !== 'lost');
    const confirmedDeals = deals.filter(d => d.stage === 'confirmed');

    const calcValue = (d) => d.deal_value || (
      d.fee_type === 'percentage' && d.candidate_salary && d.fee_percentage
        ? (d.candidate_salary * d.fee_percentage / 100)
        : d.fee_flat || 0
    );

    const totalPipeline = activeDeals.reduce((sum, d) => sum + calcValue(d), 0);
    const weightedPipeline = activeDeals.reduce((sum, d) => {
      const stage = STAGES.find(s => s.id === d.stage);
      const prob = d.probability || stage?.probability || 0;
      return sum + (calcValue(d) * prob / 100);
    }, 0);
    const confirmedValue = confirmedDeals.reduce((sum, d) => sum + calcValue(d), 0);
    const avgDealSize = activeDeals.length > 0 ? totalPipeline / activeDeals.length : 0;

    return { totalPipeline, weightedPipeline, confirmedValue, avgDealSize, activeDeals: activeDeals.length, confirmedDeals: confirmedDeals.length };
  }, [deals]);

  // Animate header on mount
  useEffect(() => {
    if (loading || !headerRef.current || prefersReducedMotion()) return;

    animate({
      targets: headerRef.current,
      translateY: [-20, 0],
      opacity: [0, 1],
      duration: 500,
      easing: 'easeOutQuart',
    });
  }, [loading]);

  // Animate stats grid
  useEffect(() => {
    if (loading || !statsGridRef.current || prefersReducedMotion()) return;

    const cards = statsGridRef.current.querySelectorAll('.stat-card');
    if (cards.length === 0) return;

    Array.from(cards).forEach(card => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
    });

    animate({
      targets: cards,
      translateY: [20, 0],
      opacity: [0, 1],
      delay: anime.stagger(60, { start: 100 }),
      duration: 450,
      easing: 'easeOutQuart',
    });
  }, [loading, stats]);

  if (loading) {
    return (
      <div className={`min-h-screen ${t("bg-gray-50", "bg-black")} relative`}>
        <div className="relative z-10 w-full px-4 lg:px-6 py-4 space-y-4">
          <Skeleton className={`h-20 w-full ${t("bg-gray-200", "bg-zinc-800")} rounded-xl`} />
          <div className="grid grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className={`h-16 ${t("bg-gray-200", "bg-zinc-800")} rounded-xl`} />)}
          </div>
          <div className="flex gap-3 overflow-x-auto">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className={`h-[500px] w-72 flex-shrink-0 ${t("bg-gray-200", "bg-zinc-800")} rounded-xl`} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${t("bg-gray-50", "bg-black")} relative`}>
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full px-4 lg:px-6 py-4 space-y-4">
        <div ref={headerRef} style={{ opacity: 0 }}>
          <PageHeader
            icon={Handshake}
            title="Recruitment Pipeline"
            subtitle={`${stats.activeDeals} active deals · €${stats.totalPipeline.toLocaleString()} in pipeline`}
            color="red"
            actions={
              <Button
                onClick={() => openNewModal()}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Deal
              </Button>
            }
          />
        </div>

        {/* Stats Row */}
        <div ref={statsGridRef} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className={`stat-card p-3 rounded-xl ${t("bg-white", "bg-zinc-900/50")} border ${t("border-gray-200", "border-zinc-800/60")}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`${t("text-gray-400", "text-zinc-500")} text-xs`}>Pipeline Value</p>
                <p className={`text-lg font-bold ${t("text-gray-900", "text-white")} mt-0.5`}>€{stats.totalPipeline.toLocaleString()}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Euro className="w-4 h-4 text-red-400/70" />
              </div>
            </div>
          </div>

          <div className={`stat-card p-3 rounded-xl ${t("bg-white", "bg-zinc-900/50")} border ${t("border-gray-200", "border-zinc-800/60")}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`${t("text-gray-400", "text-zinc-500")} text-xs`}>Weighted Forecast</p>
                <p className={`text-lg font-bold ${t("text-gray-900", "text-white")} mt-0.5`}>€{Math.round(stats.weightedPipeline).toLocaleString()}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-red-400/70" />
              </div>
            </div>
          </div>

          <div className={`stat-card p-3 rounded-xl ${t("bg-white", "bg-zinc-900/50")} border ${t("border-gray-200", "border-zinc-800/60")}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`${t("text-gray-400", "text-zinc-500")} text-xs`}>Confirmed Revenue</p>
                <p className={`text-lg font-bold ${t("text-gray-900", "text-white")} mt-0.5`}>€{stats.confirmedValue.toLocaleString()}</p>
                <p className="text-[10px] text-red-400/70">{stats.confirmedDeals} placements</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-red-400/70" />
              </div>
            </div>
          </div>

          <div className={`stat-card p-3 rounded-xl ${t("bg-white", "bg-zinc-900/50")} border ${t("border-gray-200", "border-zinc-800/60")}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`${t("text-gray-400", "text-zinc-500")} text-xs`}>Avg Deal Size</p>
                <p className={`text-lg font-bold ${t("text-gray-900", "text-white")} mt-0.5`}>€{Math.round(stats.avgDealSize).toLocaleString()}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
                <Target className="w-4 h-4 text-red-400/60" />
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Board */}
        <div className="mt-4">
        {deals.length === 0 ? (
          <div className={`p-16 text-center rounded-2xl ${t("bg-white", "bg-zinc-900/50")} border ${t("border-gray-200", "border-zinc-800/60")}`}>
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center mx-auto mb-6">
              <Handshake className="w-10 h-10 text-red-400" />
            </div>
            <h3 className={`text-2xl font-bold ${t("text-gray-900", "text-white")} mb-3`}>Start Your Recruitment Pipeline</h3>
            <p className={`${t("text-gray-500", "text-zinc-400")} mb-8 max-w-md mx-auto`}>
              Track your recruitment deals from lead to confirmed placement. Add your first deal to get started.
            </p>
            <Button onClick={() => openNewModal()} className="bg-red-600/80 hover:bg-red-600 text-white font-medium px-6">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Deal
            </Button>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div ref={pipelineRef} className="flex gap-4 overflow-x-auto pb-6">
              {STAGES.map((stage) => (
                <StageColumn
                  key={stage.id}
                  stage={stage}
                  deals={deals.filter(d => d.stage === stage.id)}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                  onAddDeal={openNewModal}
                  clients={clients}
                  candidates={candidates}
                  t={t}
                />
              ))}
            </div>
          </DragDropContext>
        )}
        </div>

        {/* Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className={`${t("bg-white", "bg-zinc-900")} ${t("border-gray-200", "border-zinc-800")} max-w-xl p-0 overflow-hidden`}>
            <div className={`px-6 py-4 border-b ${t("border-gray-200", "border-zinc-800")} bg-gradient-to-r from-red-500/10 to-red-600/10`}>
              <DialogTitle className={`text-lg font-semibold ${t("text-gray-900", "text-white")} flex items-center gap-3`}>
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Handshake className="w-5 h-5 text-red-400" />
                </div>
                {selectedDeal ? 'Edit Deal' : 'New Deal'}
              </DialogTitle>
            </div>

            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className={`${t("text-gray-500", "text-zinc-400")} text-sm mb-1.5 block`}>Deal Title <span className="text-red-400">*</span></label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`${t("bg-gray-100", "bg-zinc-800/50")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")} focus:border-red-500`}
                  placeholder="e.g. Senior Developer - TechCorp"
                />
              </div>

              {/* Client & Project */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`${t("text-gray-500", "text-zinc-400")} text-sm mb-1.5 block`}>Client</label>
                  <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
                    <SelectTrigger className={`${t("bg-gray-100", "bg-zinc-800/50")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")} focus:border-red-500`}>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent className={`${t("bg-white", "bg-zinc-900")} ${t("border-gray-200", "border-zinc-700")}`}>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="flex items-center gap-2">
                            <Building2 className="w-3 h-3" />
                            {c.name || c.company_name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={`${t("text-gray-500", "text-zinc-400")} text-sm mb-1.5 block`}>Project</label>
                  <Select value={formData.project_id} onValueChange={(v) => setFormData({ ...formData, project_id: v })}>
                    <SelectTrigger className={`${t("bg-gray-100", "bg-zinc-800/50")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")} focus:border-red-500`}>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent className={`${t("bg-white", "bg-zinc-900")} ${t("border-gray-200", "border-zinc-700")}`}>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="flex items-center gap-2">
                            <Briefcase className="w-3 h-3" />
                            {p.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Candidate & Stage */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`${t("text-gray-500", "text-zinc-400")} text-sm mb-1.5 block`}>Candidate</label>
                  <Select value={formData.candidate_id} onValueChange={(v) => setFormData({ ...formData, candidate_id: v })}>
                    <SelectTrigger className={`${t("bg-gray-100", "bg-zinc-800/50")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")} focus:border-red-500`}>
                      <SelectValue placeholder="Select candidate" />
                    </SelectTrigger>
                    <SelectContent className={`${t("bg-white", "bg-zinc-900")} ${t("border-gray-200", "border-zinc-700")}`}>
                      {candidates.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="flex items-center gap-2">
                            <User className="w-3 h-3" />
                            {c.first_name} {c.last_name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={`${t("text-gray-500", "text-zinc-400")} text-sm mb-1.5 block`}>Stage</label>
                  <Select value={formData.stage} onValueChange={(v) => setFormData({ ...formData, stage: v })}>
                    <SelectTrigger className={`${t("bg-gray-100", "bg-zinc-800/50")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")} focus:border-red-500`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={`${t("bg-white", "bg-zinc-900")} ${t("border-gray-200", "border-zinc-700")}`}>
                      {STAGES.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${s.bgAccent}`} />
                            {s.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Fee Structure */}
              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-red-400">
                  <Euro className="w-4 h-4" />
                  Fee Structure
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={`${t("text-gray-500", "text-zinc-400")} text-sm mb-1.5 block`}>Fee Type</label>
                    <Select value={formData.fee_type} onValueChange={(v) => setFormData({ ...formData, fee_type: v })}>
                      <SelectTrigger className={`${t("bg-gray-100", "bg-zinc-800/50")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={`${t("bg-white", "bg-zinc-900")} ${t("border-gray-200", "border-zinc-700")}`}>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="flat">Flat Fee</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(formData.fee_type === 'percentage' || formData.fee_type === 'mixed') && (
                    <div>
                      <label className={`${t("text-gray-500", "text-zinc-400")} text-sm mb-1.5 block`}>Percentage</label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={formData.fee_percentage}
                          onChange={(e) => setFormData({ ...formData, fee_percentage: e.target.value })}
                          className={`${t("bg-gray-100", "bg-zinc-800/50")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")} pr-7`}
                          placeholder="20"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                      </div>
                    </div>
                  )}
                  {(formData.fee_type === 'flat' || formData.fee_type === 'mixed') && (
                    <div>
                      <label className={`${t("text-gray-500", "text-zinc-400")} text-sm mb-1.5 block`}>Flat Fee</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">€</span>
                        <Input
                          type="number"
                          value={formData.fee_flat}
                          onChange={(e) => setFormData({ ...formData, fee_flat: e.target.value })}
                          className={`${t("bg-gray-100", "bg-zinc-800/50")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")} pl-7`}
                          placeholder="5000"
                        />
                      </div>
                    </div>
                  )}
                </div>
                {formData.fee_type === 'percentage' && (
                  <div>
                    <label className={`${t("text-gray-500", "text-zinc-400")} text-sm mb-1.5 block`}>Candidate Salary (for fee calculation)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">€</span>
                      <Input
                        type="number"
                        value={formData.candidate_salary}
                        onChange={(e) => setFormData({ ...formData, candidate_salary: e.target.value })}
                        className={`${t("bg-gray-100", "bg-zinc-800/50")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")} pl-7`}
                        placeholder="75000"
                      />
                    </div>
                    {formData.candidate_salary && formData.fee_percentage && (
                      <p className="text-xs text-red-400 mt-2">
                        Calculated fee: €{(parseFloat(formData.candidate_salary) * parseFloat(formData.fee_percentage) / 100).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Expected Start Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`${t("text-gray-500", "text-zinc-400")} text-sm mb-1.5 block`}>Expected Start Date</label>
                  <Input
                    type="date"
                    value={formData.expected_start_date}
                    onChange={(e) => setFormData({ ...formData, expected_start_date: e.target.value })}
                    className={`${t("bg-gray-100", "bg-zinc-800/50")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")} focus:border-red-500`}
                  />
                </div>
                <div>
                  <label className={`${t("text-gray-500", "text-zinc-400")} text-sm mb-1.5 block`}>Direct Value Override</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">€</span>
                    <Input
                      type="number"
                      value={formData.deal_value}
                      onChange={(e) => setFormData({ ...formData, deal_value: e.target.value })}
                      className={`${t("bg-gray-100", "bg-zinc-800/50")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")} pl-7`}
                      placeholder="Auto-calculated"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={`${t("text-gray-500", "text-zinc-400")} text-sm mb-1.5 block`}>Notes</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className={`${t("bg-gray-100", "bg-zinc-800/50")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")} focus:border-red-500 resize-none`}
                  rows={3}
                  placeholder="Add any relevant notes..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className={`px-6 py-4 border-t ${t("border-gray-200", "border-zinc-800")} ${t("bg-gray-50", "bg-zinc-900/80")} flex items-center justify-between`}>
              <div className={`text-xs ${t("text-gray-400", "text-zinc-500")}`}>
                {formData.fee_percentage && formData.candidate_salary && (
                  <span>Est. Value: <span className="text-red-400 font-medium">€{Math.round(parseFloat(formData.candidate_salary) * parseFloat(formData.fee_percentage) / 100).toLocaleString()}</span></span>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowModal(false)} className={`${t("border-gray-200", "border-zinc-700")} ${t("text-gray-600", "text-zinc-300")} ${t("hover:bg-gray-100", "hover:bg-zinc-800")}`}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!formData.title || saving} className="bg-red-500 hover:bg-red-400 text-white min-w-[100px]">
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {selectedDeal ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    selectedDeal ? 'Update' : 'Create'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
