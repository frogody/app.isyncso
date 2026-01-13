import React, { useState, useEffect } from 'react';
import { db } from '@/api/supabaseClient';
import { motion } from 'framer-motion';
import {
  Presentation, Plus, Search, Upload, Download, Eye, Edit,
  Trash2, Clock, CheckCircle, Share2, MoreHorizontal, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function RaisePitchDecks() {
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

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
      review: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      approved: 'bg-green-500/20 text-green-400 border-green-500/30',
      shared: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
    };
    return styles[status] || styles.draft;
  };

  const filteredDecks = pitchDecks.filter(deck =>
    !searchTerm || deck.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black">
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Pitch Decks"
          subtitle="Manage your investor presentations"
          icon={Presentation}
          color="orange"
          actions={
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Deck
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800">
                <DialogHeader>
                  <DialogTitle className="text-white">Create Pitch Deck</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-zinc-400">Name</Label>
                    <Input
                      value={newDeck.name}
                      onChange={(e) => setNewDeck({...newDeck, name: e.target.value})}
                      className="bg-zinc-800 border-zinc-700"
                      placeholder="Series A Deck v2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-zinc-400">Version</Label>
                      <Input
                        value={newDeck.version}
                        onChange={(e) => setNewDeck({...newDeck, version: e.target.value})}
                        className="bg-zinc-800 border-zinc-700"
                        placeholder="1.0"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-400">Status</Label>
                      <Select value={newDeck.status} onValueChange={(v) => setNewDeck({...newDeck, status: v})}>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700">
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
                    <Label className="text-zinc-400">Description</Label>
                    <Textarea
                      value={newDeck.description}
                      onChange={(e) => setNewDeck({...newDeck, description: e.target.value})}
                      className="bg-zinc-800 border-zinc-700"
                      placeholder="Describe this version..."
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddDeck} className="bg-orange-600 hover:bg-orange-700">Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          }
        />

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search decks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-zinc-900/50 border-zinc-800"
          />
        </div>

        {/* Decks Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-48 bg-zinc-900/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredDecks.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <Presentation className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-300 mb-2">No pitch decks yet</h3>
            <p className="text-zinc-500 mb-4">Create your first investor presentation</p>
            <Button onClick={() => setIsAddDialogOpen(true)} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Pitch Deck
            </Button>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDecks.map((deck) => (
              <motion.div
                key={deck.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <GlassCard className="p-5 hover:border-orange-500/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-orange-400" />
                    </div>
                    <Badge className={`${getStatusBadge(deck.status)} border`}>
                      {deck.status}
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-white mb-1">{deck.name || 'Untitled Deck'}</h3>
                  <p className="text-sm text-zinc-500 mb-3">Version {deck.version}</p>

                  {deck.description && (
                    <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{deck.description}</p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                    <span className="text-xs text-zinc-500">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {deck.updated_at ? new Date(deck.updated_at).toLocaleDateString() : 'Just now'}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                        <Share2 className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-zinc-400">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>Download</DropdownMenuItem>
                          <DropdownMenuItem>Duplicate</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-400">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
