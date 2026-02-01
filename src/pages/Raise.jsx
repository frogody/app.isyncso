import React, { useState, useEffect } from 'react';
import { db, supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Euro, Users, FileText, Target, Rocket,
  Building2, Calendar, ArrowUpRight, Plus, Filter, Download,
  PieChart, BarChart3, Briefcase, HandshakeIcon, MessageSquare,
  CheckCircle2, Clock, AlertCircle, ExternalLink, Mail, Phone,
  GripVertical, MoreHorizontal, Trash2, Sun, Moon
} from 'lucide-react';
import { toast } from 'sonner';
import {
  RaiseCard,
  RaiseCardContent,
  RaiseCardHeader,
  RaiseCardTitle,
  RaiseCardDescription,
  RaiseButton,
  RaiseBadge,
  RaiseStatCard,
  RaiseEmptyState,
} from '@/components/raise/ui';
import { MOTION_VARIANTS } from '@/tokens/raise';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/ui/PageHeader';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RaisePageTransition } from '@/components/raise/RaisePageTransition';
import { useTheme } from '@/contexts/GlobalThemeContext';

// Investor Pipeline Stages
const INVESTOR_STAGES = [
  { id: 'contacted', label: 'Contacted', color: 'from-zinc-500 to-zinc-600', accent: 'text-zinc-400', bgAccent: 'bg-zinc-500' },
  { id: 'interested', label: 'Interested', color: 'from-orange-500 to-orange-600', accent: 'text-orange-400', bgAccent: 'bg-orange-500' },
  { id: 'in_discussions', label: 'In Discussions', color: 'from-orange-400 to-orange-500', accent: 'text-orange-400', bgAccent: 'bg-orange-400' },
  { id: 'due_diligence', label: 'Due Diligence', color: 'from-orange-500 to-orange-600', accent: 'text-orange-400', bgAccent: 'bg-orange-500' },
  { id: 'committed', label: 'Committed', color: 'from-green-500 to-green-600', accent: 'text-green-400', bgAccent: 'bg-green-500' },
  { id: 'passed', label: 'Passed', color: 'from-red-500 to-red-600', accent: 'text-red-400', bgAccent: 'bg-red-500' },
];

