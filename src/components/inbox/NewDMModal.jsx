import React, { useState, useEffect } from 'react';
import { Search, MessageSquare, Loader2, X, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { db } from '@/api/supabaseClient';

// Helper to extract domain from email
const getDomain = (email) => email?.split('@')[1]?.toLowerCase() || '';

// Check if current user can message target user
const canMessageUser = (currentUser, targetUser) => {
  if (!currentUser?.email || !targetUser?.email) return false;
  
  const currentDomain = getDomain(currentUser.email);
  const targetDomain = getDomain(targetUser.email);
  
  // @isyncso.com users can message everyone and everyone can message them
  if (currentDomain === 'isyncso.com' || targetDomain === 'isyncso.com') {
    return true;
  }
  
  // Same domain = always allowed
  if (currentDomain === targetDomain) {
    return true;
  }
  
  // Cross-domain: check if target allows external messages
  return targetUser.allow_external_messages !== false;
};

export default function NewDMModal({ 
  open, 
  onClose, 
  onCreate,
  currentUserId
}) {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Get current user first
      const me = await db.auth.me().catch(() => null);
      setCurrentUser(me);

      // Try to get team members - edge function may not be available
      let allUsers = [];
      try {
        const usersResponse = await db.functions.invoke('getTeamMembers');
        allUsers = usersResponse?.data?.users || [];
      } catch (e) {
        console.warn('getTeamMembers not available:', e.message);
        // Fallback: empty list - user will see "No team members yet"
      }

      setUsers(allUsers.filter(u => u.id !== currentUserId));
    } catch (error) {
      console.error('Failed to load users:', error);
    }
    setLoading(false);
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectUser = async (user) => {
    setCreating(true);
    await onCreate(user);
    setCreating(false);
    setSearchTerm('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-cyan-400" />
            New message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none"
              autoFocus
            />
          </div>

          {/* User list */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                {searchTerm ? 'No users found' : 'No team members yet'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredUsers.map(user => {
                  const canMessage = canMessageUser(currentUser, user);
                  return (
                    <button
                      key={user.id}
                      onClick={() => canMessage && handleSelectUser(user)}
                      disabled={creating || !canMessage}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left group ${
                        canMessage 
                          ? 'hover:bg-zinc-800 disabled:opacity-50' 
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                      title={!canMessage ? 'This user has disabled messages from external domains' : ''}
                    >
                      <div className="relative">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center text-sm font-bold text-white">
                            {user.full_name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-zinc-900" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate transition-colors ${
                          canMessage ? 'text-white group-hover:text-cyan-400' : 'text-zinc-500'
                        }`}>
                          {user.full_name || 'Unknown'}
                        </div>
                        <div className="text-xs text-zinc-500 truncate">{user.email}</div>
                      </div>
                      {canMessage ? (
                        <MessageSquare className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
                      ) : (
                        <Lock className="w-4 h-4 text-zinc-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}