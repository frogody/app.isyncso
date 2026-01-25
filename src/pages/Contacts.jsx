import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Plus, Mail, Phone, Building, MapPin, MoreVertical, X, Download, Trash2, Tag } from 'lucide-react';
import { toast } from 'sonner';

const initialContacts = [
  { id: 1, name: 'John Smith', email: 'john@acme.com', phone: '+1 234-567-8900', company: 'Acme Corp', location: 'New York', score: 92, status: 'hot', tags: ['Enterprise', 'Decision Maker'] },
  { id: 2, name: 'Sarah Williams', email: 'sarah@techstart.io', phone: '+1 234-567-8901', company: 'TechStart', location: 'San Francisco', score: 78, status: 'warm', tags: ['Startup', 'CTO'] },
  { id: 3, name: 'Mike Chen', email: 'mike@bigcorp.com', phone: '+1 234-567-8902', company: 'BigCorp LLC', location: 'Chicago', score: 65, status: 'warm', tags: ['Mid-Market'] },
  { id: 4, name: 'Emma Davis', email: 'emma@startup.co', phone: '+1 234-567-8903', company: 'Startup Co', location: 'Austin', score: 45, status: 'cold', tags: ['SMB'] },
  { id: 5, name: 'Alex Johnson', email: 'alex@enterprise.com', phone: '+1 234-567-8904', company: 'Enterprise Inc', location: 'Boston', score: 88, status: 'hot', tags: ['Enterprise', 'VP'] }
];

export default function Contacts() {
  const [contacts, setContacts] = useState(initialContacts);
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '', company: '', location: '' });

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleAddContact = () => {
    if (!newContact.name || !newContact.email) {
      toast.error('Name and email are required');
      return;
    }
    const contact = {
      id: Date.now(),
      ...newContact,
      score: 50,
      status: 'cold',
      tags: []
    };
    setContacts(prev => [...prev, contact]);
    setNewContact({ name: '', email: '', phone: '', company: '', location: '' });
    setShowAddContact(false);
    toast.success('Contact added successfully');
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Delete ${selectedIds.length} contacts?`)) {
      setContacts(prev => prev.filter(c => !selectedIds.includes(c.id)));
      setSelectedIds([]);
      if (selectedContact && selectedIds.includes(selectedContact.id)) {
        setSelectedContact(null);
      }
      toast.success('Contacts deleted');
    }
  };

  const handleExport = () => {
    const selected = contacts.filter(c => selectedIds.includes(c.id));
    const csv = [
      ['Name', 'Email', 'Phone', 'Company', 'Location', 'Score'],
      ...selected.map(c => [c.name, c.email, c.phone, c.company, c.location, c.score])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Contacts exported');
  };

  const handleSendEmail = () => {
    if (!selectedContact) return;
    window.location.href = `mailto:${selectedContact.email}`;
    toast.success('Opening email client...');
  };

  const handleScheduleCall = () => {
    if (!selectedContact) return;
    toast.success('Call scheduling coming soon');
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 lg:px-6 py-4 space-y-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-white mb-1">Contacts</h1>
            <p className="text-zinc-400 text-xs">{contacts.length} total contacts</p>
          </div>
          <button 
            onClick={() => setShowAddContact(true)}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Contact
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:border-orange-500 focus:outline-none"
            />
          </div>
          <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-center justify-between"
          >
            <span className="text-sm text-orange-400">{selectedIds.length} selected</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => toast.info('Add tag functionality coming soon')}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-sm flex items-center gap-2"
              >
                <Tag className="w-3 h-3" /> Add Tag
              </button>
              <button 
                onClick={handleExport}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-sm flex items-center gap-2"
              >
                <Download className="w-3 h-3" /> Export
              </button>
              <button 
                onClick={handleBulkDelete}
                className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-sm flex items-center gap-2"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Contact List */}
          <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[auto,1fr,1fr,1fr,auto] gap-3 p-3 border-b border-zinc-800 text-[10px] text-zinc-500 font-medium">
              <div className="w-5" />
              <div>CONTACT</div>
              <div>COMPANY</div>
              <div>SCORE</div>
              <div className="w-8" />
            </div>
            <div className="divide-y divide-zinc-800">
              {filteredContacts.map((contact, i) => (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedContact(contact)}
                  className={`grid grid-cols-[auto,1fr,1fr,1fr,auto] gap-3 p-3 items-center cursor-pointer transition-colors ${
                    selectedContact?.id === contact.id ? 'bg-orange-500/10' : 'hover:bg-zinc-800/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(contact.id)}
                    onChange={() => toggleSelect(contact.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-orange-500 focus:ring-orange-500"
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <span className="text-orange-400 text-xs font-medium">{contact.name.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-white">{contact.name}</div>
                      <div className="text-[10px] text-zinc-500">{contact.email}</div>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-400">{contact.company}</div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500" style={{ width: `${contact.score}%` }} />
                    </div>
                    <span className="text-xs text-orange-400">{contact.score}</span>
                  </div>
                  <button className="p-1 hover:bg-zinc-700 rounded">
                    <MoreVertical className="w-4 h-4 text-zinc-500" />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Detail Panel */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            {selectedContact ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="text-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-2">
                    <span className="text-lg text-orange-400 font-medium">{selectedContact.name.charAt(0)}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white">{selectedContact.name}</h3>
                  <p className="text-xs text-zinc-400">{selectedContact.company}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                    selectedContact.status === 'hot' ? 'bg-red-500/20 text-red-400' :
                    selectedContact.status === 'warm' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {selectedContact.status.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-xs">
                    <Mail className="w-3 h-3 text-zinc-500" />
                    <span className="text-zinc-300">{selectedContact.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Phone className="w-3 h-3 text-zinc-500" />
                    <span className="text-zinc-300">{selectedContact.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Building className="w-3 h-3 text-zinc-500" />
                    <span className="text-zinc-300">{selectedContact.company}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <MapPin className="w-3 h-3 text-zinc-500" />
                    <span className="text-zinc-300">{selectedContact.location}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-[10px] text-zinc-500 mb-1">Tags</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedContact.tags.map((tag, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-300">{tag}</span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <button 
                    onClick={handleSendEmail}
                    className="w-full py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-sm font-medium transition-colors"
                  >
                    Send Email
                  </button>
                  <button 
                    onClick={handleScheduleCall}
                    className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Schedule Call
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="text-center text-zinc-500 py-12">
                Select a contact to view details
              </div>
            )}
          </div>
        </div>

        {/* Add Contact Modal */}
        {showAddContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddContact(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Add Contact</h3>
                <button onClick={() => setShowAddContact(false)} className="p-2 hover:bg-zinc-800 rounded-lg">
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Full Name *" 
                  value={newContact.name}
                  onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none" 
                />
                <input 
                  type="email" 
                  placeholder="Email *" 
                  value={newContact.email}
                  onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none" 
                />
                <input 
                  type="tel" 
                  placeholder="Phone" 
                  value={newContact.phone}
                  onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none" 
                />
                <input 
                  type="text" 
                  placeholder="Company" 
                  value={newContact.company}
                  onChange={(e) => setNewContact(prev => ({ ...prev, company: e.target.value }))}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none" 
                />
                <input 
                  type="text" 
                  placeholder="Location" 
                  value={newContact.location}
                  onChange={(e) => setNewContact(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none" 
                />
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowAddContact(false)}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddContact}
                    className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-medium transition-colors"
                  >
                    Add Contact
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}