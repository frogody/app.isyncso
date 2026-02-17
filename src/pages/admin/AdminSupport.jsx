/**
 * AdminSupport Component
 * Support & Moderation for admin panel - Tickets, Reports, User Flags, Canned Responses
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAdmin } from '@/components/admin/AdminGuard';
import {
  Headphones,
  AlertTriangle,
  Flag,
  MessageSquare,
  RefreshCw,
  Search,
  MoreVertical,
  Clock,
  User,
  Building2,
  Send,
  ChevronDown,
  ChevronUp,
  Shield,
  Ban,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  MessageCircle,
  Copy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getStatusColor } from '@/lib/adminTheme';

const ADMIN_API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api`;

export default function AdminSupport() {
  const { session } = useAdmin();
  const [activeTab, setActiveTab] = useState('tickets');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tickets state
  const [tickets, setTickets] = useState([]);
  const [ticketsTotal, setTicketsTotal] = useState(0);
  const [ticketsFilter, setTicketsFilter] = useState({ status: 'all', priority: 'all', search: '' });
  const [expandedTicket, setExpandedTicket] = useState(null);
  const [ticketDetail, setTicketDetail] = useState(null);

  // Moderation state
  const [reports, setReports] = useState([]);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [reportsFilter, setReportsFilter] = useState({ status: 'all' });

  // User flags state
  const [userFlags, setUserFlags] = useState([]);

  // Canned responses state
  const [cannedResponses, setCannedResponses] = useState([]);

  // Categories state
  const [categories, setCategories] = useState([]);

  // Modal state
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [resolution, setResolution] = useState('');
  const [actionType, setActionType] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchWithAuth = async (endpoint, options = {}) => {
    const response = await fetch(`${ADMIN_API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }
    return response.json();
  };

  const fetchStats = async () => {
    try {
      const data = await fetchWithAuth('/support/stats');
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchTickets = async () => {
    try {
      const params = new URLSearchParams();
      if (ticketsFilter.status !== 'all') params.append('status', ticketsFilter.status);
      if (ticketsFilter.priority !== 'all') params.append('priority', ticketsFilter.priority);
      if (ticketsFilter.search) params.append('search', ticketsFilter.search);
      const data = await fetchWithAuth(`/support/tickets?${params}`);
      setTickets(data.items || []);
      setTicketsTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    }
  };

  const fetchTicketDetail = async (ticketId) => {
    try {
      const data = await fetchWithAuth(`/support/tickets/${ticketId}`);
      setTicketDetail(data);
    } catch (error) {
      console.error('Failed to fetch ticket detail:', error);
    }
  };

  const fetchReports = async () => {
    try {
      const params = new URLSearchParams();
      if (reportsFilter.status !== 'all') params.append('status', reportsFilter.status);
      const data = await fetchWithAuth(`/moderation/reports?${params}`);
      setReports(data.items || []);
      setReportsTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    }
  };

  const fetchUserFlags = async () => {
    try {
      const data = await fetchWithAuth('/moderation/user-flags');
      setUserFlags(data || []);
    } catch (error) {
      console.error('Failed to fetch user flags:', error);
    }
  };

  const fetchCannedResponses = async () => {
    try {
      const data = await fetchWithAuth('/support/canned-responses');
      setCannedResponses(data || []);
    } catch (error) {
      console.error('Failed to fetch canned responses:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await fetchWithAuth('/support/categories');
      setCategories(data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchTickets(),
      fetchReports(),
      fetchUserFlags(),
      fetchCannedResponses(),
      fetchCategories(),
    ]);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [ticketsFilter]);

  useEffect(() => {
    fetchReports();
  }, [reportsFilter]);

  const toggleTicketExpand = async (ticketId) => {
    if (expandedTicket === ticketId) {
      setExpandedTicket(null);
      setTicketDetail(null);
    } else {
      setExpandedTicket(ticketId);
      await fetchTicketDetail(ticketId);
    }
  };

  const handleUpdateTicket = async (ticketId, updates) => {
    try {
      await fetchWithAuth(`/support/tickets/${ticketId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      toast.success('Ticket updated');
      fetchTickets();
      if (expandedTicket === ticketId) {
        await fetchTicketDetail(ticketId);
      }
      fetchStats();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim()) return;

    setSaving(true);
    try {
      await fetchWithAuth(`/support/tickets/${expandedTicket}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          message: replyMessage,
          is_internal: isInternalNote,
        }),
      });
      toast.success(isInternalNote ? 'Internal note added' : 'Reply sent');
      setReplyMessage('');
      setIsInternalNote(false);
      setShowReplyModal(false);
      await fetchTicketDetail(expandedTicket);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResolveReport = async () => {
    if (!resolution.trim()) return;

    setSaving(true);
    try {
      await fetchWithAuth(`/moderation/reports/${selectedReport.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          resolution,
          action_type: actionType || null,
        }),
      });
      toast.success('Report resolved');
      setShowResolveModal(false);
      setSelectedReport(null);
      setResolution('');
      setActionType('');
      fetchReports();
      fetchStats();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const useCannedResponse = (response) => {
    setReplyMessage(response.content);
    toast.success('Canned response loaded');
  };

  const getStatusBadge = (status) => {
    // Map support-specific statuses to standard status colors
    const statusMap = {
      open: 'active',
      in_progress: 'processing',
      waiting: 'warning',
      resolved: 'success',
      closed: 'inactive',
      pending: 'pending',
      investigating: 'beta',
      dismissed: 'archived',
    };
    const mappedStatus = statusMap[status] || status;
    return <Badge className={cn('text-[10px] px-1.5 py-px', getStatusColor(mappedStatus))}>{status.replace('_', ' ')}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      low: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
      medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return <Badge className={cn('text-[10px] px-1.5 py-px', styles[priority])}>{priority}</Badge>;
  };

  const getReasonBadge = (reason) => {
    const styles = {
      spam: 'bg-yellow-500/20 text-yellow-400',
      harassment: 'bg-red-500/20 text-red-400',
      inappropriate: 'bg-orange-500/20 text-orange-400',
      fake: 'bg-blue-500/20 text-blue-400',
      copyright: 'bg-blue-500/20 text-blue-400',
      other: 'bg-zinc-500/20 text-zinc-400',
    };
    return <Badge className={cn('text-[10px] px-1.5 py-px', styles[reason])}>{reason}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Support & Moderation</h1>
          <p className="text-zinc-400 text-xs">Manage tickets, reports, and user flags</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="border-zinc-700 h-7 text-xs"
        >
          <RefreshCw className={cn("w-3 h-3 mr-1.5", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-zinc-500 mb-0.5">Open Tickets</p>
                <p className="text-lg font-bold text-white">{stats?.open_tickets || 0}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <Headphones className="w-4 h-4 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-zinc-500 mb-0.5">Avg Response Time</p>
                <p className="text-lg font-bold text-white">
                  {stats?.avg_response_hours ? `${Math.round(stats.avg_response_hours)}h` : '-'}
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Clock className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-zinc-500 mb-0.5">Pending Reports</p>
                <p className="text-lg font-bold text-white">{stats?.pending_reports || 0}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-zinc-500 mb-0.5">Active Bans</p>
                <p className="text-lg font-bold text-white">{stats?.active_bans || 0}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <Ban className="w-4 h-4 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="tickets" className="data-[state=active]:bg-zinc-800 text-xs">
            <Headphones className="w-3 h-3 mr-1.5" />
            Tickets ({ticketsTotal})
          </TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-zinc-800 text-xs">
            <AlertTriangle className="w-3 h-3 mr-1.5" />
            Reports ({reportsTotal})
          </TabsTrigger>
          <TabsTrigger value="flags" className="data-[state=active]:bg-zinc-800 text-xs">
            <Flag className="w-3 h-3 mr-1.5" />
            User Flags
          </TabsTrigger>
          <TabsTrigger value="canned" className="data-[state=active]:bg-zinc-800 text-xs">
            <MessageSquare className="w-3 h-3 mr-1.5" />
            Canned Responses
          </TabsTrigger>
        </TabsList>

        {/* Tickets Tab */}
        <TabsContent value="tickets" className="mt-3">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="border-b border-zinc-800 py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm">Support Tickets</CardTitle>
              </div>
              <div className="flex gap-2 mt-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                  <Input
                    placeholder="Search tickets..."
                    className="pl-8 bg-zinc-800 border-zinc-700 h-7 text-xs"
                    value={ticketsFilter.search}
                    onChange={(e) => setTicketsFilter({ ...ticketsFilter, search: e.target.value })}
                  />
                </div>
                <Select
                  value={ticketsFilter.status}
                  onValueChange={(v) => setTicketsFilter({ ...ticketsFilter, status: v })}
                >
                  <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700 h-7 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="waiting">Waiting</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={ticketsFilter.priority}
                  onValueChange={(v) => setTicketsFilter({ ...ticketsFilter, priority: v })}
                >
                  <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700 h-7 text-xs">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-zinc-800">
                {tickets.map((ticket) => (
                  <div key={ticket.id}>
                    <div
                      className="py-2 px-3 hover:bg-zinc-800/30 cursor-pointer"
                      onClick={() => toggleTicketExpand(ticket.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <code className="text-[10px] text-zinc-500">{ticket.ticket_number}</code>
                            {getStatusBadge(ticket.status)}
                            {getPriorityBadge(ticket.priority)}
                          </div>
                          <h3 className="text-white text-xs font-medium">{ticket.subject}</h3>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-500">
                            <span className="flex items-center gap-1">
                              <User className="w-2.5 h-2.5" />
                              {ticket.user_name || ticket.user_email}
                            </span>
                            {ticket.organization_name && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-2.5 h-2.5" />
                                {ticket.organization_name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-2.5 h-2.5" />
                              {ticket.message_count} messages
                            </span>
                            <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreVertical className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="text-xs" onClick={(e) => { e.stopPropagation(); handleUpdateTicket(ticket.id, { status: 'in_progress' }); }}>
                                Mark In Progress
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs" onClick={(e) => { e.stopPropagation(); handleUpdateTicket(ticket.id, { status: 'resolved' }); }}>
                                Mark Resolved
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-xs" onClick={(e) => { e.stopPropagation(); handleUpdateTicket(ticket.id, { priority: 'urgent' }); }}>
                                Set Urgent
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs" onClick={(e) => { e.stopPropagation(); handleUpdateTicket(ticket.id, { priority: 'high' }); }}>
                                Set High Priority
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {expandedTicket === ticket.id ? (
                            <ChevronUp className="w-4 h-4 text-zinc-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-zinc-500" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Ticket Detail */}
                    {expandedTicket === ticket.id && ticketDetail && (
                      <div className="bg-zinc-800/30 p-3 border-t border-zinc-700">
                        <div className="space-y-3">
                          {/* Description */}
                          {ticketDetail.ticket?.description && (
                            <div className="bg-zinc-900 p-2 rounded-lg">
                              <p className="text-xs text-zinc-300">{ticketDetail.ticket.description}</p>
                            </div>
                          )}

                          {/* Messages */}
                          <div className="space-y-2 max-h-72 overflow-y-auto">
                            {ticketDetail.messages?.map((msg) => (
                              <div
                                key={msg.id}
                                className={cn(
                                  "p-2 rounded-lg",
                                  msg.is_internal ? "bg-yellow-500/10 border border-yellow-500/30" : "bg-zinc-900"
                                )}
                              >
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Avatar className="w-5 h-5">
                                    <AvatarImage src={msg.user_avatar} />
                                    <AvatarFallback className="text-[9px]">{msg.user_name?.charAt(0) || '?'}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-white font-medium">{msg.user_name}</span>
                                  {msg.is_internal && (
                                    <Badge className="text-[10px] px-1.5 py-px bg-yellow-500/20 text-yellow-400">Internal</Badge>
                                  )}
                                  <span className="text-[10px] text-zinc-500 ml-auto">
                                    {new Date(msg.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-300 whitespace-pre-wrap">{msg.message}</p>
                              </div>
                            ))}
                          </div>

                          {/* Reply Actions */}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-cyan-600 hover:bg-cyan-700 h-7 text-xs"
                              onClick={() => setShowReplyModal(true)}
                            >
                              <Send className="w-3 h-3 mr-1.5" />
                              Reply
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="border-zinc-700 h-7 text-xs">
                                  Use Canned Response
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-56">
                                {cannedResponses.map((response) => (
                                  <DropdownMenuItem
                                    key={response.id}
                                    className="text-xs"
                                    onClick={() => {
                                      useCannedResponse(response);
                                      setShowReplyModal(true);
                                    }}
                                  >
                                    {response.name}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {tickets.length === 0 && (
                  <div className="p-6 text-center text-zinc-500 text-xs">
                    No tickets found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-3">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="border-b border-zinc-800 py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm">Moderation Reports</CardTitle>
                <Select
                  value={reportsFilter.status}
                  onValueChange={(v) => setReportsFilter({ status: v })}
                >
                  <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700 h-7 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Reported User</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Reason</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Reporter</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Status</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Date</th>
                    <th className="text-right py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="border-t border-zinc-800 hover:bg-zinc-800/30 h-9">
                      <td className="py-1.5 px-3">
                        <div>
                          <p className="text-white text-xs font-medium">{report.reported_user_name || 'Unknown'}</p>
                          <p className="text-[10px] text-zinc-500">{report.reported_user_email}</p>
                        </div>
                      </td>
                      <td className="py-1.5 px-3">
                        {getReasonBadge(report.reason)}
                        {report.description && (
                          <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">{report.description}</p>
                        )}
                      </td>
                      <td className="py-1.5 px-3 text-xs text-zinc-400">{report.reporter_name || 'Anonymous'}</td>
                      <td className="py-1.5 px-3">{getStatusBadge(report.status)}</td>
                      <td className="py-1.5 px-3 text-xs text-zinc-400">
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-1.5 px-3 text-right">
                        {report.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-zinc-700 h-6 text-xs"
                            onClick={() => {
                              setSelectedReport(report);
                              setShowResolveModal(true);
                            }}
                          >
                            Resolve
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {reports.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-zinc-500 text-xs">
                        No reports found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Flags Tab */}
        <TabsContent value="flags" className="mt-3">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="border-b border-zinc-800 py-3 px-4">
              <CardTitle className="text-white text-sm">User Flags</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">User</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Flag Type</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Reason</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Flagged By</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Status</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {userFlags.map((flag) => (
                    <tr key={flag.id} className="border-t border-zinc-800 hover:bg-zinc-800/30 h-9">
                      <td className="py-1.5 px-3">
                        <p className="text-white text-xs font-medium">{flag.user_name}</p>
                        <p className="text-[10px] text-zinc-500">{flag.user_email}</p>
                      </td>
                      <td className="py-1.5 px-3">
                        <Badge className={cn(
                          'text-[10px] px-1.5 py-px',
                          flag.flag_type === 'vip' ? 'bg-blue-500/20 text-blue-400' :
                          flag.flag_type === 'fraud' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        )}>
                          {flag.flag_type}
                        </Badge>
                      </td>
                      <td className="py-1.5 px-3 text-xs text-zinc-400">{flag.reason || '-'}</td>
                      <td className="py-1.5 px-3 text-xs text-zinc-400">{flag.flagged_by_name || 'System'}</td>
                      <td className="py-1.5 px-3">
                        {flag.resolved_at ? (
                          <Badge className="bg-cyan-500/20 text-cyan-400 text-[10px] px-1.5 py-px">Resolved</Badge>
                        ) : (
                          <Badge className="bg-yellow-500/20 text-yellow-400 text-[10px] px-1.5 py-px">Active</Badge>
                        )}
                      </td>
                      <td className="py-1.5 px-3 text-xs text-zinc-400">
                        {new Date(flag.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {userFlags.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-zinc-500 text-xs">
                        No user flags found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Canned Responses Tab */}
        <TabsContent value="canned" className="mt-3">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="border-b border-zinc-800 py-3 px-4">
              <CardTitle className="text-white text-sm">Canned Responses</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {cannedResponses.map((response) => (
                  <div key={response.id} className="bg-zinc-800/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="text-white text-xs font-medium">{response.name}</h3>
                      {response.category && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-px border-zinc-700">
                          {response.category}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 line-clamp-3 mb-2">{response.content}</p>
                    {response.variables?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {response.variables.map((v) => (
                          <code key={v} className="text-[10px] bg-zinc-700 px-1.5 py-0.5 rounded text-cyan-400">
                            {`{{${v}}}`}
                          </code>
                        ))}
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2 h-6 text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(response.content);
                        toast.success('Copied to clipboard');
                      }}
                    >
                      <Copy className="w-3 h-3 mr-1.5" />
                      Copy
                    </Button>
                  </div>
                ))}
              </div>
              {cannedResponses.length === 0 && (
                <div className="text-center text-zinc-500 py-6 text-xs">
                  No canned responses found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reply Modal */}
      <Dialog open={showReplyModal} onOpenChange={setShowReplyModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-white text-sm">Reply to Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Message</Label>
              <Textarea
                className="bg-zinc-800 border-zinc-700 min-h-[120px] text-xs"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your reply..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={isInternalNote}
                onCheckedChange={setIsInternalNote}
              />
              <Label className="text-zinc-400 text-xs">Internal note (not visible to customer)</Label>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setShowReplyModal(false)} className="border-zinc-700 h-7 text-xs">
              Cancel
            </Button>
            <Button className="bg-cyan-600 hover:bg-cyan-700 h-7 text-xs" onClick={handleSendReply} disabled={saving}>
              {saving ? 'Sending...' : isInternalNote ? 'Add Note' : 'Send Reply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Report Modal */}
      <Dialog open={showResolveModal} onOpenChange={setShowResolveModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-white text-sm">Resolve Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Resolution</Label>
              <Textarea
                className="bg-zinc-800 border-zinc-700 text-xs min-h-[80px]"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Describe the resolution..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Take Action (optional)</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-7 text-xs">
                  <SelectValue placeholder="No action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">No action</SelectItem>
                  <SelectItem value="warning" className="text-xs">Issue Warning</SelectItem>
                  <SelectItem value="mute" className="text-xs">Mute User</SelectItem>
                  <SelectItem value="suspend" className="text-xs">Suspend User</SelectItem>
                  <SelectItem value="ban" className="text-xs">Ban User</SelectItem>
                  <SelectItem value="content_removal" className="text-xs">Remove Content</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setShowResolveModal(false)} className="border-zinc-700 h-7 text-xs">
              Cancel
            </Button>
            <Button className="bg-cyan-600 hover:bg-cyan-700 h-7 text-xs" onClick={handleResolveReport} disabled={saving}>
              {saving ? 'Resolving...' : 'Resolve Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
