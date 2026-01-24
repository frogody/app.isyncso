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
    return <Badge className={cn('text-xs', getStatusColor(mappedStatus))}>{status.replace('_', ' ')}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      low: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
      medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return <Badge className={cn('text-xs', styles[priority])}>{priority}</Badge>;
  };

  const getReasonBadge = (reason) => {
    const styles = {
      spam: 'bg-yellow-500/20 text-yellow-400',
      harassment: 'bg-red-500/20 text-red-400',
      inappropriate: 'bg-orange-500/20 text-orange-400',
      fake: 'bg-purple-500/20 text-purple-400',
      copyright: 'bg-blue-500/20 text-blue-400',
      other: 'bg-zinc-500/20 text-zinc-400',
    };
    return <Badge className={cn('text-xs', styles[reason])}>{reason}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Support & Moderation</h1>
          <p className="text-zinc-400">Manage tickets, reports, and user flags</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="border-zinc-700"
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Headphones className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.open_tickets || 0}</p>
                <p className="text-xs text-zinc-500">Open Tickets</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {stats?.avg_response_hours ? `${Math.round(stats.avg_response_hours)}h` : '-'}
                </p>
                <p className="text-xs text-zinc-500">Avg Response Time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.pending_reports || 0}</p>
                <p className="text-xs text-zinc-500">Pending Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Ban className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.active_bans || 0}</p>
                <p className="text-xs text-zinc-500">Active Bans</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="tickets" className="data-[state=active]:bg-zinc-800">
            <Headphones className="w-4 h-4 mr-2" />
            Tickets ({ticketsTotal})
          </TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-zinc-800">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Reports ({reportsTotal})
          </TabsTrigger>
          <TabsTrigger value="flags" className="data-[state=active]:bg-zinc-800">
            <Flag className="w-4 h-4 mr-2" />
            User Flags
          </TabsTrigger>
          <TabsTrigger value="canned" className="data-[state=active]:bg-zinc-800">
            <MessageSquare className="w-4 h-4 mr-2" />
            Canned Responses
          </TabsTrigger>
        </TabsList>

        {/* Tickets Tab */}
        <TabsContent value="tickets" className="mt-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Support Tickets</CardTitle>
              </div>
              <div className="flex gap-3 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    placeholder="Search tickets..."
                    className="pl-10 bg-zinc-800 border-zinc-700"
                    value={ticketsFilter.search}
                    onChange={(e) => setTicketsFilter({ ...ticketsFilter, search: e.target.value })}
                  />
                </div>
                <Select
                  value={ticketsFilter.status}
                  onValueChange={(v) => setTicketsFilter({ ...ticketsFilter, status: v })}
                >
                  <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700">
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
                  <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700">
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
                      className="p-4 hover:bg-zinc-800/30 cursor-pointer"
                      onClick={() => toggleTicketExpand(ticket.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-xs text-zinc-500">{ticket.ticket_number}</code>
                            {getStatusBadge(ticket.status)}
                            {getPriorityBadge(ticket.priority)}
                          </div>
                          <h3 className="text-white font-medium">{ticket.subject}</h3>
                          <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {ticket.user_name || ticket.user_email}
                            </span>
                            {ticket.organization_name && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {ticket.organization_name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-3 h-3" />
                              {ticket.message_count} messages
                            </span>
                            <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateTicket(ticket.id, { status: 'in_progress' }); }}>
                                Mark In Progress
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateTicket(ticket.id, { status: 'resolved' }); }}>
                                Mark Resolved
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateTicket(ticket.id, { priority: 'urgent' }); }}>
                                Set Urgent
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateTicket(ticket.id, { priority: 'high' }); }}>
                                Set High Priority
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {expandedTicket === ticket.id ? (
                            <ChevronUp className="w-5 h-5 text-zinc-500" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-zinc-500" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Ticket Detail */}
                    {expandedTicket === ticket.id && ticketDetail && (
                      <div className="bg-zinc-800/30 p-4 border-t border-zinc-700">
                        <div className="space-y-4">
                          {/* Description */}
                          {ticketDetail.ticket?.description && (
                            <div className="bg-zinc-900 p-3 rounded-lg">
                              <p className="text-sm text-zinc-300">{ticketDetail.ticket.description}</p>
                            </div>
                          )}

                          {/* Messages */}
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {ticketDetail.messages?.map((msg) => (
                              <div
                                key={msg.id}
                                className={cn(
                                  "p-3 rounded-lg",
                                  msg.is_internal ? "bg-yellow-500/10 border border-yellow-500/30" : "bg-zinc-900"
                                )}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <Avatar className="w-6 h-6">
                                    <AvatarImage src={msg.user_avatar} />
                                    <AvatarFallback className="text-xs">{msg.user_name?.charAt(0) || '?'}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm text-white font-medium">{msg.user_name}</span>
                                  {msg.is_internal && (
                                    <Badge className="text-[10px] bg-yellow-500/20 text-yellow-400">Internal</Badge>
                                  )}
                                  <span className="text-xs text-zinc-500 ml-auto">
                                    {new Date(msg.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{msg.message}</p>
                              </div>
                            ))}
                          </div>

                          {/* Reply Actions */}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-red-500 hover:bg-red-600"
                              onClick={() => setShowReplyModal(true)}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Reply
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="border-zinc-700">
                                  Use Canned Response
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-64">
                                {cannedResponses.map((response) => (
                                  <DropdownMenuItem
                                    key={response.id}
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
                  <div className="p-8 text-center text-zinc-500">
                    No tickets found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Moderation Reports</CardTitle>
                <Select
                  value={reportsFilter.status}
                  onValueChange={(v) => setReportsFilter({ status: v })}
                >
                  <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700">
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
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Reported User</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Reason</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Reporter</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Status</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Date</th>
                    <th className="text-right p-4 text-xs font-medium text-zinc-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                      <td className="p-4">
                        <div>
                          <p className="text-white font-medium">{report.reported_user_name || 'Unknown'}</p>
                          <p className="text-xs text-zinc-500">{report.reported_user_email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        {getReasonBadge(report.reason)}
                        {report.description && (
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{report.description}</p>
                        )}
                      </td>
                      <td className="p-4 text-sm text-zinc-400">{report.reporter_name || 'Anonymous'}</td>
                      <td className="p-4">{getStatusBadge(report.status)}</td>
                      <td className="p-4 text-sm text-zinc-400">
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        {report.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-zinc-700"
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
                      <td colSpan={6} className="p-8 text-center text-zinc-500">
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
        <TabsContent value="flags" className="mt-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="border-b border-zinc-800">
              <CardTitle className="text-white">User Flags</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">User</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Flag Type</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Reason</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Flagged By</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Status</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {userFlags.map((flag) => (
                    <tr key={flag.id} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                      <td className="p-4">
                        <p className="text-white font-medium">{flag.user_name}</p>
                        <p className="text-xs text-zinc-500">{flag.user_email}</p>
                      </td>
                      <td className="p-4">
                        <Badge className={cn(
                          'text-xs',
                          flag.flag_type === 'vip' ? 'bg-purple-500/20 text-purple-400' :
                          flag.flag_type === 'fraud' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        )}>
                          {flag.flag_type}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-zinc-400">{flag.reason || '-'}</td>
                      <td className="p-4 text-sm text-zinc-400">{flag.flagged_by_name || 'System'}</td>
                      <td className="p-4">
                        {flag.resolved_at ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">Resolved</Badge>
                        ) : (
                          <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Active</Badge>
                        )}
                      </td>
                      <td className="p-4 text-sm text-zinc-400">
                        {new Date(flag.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {userFlags.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500">
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
        <TabsContent value="canned" className="mt-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="border-b border-zinc-800">
              <CardTitle className="text-white">Canned Responses</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cannedResponses.map((response) => (
                  <div key={response.id} className="bg-zinc-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-medium">{response.name}</h3>
                      {response.category && (
                        <Badge variant="outline" className="text-xs border-zinc-700">
                          {response.category}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-zinc-400 line-clamp-3 mb-3">{response.content}</p>
                    {response.variables?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {response.variables.map((v) => (
                          <code key={v} className="text-[10px] bg-zinc-700 px-1.5 py-0.5 rounded text-emerald-400">
                            {`{{${v}}}`}
                          </code>
                        ))}
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-3"
                      onClick={() => {
                        navigator.clipboard.writeText(response.content);
                        toast.success('Copied to clipboard');
                      }}
                    >
                      <Copy className="w-3 h-3 mr-2" />
                      Copy
                    </Button>
                  </div>
                ))}
              </div>
              {cannedResponses.length === 0 && (
                <div className="text-center text-zinc-500 py-8">
                  No canned responses found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reply Modal */}
      <Dialog open={showReplyModal} onOpenChange={setShowReplyModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Reply to Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-400">Message</Label>
              <Textarea
                className="bg-zinc-800 border-zinc-700 min-h-[150px]"
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
              <Label className="text-zinc-400">Internal note (not visible to customer)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReplyModal(false)} className="border-zinc-700">
              Cancel
            </Button>
            <Button className="bg-red-500 hover:bg-red-600" onClick={handleSendReply} disabled={saving}>
              {saving ? 'Sending...' : isInternalNote ? 'Add Note' : 'Send Reply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Report Modal */}
      <Dialog open={showResolveModal} onOpenChange={setShowResolveModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Resolve Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-400">Resolution</Label>
              <Textarea
                className="bg-zinc-800 border-zinc-700"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Describe the resolution..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Take Action (optional)</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="No action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No action</SelectItem>
                  <SelectItem value="warning">Issue Warning</SelectItem>
                  <SelectItem value="mute">Mute User</SelectItem>
                  <SelectItem value="suspend">Suspend User</SelectItem>
                  <SelectItem value="ban">Ban User</SelectItem>
                  <SelectItem value="content_removal">Remove Content</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveModal(false)} className="border-zinc-700">
              Cancel
            </Button>
            <Button className="bg-red-500 hover:bg-red-600" onClick={handleResolveReport} disabled={saving}>
              {saving ? 'Resolving...' : 'Resolve Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