// Investor Card Component for Kanban
function InvestorCard({ investor, index, stageConfig, onEdit, onDelete }) {
  const { rt } = useTheme();

  return (
    <Draggable draggableId={investor.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          style={{
            ...provided.draggableProps.style,
            transition: snapshot.isDragging
              ? provided.draggableProps.style?.transition
              : 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
          }}
          className={`group relative ${rt('bg-white shadow-sm', 'bg-zinc-900/60')} backdrop-blur-sm rounded-[20px] border ${
            snapshot.isDragging
              ? 'shadow-2xl shadow-orange-500/20 border-orange-500/50 z-50'
              : rt('border-slate-200 hover:border-slate-300', 'border-zinc-800/60 hover:border-zinc-700/60')
          }`}
        >
          {/* Top gradient bar */}
          <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-[20px] bg-gradient-to-r ${stageConfig.color} opacity-60`} />

          <div className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className={`font-semibold ${rt('text-slate-900', 'text-white')} truncate`}>
                  {investor.name || 'Unknown Investor'}
                </h4>
                <p className={`${rt('text-slate-500', 'text-zinc-500')} text-sm flex items-center gap-1.5 mt-1`}>
                  <Building2 className="w-3 h-3" />
                  <span className="truncate">{investor.firm || 'Investment Firm'}</span>
                </p>
              </div>
              <div className="flex items-center gap-1">
                <div {...provided.dragHandleProps} className={`p-1 rounded ${rt('hover:bg-slate-100', 'hover:bg-zinc-800')} cursor-grab`}>
                  <GripVertical className={`w-4 h-4 ${rt('text-slate-400', 'text-zinc-600')}`} />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`h-7 w-7 inline-flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${rt('hover:bg-slate-100', 'hover:bg-zinc-800')}`}>
                      <MoreHorizontal className={`w-4 h-4 ${rt('text-slate-500', 'text-zinc-400')}`} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className={rt('bg-white border-slate-200', 'bg-zinc-900 border-zinc-800')}>
                    <DropdownMenuItem onClick={() => onEdit?.(investor)} className={rt('text-slate-600 focus:text-slate-900 focus:bg-slate-100', 'text-zinc-300 focus:text-white focus:bg-zinc-800')}>
                      <ExternalLink className="w-4 h-4 mr-2" /> View Details
                    </DropdownMenuItem>
                    {investor.email && (
                      <DropdownMenuItem asChild className={rt('text-slate-600 focus:text-slate-900 focus:bg-slate-100', 'text-zinc-300 focus:text-white focus:bg-zinc-800')}>
                        <a href={`mailto:${investor.email}`}>
                          <Mail className="w-4 h-4 mr-2" /> Send Email
                        </a>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className={rt('bg-slate-200', 'bg-zinc-800')} />
                    <DropdownMenuItem onClick={() => onDelete?.(investor.id)} className="text-red-400 focus:text-red-300 focus:bg-red-950/30">
                      <Trash2 className="w-4 h-4 mr-2" /> Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Check Size */}
            {investor.check_size && (
              <div className="mt-3">
                <span className={`text-lg font-bold ${rt('text-slate-900', 'text-white')}`}>
                  ${(investor.check_size / 1000).toFixed(0)}k
                  {investor.check_size_max && ` - ${(investor.check_size_max / 1000).toFixed(0)}k`}
                </span>
                <span className={`${rt('text-slate-400', 'text-zinc-600')} text-sm ml-2`}>check size</span>
              </div>
            )}

            {/* Contact Info */}
            <div className={`mt-3 pt-3 border-t ${rt('border-slate-200', 'border-zinc-800/50')} flex items-center gap-3 text-xs`}>
              {investor.email && (
                <span className={`flex items-center gap-1 ${rt('text-slate-500', 'text-zinc-500')}`}>
                  <Mail className="w-3 h-3" />
                  <span className="truncate max-w-[100px]">{investor.email}</span>
                </span>
              )}
              {investor.linkedin && (
                <a href={investor.linkedin} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1 ${rt('text-slate-500 hover:text-orange-600', 'text-zinc-500 hover:text-orange-400')}`}>
                  <ExternalLink className="w-3 h-3" />
                  LinkedIn
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

// Stage Column Component for Kanban
function InvestorStageColumn({ stage, investors, onAddInvestor, onEdit, onDelete }) {
  const { rt } = useTheme();
  const stageInvestors = investors.filter(i => i.status === stage.id);
  const totalCheckSize = stageInvestors.reduce((sum, i) => sum + (i.check_size || 0), 0);

  return (
    <div className="flex-shrink-0 w-72">
      <div className={`sticky top-0 z-10 pb-3 ${rt('bg-slate-50', 'bg-black')}`}>
        {/* Column Header */}
        <div className={`${rt('bg-white border-slate-200 shadow-sm', 'bg-zinc-900/70 border-zinc-800/60')} backdrop-blur-xl rounded-[20px] border p-4`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${stage.color}`} />
              <h3 className={`${rt('text-slate-900', 'text-white')} font-semibold text-sm`}>{stage.label}</h3>
              <RaiseBadge variant="neutral" size="sm">{stageInvestors.length}</RaiseBadge>
            </div>
            <RaiseButton
              variant="ghost"
              size="sm"
              className="h-7 w-7 !px-0"
              onClick={() => onAddInvestor?.(stage.id)}
              icon={<Plus className="w-4 h-4" />}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className={`text-lg font-bold ${rt('text-orange-600', 'text-orange-400/80')}`}>${(totalCheckSize / 1000).toLocaleString()}k</span>
              <span className={`text-xs ${rt('text-slate-400', 'text-zinc-600')}`}>potential</span>
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
            className={`space-y-3 min-h-[300px] rounded-[20px] p-2 transition-colors duration-200 ${
              snapshot.isDraggingOver
                ? 'bg-orange-500/5 border-2 border-dashed border-orange-500/40'
                : 'border-2 border-transparent'
            }`}
          >
            {stageInvestors.map((investor, index) => (
              <InvestorCard
                key={investor.id}
                investor={investor}
                index={index}
                stageConfig={stage}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
            {provided.placeholder}

            {stageInvestors.length === 0 && !snapshot.isDraggingOver && (
              <div
                className={`flex flex-col items-center justify-center py-8 text-center border-2 border-dashed ${rt('border-slate-200 hover:border-slate-300', 'border-zinc-800 hover:border-zinc-700')} rounded-[20px] cursor-pointer transition-colors`}
                onClick={() => onAddInvestor?.(stage.id)}
              >
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${stage.color} opacity-20 flex items-center justify-center mb-3`}>
                  <Plus className={`w-5 h-5 ${rt('text-slate-900', 'text-white')}`} />
                </div>
                <p className={`${rt('text-slate-400', 'text-zinc-600')} text-sm`}>Drop investor here</p>
                <p className={`${rt('text-slate-400', 'text-zinc-700')} text-xs mt-1`}>or click to add</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default function Raise() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [campaigns, setCampaigns] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [pitchDecks, setPitchDecks] = useState([]);
  const [dataRooms, setDataRooms] = useState([]);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'

  useEffect(() => {
    loadRaiseData();
  }, []);

  const loadRaiseData = async () => {
    try {
      setLoading(true);

      // Load raise-related data from database
      const [campaignsData, investorsData, pitchDecksData, dataRoomsData] = await Promise.all([
        db.entities.RaiseCampaign?.filter({}) || [],
        db.entities.RaiseInvestor?.filter({}) || [],
        db.entities.RaisePitchDeck?.filter({}) || [],
        db.entities.RaiseDataRoom?.filter({}) || []
      ]);

      setCampaigns(campaignsData || []);
      setInvestors(investorsData || []);
      setPitchDecks(pitchDecksData || []);
      setDataRooms(dataRoomsData || []);
    } catch (error) {
      console.error('Error loading raise data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary metrics
  const activeCampaign = campaigns.find(c => c.status === 'active');
  const targetAmount = activeCampaign?.target_amount || 0;
  const raisedAmount = activeCampaign?.raised_amount || 0;
  const progressPercent = targetAmount > 0 ? Math.round((raisedAmount / targetAmount) * 100) : 0;

  const totalInvestors = investors.length;
  const interestedInvestors = investors.filter(i => i.status === 'interested' || i.status === 'in_discussions').length;
  const committedInvestors = investors.filter(i => i.status === 'committed').length;

  const metrics = [
    {
      label: 'Raise Target',
      value: `\u20AC${(targetAmount / 1000000).toFixed(1)}M`,
      subtitle: activeCampaign?.name || 'No active campaign',
      icon: <Target className="w-5 h-5" />,
      accentColor: 'orange',
    },
    {
      label: 'Amount Raised',
      value: `\u20AC${(raisedAmount / 1000000).toFixed(1)}M`,
      subtitle: `${progressPercent}% of target`,
      icon: <Euro className="w-5 h-5" />,
      accentColor: 'green',
    },
    {
      label: 'Investor Pipeline',
      value: totalInvestors,
      subtitle: `${interestedInvestors} interested, ${committedInvestors} committed`,
      icon: <Users className="w-5 h-5" />,
      accentColor: 'blue',
    },
    {
      label: 'Pitch Decks',
      value: pitchDecks.length,
      subtitle: `${dataRooms.length} data rooms`,
      icon: <FileText className="w-5 h-5" />,
      accentColor: 'purple',
    }
  ];

  const getStatusBadgeVariant = (status) => {
    const map = {
      'interested': 'primary',
      'in_discussions': 'primary',
      'due_diligence': 'warning',
      'committed': 'success',
      'passed': 'neutral'
    };
    return map[status] || 'neutral';
  };

  const handleExport = () => {
    try {
      const exportData = {
        generatedAt: new Date().toISOString(),
        activeCampaign: activeCampaign ? {
          name: activeCampaign.name,
          targetAmount: activeCampaign.target_amount,
          raisedAmount: activeCampaign.raised_amount,
          roundType: activeCampaign.round_type,
          status: activeCampaign.status
        } : null,
        summary: {
          targetAmount,
          raisedAmount,
          progressPercent,
          totalInvestors,
          interestedInvestors,
          committedInvestors
        },
        investors: investors.map(i => ({
          id: i.id,
          name: i.name,
          firm: i.firm,
          status: i.status,
          checkSize: i.check_size,
          email: i.email
        })),
        pitchDecks: pitchDecks.map(d => ({
          id: d.id,
          name: d.name,
          version: d.version
        })),
        dataRooms: dataRooms.map(r => ({
          id: r.id,
          name: r.name,
          documentsCount: r.documents_count
        }))
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fundraising-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Fundraising data exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export data');
    }
  };

  // Handle drag and drop for investor pipeline
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    // Dropped outside a valid droppable
    if (!destination) return;

    // Dropped in the same position
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const investorId = draggableId;
    const newStatus = destination.droppableId;
    const sourceStatus = source.droppableId;

    // Optimistic update for immediate UI feedback
    setInvestors(prev => {
      return prev.map(inv => {
        if (inv.id === investorId) {
          return { ...inv, status: newStatus, updated_at: new Date().toISOString() };
        }
        return inv;
      });
    });

    // Only update database if status actually changed
    if (newStatus !== sourceStatus) {
      try {
        // Try to update using the db.entities pattern first, fallback to direct supabase
        if (db.entities.RaiseInvestor?.update) {
          await db.entities.RaiseInvestor.update(investorId, {
            status: newStatus,
            updated_at: new Date().toISOString()
          });
        } else {
          // Fallback to direct supabase call
          const { error } = await supabase
            .from('raise_investors')
            .update({
              status: newStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', investorId);

          if (error) throw error;
        }

        const stageLabel = INVESTOR_STAGES.find(s => s.id === newStatus)?.label || newStatus;
        toast.success(`Investor moved to ${stageLabel}`);
      } catch (error) {
        console.error('Failed to update investor status:', error);
        toast.error('Failed to update investor stage');
        // Reload data on error to revert
        loadRaiseData();
      }
    }
  };

  const handleDeleteInvestor = async (investorId) => {
    if (!confirm('Remove this investor from the pipeline?')) return;

    try {
      if (db.entities.RaiseInvestor?.delete) {
        await db.entities.RaiseInvestor.delete(investorId);
      } else {
        const { error } = await supabase
          .from('raise_investors')
          .delete()
          .eq('id', investorId);
        if (error) throw error;
      }
      setInvestors(prev => prev.filter(inv => inv.id !== investorId));
      toast.success('Investor removed');
    } catch (error) {
      console.error('Failed to delete investor:', error);
      toast.error('Failed to remove investor');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <RaisePageTransition>
      <RaiseContent
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        campaigns={campaigns}
        investors={investors}
        pitchDecks={pitchDecks}
        dataRooms={dataRooms}
        viewMode={viewMode}
        setViewMode={setViewMode}
        activeCampaign={activeCampaign}
        targetAmount={targetAmount}
        raisedAmount={raisedAmount}
        progressPercent={progressPercent}
        totalInvestors={totalInvestors}
        interestedInvestors={interestedInvestors}
        committedInvestors={committedInvestors}
        metrics={metrics}
        getStatusBadgeVariant={getStatusBadgeVariant}
        handleExport={handleExport}
        handleDragEnd={handleDragEnd}
        handleDeleteInvestor={handleDeleteInvestor}
      />
    </RaisePageTransition>
  );
}

function RaiseContent({
  activeTab, setActiveTab, campaigns, investors, pitchDecks, dataRooms,
  viewMode, setViewMode, activeCampaign, targetAmount, raisedAmount,
  progressPercent, totalInvestors, interestedInvestors, committedInvestors,
  metrics, getStatusBadgeVariant, handleExport, handleDragEnd,
  handleDeleteInvestor,
}) {
  const { theme, toggleTheme, rt } = useTheme();

  return (
    <div className={`min-h-screen ${rt('bg-slate-50', 'bg-black')}`}>
      <div className="w-full px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <PageHeader
          icon={Rocket}
          title="Raise"
          subtitle="Fundraising toolkit & investor management"
          color="orange"
          actions={
            <div className="flex gap-2">
              <RaiseButton variant="ghost" size="sm" onClick={toggleTheme} icon={theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />} />
              <RaiseButton variant="secondary" size="sm" onClick={handleExport} icon={<Download className="w-4 h-4" />}>
                Export
              </RaiseButton>
              <RaiseButton size="sm" icon={<Plus className="w-4 h-4" />}>
                New Campaign
              </RaiseButton>
            </div>
          }
        />

      {/* Progress Bar for Active Campaign */}
      {activeCampaign && (
        <RaiseCard className={rt('bg-orange-50 border-orange-200', 'bg-gradient-to-r from-orange-950/50 to-orange-950/50 border-orange-500/20') + ' mb-6'}>
          <RaiseCardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className={`text-lg font-semibold ${rt('text-slate-900', 'text-white')}`}>{activeCampaign.name}</h3>
                <p className={`text-sm ${rt('text-slate-500', 'text-zinc-400')}`}>{activeCampaign.round_type || 'Funding Round'}</p>
              </div>
              <RaiseBadge variant="primary">Active</RaiseBadge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className={rt('text-slate-500', 'text-zinc-400')}>Progress</span>
                <span className={`${rt('text-slate-900', 'text-white')} font-medium`}>
                  ${(raisedAmount / 1000000).toFixed(2)}M / ${(targetAmount / 1000000).toFixed(2)}M
                </span>
              </div>
              <Progress value={progressPercent} className={`h-3 ${rt('bg-slate-200', 'bg-zinc-800')}`} />
              <p className={`text-xs ${rt('text-slate-400', 'text-zinc-500')} text-right`}>{progressPercent}% raised</p>
            </div>
          </RaiseCardContent>
        </RaiseCard>
      )}

      {/* Metrics Grid - Using RaiseStatCard with staggered delays */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {metrics.map((metric, index) => (
          <RaiseStatCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            subtitle={metric.subtitle}
            icon={metric.icon}
            delay={index * 0.08}
            accentColor={metric.accentColor}
          />
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className={rt('bg-slate-100 border border-slate-200', 'bg-zinc-900 border border-zinc-800')}>
          <TabsTrigger value="overview" className={`data-[state=active]:${rt('bg-white', 'bg-zinc-800')}`}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="investors" className={`data-[state=active]:${rt('bg-white', 'bg-zinc-800')}`}>
            <Users className="w-4 h-4 mr-2" />
            Investors
          </TabsTrigger>
          <TabsTrigger value="materials" className={`data-[state=active]:${rt('bg-white', 'bg-zinc-800')}`}>
            <FileText className="w-4 h-4 mr-2" />
            Materials
          </TabsTrigger>
          <TabsTrigger value="dataroom" className={`data-[state=active]:${rt('bg-white', 'bg-zinc-800')}`}>
            <Briefcase className="w-4 h-4 mr-2" />
            Data Room
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent value="overview" key="overview">
            <motion.div
              key={activeTab === 'overview' ? 'overview-active' : undefined}
              initial={MOTION_VARIANTS.slideUp.initial}
              animate={MOTION_VARIANTS.slideUp.animate}
              exit={{ opacity: 0 }}
              transition={MOTION_VARIANTS.slideUp.transition}
            >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Investor Pipeline */}
              <RaiseCard>
                <RaiseCardHeader>
                  <RaiseCardTitle>Investor Pipeline</RaiseCardTitle>
                  <RaiseCardDescription>Breakdown by stage</RaiseCardDescription>
                </RaiseCardHeader>
                <RaiseCardContent>
                  <div className="space-y-3">
                    {[
                      { stage: 'Contacted', count: investors.filter(i => i.status === 'contacted').length, color: 'zinc' },
                      { stage: 'Interested', count: investors.filter(i => i.status === 'interested').length, color: 'orange' },
                      { stage: 'In Discussions', count: investors.filter(i => i.status === 'in_discussions').length, color: 'orange' },
                      { stage: 'Due Diligence', count: investors.filter(i => i.status === 'due_diligence').length, color: 'orange' },
                      { stage: 'Committed', count: investors.filter(i => i.status === 'committed').length, color: 'orange' }
                    ].map((stage) => (
                      <div key={stage.stage} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full bg-${stage.color}-500`} />
                          <span className={`${rt('text-slate-600', 'text-zinc-300')} text-sm`}>{stage.stage}</span>
                        </div>
                        <span className={`${rt('text-slate-900', 'text-white')} font-medium text-sm`}>{stage.count}</span>
                      </div>
                    ))}
                  </div>
                </RaiseCardContent>
              </RaiseCard>

              {/* Recent Activity */}
              <RaiseCard>
                <RaiseCardHeader>
                  <RaiseCardTitle>Recent Activity</RaiseCardTitle>
                  <RaiseCardDescription>Latest investor interactions</RaiseCardDescription>
                </RaiseCardHeader>
                <RaiseCardContent>
                  <div className="space-y-3">
                    {investors.length === 0 ? (
                      <RaiseEmptyState
                        icon={<MessageSquare className="w-6 h-6" />}
                        title="No investor activity yet"
                        message="Start adding investors to your pipeline"
                      />
                    ) : (
                      investors.slice(0, 5).map((investor) => (
                        <div key={investor.id} className={`flex items-start gap-2 p-2 ${rt('bg-slate-50', 'bg-zinc-800/50')} rounded-xl`}>
                          <div className={`p-1.5 ${rt('bg-orange-50', 'bg-orange-500/10')} rounded-lg`}>
                            <Building2 className={`w-3 h-3 ${rt('text-orange-600', 'text-orange-400')}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium ${rt('text-slate-900', 'text-white')} truncate`}>{investor.name || 'Unknown Investor'}</p>
                            <p className={`text-[10px] ${rt('text-slate-400', 'text-zinc-500')}`}>{investor.firm || 'Investment Firm'}</p>
                          </div>
                          <RaiseBadge variant={getStatusBadgeVariant(investor.status)} size="sm">
                            {investor.status || 'new'}
                          </RaiseBadge>
                        </div>
                      ))
                    )}
                  </div>
                </RaiseCardContent>
              </RaiseCard>
            </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="investors" key="investors">
            <motion.div
              key={activeTab === 'investors' ? 'investors-active' : undefined}
              initial={MOTION_VARIANTS.slideUp.initial}
              animate={MOTION_VARIANTS.slideUp.animate}
              exit={{ opacity: 0 }}
              transition={MOTION_VARIANTS.slideUp.transition}
            >
            <div className="space-y-3">
              {/* Header with View Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-lg font-semibold ${rt('text-slate-900', 'text-white')}`}>Investor Pipeline</h2>
                  <p className={`${rt('text-slate-400', 'text-zinc-500')} text-xs`}>{investors.length} investors in pipeline</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`flex ${rt('bg-slate-100', 'bg-zinc-900')} rounded-full border ${rt('border-slate-200', 'border-zinc-800')} p-0.5`}>
                    <RaiseButton
                      size="sm"
                      variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                      onClick={() => setViewMode('kanban')}
                      icon={<BarChart3 className="w-3 h-3" />}
                    >
                      Board
                    </RaiseButton>
                    <RaiseButton
                      size="sm"
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      onClick={() => setViewMode('list')}
                      icon={<Users className="w-3 h-3" />}
                    >
                      List
                    </RaiseButton>
                  </div>
                  <RaiseButton size="sm" icon={<Plus className="w-3 h-3" />}>
                    Add
                  </RaiseButton>
                </div>
              </div>

              {investors.length === 0 ? (
                <RaiseCard>
                  <RaiseCardContent className="py-8">
                    <RaiseEmptyState
                      icon={<Users className="w-6 h-6" />}
                      title="No investors yet"
                      message="Start building your investor pipeline"
                      action={{
                        label: 'Add First Investor',
                        onClick: () => {},
                        icon: <Plus className="w-3 h-3" />,
                      }}
                    />
                  </RaiseCardContent>
                </RaiseCard>
              ) : viewMode === 'kanban' ? (
                /* Kanban Board View */
                <DragDropContext onDragEnd={handleDragEnd}>
                  <div className="flex gap-3 overflow-x-auto pb-4">
                    {INVESTOR_STAGES.map((stage) => (
                      <InvestorStageColumn
                        key={stage.id}
                        stage={stage}
                        investors={investors}
                        onDelete={handleDeleteInvestor}
                      />
                    ))}
                  </div>
                </DragDropContext>
              ) : (
                /* List View */
                <RaiseCard>
                  <RaiseCardContent className="p-3">
                    <div className="space-y-2">
                      {investors.map((investor) => (
                        <div key={investor.id} className={`flex items-center justify-between p-3 ${rt('bg-slate-50 hover:bg-slate-100', 'bg-zinc-800/50 hover:bg-zinc-800')} rounded-xl transition-colors`}>
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 ${rt('bg-orange-50', 'bg-orange-500/10')} rounded-lg`}>
                              <Building2 className={`w-4 h-4 ${rt('text-orange-600', 'text-orange-400')}`} />
                            </div>
                            <div>
                              <p className={`text-sm font-medium ${rt('text-slate-900', 'text-white')}`}>{investor.name || 'Unknown'}</p>
                              <p className={`text-xs ${rt('text-slate-400', 'text-zinc-500')}`}>{investor.firm || 'Investment Firm'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {investor.check_size && (
                              <span className={`text-xs ${rt('text-slate-500', 'text-zinc-400')}`}>
                                ${(investor.check_size / 1000).toFixed(0)}k - ${((investor.check_size_max || investor.check_size * 2) / 1000).toFixed(0)}k
                              </span>
                            )}
                            <RaiseBadge variant={getStatusBadgeVariant(investor.status)} size="sm">
                              {investor.status || 'new'}
                            </RaiseBadge>
                            <div className="flex gap-1">
                              {investor.email && (
                                <RaiseButton size="sm" variant="ghost" className="h-6 w-6 !px-0" icon={<Mail className="w-3 h-3" />} />
                              )}
                              {investor.linkedin && (
                                <RaiseButton size="sm" variant="ghost" className="h-6 w-6 !px-0" icon={<ExternalLink className="w-3 h-3" />} />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </RaiseCardContent>
                </RaiseCard>
              )}
            </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="materials" key="materials">
            <motion.div
              key={activeTab === 'materials' ? 'materials-active' : undefined}
              initial={MOTION_VARIANTS.slideUp.initial}
              animate={MOTION_VARIANTS.slideUp.animate}
              exit={{ opacity: 0 }}
              transition={MOTION_VARIANTS.slideUp.transition}
            >
            <RaiseCard>
              <RaiseCardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <RaiseCardTitle>Pitch Materials</RaiseCardTitle>
                    <RaiseCardDescription>Decks, one-pagers, and presentations</RaiseCardDescription>
                  </div>
                  <RaiseButton size="sm" icon={<Plus className="w-3 h-3" />}>
                    Upload
                  </RaiseButton>
                </div>
              </RaiseCardHeader>
              <RaiseCardContent>
                {pitchDecks.length === 0 ? (
                  <RaiseEmptyState
                    icon={<FileText className="w-6 h-6" />}
                    title="No pitch materials"
                    message="Upload your pitch deck and other materials"
                    action={{
                      label: 'Upload Pitch Deck',
                      onClick: () => {},
                      icon: <Plus className="w-3 h-3" />,
                    }}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {pitchDecks.map((deck) => (
                      <div key={deck.id} className={`p-3 ${rt('bg-slate-50 border-slate-200 hover:border-orange-300', 'bg-zinc-800/50 border-zinc-700 hover:border-orange-500/50')} rounded-xl border transition-colors cursor-pointer`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className={`p-1.5 ${rt('bg-orange-50', 'bg-orange-500/10')} rounded-lg`}>
                            <FileText className={`w-4 h-4 ${rt('text-orange-600', 'text-orange-400')}`} />
                          </div>
                          <RaiseBadge variant="neutral" size="sm">
                            {deck.version || 'v1.0'}
                          </RaiseBadge>
                        </div>
                        <h4 className={`text-sm font-medium ${rt('text-slate-900', 'text-white')} mb-0.5`}>{deck.name || 'Pitch Deck'}</h4>
                        <p className={`text-xs ${rt('text-slate-400', 'text-zinc-500')}`}>{deck.description || 'Investment presentation'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </RaiseCardContent>
            </RaiseCard>
            </motion.div>
          </TabsContent>

          <TabsContent value="dataroom" key="dataroom">
            <motion.div
              key={activeTab === 'dataroom' ? 'dataroom-active' : undefined}
              initial={MOTION_VARIANTS.slideUp.initial}
              animate={MOTION_VARIANTS.slideUp.animate}
              exit={{ opacity: 0 }}
              transition={MOTION_VARIANTS.slideUp.transition}
            >
            <RaiseCard>
              <RaiseCardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <RaiseCardTitle>Data Rooms</RaiseCardTitle>
                    <RaiseCardDescription>Secure document sharing with investors</RaiseCardDescription>
                  </div>
                  <RaiseButton size="sm" icon={<Plus className="w-3 h-3" />}>
                    Create
                  </RaiseButton>
                </div>
              </RaiseCardHeader>
              <RaiseCardContent>
                {dataRooms.length === 0 ? (
                  <RaiseEmptyState
                    icon={<Briefcase className="w-6 h-6" />}
                    title="No data rooms"
                    message="Create a secure data room for due diligence"
                    action={{
                      label: 'Create Data Room',
                      onClick: () => {},
                      icon: <Plus className="w-3 h-3" />,
                    }}
                  />
                ) : (
                  <div className="space-y-2">
                    {dataRooms.map((room) => (
                      <div key={room.id} className={`flex items-center justify-between p-3 ${rt('bg-slate-50', 'bg-zinc-800/50')} rounded-xl`}>
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 ${rt('bg-orange-50', 'bg-orange-500/10')} rounded-lg`}>
                            <Briefcase className={`w-4 h-4 ${rt('text-orange-600', 'text-orange-400')}`} />
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${rt('text-slate-900', 'text-white')}`}>{room.name || 'Data Room'}</p>
                            <p className={`text-xs ${rt('text-slate-400', 'text-zinc-500')}`}>{room.documents_count || 0} documents</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs ${rt('text-slate-500', 'text-zinc-400')}`}>{room.viewers || 0} viewers</span>
                          <RaiseButton size="sm" variant="secondary" icon={<ExternalLink className="w-3 h-3" />}>
                            Open
                          </RaiseButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </RaiseCardContent>
            </RaiseCard>
            </motion.div>
          </TabsContent>
        </AnimatePresence>
      </Tabs>
      </div>
    </div>
  );
}
