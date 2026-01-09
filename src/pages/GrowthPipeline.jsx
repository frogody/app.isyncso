import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { animate, stagger } from 'animejs';
import { prefersReducedMotion } from '@/lib/animations';
import { base44 } from "@/api/base44Client";
import { useUser } from "@/components/context/UserContext";
import {
  Plus, GripVertical, Building2, User, DollarSign, Calendar, Target, Clock,
  TrendingUp, ArrowRight, MoreHorizontal, Mail, Phone, ExternalLink, Trash2,
  Sparkles, Filter, ChevronDown, AlertCircle, CheckCircle2, Zap
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

// Pipeline stages - synced with CRMContacts for consistency
const STAGES = [
  { id: 'new', label: 'New Lead', color: 'from-blue-500 to-blue-600', accent: 'text-blue-400', bgAccent: 'bg-blue-500', borderAccent: 'border-blue-500/50', probability: 10 },
  { id: 'contacted', label: 'Contacted', color: 'from-cyan-500 to-cyan-600', accent: 'text-cyan-400', bgAccent: 'bg-cyan-500', borderAccent: 'border-cyan-500/50', probability: 20 },
  { id: 'qualified', label: 'Qualified', color: 'from-indigo-500/60 to-indigo-600/60', accent: 'text-indigo-400/70', bgAccent: 'bg-indigo-500/60', borderAccent: 'border-indigo-500/40', probability: 40 },
  { id: 'proposal', label: 'Proposal', color: 'from-purple-500/70 to-purple-600/70', accent: 'text-purple-400/80', bgAccent: 'bg-purple-500/70', borderAccent: 'border-purple-500/50', probability: 60 },
  { id: 'negotiation', label: 'Negotiation', color: 'from-yellow-500/80 to-yellow-600/80', accent: 'text-yellow-400/90', bgAccent: 'bg-yellow-500/80', borderAccent: 'border-yellow-500/60', probability: 80 },
  { id: 'won', label: 'Won', color: 'from-green-500 to-green-600', accent: 'text-green-400', bgAccent: 'bg-green-500', borderAccent: 'border-green-500/70', probability: 100 },
];

const emptyForm = {
  company_name: '', contact_name: '', contact_email: '', stage: 'new',
  deal_value: '', probability: '', expected_close_date: '', source: '', notes: '', next_action: ''
};

function DealCard({ opp, onEdit, onDelete, stageConfig, index }) {
  const getDaysInStage = () => {
    const created = new Date(opp.updated_date || opp.created_date);
    return Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
  };

  const days = getDaysInStage();
  const isOverdue = opp.expected_close_date && new Date(opp.expected_close_date) < new Date();
  const probability = opp.probability || stageConfig.probability;

  return (
    <Draggable draggableId={opp.id} index={index}>
      {(provided, snapshot) => (
        <motion.div
          ref={provided.innerRef}
          {...provided.draggableProps}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ delay: index * 0.03 }}
          className={`group relative bg-zinc-900/60 backdrop-blur-sm rounded-xl border transition-all duration-200 ${
            snapshot.isDragging 
              ? `shadow-2xl shadow-indigo-500/10 border-indigo-500/30 scale-[1.02]` 
              : `border-zinc-800/60 hover:border-zinc-700/60`
          }`}
        >
          {/* Top gradient bar */}
          <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r ${stageConfig.color} opacity-60`} />
          
          <div className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0" onClick={() => onEdit(opp)}>
                <h4 className="font-semibold text-white truncate cursor-pointer hover:text-indigo-400/80 transition-colors">
                  {opp.company_name}
                </h4>
                {opp.contact_name && (
                  <p className="text-zinc-500 text-sm flex items-center gap-1.5 mt-1">
                    <User className="w-3 h-3" />
                    <span className="truncate">{opp.contact_name}</span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <div {...provided.dragHandleProps} className="p-1 rounded hover:bg-zinc-800 cursor-grab">
                  <GripVertical className="w-4 h-4 text-zinc-600" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-4 h-4 text-zinc-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                    <DropdownMenuItem onClick={() => onEdit(opp)} className="text-zinc-300 focus:text-white focus:bg-zinc-800">
                      <ExternalLink className="w-4 h-4 mr-2" /> View Details
                    </DropdownMenuItem>
                    {opp.contact_email && (
                      <DropdownMenuItem onClick={() => window.location.href = `mailto:${opp.contact_email}`} className="text-zinc-300 focus:text-white focus:bg-zinc-800">
                        <Mail className="w-4 h-4 mr-2" /> Send Email
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuItem onClick={() => onDelete(opp.id)} className="text-red-400 focus:text-red-300 focus:bg-red-950/30">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Deal
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Value */}
            <div className="mt-4 flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold text-white">€{(opp.deal_value || 0).toLocaleString()}</span>
                <span className="text-zinc-600 text-sm ml-2">· {probability}%</span>
              </div>
            </div>

            {/* Progress bar for probability */}
            <div className="mt-3">
              <Progress value={probability} className="h-1.5 bg-zinc-800" />
            </div>

            {/* Footer info */}
            <div className="mt-4 pt-3 border-t border-zinc-800/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                {isOverdue ? (
                  <span className="flex items-center gap-1 text-red-400">
                    <AlertCircle className="w-3 h-3" /> Overdue
                  </span>
                ) : opp.expected_close_date ? (
                  <span className="flex items-center gap-1 text-zinc-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(opp.expected_close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                ) : null}
                <span className="flex items-center gap-1 text-zinc-500">
                  <Clock className="w-3 h-3" /> {days}d
                </span>
              </div>
              {opp.source && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-zinc-700 text-zinc-500">
                  {opp.source}
                </Badge>
              )}
            </div>

            {/* Next action */}
            {opp.next_action && (
              <div className="mt-3 p-2 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                <p className="text-xs text-indigo-400/80 flex items-center gap-1.5">
                  <Zap className="w-3 h-3" />
                  <span className="truncate">{opp.next_action}</span>
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </Draggable>
  );
}

function StageColumn({ stage, opportunities, onEdit, onDelete, onAddDeal }) {
  const stageValue = opportunities.reduce((sum, o) => sum + (o.deal_value || 0), 0);
  const weightedValue = opportunities.reduce((sum, o) => {
    const prob = o.probability || stage.probability;
    return sum + ((o.deal_value || 0) * prob / 100);
  }, 0);

  return (
    <div className="flex-shrink-0 w-80">
      <div className="sticky top-0 z-10 pb-3 bg-black">
        {/* Column Header */}
        <div className="bg-zinc-900/70 backdrop-blur-xl rounded-xl border border-zinc-800/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${stage.color}`} />
              <h3 className="text-white font-semibold">{stage.label}</h3>
              <Badge className="bg-zinc-800 text-zinc-300 text-xs">{opportunities.length}</Badge>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-zinc-500 hover:text-white hover:bg-zinc-800"
              onClick={() => onAddDeal(stage.id)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold text-indigo-400/80">€{stageValue.toLocaleString()}</span>
              <span className="text-xs text-zinc-600">total</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-zinc-500">€{Math.round(weightedValue).toLocaleString()}</span>
              <span className="text-xs text-zinc-600">weighted</span>
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
            className={`space-y-3 min-h-[400px] rounded-xl p-2 transition-all duration-200 ${
              snapshot.isDraggingOver 
                ? `bg-gradient-to-b from-indigo-500/3 to-transparent border-2 border-dashed border-indigo-500/30` 
                : 'border-2 border-transparent'
            }`}
          >
            <AnimatePresence>
              {opportunities.map((opp, index) => (
                <DealCard 
                  key={opp.id} 
                  opp={opp} 
                  onEdit={onEdit} 
                  onDelete={onDelete}
                  stageConfig={stage}
                  index={index}
                />
              ))}
            </AnimatePresence>
            {provided.placeholder}
            
            {opportunities.length === 0 && !snapshot.isDraggingOver && (
              <div 
                className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition-colors"
                onClick={() => onAddDeal(stage.id)}
              >
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${stage.color} opacity-20 flex items-center justify-center mb-3`}>
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <p className="text-zinc-600 text-sm">Drop deal here</p>
                <p className="text-zinc-700 text-xs mt-1">or click to add</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default function GrowthPipeline() {
  const { user } = useUser();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  // Refs for anime.js animations
  const headerRef = useRef(null);
  const statsGridRef = useRef(null);
  const pipelineRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const loadOpportunities = async () => {
      if (!user?.id) {
        if (isMounted) setLoading(false);
        return;
      }
      try {
        // Use Prospect entity - RLS handles access control
        const prospects = await base44.entities.Prospect.list({ limit: 100 }).catch(() => []);
        if (!isMounted) return;
        // Map Prospect fields to opportunity format for display
        const opps = (prospects || []).map(p => ({
          id: p.id,
          company_name: p.company_name,
          contact_name: p.contact_name,
          contact_email: p.contact_email,
          stage: p.stage || 'new',
          deal_value: p.deal_value || p.estimated_value || 0,
          probability: p.score || 50,
          expected_close_date: p.next_follow_up,
          source: p.source,
          notes: p.notes,
          next_action: null,
          created_date: p.created_date,
          updated_date: p.updated_date,
        }));
        setOpportunities(opps);
      } catch (error) {
        console.error('Failed to load opportunities:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadOpportunities();
    return () => { isMounted = false; };
  }, [user]);

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const oppId = result.draggableId;
    const newStage = result.destination.droppableId;

    setOpportunities(prev => prev.map(o => o.id === oppId ? { ...o, stage: newStage } : o));

    try {
      // Use Prospect entity (synced with CRM)
      await base44.entities.Prospect.update(oppId, { stage: newStage });
      toast.success(`Deal moved to ${STAGES.find(s => s.id === newStage)?.label}`);
    } catch (error) {
      console.error('Failed to update:', error);
      toast.error('Failed to update deal stage');
      loadOpportunities();
    }
  };

  const handleSave = async () => {
    if (!formData.company_name) {
      toast.error('Company name is required');
      return;
    }
    try {
      // Map to Prospect entity format (synced with CRM)
      const prospectData = {
        company_name: formData.company_name,
        contact_name: formData.contact_name,
        contact_email: formData.contact_email,
        stage: formData.stage,
        deal_value: formData.deal_value ? parseFloat(formData.deal_value) : null,
        score: formData.probability ? parseFloat(formData.probability) : 50,
        source: formData.source,
        notes: formData.notes,
        next_follow_up: formData.expected_close_date || null,
      };

      if (selectedOpp) {
        await base44.entities.Prospect.update(selectedOpp.id, prospectData);
        toast.success('Deal updated');
      } else {
        await base44.entities.Prospect.create(prospectData);
        toast.success('Deal created');
      }

      setShowModal(false);
      setSelectedOpp(null);
      setFormData(emptyForm);
      loadOpportunities();
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save deal');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this deal?')) return;
    try {
      // Use Prospect entity (synced with CRM)
      await base44.entities.Prospect.delete(id);
      setOpportunities(prev => prev.filter(o => o.id !== id));
      toast.success('Deal deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const openEditModal = (opp) => {
    setSelectedOpp(opp);
    setFormData({
      company_name: opp.company_name || '',
      contact_name: opp.contact_name || '',
      contact_email: opp.contact_email || '',
      stage: opp.stage || 'new',
      deal_value: opp.deal_value?.toString() || '',
      probability: opp.probability?.toString() || '',
      expected_close_date: opp.expected_close_date || '',
      source: opp.source || '',
      notes: opp.notes || '',
      next_action: opp.next_action || ''
    });
    setShowModal(true);
  };

  const openNewModal = (stage = 'new') => {
    setSelectedOpp(null);
    setFormData({ ...emptyForm, stage });
    setShowModal(true);
  };

  // Calculate stats
  const stats = useMemo(() => {
    const activeOpps = opportunities.filter(o => o.stage !== 'won' && o.stage !== 'lost');
    const wonOpps = opportunities.filter(o => o.stage === 'won');
    const totalPipeline = activeOpps.reduce((sum, o) => sum + (o.deal_value || 0), 0);
    const weightedPipeline = activeOpps.reduce((sum, o) => {
      const stage = STAGES.find(s => s.id === o.stage);
      const prob = o.probability || stage?.probability || 0;
      return sum + ((o.deal_value || 0) * prob / 100);
    }, 0);
    const wonValue = wonOpps.reduce((sum, o) => sum + (o.deal_value || 0), 0);
    const avgDealSize = activeOpps.length > 0 
      ? totalPipeline / activeOpps.length 
      : 0;
    
    return { totalPipeline, weightedPipeline, wonValue, avgDealSize, activeDeals: activeOpps.length, wonDeals: wonOpps.length };
  }, [opportunities]);

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

  // Animate stats grid with count-up
  useEffect(() => {
    if (loading || !statsGridRef.current || prefersReducedMotion()) return;

    const cards = statsGridRef.current.querySelectorAll('.stat-card');
    if (cards.length === 0) return;

    // Set initial state
    Array.from(cards).forEach(card => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
    });

    // Staggered entrance animation
    animate({
      targets: cards,
      translateY: [20, 0],
      opacity: [0, 1],
      delay: stagger(60, { start: 100 }),
      duration: 450,
      easing: 'easeOutQuart',
    });

    // Count-up animation for stat numbers
    const statValues = statsGridRef.current.querySelectorAll('.stat-number');
    statValues.forEach(el => {
      const endValue = parseFloat(el.dataset.value) || 0;
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const obj = { value: 0 };

      animate({
        targets: obj,
        value: endValue,
        round: 1,
        duration: 1000,
        delay: 200,
        easing: 'easeOutExpo',
        update: () => {
          el.textContent = prefix + obj.value.toLocaleString() + suffix;
        },
      });
    });
  }, [loading, stats]);

  // Animate pipeline columns
  useEffect(() => {
    if (loading || !pipelineRef.current || prefersReducedMotion()) return;

    const columns = pipelineRef.current.querySelectorAll('.pipeline-column');
    if (columns.length === 0) return;

    // Set initial state
    Array.from(columns).forEach(col => {
      col.style.opacity = '0';
      col.style.transform = 'translateX(-20px)';
    });

    // Staggered entrance animation
    animate({
      targets: columns,
      translateX: [-20, 0],
      opacity: [0, 1],
      delay: stagger(70, { start: 200 }),
      duration: 500,
      easing: 'easeOutQuart',
    });
  }, [loading, opportunities]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="space-y-6">
          <Skeleton className="h-28 w-full bg-zinc-800 rounded-2xl" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 bg-zinc-800 rounded-xl" />)}
          </div>
          <div className="flex gap-4 overflow-x-auto">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-[500px] w-80 flex-shrink-0 bg-zinc-800 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div ref={headerRef} style={{ opacity: 0 }}>
          <PageHeader
            icon={Target}
            title="Sales Pipeline"
            subtitle={`${stats.activeDeals} active deals · €${stats.totalPipeline.toLocaleString()} in pipeline`}
            color="indigo"
            actions={
              <Button
                onClick={() => openNewModal()}
                className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Deal
              </Button>
            }
          />
        </div>

        {/* Stats Row */}
        <div ref={statsGridRef} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-sm">Total Pipeline</p>
                <p className="stat-number text-2xl font-bold text-white mt-1" data-value={stats.totalPipeline} data-prefix="€">€0</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-indigo-400/70" />
              </div>
            </div>
          </div>

          <div className="stat-card p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-sm">Weighted Value</p>
                <p className="stat-number text-2xl font-bold text-white mt-1" data-value={Math.round(stats.weightedPipeline)} data-prefix="€">€0</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-indigo-400/70" />
              </div>
            </div>
          </div>

          <div className="stat-card p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-sm">Won This Period</p>
                <p className="stat-number text-2xl font-bold text-white mt-1" data-value={stats.wonValue} data-prefix="€">€0</p>
                <p className="text-xs text-indigo-400/70 mt-0.5">{stats.wonDeals} deals closed</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-indigo-400/70" />
              </div>
            </div>
          </div>

          <div className="stat-card p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-sm">Avg Deal Size</p>
                <p className="stat-number text-2xl font-bold text-white mt-1" data-value={Math.round(stats.avgDealSize)} data-prefix="€">€0</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                <Target className="w-6 h-6 text-indigo-400/60" />
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Board */}
        {opportunities.length === 0 ? (
          <div className="p-16 text-center rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center mx-auto mb-6">
              <Target className="w-10 h-10 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Build Your Pipeline</h3>
            <p className="text-zinc-400 mb-8 max-w-md mx-auto">
              Start tracking your sales opportunities. Add your first deal to see it flow through your pipeline stages.
            </p>
            <Button onClick={() => openNewModal()} className="bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium px-6">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Deal
            </Button>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div ref={pipelineRef} className="flex gap-4 overflow-x-auto pb-6 -mx-6 px-6">
              {STAGES.map((stage) => (
                <div key={stage.id} className="pipeline-column">
                  <StageColumn
                    stage={stage}
                    opportunities={opportunities.filter(o => o.stage === stage.id)}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                    onAddDeal={openNewModal}
                  />
                </div>
              ))}
            </div>
          </DragDropContext>
        )}

        {/* Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="bg-zinc-900 border-zinc-800 max-w-xl p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 bg-gradient-to-r from-indigo-500/10 to-violet-500/10">
              <DialogTitle className="text-lg font-semibold text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-indigo-400" />
                </div>
                {selectedOpp ? 'Edit Deal' : 'New Deal'}
              </DialogTitle>
            </div>

            <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Company Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-indigo-400">
                  <Building2 className="w-4 h-4" />
                  Company Details
                </div>
                <div className="pl-6 space-y-4">
                  <div>
                    <label className="text-zinc-400 text-sm mb-1.5 block">Company Name <span className="text-indigo-400">*</span></label>
                    <Input 
                      value={formData.company_name} 
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} 
                      className="bg-zinc-800/50 border-zinc-700 text-white focus:border-indigo-500" 
                      placeholder="e.g. Acme Corp" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-zinc-400 text-sm mb-1.5 block">Contact Name</label>
                      <Input 
                        value={formData.contact_name} 
                        onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} 
                        className="bg-zinc-800/50 border-zinc-700 text-white focus:border-indigo-500" 
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 text-sm mb-1.5 block">Email</label>
                      <Input 
                        value={formData.contact_email} 
                        onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} 
                        className="bg-zinc-800/50 border-zinc-700 text-white focus:border-indigo-500" 
                        placeholder="john@acme.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Deal Info Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-indigo-400">
                  <DollarSign className="w-4 h-4" />
                  Deal Information
                </div>
                <div className="pl-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-zinc-400 text-sm mb-1.5 block">Deal Value</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">€</span>
                        <Input 
                          type="number" 
                          value={formData.deal_value} 
                          onChange={(e) => setFormData({ ...formData, deal_value: e.target.value })} 
                          className="bg-zinc-800/50 border-zinc-700 text-white pl-7 focus:border-indigo-500" 
                          placeholder="10,000"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-zinc-400 text-sm mb-1.5 block">Win Probability</label>
                      <div className="relative">
                        <Input 
                          type="number" 
                          min="0" 
                          max="100"
                          value={formData.probability} 
                          onChange={(e) => setFormData({ ...formData, probability: e.target.value })} 
                          className="bg-zinc-800/50 border-zinc-700 text-white pr-7 focus:border-indigo-500" 
                          placeholder="50"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-zinc-400 text-sm mb-1.5 block">Stage</label>
                      <Select value={formData.stage} onValueChange={(v) => setFormData({ ...formData, stage: v })}>
                        <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white focus:border-indigo-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
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
                    <div>
                      <label className="text-zinc-400 text-sm mb-1.5 block">Source</label>
                      <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                        <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white focus:border-indigo-500">
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          <SelectItem value="inbound">Inbound</SelectItem>
                          <SelectItem value="outbound">Outbound</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                          <SelectItem value="partner">Partner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-indigo-400">
                  <Calendar className="w-4 h-4" />
                  Timeline & Actions
                </div>
                <div className="pl-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-zinc-400 text-sm mb-1.5 block">Expected Close</label>
                      <Input 
                        type="date" 
                        value={formData.expected_close_date} 
                        onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })} 
                        className="bg-zinc-800/50 border-zinc-700 text-white focus:border-indigo-500" 
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 text-sm mb-1.5 block">Next Action</label>
                      <Input 
                        value={formData.next_action} 
                        onChange={(e) => setFormData({ ...formData, next_action: e.target.value })} 
                        className="bg-zinc-800/50 border-zinc-700 text-white focus:border-indigo-500" 
                        placeholder="e.g. Follow up call"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-zinc-400 text-sm mb-1.5 block">Notes</label>
                    <Textarea 
                      value={formData.notes} 
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
                      className="bg-zinc-800/50 border-zinc-700 text-white focus:border-indigo-500 resize-none" 
                      rows={3} 
                      placeholder="Add any relevant notes..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
              <div className="text-xs text-zinc-500">
                {formData.deal_value && formData.probability && (
                  <span>Weighted: <span className="text-indigo-400 font-medium">€{Math.round(parseFloat(formData.deal_value) * (parseFloat(formData.probability) / 100)).toLocaleString()}</span></span>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowModal(false)} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!formData.company_name} className="bg-indigo-500 hover:bg-indigo-400 text-white min-w-[100px]">
                  {selectedOpp ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}