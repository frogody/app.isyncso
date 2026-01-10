import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import anime from '@/lib/anime-wrapper';
const animate = anime;
const stagger = anime.stagger;
import { base44, supabase } from "@/api/base44Client";
import { useUser } from "@/components/context/UserContext";
import { prefersReducedMotion } from "@/lib/animations";

// Contact type definitions
const CONTACT_TYPES = [
  { id: 'all', label: 'All Contacts' },
  { id: 'lead', label: 'Leads' },
  { id: 'prospect', label: 'Prospects' },
  { id: 'customer', label: 'Customers' },
  { id: 'supplier', label: 'Suppliers' },
  { id: 'partner', label: 'Partners' },
  { id: 'candidate', label: 'Candidates' },
  { id: 'target', label: 'Targets' },
];
import {
  Plus, Search, Filter, Mail, Phone, Building2, MapPin, MoreVertical, X,
  Download, Upload, Trash2, Tag, User, Calendar, MessageSquare, ExternalLink,
  ChevronDown, ChevronRight, Clock, Star, StarOff, FileText, Briefcase,
  TrendingUp, Activity, Edit2, CheckCircle2, XCircle, Users, Globe, Eye,
  LayoutGrid, List, Kanban, BarChart3, Target, DollarSign, ArrowUpRight,
  ArrowDownRight, Minus, PieChart, LineChart, Send, PhoneCall, Video,
  UserPlus, Settings2, Zap, Sparkles, Award, AlertCircle, ArrowRight,
  Table2, RefreshCw, Copy, Link2, Linkedin, Twitter, SlidersHorizontal,
  ChevronLeft, Home, Layers, GripVertical, Hash, Loader2
} from "lucide-react";
import { enrichContact, mapEnrichedDataToContact } from "@/components/integrations/ExploriumAPI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

