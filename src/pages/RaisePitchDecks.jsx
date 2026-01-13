import React, { useState, useEffect } from 'react';
import { db } from '@/api/supabaseClient';
import { motion } from 'framer-motion';
import {
  Presentation, Plus, Search, Upload, Download, Eye, Edit2,
  Trash2, Clock, CheckCircle, Share2, MoreHorizontal, FileText,
  ExternalLink, Calendar, Users, Link2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
      shared: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
    };
    return styles[status] || styles.draft;
  };

  const filteredDecks = pitchDecks.filter(deck =>
    !searchTerm || deck.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <PageHeader
          title="Pitch Decks"
          subtitle="Manage your investor presentations"
          icon={Presentation}
          color="amber"
          actions={
            <div className="flex gap-3">
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Deck
              </Button>
            </div>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Decks', value: pitchDecks.length, icon: FileText },
            { label: 'Drafts', value: pitchDecks.filter(d => d.status === 'draft').length, icon: Edit2 },
            { label: 'Approved', value: pitchDecks.filter(d => d.status === 'approved').length, icon: CheckCircle },
            { label: 'Shared', value: pitchDecks.filter(d => d.status === 'shared').length, icon: Share2 }
          ].map((stat, idx) => (
            <Card key={idx} className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <stat.icon className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-zinc-500">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

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
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Pitch Materials</CardTitle>
            <CardDescription>Decks, one-pagers, and presentations</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredDecks.length === 0 ? (
              <div className="text-center py-12">
                <Presentation className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No pitch decks yet</h3>
                <p className="text-zinc-500 mb-4">Create your first investor presentation</p>
                <Button
                  onClick={() => setIsAddDialogOpen(true)}
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Pitch Deck
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDecks.map((deck) => (
                  <motion.div
                    key={deck.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700 hover:border-amber-500/50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                          <FileText className="w-5 h-5 text-amber-400" />
                        </div>
                        <Badge variant="outline" className={`${getStatusBadge(deck.status)} border`}>
                          {deck.status}
                        </Badge>
                      </div>

                      <h4 className="font-medium text-white mb-1">{deck.name || 'Pitch Deck'}</h4>
                      <p className="text-sm text-zinc-500 mb-2">Version {deck.version}</p>
                      {deck.description && (
                        <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{deck.description}</p>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-zinc-700">
                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {deck.updated_at ? new Date(deck.updated_at).toLocaleDateString() : 'Just now'}
                        </span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white">
                            <Share2 className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                              <DropdownMenuItem className="text-zinc-300">Edit</DropdownMenuItem>
                              <DropdownMenuItem className="text-zinc-300">Download</DropdownMenuItem>
                              <DropdownMenuItem className="text-zinc-300">Duplicate</DropdownMenuItem>
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
          </CardContent>
        </Card>

        {/* Add Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-zinc-700">
                Cancel
              </Button>
              <Button onClick={handleAddDeck} className="bg-amber-500 hover:bg-amber-600">
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
