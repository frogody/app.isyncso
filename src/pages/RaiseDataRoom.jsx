import React, { useState, useEffect } from 'react';
import { db } from '@/api/supabaseClient';
import { motion } from 'framer-motion';
import {
  FolderKey, Plus, Search, Upload, Download, Eye, Lock, Unlock,
  File, Folder, MoreHorizontal, Users, Clock, Shield, Link2,
  ExternalLink, FileText, Settings, Briefcase, Sun, Moon
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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { RaisePageTransition } from '@/components/raise/RaisePageTransition';
import { useRaiseTheme } from '@/contexts/RaiseThemeContext';

export default function RaiseDataRoom() {
  const { theme, toggleTheme, rt } = useRaiseTheme();
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
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleTheme}
                  className={rt('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}
                >
                  {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </Button>
                <Button
                  onClick={() => setIsAddDialogOpen(true)}
                  className={rt(
                    'bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200',
                    'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  )}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Data Room
                </Button>
              </div>
            }
          />

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Rooms', value: dataRooms.length, icon: Folder },
              { label: 'Active', value: dataRooms.filter(r => r.is_active).length, icon: Unlock },
              { label: 'NDA Required', value: dataRooms.filter(r => r.requires_nda).length, icon: Shield },
              { label: 'Total Viewers', value: dataRooms.reduce((sum, r) => sum + (r.viewer_count || 0), 0), icon: Users }
            ].map((stat, idx) => (
              <Card key={idx} className={rt('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className={rt(
                      'p-2 rounded-lg bg-orange-50 border border-orange-200',
                      'p-2 rounded-lg bg-orange-500/10 border border-orange-500/20'
                    )}>
                      <stat.icon className={rt('w-4 h-4 text-orange-500', 'w-4 h-4 text-orange-400')} />
                    </div>
                    <div>
                      <p className={rt('text-lg font-bold text-slate-900', 'text-lg font-bold text-white')}>{stat.value}</p>
                      <p className={rt('text-[10px] text-slate-500', 'text-[10px] text-zinc-500')}>{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
          <Card className={rt('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
            <CardHeader>
              <CardTitle className={rt('text-slate-900', 'text-white')}>Data Rooms</CardTitle>
              <CardDescription className={rt('text-slate-500', '')}>Secure document sharing with investors</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredRooms.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className={rt('w-12 h-12 text-slate-300 mx-auto mb-4', 'w-12 h-12 text-zinc-600 mx-auto mb-4')} />
                  <h3 className={rt('text-lg font-medium text-slate-900 mb-2', 'text-lg font-medium text-white mb-2')}>No data rooms yet</h3>
                  <p className={rt('text-slate-500 mb-4', 'text-zinc-500 mb-4')}>Create a secure space for due diligence documents</p>
                  <Button
                    onClick={() => setIsAddDialogOpen(true)}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Data Room
                  </Button>
                </div>
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
                              <Badge variant="outline" className={rt(
                                'bg-orange-50 text-orange-600 border-orange-200 text-xs',
                                'bg-orange-500/10 text-orange-400 border-orange-500/30 text-xs'
                              )}>
                                NDA Required
                              </Badge>
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
                        <Badge variant="outline" className={room.is_active
                          ? rt('bg-green-50 text-green-600 border-green-200', 'bg-green-500/10 text-green-400 border-green-500/30')
                          : rt('bg-slate-100 text-slate-500 border-slate-200', 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30')
                        }>
                          {room.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className={rt('h-8 w-8 text-slate-400 hover:text-slate-700', 'h-8 w-8 text-zinc-400 hover:text-white')}>
                            <Link2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className={rt('h-8 w-8 text-slate-400 hover:text-slate-700', 'h-8 w-8 text-zinc-400 hover:text-white')}>
                            <Upload className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className={rt('h-8 w-8 text-slate-400', 'h-8 w-8 text-zinc-400')}>
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
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
            </CardContent>
          </Card>

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
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className={rt('border-slate-200', 'border-zinc-700')}>
                  Cancel
                </Button>
                <Button onClick={handleAddRoom} className="bg-orange-500 hover:bg-orange-600">
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </RaisePageTransition>
  );
}
