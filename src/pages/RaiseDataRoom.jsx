import React, { useState, useEffect } from 'react';
import { db } from '@/api/supabaseClient';
import { motion } from 'framer-motion';
import {
  FolderKey, Plus, Search, Upload, Download, Eye, Lock, Unlock,
  File, Folder, MoreHorizontal, Users, Clock, Shield, Link2
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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function RaiseDataRoom() {
  const [loading, setLoading] = useState(true);
  const [dataRooms, setDataRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: '',
    description: '',
    is_active: true,
    requires_nda: true,
    access_level: 'invited_only'
  });

  useEffect(() => {
    loadDataRooms();
  }, []);

  const loadDataRooms = async () => {
    try {
      setLoading(true);
      const data = await db.entities.RaiseDataRoom?.list() || [];
      setDataRooms(data);
    } catch (error) {
      console.error('Error loading data rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = async () => {
    try {
      await db.entities.RaiseDataRoom.create(newRoom);
      toast.success('Data room created successfully');
      setIsAddDialogOpen(false);
      setNewRoom({ name: '', description: '', is_active: true, requires_nda: true, access_level: 'invited_only' });
      loadDataRooms();
    } catch (error) {
      console.error('Error creating data room:', error);
      toast.error('Failed to create data room');
    }
  };

  const filteredRooms = dataRooms.filter(room =>
    !searchTerm || room.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black">
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Data Room"
          subtitle="Secure document sharing for due diligence"
          icon={FolderKey}
          color="orange"
          actions={
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Data Room
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800">
                <DialogHeader>
                  <DialogTitle className="text-white">Create Data Room</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-zinc-400">Name</Label>
                    <Input
                      value={newRoom.name}
                      onChange={(e) => setNewRoom({...newRoom, name: e.target.value})}
                      className="bg-zinc-800 border-zinc-700"
                      placeholder="Series A Data Room"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400">Description</Label>
                    <Textarea
                      value={newRoom.description}
                      onChange={(e) => setNewRoom({...newRoom, description: e.target.value})}
                      className="bg-zinc-800 border-zinc-700"
                      placeholder="Due diligence documents for Series A round..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400">Access Level</Label>
                    <Select value={newRoom.access_level} onValueChange={(v) => setNewRoom({...newRoom, access_level: v})}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="invited_only">Invited Only</SelectItem>
                        <SelectItem value="link_access">Anyone with Link</SelectItem>
                        <SelectItem value="password_protected">Password Protected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50">
                    <div>
                      <p className="text-sm text-zinc-300">Require NDA</p>
                      <p className="text-xs text-zinc-500">Viewers must sign NDA before access</p>
                    </div>
                    <Switch
                      checked={newRoom.requires_nda}
                      onCheckedChange={(v) => setNewRoom({...newRoom, requires_nda: v})}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddRoom} className="bg-orange-600 hover:bg-orange-700">Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          }
        />

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search data rooms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-zinc-900/50 border-zinc-800"
          />
        </div>

        {/* Data Rooms Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-48 bg-zinc-900/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredRooms.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <FolderKey className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-300 mb-2">No data rooms yet</h3>
            <p className="text-zinc-500 mb-4">Create a secure space for due diligence documents</p>
            <Button onClick={() => setIsAddDialogOpen(true)} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Data Room
            </Button>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.map((room) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <GlassCard className="p-5 hover:border-orange-500/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                      <Folder className="w-6 h-6 text-orange-400" />
                    </div>
                    <Badge className={room.is_active ? 'bg-green-500/20 text-green-400 border-green-500/30 border' : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30 border'}>
                      {room.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-white mb-1">{room.name || 'Untitled Room'}</h3>
                  {room.description && (
                    <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{room.description}</p>
                  )}

                  <div className="flex items-center gap-3 text-sm text-zinc-500 mb-3">
                    {room.requires_nda && (
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3" /> NDA Required
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {room.viewer_count || 0} viewers
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                    <span className="text-xs text-zinc-500">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {room.updated_at ? new Date(room.updated_at).toLocaleDateString() : 'Just now'}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                        <Link2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                        <Upload className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-zinc-400">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Open</DropdownMenuItem>
                          <DropdownMenuItem>Manage Access</DropdownMenuItem>
                          <DropdownMenuItem>Settings</DropdownMenuItem>
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
