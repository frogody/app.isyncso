import React, { useState, useEffect } from 'react';
import { db } from '@/api/supabaseClient';
import { motion } from 'framer-motion';
import {
  TrendingUp, DollarSign, Users, FileText, Target, Rocket,
  Building2, Calendar, ArrowUpRight, Plus, Filter, Download,
  PieChart, BarChart3, Briefcase, HandshakeIcon, MessageSquare,
  CheckCircle2, Clock, AlertCircle, ExternalLink, Mail, Phone
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/ui/PageHeader';

export default function Raise() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [campaigns, setCampaigns] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [pitchDecks, setPitchDecks] = useState([]);
  const [dataRooms, setDataRooms] = useState([]);

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
      color: 'amber'
    },
    {
      title: 'Amount Raised',
      value: `$${(raisedAmount / 1000000).toFixed(1)}M`,
      subtitle: `${progressPercent}% of target`,
      icon: DollarSign,
      color: 'amber'
    },
    {
      title: 'Investor Pipeline',
      value: totalInvestors,
      subtitle: `${interestedInvestors} interested, ${committedInvestors} committed`,
      icon: Users,
      color: 'indigo'
    },
    {
      title: 'Pitch Decks',
      value: pitchDecks.length,
      subtitle: `${dataRooms.length} data rooms`,
      icon: FileText,
      color: 'amber'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
    };
    return colors[color] || colors.amber;
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'interested': 'text-amber-400 border-amber-500/30 bg-amber-500/10',
      'in_discussions': 'text-amber-400 border-amber-500/30 bg-amber-500/10',
      'due_diligence': 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
      'committed': 'text-amber-400 border-amber-500/30 bg-amber-500/10',
      'passed': 'text-zinc-400 border-zinc-500/30 bg-zinc-500/10'
    };
    return statusColors[status] || statusColors.interested;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-amber-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-amber-950/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <PageHeader
          icon={Rocket}
          title="Raise"
          subtitle="Fundraising toolkit & investor management"
          color="amber"
          actions={
            <div className="flex gap-3">
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </div>
          }
        />

      {/* Progress Bar for Active Campaign */}
      {activeCampaign && (
        <Card className="bg-gradient-to-r from-amber-950/50 to-amber-950/50 border-amber-500/20 mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{activeCampaign.name}</h3>
                <p className="text-sm text-zinc-400">{activeCampaign.round_type || 'Funding Round'}</p>
              </div>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${getColorClasses(metric.color)}`}>
                    <metric.icon className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{metric.value}</p>
                  <p className="text-sm text-zinc-500">{metric.title}</p>
                  <p className="text-xs text-zinc-600 mt-1">{metric.subtitle}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Investor Pipeline */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Investor Pipeline</CardTitle>
                <CardDescription>Breakdown by stage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { stage: 'Contacted', count: investors.filter(i => i.status === 'contacted').length, color: 'zinc' },
                    { stage: 'Interested', count: investors.filter(i => i.status === 'interested').length, color: 'amber' },
                    { stage: 'In Discussions', count: investors.filter(i => i.status === 'in_discussions').length, color: 'amber' },
                    { stage: 'Due Diligence', count: investors.filter(i => i.status === 'due_diligence').length, color: 'indigo' },
                    { stage: 'Committed', count: investors.filter(i => i.status === 'committed').length, color: 'amber' }
                  ].map((stage) => (
                    <div key={stage.stage} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full bg-${stage.color}-500`} />
                        <span className="text-zinc-300">{stage.stage}</span>
                      </div>
                      <span className="text-white font-medium">{stage.count}</span>
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
                <div className="space-y-4">
                  {investors.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                      <p className="text-zinc-500">No investor activity yet</p>
                    </div>
                  ) : (
                    investors.slice(0, 5).map((investor) => (
                      <div key={investor.id} className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                          <Building2 className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{investor.name || 'Unknown Investor'}</p>
                          <p className="text-xs text-zinc-500">{investor.firm || 'Investment Firm'}</p>
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
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Investor CRM</CardTitle>
                  <CardDescription>{investors.length} investors in pipeline</CardDescription>
                </div>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Investor
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {investors.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No investors yet</h3>
                  <p className="text-zinc-500 mb-4">Start building your investor pipeline</p>
                  <Button className="bg-amber-500 hover:bg-amber-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Investor
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {investors.map((investor) => (
                    <div key={investor.id} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                          <Building2 className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{investor.name || 'Unknown'}</p>
                          <p className="text-sm text-zinc-500">{investor.firm || 'Investment Firm'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {investor.check_size && (
                          <span className="text-sm text-zinc-400">
                            ${(investor.check_size / 1000).toFixed(0)}k - ${((investor.check_size_max || investor.check_size * 2) / 1000).toFixed(0)}k
                          </span>
                        )}
                        <Badge variant="outline" className={getStatusColor(investor.status)}>
                          {investor.status || 'new'}
                        </Badge>
                        <div className="flex gap-2">
                          {investor.email && (
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <Mail className="w-4 h-4 text-zinc-400" />
                            </Button>
                          )}
                          {investor.linkedin && (
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <ExternalLink className="w-4 h-4 text-zinc-400" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Pitch Materials</CardTitle>
                  <CardDescription>Decks, one-pagers, and presentations</CardDescription>
                </div>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Material
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {pitchDecks.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No pitch materials</h3>
                  <p className="text-zinc-500 mb-4">Upload your pitch deck and other materials</p>
                  <Button className="bg-amber-500 hover:bg-amber-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Pitch Deck
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pitchDecks.map((deck) => (
                    <div key={deck.id} className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 hover:border-amber-500/50 transition-colors cursor-pointer">
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 bg-amber-500/10 rounded-lg">
                          <FileText className="w-5 h-5 text-amber-400" />
                        </div>
                        <Badge variant="outline" className="text-zinc-400">
                          {deck.version || 'v1.0'}
                        </Badge>
                      </div>
                      <h4 className="font-medium text-white mb-1">{deck.name || 'Pitch Deck'}</h4>
                      <p className="text-sm text-zinc-500">{deck.description || 'Investment presentation'}</p>
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
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Data Room
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {dataRooms.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No data rooms</h3>
                  <p className="text-zinc-500 mb-4">Create a secure data room for due diligence</p>
                  <Button className="bg-amber-500 hover:bg-amber-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Data Room
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {dataRooms.map((room) => (
                    <div key={room.id} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-amber-500/10 rounded-lg">
                          <Briefcase className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{room.name || 'Data Room'}</p>
                          <p className="text-sm text-zinc-500">{room.documents_count || 0} documents</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-zinc-400">{room.viewers || 0} viewers</span>
                        <Button size="sm" variant="outline" className="border-zinc-700">
                          <ExternalLink className="w-4 h-4 mr-2" />
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