// CRM Pipeline Stages - using consistent cyan theme
const PIPELINE_STAGES = [
  { id: "new", label: "New Lead", color: "bg-zinc-600", textColor: "text-zinc-400", bgColor: "bg-zinc-500/10", borderColor: "border-zinc-500/30" },
  { id: "contacted", label: "Contacted", color: "bg-cyan-600/80", textColor: "text-cyan-400/80", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/30" },
  { id: "qualified", label: "Qualified", color: "bg-cyan-500/80", textColor: "text-cyan-400/80", bgColor: "bg-cyan-500/15", borderColor: "border-cyan-500/35" },
  { id: "proposal", label: "Proposal", color: "bg-cyan-500", textColor: "text-cyan-400", bgColor: "bg-cyan-500/20", borderColor: "border-cyan-500/40" },
  { id: "negotiation", label: "Negotiation", color: "bg-cyan-400/80", textColor: "text-cyan-300/90", bgColor: "bg-cyan-500/25", borderColor: "border-cyan-500/45" },
  { id: "won", label: "Won", color: "bg-cyan-400", textColor: "text-cyan-300", bgColor: "bg-cyan-500/30", borderColor: "border-cyan-500/50" },
  { id: "lost", label: "Lost", color: "bg-zinc-700", textColor: "text-zinc-500", bgColor: "bg-zinc-500/10", borderColor: "border-zinc-600/30" },
];

const CONTACT_SOURCES = [
  { id: "website", label: "Website" },
  { id: "referral", label: "Referral" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "cold_outreach", label: "Cold Outreach" },
  { id: "event", label: "Event" },
  { id: "partner", label: "Partner" },
  { id: "other", label: "Other" },
];

const INDUSTRY_OPTIONS = [
  "Technology", "Finance", "Healthcare", "Education", "Retail", "Manufacturing",
  "Real Estate", "Consulting", "Marketing", "Legal", "Non-profit", "Other"
];

const emptyContact = {
  name: "",
  email: "",
  phone: "",
  company_name: "",
  job_title: "",
  location: "",
  stage: "new",
  source: "website",
  contact_type: "lead",
  industry: "",
  company_size: "",
  website: "",
  linkedin_url: "",
  twitter_url: "",
  deal_value: "",
  score: 50,
  tags: [],
  notes: "",
  last_contacted: null,
  next_follow_up: null,
};

// Lead Score Component - using cyan theme
function LeadScoreIndicator({ score }) {
  const getScoreColor = (s) => {
    if (s >= 80) return { bg: "bg-cyan-400", text: "text-cyan-400", label: "Hot" };
    if (s >= 60) return { bg: "bg-cyan-500/80", text: "text-cyan-400/80", label: "Warm" };
    if (s >= 40) return { bg: "bg-cyan-600/60", text: "text-cyan-400/60", label: "Cool" };
    return { bg: "bg-zinc-600", text: "text-zinc-500", label: "Cold" };
  };

  const { bg, text, label } = getScoreColor(score);

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-10 h-10">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-zinc-800" />
          <circle
            cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="transparent"
            strokeDasharray={`${(score / 100) * 100.53} 100.53`}
            className={text}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${text}`}>{score}</span>
      </div>
      <span className={`text-xs font-medium ${text}`}>{label}</span>
    </div>
  );
}

// Contact Card for Grid View
function ContactCard({ contact, isSelected, onClick, onToggleStar, onStageChange }) {
  const stageConfig = PIPELINE_STAGES.find(s => s.id === contact.stage) || PIPELINE_STAGES[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={`bg-zinc-900/50 border rounded-2xl p-4 cursor-pointer transition-all group ${
        isSelected ? "border-cyan-500/50 ring-1 ring-cyan-500/30" : "border-zinc-800/60 hover:border-zinc-700"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500/20 to-cyan-400/10 flex items-center justify-center flex-shrink-0 ring-2 ring-zinc-800">
            <span className="text-cyan-400/80 font-semibold">
              {contact.name?.charAt(0)?.toUpperCase() || "?"}
            </span>
          </div>
          <div>
            <h4 className="font-medium text-white group-hover:text-cyan-400 transition-colors">
              {contact.name || "Unnamed Contact"}
            </h4>
            {contact.job_title && (
              <p className="text-xs text-zinc-500">{contact.job_title}</p>
            )}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleStar(contact); }}
          className="text-zinc-600 hover:text-yellow-400 transition-colors"
        >
          {contact.is_starred ? (
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          ) : (
            <Star className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Company */}
      {contact.company_name && (
        <div className="flex items-center gap-2 mb-3 text-sm text-zinc-400">
          <Building2 className="w-4 h-4 text-zinc-500" />
          <span className="truncate">{contact.company_name}</span>
        </div>
      )}

      {/* Stage Badge */}
      <div className="flex items-center justify-between mb-3">
        <Badge variant="outline" className={`${stageConfig.bgColor} ${stageConfig.textColor} ${stageConfig.borderColor}`}>
          {stageConfig.label}
        </Badge>
        <LeadScoreIndicator score={contact.score || 50} />
      </div>

      {/* Deal Value */}
      {contact.deal_value && (
        <div className="flex items-center justify-between text-sm mb-3">
          <span className="text-zinc-500">Deal Value</span>
          <span className="font-semibold text-cyan-400/80">${parseFloat(contact.deal_value).toLocaleString()}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
        <div className="flex items-center gap-2">
          {contact.email && (
            <button
              onClick={(e) => { e.stopPropagation(); window.location.href = `mailto:${contact.email}`; }}
              className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
            </button>
          )}
          {contact.phone && (
            <button
              onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${contact.phone}`; }}
              className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
            </button>
          )}
          {contact.linkedin_url && (
            <button
              onClick={(e) => { e.stopPropagation(); window.open(contact.linkedin_url, '_blank'); }}
              className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-700 transition-colors"
            >
              <Linkedin className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {contact.last_contacted && (
          <span className="text-xs text-zinc-500">
            {new Date(contact.last_contacted).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// Pipeline Kanban Card
function PipelineCard({ contact, index, onEdit, onDelete }) {
  return (
    <Draggable draggableId={contact.id} index={index}>
      {(provided, snapshot) => (
        <motion.div
          ref={provided.innerRef}
          {...provided.draggableProps}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`group bg-zinc-900/80 rounded-xl border transition-all ${
            snapshot.isDragging
              ? "shadow-xl shadow-cyan-500/10 border-cyan-500/40"
              : "border-zinc-800/60 hover:border-zinc-700"
          }`}
        >
          <div className="p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div {...provided.dragHandleProps} className="cursor-grab text-zinc-600 hover:text-zinc-400">
                  <GripVertical className="w-4 h-4" />
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/15 to-cyan-400/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-cyan-400/80 text-xs font-semibold">
                    {contact.name?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-medium text-white truncate">{contact.name}</h4>
                  {contact.company_name && (
                    <p className="text-xs text-zinc-500 truncate">{contact.company_name}</p>
                  )}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                    <MoreVertical className="w-3.5 h-3.5 text-zinc-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                  <DropdownMenuItem onClick={() => onEdit(contact)} className="text-zinc-300">
                    <Edit2 className="w-4 h-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  <DropdownMenuItem onClick={() => onDelete(contact.id)} className="text-red-400">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {contact.deal_value && (
              <div className="flex items-center gap-1 text-sm font-medium text-cyan-400/80 ml-6 mb-2">
                <DollarSign className="w-3.5 h-3.5" />
                {parseFloat(contact.deal_value).toLocaleString()}
              </div>
            )}

            <div className="flex items-center justify-between ml-6">
              <div className="flex items-center gap-1.5">
                {contact.email && <Mail className="w-3 h-3 text-zinc-600" />}
                {contact.phone && <Phone className="w-3 h-3 text-zinc-600" />}
              </div>
              <LeadScoreIndicator score={contact.score || 50} />
            </div>
          </div>
        </motion.div>
      )}
    </Draggable>
  );
}

// Pipeline Column
function PipelineColumn({ stage, contacts, onAddContact, onEdit, onDelete }) {
  const totalValue = contacts.reduce((sum, c) => sum + (parseFloat(c.deal_value) || 0), 0);

  return (
    <div className="flex-shrink-0 w-72">
      {/* Column Header */}
      <div className="mb-3 px-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${stage.color}`} />
            <span className="font-medium text-white text-sm">{stage.label}</span>
            <span className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">{contacts.length}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-white"
            onClick={() => onAddContact(stage.id)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {totalValue > 0 && (
          <div className="text-xs text-zinc-500">${totalValue.toLocaleString()} total</div>
        )}
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={stage.id} type="CONTACT">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-2 min-h-[300px] rounded-xl p-2 transition-all ${
              snapshot.isDraggingOver
                ? "bg-cyan-500/5 border-2 border-dashed border-cyan-500/30"
                : "border-2 border-transparent"
            }`}
          >
            <AnimatePresence>
              {contacts.map((contact, index) => (
                <PipelineCard
                  key={contact.id}
                  contact={contact}
                  index={index}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </AnimatePresence>
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

// Contact Detail Sheet
function ContactDetailSheet({ contact, isOpen, onClose, onEdit, onDelete, activities, deals }) {
  const stageConfig = PIPELINE_STAGES.find(s => s.id === contact?.stage) || PIPELINE_STAGES[0];

  if (!contact) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl bg-zinc-900 border-zinc-800/60 overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-400/10 flex items-center justify-center">
                <span className="text-cyan-400/80 font-bold text-xl">
                  {contact.name?.charAt(0)?.toUpperCase() || "?"}
                </span>
              </div>
              <div>
                <SheetTitle className="text-white text-xl">{contact.name}</SheetTitle>
                {contact.job_title && <p className="text-zinc-400">{contact.job_title}</p>}
                {contact.company_name && (
                  <p className="text-zinc-500 text-sm flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {contact.company_name}
                  </p>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-3 bg-zinc-800/50 rounded-lg text-center">
            <div className="text-xs text-zinc-500 mb-1">Stage</div>
            <Badge variant="outline" className={`${stageConfig.bgColor} ${stageConfig.textColor} ${stageConfig.borderColor}`}>
              {stageConfig.label}
            </Badge>
          </div>
          <div className="p-3 bg-zinc-800/50 rounded-lg text-center">
            <div className="text-xs text-zinc-500 mb-1">Score</div>
            <LeadScoreIndicator score={contact.score || 50} />
          </div>
          <div className="p-3 bg-zinc-800/50 rounded-lg text-center">
            <div className="text-xs text-zinc-500 mb-1">Deal Value</div>
            <div className="text-lg font-bold text-white">
              ${parseFloat(contact.deal_value || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 mb-6">
          {contact.email && (
            <Button
              size="sm"
              className="bg-cyan-500/15 text-cyan-400/80 hover:bg-cyan-500/25 border border-cyan-500/30"
              onClick={() => window.location.href = `mailto:${contact.email}`}
            >
              <Mail className="w-4 h-4 mr-1" /> Email
            </Button>
          )}
          {contact.phone && (
            <Button size="sm" variant="outline" className="border-zinc-700" onClick={() => window.location.href = `tel:${contact.phone}`}>
              <Phone className="w-4 h-4 mr-1" /> Call
            </Button>
          )}
          <Button size="sm" variant="outline" className="border-zinc-700">
            <Video className="w-4 h-4 mr-1" /> Meet
          </Button>
          <Button size="sm" variant="outline" className="border-zinc-700" onClick={() => onEdit(contact)}>
            <Edit2 className="w-4 h-4 mr-1" /> Edit
          </Button>
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="bg-zinc-800/50 mb-4 w-full">
            <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
            <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
            <TabsTrigger value="deals" className="flex-1">Deals</TabsTrigger>
            <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {contact.email && (
                <div className="p-3 bg-zinc-800/30 rounded-lg">
                  <div className="text-xs text-zinc-500 mb-1">Email</div>
                  <div className="text-sm text-white flex items-center gap-2">
                    <Mail className="w-4 h-4 text-zinc-500" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                </div>
              )}
              {contact.phone && (
                <div className="p-3 bg-zinc-800/30 rounded-lg">
                  <div className="text-xs text-zinc-500 mb-1">Phone</div>
                  <div className="text-sm text-white flex items-center gap-2">
                    <Phone className="w-4 h-4 text-zinc-500" />
                    {contact.phone}
                  </div>
                </div>
              )}
              {contact.location && (
                <div className="p-3 bg-zinc-800/30 rounded-lg">
                  <div className="text-xs text-zinc-500 mb-1">Location</div>
                  <div className="text-sm text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-zinc-500" />
                    {contact.location}
                  </div>
                </div>
              )}
              {contact.industry && (
                <div className="p-3 bg-zinc-800/30 rounded-lg">
                  <div className="text-xs text-zinc-500 mb-1">Industry</div>
                  <div className="text-sm text-white flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-zinc-500" />
                    {contact.industry}
                  </div>
                </div>
              )}
              {contact.source && (
                <div className="p-3 bg-zinc-800/30 rounded-lg">
                  <div className="text-xs text-zinc-500 mb-1">Source</div>
                  <div className="text-sm text-white capitalize">{contact.source.replace(/_/g, ' ')}</div>
                </div>
              )}
              {contact.website && (
                <div className="p-3 bg-zinc-800/30 rounded-lg">
                  <div className="text-xs text-zinc-500 mb-1">Website</div>
                  <a href={contact.website} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400/80 hover:underline flex items-center gap-1">
                    <Globe className="w-4 h-4" /> Visit
                  </a>
                </div>
              )}
            </div>

            {/* Social Links */}
            {(contact.linkedin_url || contact.twitter_url) && (
              <div className="pt-3 border-t border-zinc-800/60">
                <div className="text-xs text-zinc-500 mb-2">Social</div>
                <div className="flex gap-2">
                  {contact.linkedin_url && (
                    <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-zinc-800/60 rounded-lg text-cyan-400/80 hover:bg-zinc-700">
                      <Linkedin className="w-5 h-5" />
                    </a>
                  )}
                  {contact.twitter_url && (
                    <a href={contact.twitter_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-zinc-800/60 rounded-lg text-cyan-400/80 hover:bg-zinc-700">
                      <Twitter className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            {contact.tags?.length > 0 && (
              <div className="pt-3 border-t border-zinc-800">
                <div className="text-xs text-zinc-500 mb-2">Tags</div>
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map((tag, i) => (
                    <Badge key={i} variant="outline" className="border-zinc-700 text-zinc-300">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity">
            {activities.length > 0 ? (
              <div className="space-y-3">
                {activities.map((activity, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-zinc-800/30 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                      <Activity className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white">{activity.description}</p>
                      <p className="text-xs text-zinc-500 mt-1">{new Date(activity.created_date).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-500">
                <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No activity recorded</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="deals">
            {deals.length > 0 ? (
              <div className="space-y-3">
                {deals.map((deal, i) => (
                  <div key={i} className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-white">{deal.company_name || deal.title}</h4>
                      <span className="text-lg font-bold text-cyan-400/80">${(deal.deal_value || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-zinc-700 text-xs">{deal.stage}</Badge>
                      <span className="text-xs text-zinc-500">{deal.probability}% probability</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-500">
                <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No deals associated</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes">
            {contact.notes ? (
              <div className="p-4 bg-zinc-800/30 rounded-lg">
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{contact.notes}</p>
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-500">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No notes added</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// Analytics Dashboard
function CRMAnalytics({ contacts }) {
  const stats = useMemo(() => {
    const byStage = {};
    PIPELINE_STAGES.forEach(s => { byStage[s.id] = { count: 0, value: 0 }; });

    let totalValue = 0;
    let hotLeads = 0;
    let contactedThisWeek = 0;
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    contacts.forEach(c => {
      const stage = c.stage || 'new';
      if (byStage[stage]) {
        byStage[stage].count++;
        byStage[stage].value += parseFloat(c.deal_value) || 0;
      }
      totalValue += parseFloat(c.deal_value) || 0;
      if (c.score >= 80) hotLeads++;
      if (c.last_contacted && new Date(c.last_contacted) > oneWeekAgo) contactedThisWeek++;
    });

    const wonDeals = byStage.won?.count || 0;
    const lostDeals = byStage.lost?.count || 0;
    const closedDeals = wonDeals + lostDeals;
    const conversionRate = closedDeals > 0 ? ((wonDeals / closedDeals) * 100).toFixed(1) : 0;

    return { byStage, totalValue, hotLeads, contactedThisWeek, conversionRate, totalContacts: contacts.length };
  }, [contacts]);

  return (
    <div className="space-y-6 mb-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-cyan-400/70" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalContacts}</div>
          <div className="text-xs text-zinc-500">Total Contacts</div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-cyan-400/70" />
          </div>
          <div className="text-2xl font-bold text-white">${(stats.totalValue / 1000).toFixed(0)}k</div>
          <div className="text-xs text-zinc-500">Pipeline Value</div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-cyan-400/70" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.conversionRate}%</div>
          <div className="text-xs text-zinc-500">Win Rate</div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-5 h-5 text-cyan-400/70" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.hotLeads}</div>
          <div className="text-xs text-zinc-500">Hot Leads</div>
        </div>
      </div>

      {/* Pipeline Funnel */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Pipeline Overview</h3>
        <div className="space-y-3">
          {PIPELINE_STAGES.filter(s => s.id !== 'lost').map(stage => {
            const data = stats.byStage[stage.id];
            const percentage = stats.totalContacts > 0 ? (data.count / stats.totalContacts) * 100 : 0;
            return (
              <div key={stage.id} className="flex items-center gap-4">
                <div className="w-24 text-sm text-zinc-400">{stage.label}</div>
                <div className="flex-1 bg-zinc-800 rounded-full h-6 relative overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    className={`h-full ${stage.color} rounded-full`}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                    {data.count} ({percentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="w-20 text-right text-sm text-zinc-400">
                  ${(data.value / 1000).toFixed(0)}k
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Main CRM Component
export default function CRMContacts() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedContactType = searchParams.get('type') || 'all';

  const [contacts, setContacts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [detailContact, setDetailContact] = useState(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(emptyContact);
  const [editingContact, setEditingContact] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // 'grid', 'table', 'pipeline'
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [activities, setActivities] = useState([]);
  const [deals, setDeals] = useState([]);
  const [enriching, setEnriching] = useState(false);
  const tableBodyRef = useRef(null);

  useEffect(() => {
    if (user?.id) loadContacts();
  }, [user]);

  const loadContacts = async () => {
    if (!user?.id) return;
    try {
      // Use owner_id which is the actual column name in the prospects table
      const prospects = await base44.entities.Prospect.filter({ owner_id: user.id });
      const contactList = prospects.map(p => ({
        id: p.id,
        name: [p.first_name, p.last_name].filter(Boolean).join(' ') || p.company || "Unknown",
        email: p.email,
        phone: p.phone,
        company_name: p.company,
        job_title: p.job_title,
        location: p.location,
        stage: p.stage || "new",
        source: p.source || "website",
        contact_type: p.contact_type || "prospect",
        industry: p.industry,
        company_size: p.company_size,
        website: p.website,
        linkedin_url: p.linkedin_url,
        twitter_url: p.twitter_url,
        deal_value: p.deal_value || 0,
        score: p.probability || 50,
        tags: p.tags || [],
        notes: p.notes,
        is_starred: p.is_starred || false,
        last_contacted: p.last_contacted,
        next_follow_up: p.next_follow_up,
        created_date: p.created_date,
        updated_date: p.updated_date,
        // Type-specific fields
        lifetime_value: p.lifetime_value,
        contract_date: p.contract_date,
        renewal_date: p.renewal_date,
        partnership_type: p.partnership_type,
        candidate_status: p.candidate_status,
        target_priority: p.target_priority,
      }));
      setContacts(contactList);

      // Also load suppliers for the supplier type view
      if (user?.company_id) {
        const { data: supplierData } = await supabase
          .from('suppliers')
          .select('*')
          .eq('company_id', user.company_id);
        setSuppliers(supplierData || []);
      }
    } catch (error) {
      console.error("Failed to load contacts:", error);
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  const loadContactDetails = async (contact) => {
    try {
      const [opps, acts] = await Promise.all([
        base44.entities.GrowthOpportunity.filter({ contact_email: contact.email }).catch(() => []),
        base44.entities.ActionLog.filter({ target_email: contact.email }).catch(() => []),
      ]);
      setDeals(opps);
      setActivities(acts);
    } catch (error) {
      console.error("Failed to load contact details:", error);
    }
  };

  // Calculate contact counts by type for sidebar
  const contactCounts = useMemo(() => {
    const counts = {};
    contacts.forEach(c => {
      const type = c.contact_type || 'prospect';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    // If supplier view is selected, show suppliers instead
    if (selectedContactType === 'supplier') {
      return suppliers.map(s => ({
        id: s.id,
        name: s.name,
        email: s.contact?.email,
        phone: s.contact?.phone,
        company_name: s.name,
        website: s.website,
        location: s.address?.country || '',
        stage: 'won',
        contact_type: 'supplier',
        is_supplier: true,
      })).filter(c => {
        const matchesSearch = !searchQuery ||
          c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.email?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      });
    }

    return contacts.filter(c => {
      const matchesSearch = !searchQuery ||
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStage = stageFilter === "all" || c.stage === stageFilter;
      const matchesSource = sourceFilter === "all" || c.source === sourceFilter;
      const matchesType = selectedContactType === "all" || c.contact_type === selectedContactType;
      return matchesSearch && matchesStage && matchesSource && matchesType;
    });
  }, [contacts, suppliers, searchQuery, stageFilter, sourceFilter, selectedContactType]);

  const contactsByStage = useMemo(() => {
    const grouped = {};
    PIPELINE_STAGES.forEach(stage => {
      grouped[stage.id] = filteredContacts.filter(c => c.stage === stage.id);
    });
    return grouped;
  }, [filteredContacts]);

  // Animate table rows on load (after filteredContacts is defined)
  useEffect(() => {
    if (tableBodyRef.current && viewMode === 'table' && !prefersReducedMotion()) {
      const rows = tableBodyRef.current.querySelectorAll('tr');
      if (rows.length > 0) {
        animate({
          targets: rows,
          opacity: [0, 1],
          translateX: [-15, 0],
          delay: stagger(25, { start: 100 }),
          duration: 300,
          easing: 'easeOutQuad',
        });
      }
    }
  }, [filteredContacts, viewMode]);

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const contactId = result.draggableId;
    const newStage = result.destination.droppableId;

    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, stage: newStage } : c));

    try {
      await base44.entities.Prospect.update(contactId, { stage: newStage });
      const stageName = PIPELINE_STAGES.find(s => s.id === newStage)?.label;
      toast.success(`Moved to ${stageName}`);
    } catch (error) {
      console.error("Failed to update stage:", error);
      toast.error("Failed to update stage");
      loadContacts();
    }
  };

  const handleSave = async () => {
    if (!formData.name && !formData.company_name) {
      toast.error("Name or company is required");
      return;
    }

    if (!user?.id) {
      toast.error("You must be logged in to create contacts");
      return;
    }

    try {
      // Parse name into first_name and last_name
      const nameParts = (formData.name || '').trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Use correct column names for the prospects table
      const prospectData = {
        owner_id: user.id,
        first_name: firstName,
        last_name: lastName,
        email: formData.email,
        phone: formData.phone,
        job_title: formData.job_title,
        company: formData.company_name,
        stage: formData.stage,
        source: formData.source,
        contact_type: formData.contact_type || 'lead',
        linkedin_url: formData.linkedin_url,
        twitter_url: formData.twitter_url,
        website: formData.website,
        location: formData.location,
        industry: formData.industry,
        company_size: formData.company_size,
        deal_value: formData.deal_value ? parseFloat(formData.deal_value) : null,
        probability: formData.score,
        tags: formData.tags,
        notes: formData.notes,
        is_starred: formData.is_starred || false,
        next_follow_up: formData.next_follow_up,
        // Type-specific fields
        lifetime_value: formData.lifetime_value ? parseFloat(formData.lifetime_value) : null,
        contract_date: formData.contract_date,
        renewal_date: formData.renewal_date,
        partnership_type: formData.partnership_type,
        candidate_status: formData.candidate_status,
        target_priority: formData.target_priority,
      };

      if (editingContact) {
        await base44.entities.Prospect.update(editingContact.id, prospectData);
        toast.success("Contact updated");
      } else {
        await base44.entities.Prospect.create(prospectData);
        toast.success("Contact created");
      }

      setShowModal(false);
      setFormData(emptyContact);
      setEditingContact(null);
      loadContacts();
    } catch (error) {
      console.error("Failed to save contact:", error);
      toast.error("Failed to save contact");
    }
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setFormData({ ...contact });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this contact?")) return;
    try {
      await base44.entities.Prospect.delete(id);
      toast.success("Contact deleted");
      setSelectedContacts(prev => prev.filter(cid => cid !== id));
      if (detailContact?.id === id) {
        setDetailContact(null);
        setShowDetailSheet(false);
      }
      loadContacts();
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Failed to delete contact");
    }
  };

  const handleToggleStar = async (contact) => {
    try {
      await base44.entities.Prospect.update(contact.id, { is_starred: !contact.is_starred });
      loadContacts();
    } catch (error) {
      console.error("Failed to update:", error);
    }
  };

  // Explorium enrichment for contacts
  const handleEnrichContact = async () => {
    if (!formData.company_name && !formData.email && !formData.website) {
      toast.error("Enter a company name, email, or website to enrich");
      return;
    }

    setEnriching(true);
    try {
      // Extract domain from email or website
      let domain = null;
      if (formData.website) {
        try {
          domain = new URL(formData.website.startsWith('http') ? formData.website : `https://${formData.website}`).hostname;
        } catch { }
      } else if (formData.email) {
        domain = formData.email.split('@')[1];
      }

      const enrichedData = await enrichContact({
        companyName: formData.company_name,
        domain: domain,
        email: formData.email,
        linkedinUrl: formData.linkedin_url,
        fullName: formData.name
      });

      if (enrichedData.error) {
        toast.error("Enrichment service unavailable. Set up Explorium API in Settings.");
        return;
      }

      if (!enrichedData.enriched) {
        toast.info("No additional data found for this contact");
        return;
      }

      // Map and merge enriched data
      const mappedData = mapEnrichedDataToContact(enrichedData);

      setFormData(prev => ({
        ...prev,
        // Only fill in empty fields, don't overwrite existing data
        company_name: prev.company_name || mappedData.company_name || prev.company_name,
        industry: prev.industry || mappedData.industry || prev.industry,
        company_size: prev.company_size || mappedData.company_size || prev.company_size,
        website: prev.website || mappedData.website || prev.website,
        location: prev.location || mappedData.location || prev.location,
        linkedin_url: prev.linkedin_url || mappedData.linkedin_url || prev.linkedin_url,
        name: prev.name || mappedData.contact_name || prev.name,
        job_title: prev.job_title || mappedData.contact_title || prev.job_title,
        email: prev.email || mappedData.contact_email || prev.email,
        phone: prev.phone || mappedData.contact_phone || prev.phone,
      }));

      toast.success("Contact enriched with company data!");
    } catch (error) {
      console.error("Enrichment failed:", error);
      toast.error("Failed to enrich contact. Check your Explorium API setup.");
    } finally {
      setEnriching(false);
    }
  };

  const handleViewContact = (contact) => {
    setDetailContact(contact);
    loadContactDetails(contact);
    setShowDetailSheet(true);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedContacts.length} contacts?`)) return;
    try {
      await Promise.all(selectedContacts.map(id => base44.entities.Prospect.delete(id)));
      toast.success(`${selectedContacts.length} contacts deleted`);
      setSelectedContacts([]);
      loadContacts();
    } catch (error) {
      console.error("Bulk delete failed:", error);
      toast.error("Failed to delete contacts");
    }
  };

  const handleExport = () => {
    const csv = [
      ["Name", "Email", "Phone", "Company", "Title", "Stage", "Score", "Deal Value", "Source"],
      ...filteredContacts.map(c => [
        c.name, c.email, c.phone, c.company_name, c.job_title, c.stage, c.score, c.deal_value, c.source
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "crm-contacts.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Contacts exported");
  };

  const handleAddToStage = (stageId) => {
    setEditingContact(null);
    setFormData({ ...emptyContact, stage: stageId });
    setShowModal(true);
  };

  // Navigate to import page
  const handleImportContacts = () => {
    navigate('/contacts-import');
  };

  if (loading) {
    return (
      <div className="max-w-full mx-auto p-4 sm:p-6">
        <Skeleton className="h-10 w-48 bg-zinc-800 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 bg-zinc-800 rounded-xl" />)}
        </div>
        <div className="flex gap-4 overflow-x-auto">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="w-72 h-96 bg-zinc-800 rounded-xl flex-shrink-0" />)}
        </div>
      </div>
    );
  }

  // Get current type label for display
  const currentTypeLabel = CONTACT_TYPES.find(t => t.id === selectedContactType)?.label || 'Contacts';

  return (
    <div className="max-w-full mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{currentTypeLabel}</h1>
          <p className="text-sm text-zinc-400">
            {filteredContacts.length} {selectedContactType === 'all' ? 'contacts' : currentTypeLabel.toLowerCase()} in pipeline
          </p>
        </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-zinc-800/50 rounded-lg p-1">
              <button
                onClick={() => setViewMode("pipeline")}
                className={`p-2 rounded text-sm ${viewMode === "pipeline" ? "bg-zinc-700 text-white" : "text-zinc-400"}`}
                title="Pipeline View"
              >
                <Kanban className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded text-sm ${viewMode === "grid" ? "bg-zinc-700 text-white" : "text-zinc-400"}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-2 rounded text-sm ${viewMode === "table" ? "bg-zinc-700 text-white" : "text-zinc-400"}`}
                title="Table View"
              >
                <Table2 className="w-4 h-4" />
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700 ${showAnalytics ? "bg-cyan-500/15 text-cyan-400/80 border-cyan-500/30" : ""}`}
            >
              <BarChart3 className="w-4 h-4 mr-1" /> Analytics
            </Button>

            <Button variant="outline" size="sm" onClick={handleExport} className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700">
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>

            <Button onClick={() => { setEditingContact(null); setFormData(emptyContact); setShowModal(true); }} className="bg-cyan-600/80 hover:bg-cyan-600 text-white">
              <Plus className="w-4 h-4 mr-1" /> Add Contact
            </Button>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <AnimatePresence>
          {showAnalytics && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <CRMAnalytics contacts={contacts} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-800"
            />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-zinc-900 border-zinc-800">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all">All Stages</SelectItem>
              {PIPELINE_STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-zinc-900 border-zinc-800">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all">All Sources</SelectItem>
              {CONTACT_SOURCES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Bulk Actions */}
          {selectedContacts.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-zinc-400">{selectedContacts.length} selected</span>
              <Button variant="outline" size="sm" onClick={handleBulkDelete} className="text-zinc-400 border-zinc-600 hover:bg-zinc-800">
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            </div>
          )}
        </div>

        {/* Content Views */}
        {viewMode === "pipeline" ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
              {PIPELINE_STAGES.map(stage => (
                <PipelineColumn
                  key={stage.id}
                  stage={stage}
                  contacts={contactsByStage[stage.id]}
                  onAddContact={handleAddToStage}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </DragDropContext>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredContacts.map(contact => (
              <ContactCard
                key={contact.id}
                contact={contact}
                isSelected={selectedContacts.includes(contact.id)}
                onClick={() => handleViewContact(contact)}
                onToggleStar={handleToggleStar}
              />
            ))}
            {filteredContacts.length === 0 && (
              <div className="col-span-full text-center py-20">
                <Users className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                <h2 className="text-xl font-semibold text-zinc-300 mb-2">No contacts found</h2>
                <p className="text-zinc-500 mb-6">Try adjusting your filters or add a new contact</p>
                <Button onClick={() => { setEditingContact(null); setFormData(emptyContact); setShowModal(true); }} className="bg-cyan-600/80 hover:bg-cyan-600 text-white">
                  <Plus className="w-4 h-4 mr-1" /> Add Contact
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Table View */
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="p-3 text-left">
                      <Checkbox
                        checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                        onCheckedChange={(checked) => {
                          setSelectedContacts(checked ? filteredContacts.map(c => c.id) : []);
                        }}
                      />
                    </th>
                    <th className="p-3 text-left text-xs font-medium text-zinc-500 uppercase">Contact</th>
                    <th className="p-3 text-left text-xs font-medium text-zinc-500 uppercase">Company</th>
                    <th className="p-3 text-left text-xs font-medium text-zinc-500 uppercase">Stage</th>
                    <th className="p-3 text-left text-xs font-medium text-zinc-500 uppercase">Score</th>
                    <th className="p-3 text-left text-xs font-medium text-zinc-500 uppercase">Deal Value</th>
                    <th className="p-3 text-left text-xs font-medium text-zinc-500 uppercase">Source</th>
                    <th className="p-3 text-left text-xs font-medium text-zinc-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody ref={tableBodyRef}>
                  {filteredContacts.map(contact => {
                    const stageConfig = PIPELINE_STAGES.find(s => s.id === contact.stage) || PIPELINE_STAGES[0];
                    return (
                      <tr key={contact.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors" style={{ opacity: 0 }}>
                        <td className="p-3">
                          <Checkbox
                            checked={selectedContacts.includes(contact.id)}
                            onCheckedChange={(checked) => {
                              setSelectedContacts(prev =>
                                checked ? [...prev, contact.id] : prev.filter(id => id !== contact.id)
                              );
                            }}
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleViewContact(contact)}>
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/15 to-cyan-400/10 flex items-center justify-center">
                              <span className="text-cyan-400/80 text-sm font-medium">{contact.name?.charAt(0)?.toUpperCase()}</span>
                            </div>
                            <div>
                              <div className="font-medium text-white hover:text-cyan-400 transition-colors">{contact.name}</div>
                              <div className="text-xs text-zinc-500">{contact.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm text-zinc-300">{contact.company_name || "-"}</div>
                          {contact.job_title && <div className="text-xs text-zinc-500">{contact.job_title}</div>}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className={`${stageConfig.bgColor} ${stageConfig.textColor} ${stageConfig.borderColor}`}>
                            {stageConfig.label}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <LeadScoreIndicator score={contact.score || 50} />
                        </td>
                        <td className="p-3">
                          <span className="font-medium text-white">
                            {contact.deal_value ? `$${parseFloat(contact.deal_value).toLocaleString()}` : "-"}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-sm text-zinc-400 capitalize">{contact.source?.replace(/_/g, ' ') || "-"}</span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(contact)}>
                              <Edit2 className="w-4 h-4 text-zinc-400" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4 text-zinc-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                                <DropdownMenuItem onClick={() => handleViewContact(contact)} className="text-zinc-300">
                                  <Eye className="w-4 h-4 mr-2" /> View
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-zinc-800" />
                                <DropdownMenuItem onClick={() => handleDelete(contact.id)} className="text-red-400">
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* Contact Detail Sheet */}
      <ContactDetailSheet
        contact={detailContact}
        isOpen={showDetailSheet}
        onClose={() => setShowDetailSheet(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        activities={activities}
        deals={deals}
      />

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{editingContact ? "Edit Contact" : "Add Contact"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Full Name *</label>
                <Input
                  placeholder="John Smith"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Email</label>
                <Input
                  type="email"
                  placeholder="john@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Phone</label>
                <Input
                  placeholder="+1 234-567-8900"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Job Title</label>
                <Input
                  placeholder="CEO, CTO, etc."
                  value={formData.job_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, job_title: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Company</label>
                <Input
                  placeholder="Acme Corp"
                  value={formData.company_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Industry</label>
                <Select value={formData.industry} onValueChange={(v) => setFormData(prev => ({ ...prev, industry: v }))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {INDUSTRY_OPTIONS.map(ind => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Contact Type</label>
                <Select value={formData.contact_type} onValueChange={(v) => setFormData(prev => ({ ...prev, contact_type: v }))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {CONTACT_TYPES.filter(t => t.id !== 'all' && t.id !== 'supplier').map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Stage</label>
                <Select value={formData.stage} onValueChange={(v) => setFormData(prev => ({ ...prev, stage: v }))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {PIPELINE_STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Source</label>
                <Select value={formData.source} onValueChange={(v) => setFormData(prev => ({ ...prev, source: v }))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {CONTACT_SOURCES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Lead Score</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.score}
                  onChange={(e) => setFormData(prev => ({ ...prev, score: parseInt(e.target.value) || 50 }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Deal Value ($)</label>
                <Input
                  type="number"
                  placeholder="10000"
                  value={formData.deal_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, deal_value: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Location</label>
                <Input
                  placeholder="New York, NY"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Website</label>
                <Input
                  placeholder="https://company.com"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">LinkedIn</label>
                <Input
                  placeholder="https://linkedin.com/in/..."
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>

            {/* Enrich with AI Button */}
            <Button
              type="button"
              onClick={handleEnrichContact}
              disabled={enriching || (!formData.company_name && !formData.email && !formData.website)}
              className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white border-0 disabled:opacity-50"
            >
              {enriching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enriching...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Enrich with AI
                </>
              )}
            </Button>
            <p className="text-xs text-zinc-500 text-center -mt-2">
              Auto-fill company data using Explorium API
            </p>

            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Notes</label>
              <Textarea
                placeholder="Add notes about this contact..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="bg-zinc-800 border-zinc-700 min-h-[80px]"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => { setShowModal(false); setEditingContact(null); }} className="flex-1 border-zinc-700">
                Cancel
              </Button>
              <Button onClick={handleSave} className="flex-1 bg-cyan-600/80 hover:bg-cyan-600 text-white">
                {editingContact ? "Update" : "Create"} Contact
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}