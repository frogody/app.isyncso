import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useUser } from "@/components/context/UserContext";
import {
  Search, X, User, Building2, Mail, Phone, Plus, ChevronDown, Check, Loader2,
  ExternalLink, Sparkles, Globe, MapPin, Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

/**
 * ContactSelector - Reusable component for selecting CRM contacts
 *
 * Used in: FinanceProposalBuilder, Deals, and other places where
 * users need to link to existing contacts instead of manual entry.
 *
 * Features:
 * - Search existing CRM contacts
 * - Auto-fill form data when contact is selected
 * - Option to create new contact
 * - Explorium API integration for company enrichment (optional)
 */
export default function ContactSelector({
  value, // Currently selected contact ID
  onSelect, // Callback when contact is selected - receives full contact object
  placeholder = "Search contacts...",
  className = "",
  showEnrichButton = false, // Show Explorium enrichment button
  disabled = false,
  required = false,
}) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  // Load contacts when component mounts or opens
  useEffect(() => {
    if (open && user?.id) {
      loadContacts();
    }
  }, [open, user?.id]);

  // Set initial selected contact from value prop
  useEffect(() => {
    if (value && contacts.length > 0) {
      const contact = contacts.find(c => c.id === value);
      if (contact) {
        setSelectedContact(contact);
      }
    }
  }, [value, contacts]);

  const loadContacts = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const prospects = await base44.entities.Prospect.filter({ user_id: user.id });
      const contactList = prospects.map(p => ({
        id: p.id,
        name: p.contact_name || p.company_name || "Unknown",
        email: p.contact_email || p.email,
        phone: p.contact_phone || p.phone,
        company_name: p.company_name,
        job_title: p.contact_title || p.job_title,
        location: p.location || p.hq_city,
        industry: p.industry,
        website: p.website || p.domain,
        linkedin_url: p.linkedin_url,
        stage: p.stage || p.status || "new",
        deal_value: p.deal_value || p.estimated_value || 0,
        score: p.score || 50,
      }));
      setContacts(contactList);
    } catch (error) {
      console.error("Failed to load contacts:", error);
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  // Filter contacts based on search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;

    const query = searchQuery.toLowerCase();
    return contacts.filter(c =>
      c.name?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.company_name?.toLowerCase().includes(query)
    );
  }, [contacts, searchQuery]);

  const handleSelect = (contact) => {
    setSelectedContact(contact);
    setOpen(false);
    if (onSelect) {
      onSelect(contact);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedContact(null);
    if (onSelect) {
      onSelect(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={`w-full justify-between bg-zinc-900/80 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 ${className}`}
        >
          {selectedContact ? (
            <div className="flex items-center gap-2 text-left flex-1 min-w-0">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/20 to-cyan-400/10 flex items-center justify-center flex-shrink-0">
                <span className="text-cyan-400/80 text-xs font-medium">
                  {selectedContact.name?.charAt(0)?.toUpperCase() || "?"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white truncate text-sm">{selectedContact.name}</div>
                {selectedContact.company_name && (
                  <div className="text-xs text-zinc-500 truncate">{selectedContact.company_name}</div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 rounded-full hover:bg-zinc-700"
                onClick={handleClear}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <span className="text-zinc-500">{placeholder}</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 bg-zinc-900 border-zinc-800" align="start">
        <Command className="bg-transparent">
          <div className="flex items-center border-b border-zinc-800 px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-zinc-500" />
            <input
              placeholder="Search by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-11 w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-zinc-500"
            />
          </div>
          <CommandList className="max-h-[300px] overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full bg-zinc-800" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32 bg-zinc-800" />
                      <Skeleton className="h-3 w-48 bg-zinc-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="py-8 text-center">
                <User className="w-10 h-10 mx-auto mb-2 text-zinc-600" />
                <p className="text-sm text-zinc-500 mb-3">
                  {searchQuery ? "No contacts found" : "No contacts yet"}
                </p>
                <Button
                  size="sm"
                  className="bg-cyan-600/80 hover:bg-cyan-600 text-white"
                  onClick={() => {
                    setOpen(false);
                    // Could open CRM modal here
                    window.location.href = "/CRMContacts";
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Contact in CRM
                </Button>
              </div>
            ) : (
              <CommandGroup className="p-2">
                {filteredContacts.map((contact) => (
                  <CommandItem
                    key={contact.id}
                    value={contact.id}
                    onSelect={() => handleSelect(contact)}
                    className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-zinc-800"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/15 to-cyan-400/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-cyan-400/80 font-medium">
                        {contact.name?.charAt(0)?.toUpperCase() || "?"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{contact.name}</span>
                        {selectedContact?.id === contact.id && (
                          <Check className="w-4 h-4 text-cyan-400" />
                        )}
                      </div>
                      {contact.company_name && (
                        <div className="text-xs text-zinc-500 flex items-center gap-1 truncate">
                          <Building2 className="w-3 h-3" />
                          {contact.company_name}
                          {contact.job_title && <span className="text-zinc-600">• {contact.job_title}</span>}
                        </div>
                      )}
                      {contact.email && (
                        <div className="text-xs text-zinc-500 flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3" />
                          {contact.email}
                        </div>
                      )}
                    </div>
                    {contact.deal_value > 0 && (
                      <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400/80 border-cyan-500/30 text-xs">
                        ${parseFloat(contact.deal_value).toLocaleString()}
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>

          {/* Footer with Add New option */}
          <div className="border-t border-zinc-800 p-2">
            <Button
              variant="ghost"
              className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800"
              onClick={() => {
                setOpen(false);
                window.location.href = "/CRMContacts";
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add new contact in CRM
            </Button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * ContactSelectorModal - Full-screen modal for selecting contacts
 * Use when you need more space and features
 */
export function ContactSelectorModal({
  isOpen,
  onClose,
  onSelect,
  title = "Select Contact",
  description = "Choose an existing contact or create a new one",
}) {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrichingId, setEnrichingId] = useState(null);

  useEffect(() => {
    if (isOpen && user?.id) {
      loadContacts();
    }
  }, [isOpen, user?.id]);

  const loadContacts = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const prospects = await base44.entities.Prospect.filter({ user_id: user.id });
      const contactList = prospects.map(p => ({
        id: p.id,
        name: p.contact_name || p.company_name || "Unknown",
        email: p.contact_email || p.email,
        phone: p.contact_phone || p.phone,
        company_name: p.company_name,
        job_title: p.contact_title || p.job_title,
        location: p.location || p.hq_city,
        industry: p.industry,
        website: p.website || p.domain,
        linkedin_url: p.linkedin_url,
        stage: p.stage || p.status || "new",
        deal_value: p.deal_value || p.estimated_value || 0,
        score: p.score || 50,
      }));
      setContacts(contactList);
    } catch (error) {
      console.error("Failed to load contacts:", error);
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter(c =>
      c.name?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.company_name?.toLowerCase().includes(query)
    );
  }, [contacts, searchQuery]);

  const handleSelect = (contact) => {
    if (onSelect) {
      onSelect(contact);
    }
    onClose();
  };

  // Explorium enrichment (placeholder - needs API key setup)
  const handleEnrich = async (contact) => {
    setEnrichingId(contact.id);
    try {
      // TODO: Implement Explorium API call
      // const enrichedData = await enrichWithExplorium(contact.company_name || contact.email);
      toast.info("Company enrichment coming soon!");
    } catch (error) {
      toast.error("Failed to enrich contact data");
    } finally {
      setEnrichingId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
          <DialogDescription className="text-zinc-400">{description}</DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search by name, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-zinc-800 border-zinc-700"
          />
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto mt-4 space-y-2">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl">
                  <Skeleton className="w-12 h-12 rounded-full bg-zinc-700" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32 bg-zinc-700" />
                    <Skeleton className="h-3 w-48 bg-zinc-700" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
              <h3 className="text-lg font-medium text-white mb-2">
                {searchQuery ? "No contacts found" : "No contacts yet"}
              </h3>
              <p className="text-zinc-500 mb-4">
                {searchQuery
                  ? "Try a different search term"
                  : "Add contacts in CRM to select them here"}
              </p>
              <Button
                className="bg-cyan-600/80 hover:bg-cyan-600 text-white"
                onClick={() => {
                  onClose();
                  window.location.href = "/CRMContacts";
                }}
              >
                <Plus className="w-4 h-4 mr-1" /> Add Contact in CRM
              </Button>
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 p-4 bg-zinc-800/40 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all cursor-pointer group"
                onClick={() => handleSelect(contact)}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-cyan-400/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-cyan-400/80 text-lg font-semibold">
                    {contact.name?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-white group-hover:text-cyan-400 transition-colors">
                      {contact.name}
                    </h4>
                    {contact.job_title && (
                      <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">
                        {contact.job_title}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
                    {contact.company_name && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {contact.company_name}
                      </span>
                    )}
                    {contact.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {contact.email}
                      </span>
                    )}
                    {contact.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {contact.phone}
                      </span>
                    )}
                    {contact.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {contact.location}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {contact.deal_value > 0 && (
                    <Badge className="bg-cyan-500/15 text-cyan-400/80 border-cyan-500/30">
                      ${parseFloat(contact.deal_value).toLocaleString()}
                    </Badge>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEnrich(contact);
                    }}
                    disabled={enrichingId === contact.id}
                  >
                    {enrichingId === contact.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-zinc-400 hover:text-cyan-400" />
                    )}
                  </Button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          <Button
            variant="outline"
            className="border-zinc-700"
            onClick={() => {
              onClose();
              window.location.href = "/CRMContacts";
            }}
          >
            <Plus className="w-4 h-4 mr-1" /> Add New Contact
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * useContactSelector - Hook for managing contact selection
 * Returns functions and state for contact selection
 */
export function useContactSelector() {
  const [selectedContact, setSelectedContact] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openSelector = () => setIsModalOpen(true);
  const closeSelector = () => setIsModalOpen(false);

  const selectContact = (contact) => {
    setSelectedContact(contact);
    closeSelector();
  };

  const clearContact = () => {
    setSelectedContact(null);
  };

  // Convert contact to form data for proposals/deals
  const toFormData = () => {
    if (!selectedContact) return {};
    return {
      client_name: selectedContact.name,
      client_email: selectedContact.email,
      client_company: selectedContact.company_name,
      client_phone: selectedContact.phone,
      client_location: selectedContact.location,
      prospect_id: selectedContact.id,
    };
  };

  return {
    selectedContact,
    isModalOpen,
    openSelector,
    closeSelector,
    selectContact,
    clearContact,
    toFormData,
  };
}
