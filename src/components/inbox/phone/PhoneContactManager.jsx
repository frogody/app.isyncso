import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Search, Star, StarOff, Phone,
  Trash2, Edit3, X, Check, MessageSquare, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

export default function PhoneContactManager({ phoneNumber, onSave }) {
  const metadata = phoneNumber?.metadata || {};
  const contacts = metadata.contacts || [];

  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // New contact form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [newVip, setNewVip] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [editVip, setEditVip] = useState(false);

  const filteredContacts = useMemo(() => {
    if (!search) return contacts;
    const lower = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name?.toLowerCase().includes(lower) ||
        c.phone?.includes(lower) ||
        c.notes?.toLowerCase().includes(lower)
    );
  }, [contacts, search]);

  const saveContacts = async (updatedContacts) => {
    const newMetadata = { ...metadata, contacts: updatedContacts };
    const success = await onSave(newMetadata);
    return success;
  };

  const handleAddContact = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      toast.error('Name and phone number are required');
      return;
    }

    const contact = {
      id: `contact_${Date.now()}`,
      name: newName.trim(),
      phone: newPhone.trim(),
      notes: newNotes.trim(),
      instructions: newInstructions.trim(),
      vip: newVip,
      created_at: new Date().toISOString(),
    };

    const success = await saveContacts([...contacts, contact]);
    if (success) {
      toast.success(`${contact.name} added`);
      setNewName('');
      setNewPhone('');
      setNewNotes('');
      setNewInstructions('');
      setNewVip(false);
      setShowAddForm(false);
    }
  };

  const handleDeleteContact = async (contactId) => {
    const updated = contacts.filter((c) => c.id !== contactId);
    const success = await saveContacts(updated);
    if (success) {
      toast.success('Contact removed');
    }
  };

  const handleToggleVip = async (contactId) => {
    const updated = contacts.map((c) =>
      c.id === contactId ? { ...c, vip: !c.vip } : c
    );
    await saveContacts(updated);
  };

  const startEdit = (contact) => {
    setEditingId(contact.id);
    setEditName(contact.name);
    setEditPhone(contact.phone);
    setEditNotes(contact.notes || '');
    setEditInstructions(contact.instructions || '');
    setEditVip(contact.vip || false);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editPhone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    const updated = contacts.map((c) =>
      c.id === editingId
        ? {
            ...c,
            name: editName.trim(),
            phone: editPhone.trim(),
            notes: editNotes.trim(),
            instructions: editInstructions.trim(),
            vip: editVip,
          }
        : c
    );
    const success = await saveContacts(updated);
    if (success) {
      toast.success('Contact updated');
      setEditingId(null);
    }
  };

  const INSTRUCTION_PRESETS = [
    'Always forward to me',
    'Take a message',
    'Schedule a callback',
    'Transfer to voicemail',
    'Ask them to email instead',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-700/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-zinc-300">Known Callers</h3>
            <span className="text-xs text-zinc-500">({contacts.length})</span>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600/80 hover:bg-cyan-600 text-white text-xs font-medium rounded-lg transition-colors"
          >
            {showAddForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {showAddForm ? 'Cancel' : 'Add Contact'}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40 transition-colors"
          />
        </div>
      </div>

      {/* Add Contact Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-cyan-500/20 p-5 space-y-3">
              <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">New Contact</h4>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Name"
                  className="px-3 py-2 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40 transition-colors"
                />
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="px-3 py-2 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40 transition-colors"
                />
              </div>

              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Notes about this contact..."
                className="w-full h-16 px-3 py-2 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-cyan-500/40 transition-colors"
              />

              <div>
                <p className="text-xs text-zinc-500 mb-2">Call instructions for Sync</p>
                <textarea
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  placeholder="e.g., Always forward to me, Take a message..."
                  className="w-full h-16 px-3 py-2 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-cyan-500/40 transition-colors"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {INSTRUCTION_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setNewInstructions(preset)}
                      className="px-2 py-1 rounded-md bg-zinc-800/60 text-[10px] text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setNewVip(!newVip)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    newVip
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/50 hover:border-zinc-600'
                  }`}
                >
                  {newVip ? <Star className="w-3 h-3" /> : <StarOff className="w-3 h-3" />}
                  VIP
                </button>

                <button
                  onClick={handleAddContact}
                  className="px-4 py-2 bg-cyan-600/80 hover:bg-cyan-600 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-3 h-3" />
                  Add Contact
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contacts List */}
      <div className="space-y-2">
        {filteredContacts.length === 0 ? (
          <div className="bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-700/50 p-8 text-center">
            <Users className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">
              {search ? 'No contacts match your search' : 'No known callers yet'}
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              Add contacts so Sync knows how to handle their calls
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredContacts.map((contact, index) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: index * 0.03 }}
                className="bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-700/50 overflow-hidden"
              >
                {editingId === contact.id ? (
                  /* Edit Mode */
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-3 py-2 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-cyan-500/40"
                      />
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="px-3 py-2 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-cyan-500/40"
                      />
                    </div>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Notes..."
                      className="w-full h-14 px-3 py-2 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm text-zinc-200 resize-none focus:outline-none focus:border-cyan-500/40"
                    />
                    <textarea
                      value={editInstructions}
                      onChange={(e) => setEditInstructions(e.target.value)}
                      placeholder="Instructions for Sync..."
                      className="w-full h-14 px-3 py-2 bg-zinc-950 border border-zinc-800/60 rounded-xl text-sm text-zinc-200 resize-none focus:outline-none focus:border-cyan-500/40"
                    />
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setEditVip(!editVip)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
                          editVip ? 'text-amber-400' : 'text-zinc-500'
                        }`}
                      >
                        {editVip ? <Star className="w-3 h-3" /> : <StarOff className="w-3 h-3" />}
                        VIP
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 bg-zinc-800 text-zinc-400 text-xs rounded-lg hover:bg-zinc-700 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          className="px-3 py-1.5 bg-cyan-600/80 text-white text-xs rounded-lg hover:bg-cyan-600 transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div>
                    <div
                      className="p-4 flex items-center gap-3 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                      onClick={() => setExpandedId(expandedId === contact.id ? null : contact.id)}
                    >
                      <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-400 flex-shrink-0">
                        {contact.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-200 truncate">{contact.name}</span>
                          {contact.vip && <Star className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                        </div>
                        <span className="text-xs text-zinc-500 font-mono">{contact.phone}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleVip(contact.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-amber-400 transition-colors"
                        >
                          {contact.vip ? <Star className="w-3.5 h-3.5" /> : <StarOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(contact);
                          }}
                          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteContact(contact.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {expandedId === contact.id ? (
                          <ChevronUp className="w-3.5 h-3.5 text-zinc-600" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedId === contact.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-0 space-y-2 border-t border-zinc-800/60">
                            {contact.instructions && (
                              <div className="mt-3">
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Instructions</p>
                                <p className="text-xs text-cyan-400/80 bg-cyan-500/5 border border-cyan-500/10 rounded-lg px-3 py-2">
                                  {contact.instructions}
                                </p>
                              </div>
                            )}
                            {contact.notes && (
                              <div>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Notes</p>
                                <p className="text-xs text-zinc-400">{contact.notes}</p>
                              </div>
                            )}
                            {!contact.instructions && !contact.notes && (
                              <p className="text-xs text-zinc-600 mt-3 italic">No additional details</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
