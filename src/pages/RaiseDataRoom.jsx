import React, { useState, useEffect } from 'react';
import { db } from '@/api/supabaseClient';
import { motion } from 'framer-motion';
import {
  FolderKey, Plus, Search, Upload, Download, Eye, Lock, Unlock,
  File, Folder, MoreHorizontal, Users, Clock, Shield, Link2,
  ExternalLink, FileText, Settings, Briefcase, Sun, Moon
} from 'lucide-react';
import { RaiseCard, RaiseCardContent, RaiseCardHeader, RaiseCardTitle, RaiseCardDescription, RaiseButton, RaiseBadge, RaiseStatCard, RaiseEmptyState } from '@/components/raise/ui';
import { MOTION_VARIANTS } from '@/tokens/raise';
import { Input } from '@/components/ui/input';
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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { RaisePageTransition } from '@/components/raise/RaisePageTransition';
import { useTheme } from '@/contexts/GlobalThemeContext';

export default function RaiseDataRoom() {
  const { theme, toggleTheme, rt } = useTheme();
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

  if (loading) {
    return (
      <RaisePageTransition>
        <div className={`min-h-screen ${rt('bg-slate-50', 'bg-black')} flex items-center justify-center`}>
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${rt('border-orange-500', 'border-orange-500')}`} />
        </div>
      </RaisePageTransition>
    );
  }

  return (
    <RaisePageTransition>
      <div className={`min-h-screen ${rt('bg-slate-50', 'bg-black')}`}>
        <div className="w-full px-4 lg:px-6 py-4 space-y-4">
          <PageHeader
            title="Data Room"
            subtitle="Secure document sharing for due diligence"
            icon={Briefcase}
            color="orange"
            actions={
              <div className="flex gap-2">
                <RaiseButton
                  variant="secondary"
                  size="icon"
                  onClick={toggleTheme}
                >
                  {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </RaiseButton>
                <RaiseButton
                  variant="primary"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Data Room
                </RaiseButton>
              </div>
            }
          />

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <RaiseStatCard
              label="Total Rooms"
              value={dataRooms.length}
              icon={<Folder className="w-5 h-5" />}
              accentColor="orange"
              delay={0}
            />
            <RaiseStatCard
              label="Active"
              value={dataRooms.filter(r => r.is_active).length}
              icon={<Unlock className="w-5 h-5" />}
              accentColor="green"
              delay={0.05}
            />
            <RaiseStatCard
              label="NDA Required"
              value={dataRooms.filter(r => r.requires_nda).length}
              icon={<Shield className="w-5 h-5" />}
              accentColor="blue"
              delay={0.1}
            />
            <RaiseStatCard
              label="Total Viewers"
              value={dataRooms.reduce((sum, r) => sum + (r.viewer_count || 0), 0)}
              icon={<Users className="w-5 h-5" />}
              accentColor="purple"
              delay={0.15}
            />
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className={rt('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400', 'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500')} />
            <Input
              placeholder="Search data rooms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={rt('pl-10 bg-white border-slate-200', 'pl-10 bg-zinc-900/50 border-zinc-800')}
            />
          </div>

          {/* Data Rooms */}
          <RaiseCard className="rounded-[20px]">
            <RaiseCardHeader>
              <RaiseCardTitle>Data Rooms</RaiseCardTitle>
              <RaiseCardDescription>Secure document sharing with investors</RaiseCardDescription>
            </RaiseCardHeader>
            <RaiseCardContent>
              {filteredRooms.length === 0 ? (
                <RaiseEmptyState
                  icon={<Briefcase className="w-6 h-6" />}
                  title="No data rooms yet"
                  message="Create a secure space for due diligence documents"
                  action={{ label: 'Create Data Room', onClick: () => setIsAddDialogOpen(true) }}
                />
              ) : (
                <div className="space-y-3">
                  {filteredRooms.map((room) => (
                    <motion.div
                      key={room.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={rt(
                        'flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors',
                        'flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={rt(
                          'p-2 bg-orange-50 rounded-lg border border-orange-200',
                          'p-2 bg-orange-500/10 rounded-lg border border-orange-500/20'
                        )}>
                          <Briefcase className={rt('w-4 h-4 text-orange-500', 'w-4 h-4 text-orange-400')} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={rt('font-medium text-slate-900', 'font-medium text-white')}>{room.name || 'Data Room'}</p>
                            {room.requires_nda && (
                              <RaiseBadge variant="warning">
                                NDA Required
                              </RaiseBadge>
                            )}
                          </div>
                          <p className={rt('text-sm text-slate-500', 'text-sm text-zinc-500')}>{room.description || 'Due diligence documents'}</p>
                          <div className={rt('flex items-center gap-3 mt-1 text-xs text-slate-400', 'flex items-center gap-3 mt-1 text-xs text-zinc-600')}>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {room.viewer_count || 0} viewers
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {room.documents_count || 0} documents
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <RaiseBadge variant={room.is_active ? 'success' : 'neutral'}>
                          {room.is_active ? 'Active' : 'Inactive'}
                        </RaiseBadge>
                        <div className="flex gap-1">
                          <RaiseButton variant="ghost" size="sm" className="h-8 w-8 !px-0">
                            <Link2 className="w-4 h-4" />
                          </RaiseButton>
                          <RaiseButton variant="ghost" size="sm" className="h-8 w-8 !px-0">
                            <Upload className="w-4 h-4" />
                          </RaiseButton>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${rt('text-slate-500 hover:bg-slate-100', 'text-zinc-400 hover:bg-zinc-800/30')} transition-colors`}>
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className={rt('bg-white border-slate-200', 'bg-zinc-900 border-zinc-800')}>
                              <DropdownMenuItem className={rt('text-slate-700', 'text-zinc-300')}>Open</DropdownMenuItem>
                              <DropdownMenuItem className={rt('text-slate-700', 'text-zinc-300')}>Manage Access</DropdownMenuItem>
                              <DropdownMenuItem className={rt('text-slate-700', 'text-zinc-300')}>Settings</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-400">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                <DialogTitle className={rt('text-slate-900', 'text-white')}>Create Data Room</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-3">
                <div>
                  <Label className={rt('text-slate-600', 'text-zinc-400')}>Name</Label>
                  <Input
                    value={newRoom.name}
                    onChange={(e) => setNewRoom({...newRoom, name: e.target.value})}
                    className={rt('bg-slate-50 border-slate-200', 'bg-zinc-800 border-zinc-700')}
                    placeholder="Series A Data Room"
                  />
                </div>
                <div>
                  <Label className={rt('text-slate-600', 'text-zinc-400')}>Description</Label>
                  <Textarea
                    value={newRoom.description}
                    onChange={(e) => setNewRoom({...newRoom, description: e.target.value})}
                    className={rt('bg-slate-50 border-slate-200', 'bg-zinc-800 border-zinc-700')}
                    placeholder="Due diligence documents for Series A round..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label className={rt('text-slate-600', 'text-zinc-400')}>Access Level</Label>
                  <Select value={newRoom.access_level} onValueChange={(v) => setNewRoom({...newRoom, access_level: v})}>
                    <SelectTrigger className={rt('bg-slate-50 border-slate-200', 'bg-zinc-800 border-zinc-700')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invited_only">Invited Only</SelectItem>
                      <SelectItem value="link_access">Anyone with Link</SelectItem>
                      <SelectItem value="password_protected">Password Protected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className={rt(
                  'flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200',
                  'flex items-center justify-between p-2 rounded-lg bg-zinc-800/50 border border-zinc-700'
                )}>
                  <div>
                    <p className={rt('text-xs text-slate-700', 'text-xs text-zinc-300')}>Require NDA</p>
                    <p className={rt('text-[10px] text-slate-500', 'text-[10px] text-zinc-500')}>Viewers must sign NDA before access</p>
                  </div>
                  <Switch
                    checked={newRoom.requires_nda}
                    onCheckedChange={(v) => setNewRoom({...newRoom, requires_nda: v})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <RaiseButton variant="secondary" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </RaiseButton>
                <RaiseButton variant="primary" onClick={handleAddRoom}>
                  Create
                </RaiseButton>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </RaisePageTransition>
  );
}
