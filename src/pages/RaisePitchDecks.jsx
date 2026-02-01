import React, { useState, useEffect } from 'react';
import { db } from '@/api/supabaseClient';
import { motion } from 'framer-motion';
import {
  Presentation, Plus, Search, Upload, Download, Eye, Edit2,
  Trash2, Clock, CheckCircle, Share2, MoreHorizontal, FileText,
  ExternalLink, Calendar, Users, Link2, Sun, Moon
} from 'lucide-react';
import { RaiseCard, RaiseCardContent, RaiseCardHeader, RaiseCardTitle, RaiseCardDescription, RaiseButton, RaiseBadge, RaiseStatCard, RaiseEmptyState } from '@/components/raise/ui';
import { Input } from '@/components/ui/input';
import { MOTION_VARIANTS } from '@/tokens/raise';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { RaisePageTransition } from '@/components/raise/RaisePageTransition';
import { useRaiseTheme } from '@/contexts/RaiseThemeContext';

export default function RaisePitchDecks() {
  const { theme, toggleTheme, rt } = useRaiseTheme();
  const [loading, setLoading] = useState(true);
  const [pitchDecks, setPitchDecks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newDeck, setNewDeck] = useState({
    name: '',
    version: '1.0',
    description: '',
    status: 'draft',
    file_url: ''
  });

  useEffect(() => {
    loadPitchDecks();
  }, []);

  const loadPitchDecks = async () => {
    try {
      setLoading(true);
      const data = await db.entities.RaisePitchDeck?.list() || [];
      setPitchDecks(data);
    } catch (error) {
      console.error('Error loading pitch decks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDeck = async () => {
    try {
      await db.entities.RaisePitchDeck.create(newDeck);
      toast.success('Pitch deck added successfully');
      setIsAddDialogOpen(false);
      setNewDeck({ name: '', version: '1.0', description: '', status: 'draft', file_url: '' });
      loadPitchDecks();
    } catch (error) {
      console.error('Error adding pitch deck:', error);
      toast.error('Failed to add pitch deck');
    }
  };

  const getStatusVariant = (status) => {
    const variants = {
      draft: 'neutral',
      review: 'warning',
      approved: 'success',
      shared: 'primary'
    };
    return variants[status] || 'neutral';
  };

  const filteredDecks = pitchDecks.filter(deck =>
    !searchTerm || deck.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${rt('bg-slate-50', 'bg-black')}`}>
        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${rt('border-orange-500', 'border-orange-500')}`} />
      </div>
    );
  }

  return (
    <RaisePageTransition>
      <div className={`w-full px-6 lg:px-8 py-6 space-y-6 min-h-screen ${rt('bg-slate-50', 'bg-black')}`}>
        <PageHeader
          title="Pitch Decks"
          subtitle="Manage your investor presentations"
          icon={Presentation}
          color="orange"
          actions={
            <div className="flex gap-3">
              <RaiseButton variant="secondary" size="icon" onClick={toggleTheme}>
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </RaiseButton>
              <RaiseButton variant="secondary">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </RaiseButton>
              <RaiseButton
                onClick={() => setIsAddDialogOpen(true)}
                variant="primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Deck
              </RaiseButton>
            </div>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <RaiseStatCard
            label="Total Decks"
            value={pitchDecks.length}
            icon={FileText}
            accentColor="orange"
            delay={0}
          />
          <RaiseStatCard
            label="Drafts"
            value={pitchDecks.filter(d => d.status === 'draft').length}
            icon={Edit2}
            accentColor="blue"
            delay={0.05}
          />
          <RaiseStatCard
            label="Approved"
            value={pitchDecks.filter(d => d.status === 'approved').length}
            icon={CheckCircle}
            accentColor="green"
            delay={0.1}
          />
          <RaiseStatCard
            label="Shared"
            value={pitchDecks.filter(d => d.status === 'shared').length}
            icon={Share2}
            accentColor="purple"
            delay={0.15}
          />
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${rt('text-slate-400', 'text-zinc-500')}`} />
          <Input
            placeholder="Search decks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`pl-10 ${rt('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}`}
          />
        </div>

        {/* Decks Grid */}
        <RaiseCard className="rounded-[20px]">
          <RaiseCardHeader>
            <RaiseCardTitle className={rt('text-slate-900', 'text-white')}>Pitch Materials</RaiseCardTitle>
            <RaiseCardDescription>Decks, one-pagers, and presentations</RaiseCardDescription>
          </RaiseCardHeader>
          <RaiseCardContent>
            {filteredDecks.length === 0 ? (
              <RaiseEmptyState
                icon={<Presentation className="w-6 h-6" />}
                title="No pitch decks yet"
                message="Create your first investor presentation"
                action={{ label: 'Create Pitch Deck', onClick: () => setIsAddDialogOpen(true) }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDecks.map((deck) => (
                  <motion.div
                    key={deck.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className={`p-4 rounded-[20px] border transition-colors ${rt('bg-slate-50 border-slate-200 hover:border-orange-300', 'bg-zinc-800/50 border-zinc-700 hover:border-orange-500/50')}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className={rt('p-2 bg-orange-50 rounded-lg border border-orange-200', 'p-2 bg-orange-500/10 rounded-lg border border-orange-500/20')}>
                          <FileText className={`w-5 h-5 ${rt('text-orange-600', 'text-orange-400')}`} />
                        </div>
                        <RaiseBadge variant={getStatusVariant(deck.status)}>
                          {deck.status}
                        </RaiseBadge>
                      </div>

                      <h4 className={`font-medium mb-1 ${rt('text-slate-900', 'text-white')}`}>{deck.name || 'Pitch Deck'}</h4>
                      <p className={`text-sm mb-2 ${rt('text-slate-500', 'text-zinc-500')}`}>Version {deck.version}</p>
                      {deck.description && (
                        <p className={`text-sm mb-3 line-clamp-2 ${rt('text-slate-600', 'text-zinc-400')}`}>{deck.description}</p>
                      )}

                      <div className={`flex items-center justify-between pt-3 border-t ${rt('border-slate-200', 'border-zinc-700')}`}>
                        <span className={`text-xs flex items-center gap-1 ${rt('text-slate-500', 'text-zinc-500')}`}>
                          <Clock className="w-3 h-3" />
                          {deck.updated_at ? new Date(deck.updated_at).toLocaleDateString() : 'Just now'}
                        </span>
                        <div className="flex gap-1">
                          <RaiseButton variant="ghost" size="sm" className="h-8 w-8 !px-0">
                            <Eye className="w-4 h-4" />
                          </RaiseButton>
                          <RaiseButton variant="ghost" size="sm" className="h-8 w-8 !px-0">
                            <Share2 className="w-4 h-4" />
                          </RaiseButton>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${rt('text-slate-500 hover:bg-slate-100', 'text-zinc-400 hover:bg-zinc-800/30')} transition-colors`}>
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className={rt('bg-white border-slate-200', 'bg-zinc-900 border-zinc-800')}>
                              <DropdownMenuItem className={rt('text-slate-700', 'text-zinc-300')}>Edit</DropdownMenuItem>
                              <DropdownMenuItem className={rt('text-slate-700', 'text-zinc-300')}>Download</DropdownMenuItem>
                              <DropdownMenuItem className={rt('text-slate-700', 'text-zinc-300')}>Duplicate</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-400">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </RaiseCardContent>
        </RaiseCard>

        {/* Add Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className={rt('bg-white border-slate-200', 'bg-zinc-900 border-zinc-800')}>
            <DialogHeader>
              <DialogTitle className={rt('text-slate-900', 'text-white')}>Create Pitch Deck</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className={rt('text-slate-600', 'text-zinc-400')}>Name</Label>
                <Input
                  value={newDeck.name}
                  onChange={(e) => setNewDeck({...newDeck, name: e.target.value})}
                  className={rt('bg-slate-50 border-slate-200', 'bg-zinc-800 border-zinc-700')}
                  placeholder="Series A Deck v2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className={rt('text-slate-600', 'text-zinc-400')}>Version</Label>
                  <Input
                    value={newDeck.version}
                    onChange={(e) => setNewDeck({...newDeck, version: e.target.value})}
                    className={rt('bg-slate-50 border-slate-200', 'bg-zinc-800 border-zinc-700')}
                    placeholder="1.0"
                  />
                </div>
                <div>
                  <Label className={rt('text-slate-600', 'text-zinc-400')}>Status</Label>
                  <Select value={newDeck.status} onValueChange={(v) => setNewDeck({...newDeck, status: v})}>
                    <SelectTrigger className={rt('bg-slate-50 border-slate-200', 'bg-zinc-800 border-zinc-700')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="review">In Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="shared">Shared</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className={rt('text-slate-600', 'text-zinc-400')}>Description</Label>
                <Textarea
                  value={newDeck.description}
                  onChange={(e) => setNewDeck({...newDeck, description: e.target.value})}
                  className={rt('bg-slate-50 border-slate-200', 'bg-zinc-800 border-zinc-700')}
                  placeholder="Describe this version..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <RaiseButton variant="secondary" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </RaiseButton>
              <RaiseButton onClick={handleAddDeck} variant="primary">
                Create
              </RaiseButton>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RaisePageTransition>
  );
}
