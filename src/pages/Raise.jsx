import React, { useState, useEffect } from 'react';
import { db, supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { motion } from 'framer-motion';
import {
  TrendingUp, Euro, Users, FileText, Target, Rocket,
  Building2, Calendar, ArrowUpRight, Plus, Filter, Download,
  PieChart, BarChart3, Briefcase, HandshakeIcon, MessageSquare,
  CheckCircle2, Clock, AlertCircle, ExternalLink, Mail, Phone,
  GripVertical, MoreHorizontal, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
          className={`group relative bg-zinc-900/60 backdrop-blur-sm rounded-xl border ${
            snapshot.isDragging
              ? 'shadow-2xl shadow-orange-500/20 border-orange-500/50 z-50'
              : 'border-zinc-800/60 hover:border-zinc-700/60'
          }`}
        >
          {/* Top gradient bar */}
          <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r ${stageConfig.color} opacity-60`} />

          <div className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-white truncate">
                  {investor.name || 'Unknown Investor'}
                </h4>
                <p className="text-zinc-500 text-sm flex items-center gap-1.5 mt-1">
                  <Building2 className="w-3 h-3" />
                  <span className="truncate">{investor.firm || 'Investment Firm'}</span>
                </p>
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
                    <DropdownMenuItem onClick={() => onEdit?.(investor)} className="text-zinc-300 focus:text-white focus:bg-zinc-800">
                      <ExternalLink className="w-4 h-4 mr-2" /> View Details
                    </DropdownMenuItem>
                    {investor.email && (
                      <DropdownMenuItem asChild className="text-zinc-300 focus:text-white focus:bg-zinc-800">
                        <a href={`mailto:${investor.email}`}>
                          <Mail className="w-4 h-4 mr-2" /> Send Email
                        </a>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="bg-zinc-800" />
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
                <span className="text-lg font-bold text-white">
                  ${(investor.check_size / 1000).toFixed(0)}k
                  {investor.check_size_max && ` - ${(investor.check_size_max / 1000).toFixed(0)}k`}
                </span>
                <span className="text-zinc-600 text-sm ml-2">check size</span>
              </div>
            )}

            {/* Contact Info */}
            <div className="mt-3 pt-3 border-t border-zinc-800/50 flex items-center gap-3 text-xs">
              {investor.email && (
                <span className="flex items-center gap-1 text-zinc-500">
                  <Mail className="w-3 h-3" />
                  <span className="truncate max-w-[100px]">{investor.email}</span>
                </span>
              )}
              {investor.linkedin && (
                <a href={investor.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-zinc-500 hover:text-blue-400">
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
  const stageInvestors = investors.filter(i => i.status === stage.id);
  const totalCheckSize = stageInvestors.reduce((sum, i) => sum + (i.check_size || 0), 0);

  return (
    <div className="flex-shrink-0 w-72">
      <div className="sticky top-0 z-10 pb-3 bg-black">
        {/* Column Header */}
        <div className="bg-zinc-900/70 backdrop-blur-xl rounded-xl border border-zinc-800/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${stage.color}`} />
              <h3 className="text-white font-semibold text-sm">{stage.label}</h3>
              <Badge className="bg-zinc-800 text-zinc-300 text-xs">{stageInvestors.length}</Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-500 hover:text-white hover:bg-zinc-800"
              onClick={() => onAddInvestor?.(stage.id)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold text-orange-400/80">${(totalCheckSize / 1000).toLocaleString()}k</span>
              <span className="text-xs text-zinc-600">potential</span>
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
                className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition-colors"
                onClick={() => onAddInvestor?.(stage.id)}
              >
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${stage.color} opacity-20 flex items-center justify-center mb-3`}>
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <p className="text-zinc-600 text-sm">Drop investor here</p>
                <p className="text-zinc-700 text-xs mt-1">or click to add</p>
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
      title: 'Raise Target',
      value: `$${(targetAmount / 1000000).toFixed(1)}M`,
      subtitle: activeCampaign?.name || 'No active campaign',
      icon: Target,
      color: 'orange'
    },
    {
      title: 'Amount Raised',
      value: `$${(raisedAmount / 1000000).toFixed(1)}M`,
      subtitle: `${progressPercent}% of target`,
      icon: Euro,
      color: 'orange'
    },
    {
      title: 'Investor Pipeline',
      value: totalInvestors,
      subtitle: `${interestedInvestors} interested, ${committedInvestors} committed`,
      icon: Users,
      color: 'orange'
    },
    {
      title: 'Pitch Decks',
      value: pitchDecks.length,
      subtitle: `${dataRooms.length} data rooms`,
      icon: FileText,
      color: 'orange'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    };
    return colors[color] || colors.orange;
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'interested': 'text-orange-400 border-orange-500/30 bg-orange-500/10',
      'in_discussions': 'text-orange-400 border-orange-500/30 bg-orange-500/10',
      'due_diligence': 'text-orange-400 border-orange-500/30 bg-orange-500/10',
      'committed': 'text-orange-400 border-orange-500/30 bg-orange-500/10',
      'passed': 'text-zinc-400 border-zinc-500/30 bg-zinc-500/10'
    };
    return statusColors[status] || statusColors.interested;
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
    <div className="min-h-screen bg-black">
      <div className="w-full px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <PageHeader
          icon={Rocket}
          title="Raise"
          subtitle="Fundraising toolkit & investor management"
          color="orange"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </div>
          }
        />

      {/* Progress Bar for Active Campaign */}
      {activeCampaign && (
        <Card className="bg-gradient-to-r from-orange-950/50 to-orange-950/50 border-orange-500/20 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{activeCampaign.name}</h3>
                <p className="text-sm text-zinc-400">{activeCampaign.round_type || 'Funding Round'}</p>
              </div>
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                Active
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Progress</span>
                <span className="text-white font-medium">
                  ${(raisedAmount / 1000000).toFixed(2)}M / ${(targetAmount / 1000000).toFixed(2)}M
                </span>
              </div>
              <Progress value={progressPercent} className="h-3 bg-zinc-800" />
              <p className="text-xs text-zinc-500 text-right">{progressPercent}% raised</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${getColorClasses(metric.color)}`}>
                    <metric.icon className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{metric.value}</p>
                  <p className="text-xs text-zinc-500">{metric.title}</p>
                  <p className="text-[10px] text-zinc-600 mt-1">{metric.subtitle}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-zinc-800">
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="investors" className="data-[state=active]:bg-zinc-800">
            <Users className="w-4 h-4 mr-2" />
            Investors
          </TabsTrigger>
          <TabsTrigger value="materials" className="data-[state=active]:bg-zinc-800">
            <FileText className="w-4 h-4 mr-2" />
            Materials
          </TabsTrigger>
          <TabsTrigger value="dataroom" className="data-[state=active]:bg-zinc-800">
            <Briefcase className="w-4 h-4 mr-2" />
            Data Room
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Investor Pipeline */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Investor Pipeline</CardTitle>
                <CardDescription>Breakdown by stage</CardDescription>
              </CardHeader>
              <CardContent>
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
                        <span className="text-zinc-300 text-sm">{stage.stage}</span>
                      </div>
                      <span className="text-white font-medium text-sm">{stage.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Recent Activity</CardTitle>
                <CardDescription>Latest investor interactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {investors.length === 0 ? (
                    <div className="text-center py-6">
                      <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                      <p className="text-zinc-500 text-sm">No investor activity yet</p>
                    </div>
                  ) : (
                    investors.slice(0, 5).map((investor) => (
                      <div key={investor.id} className="flex items-start gap-2 p-2 bg-zinc-800/50 rounded-lg">
                        <div className="p-1.5 bg-orange-500/10 rounded-lg">
                          <Building2 className="w-3 h-3 text-orange-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">{investor.name || 'Unknown Investor'}</p>
                          <p className="text-[10px] text-zinc-500">{investor.firm || 'Investment Firm'}</p>
                        </div>
                        <Badge variant="outline" className={getStatusColor(investor.status)}>
                          {investor.status || 'new'}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="investors">
          <div className="space-y-3">
            {/* Header with View Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Investor Pipeline</h2>
                <p className="text-zinc-500 text-xs">{investors.length} investors in pipeline</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-zinc-900 rounded-lg border border-zinc-800 p-0.5">
                  <Button
                    size="sm"
                    variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                    className={viewMode === 'kanban' ? 'bg-zinc-800 text-white text-xs' : 'text-zinc-400 text-xs'}
                    onClick={() => setViewMode('kanban')}
                  >
                    <BarChart3 className="w-3 h-3 mr-1" />
                    Board
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    className={viewMode === 'list' ? 'bg-zinc-800 text-white text-xs' : 'text-zinc-400 text-xs'}
                    onClick={() => setViewMode('list')}
                  >
                    <Users className="w-3 h-3 mr-1" />
                    List
                  </Button>
                </div>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-xs">
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            {investors.length === 0 ? (
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="py-8">
                  <div className="text-center">
                    <Users className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                    <h3 className="text-sm font-medium text-white mb-1">No investors yet</h3>
                    <p className="text-zinc-500 text-xs mb-3">Start building your investor pipeline</p>
                    <Button className="bg-orange-500 hover:bg-orange-600 text-xs">
                      <Plus className="w-3 h-3 mr-1" />
                      Add First Investor
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-3">
                  <div className="space-y-2">
                    {investors.map((investor) => (
                      <div key={investor.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-orange-500/10 rounded-lg">
                            <Building2 className="w-4 h-4 text-orange-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{investor.name || 'Unknown'}</p>
                            <p className="text-xs text-zinc-500">{investor.firm || 'Investment Firm'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {investor.check_size && (
                            <span className="text-xs text-zinc-400">
                              ${(investor.check_size / 1000).toFixed(0)}k - ${((investor.check_size_max || investor.check_size * 2) / 1000).toFixed(0)}k
                            </span>
                          )}
                          <Badge variant="outline" className={getStatusColor(investor.status)}>
                            {investor.status || 'new'}
                          </Badge>
                          <div className="flex gap-1">
                            {investor.email && (
                              <Button size="icon" variant="ghost" className="h-6 w-6">
                                <Mail className="w-3 h-3 text-zinc-400" />
                              </Button>
                            )}
                            {investor.linkedin && (
                              <Button size="icon" variant="ghost" className="h-6 w-6">
                                <ExternalLink className="w-3 h-3 text-zinc-400" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="materials">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Pitch Materials</CardTitle>
                  <CardDescription>Decks, one-pagers, and presentations</CardDescription>
                </div>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-xs">
                  <Plus className="w-3 h-3 mr-1" />
                  Upload
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {pitchDecks.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <h3 className="text-sm font-medium text-white mb-1">No pitch materials</h3>
                  <p className="text-zinc-500 text-xs mb-3">Upload your pitch deck and other materials</p>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-xs">
                    <Plus className="w-3 h-3 mr-1" />
                    Upload Pitch Deck
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pitchDecks.map((deck) => (
                    <div key={deck.id} className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700 hover:border-orange-500/50 transition-colors cursor-pointer">
                      <div className="flex items-start justify-between mb-2">
                        <div className="p-1.5 bg-orange-500/10 rounded-lg">
                          <FileText className="w-4 h-4 text-orange-400" />
                        </div>
                        <Badge variant="outline" className="text-zinc-400 text-xs">
                          {deck.version || 'v1.0'}
                        </Badge>
                      </div>
                      <h4 className="text-sm font-medium text-white mb-0.5">{deck.name || 'Pitch Deck'}</h4>
                      <p className="text-xs text-zinc-500">{deck.description || 'Investment presentation'}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dataroom">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Data Rooms</CardTitle>
                  <CardDescription>Secure document sharing with investors</CardDescription>
                </div>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-xs">
                  <Plus className="w-3 h-3 mr-1" />
                  Create
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {dataRooms.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <h3 className="text-sm font-medium text-white mb-1">No data rooms</h3>
                  <p className="text-zinc-500 text-xs mb-3">Create a secure data room for due diligence</p>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-xs">
                    <Plus className="w-3 h-3 mr-1" />
                    Create Data Room
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {dataRooms.map((room) => (
                    <div key={room.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-orange-500/10 rounded-lg">
                          <Briefcase className="w-4 h-4 text-orange-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{room.name || 'Data Room'}</p>
                          <p className="text-xs text-zinc-500">{room.documents_count || 0} documents</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400">{room.viewers || 0} viewers</span>
                        <Button size="sm" variant="outline" className="border-zinc-700 text-xs h-7 px-2">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Open
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
