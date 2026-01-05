
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, X, Pencil, Check, Search, Building2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Client } from "@/api/entities";
import { User } from "@/api/entities";
import LocationMap from "./LocationMap";

export default function ProjectCreateModal({ open, onClose, project, onSave }) {
  const [formData, setFormData] = useState({
    title: "",
    client_company: "",
    client_contact_name: "",
    client_contact_email: "",
    client_contact_phone: "",
    project_type: "client_specific",
    priority: "medium",
    deadline: null,
    budget: "",
    notes: "",
    client_preferences: "",
    description: "",
    location_description: "", // New field
    location_data: null, // New field
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [_user, setUser] = useState(null);

  useEffect(() => {
    if (open) {
      loadData();
      if (project) {
        setFormData({
          ...project,
          deadline: project.deadline ? new Date(project.deadline) : null,
          budget: project.budget !== undefined && project.budget !== null ? String(project.budget) : "",
          description: project.description || "",
          project_type: project.project_type || "client_specific",
          location_description: project.location_description || "", // Populate new field
          location_data: project.location_data || null, // Populate new field
        });
        setEditingTitle(false);
        if (project.client) {
          setSelectedClient(project.client);
        }
      } else {
        resetForm();
      }
    }
  }, [open, project]);

  const loadData = async () => {
    try {
      const userData = await User.me();
      setUser(userData);

      if (userData?.organization_id) {
        const existingClients = await Client.filter({ organization_id: userData.organization_id });
        setClients(existingClients);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      client_company: "",
      client_contact_name: "",
      client_contact_email: "",
      client_contact_phone: "",
      project_type: "client_specific",
      priority: "medium",
      deadline: null,
      budget: "",
      notes: "",
      client_preferences: "",
      description: "",
      location_description: "", // Reset new field
      location_data: null, // Reset new field
    });
    setEditingTitle(false);
    setSelectedClient(null);
    setShowClientSearch(false);
    setShowNewClientForm(false);
    setClientSearch("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) {
      alert("Please enter a project title");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        deadline: formData.deadline ? formData.deadline.toISOString().split('T')[0] : undefined
      });
      
      onClose(); // Call onClose after successful save
    } catch (error) {
      console.error("Error in form submit:", error); // Log the error for debugging
      alert("Error saving project. Please try again."); // Show an alert to the user
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClientSelect = (client) => {
    setSelectedClient(client);
    setFormData(prev => ({
      ...prev,
      client_company: client.company_name,
      client_contact_name: client.contact_name || "",
      client_contact_email: client.contact_email || "",
      client_contact_phone: client.contact_phone || "",
      client_preferences: client.preferences || ""
    }));
    setShowClientSearch(false);
    setClientSearch("");
  };

  const handleNewClient = () => {
    setShowClientSearch(false);
    setShowNewClientForm(true);
  };

  const filteredClients = clients.filter(client =>
    client.company_name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] border-0 flex flex-col"
        style={{
          background: 'rgba(12,16,20,0.98)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: '16px'
        }}
      >
        <DialogHeader className="pb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            {editingTitle ? (
              <>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
                  placeholder="Enter project title..."
                  className="text-xl font-semibold bg-transparent border-none focus:ring-0 px-0"
                  style={{color: 'var(--txt)'}}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setEditingTitle(false);
                    }
                  }}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingTitle(false)}
                  className="h-8 w-8"
                >
                  <Check className="w-4 h-4" style={{color: 'var(--txt)'}} />
                </Button>
              </>
            ) : (
              <>
                <DialogTitle className="text-xl font-semibold" style={{color: 'var(--txt)'}}>
                  {formData.title || (project ? 'Edit Project' : 'Create New Project')}
                </DialogTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingTitle(true)}
                  className="h-8 w-8"
                >
                  <Pencil className="w-4 h-4" style={{color: 'var(--muted)'}} />
                </Button>
              </>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="flex-1 px-1" style={{ maxHeight: 'calc(90vh - 180px)' }}>
            <div className="space-y-6 pr-4 pb-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg" style={{color: 'var(--txt)'}}>Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="project_type">Project Type</Label>
                    <Select
                      value={formData.project_type}
                      onValueChange={(value) => {
                        setFormData(prev => ({
                          ...prev,
                          project_type: value,
                          // Reset client or location specific fields if type changes
                          ...(value !== 'client_specific' && {
                            client_company: "", client_contact_name: "", client_contact_email: "",
                            client_contact_phone: "", client_preferences: ""
                          }),
                          ...(value !== 'location_specific' && {
                            location_description: "", location_data: null
                          })
                        }));
                        if (value !== 'client_specific') {
                          setSelectedClient(null);
                          setShowClientSearch(false);
                          setShowNewClientForm(false);
                        }
                      }}
                    >
                      <SelectTrigger className="bg-transparent mt-1" style={{borderColor: 'rgba(255,255,255,.12)'}}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client_specific">Client Specific</SelectItem>
                        <SelectItem value="role_specific">Role Specific</SelectItem>
                        <SelectItem value="industry_specific">Industry Specific</SelectItem>
                        <SelectItem value="location_specific">Location Specific</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData(prev => ({...prev, priority: value}))}
                    >
                      <SelectTrigger className="bg-transparent mt-1" style={{borderColor: 'rgba(255,255,255,.12)'}}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Project Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                    placeholder="Describe the project scope, target industry, location, etc..."
                    rows={4}
                    className="bg-transparent mt-1"
                    style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
                  />
                </div>
              </div>

              {/* Client Selection (only for client_specific) */}
              {formData.project_type === 'client_specific' && (
                <div className="space-y-4">
                  <h3 className="font-medium text-lg" style={{color: 'var(--txt)'}}>Client Information</h3>
                  
                  {!selectedClient && !showNewClientForm && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={() => setShowClientSearch(!showClientSearch)}
                          className="flex-1 btn-outline"
                        >
                          <Search className="w-4 h-4 mr-2" />
                          Search Existing Client
                        </Button>
                        <Button
                          type="button"
                          onClick={handleNewClient}
                          className="flex-1 btn-primary"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add New Client
                        </Button>
                      </div>

                      {showClientSearch && (
                        <div className="border rounded-lg p-3" style={{borderColor: 'rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)'}}>
                          <div className="relative mb-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{color: 'var(--muted)'}} />
                            <Input
                              placeholder="Search clients..."
                              value={clientSearch}
                              onChange={(e) => setClientSearch(e.target.value)}
                              className="pl-10 bg-transparent"
                              style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {filteredClients.length === 0 ? (
                              <p className="text-sm text-center py-4" style={{color: 'var(--muted)'}}>
                                No clients found
                              </p>
                            ) : (
                              filteredClients.map(client => (
                                <button
                                  key={client.id}
                                  type="button"
                                  onClick={() => handleClientSelect(client)}
                                  className="w-full text-left p-3 rounded-lg hover:bg-white/5 transition-colors"
                                  style={{borderColor: 'rgba(255,255,255,.06)'}}
                                >
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4" style={{color: 'var(--muted)'}} />
                                    <div>
                                      <p className="font-medium" style={{color: 'var(--txt)'}}>{client.company_name}</p>
                                      {client.contact_name && (
                                        <p className="text-xs" style={{color: 'var(--muted)'}}>{client.contact_name}</p>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedClient && (
                    <div className="border rounded-lg p-4" style={{borderColor: 'rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)'}}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-5 h-5" style={{color: 'var(--accent)'}} />
                          <h4 className="font-semibold" style={{color: 'var(--txt)'}}>{selectedClient.company_name}</h4>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedClient(null);
                            setFormData(prev => ({
                              ...prev,
                              client_company: "",
                              client_contact_name: "",
                              client_contact_email: "",
                              client_contact_phone: "",
                              client_preferences: ""
                            }));
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      {selectedClient.contact_name && (
                        <p className="text-sm" style={{color: 'var(--muted)'}}>Contact: {selectedClient.contact_name}</p>
                      )}
                      {selectedClient.contact_email && (
                        <p className="text-sm" style={{color: 'var(--muted)'}}>Email: {selectedClient.contact_email}</p>
                      )}
                    </div>
                  )}

                  {showNewClientForm && (
                    <div className="space-y-4 border rounded-lg p-4" style={{borderColor: 'rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)'}}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium" style={{color: 'var(--txt)'}}>New Client Details</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowNewClientForm(false);
                            setFormData(prev => ({
                              ...prev,
                              client_company: "",
                              client_contact_name: "",
                              client_contact_email: "",
                              client_contact_phone: "",
                              client_preferences: ""
                            }));
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div>
                        <Label htmlFor="client_company">Company Name *</Label>
                        <Input
                          id="client_company"
                          value={formData.client_company}
                          onChange={(e) => setFormData(prev => ({...prev, client_company: e.target.value}))}
                          placeholder="Company name"
                          required
                          className="bg-transparent mt-1"
                          style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="client_contact_name">Contact Name</Label>
                          <Input
                            id="client_contact_name"
                            value={formData.client_contact_name}
                            onChange={(e) => setFormData(prev => ({...prev, client_contact_name: e.target.value}))}
                            placeholder="Primary contact"
                            className="bg-transparent mt-1"
                            style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
                          />
                        </div>

                        <div>
                          <Label htmlFor="client_contact_email">Contact Email</Label>
                          <Input
                            id="client_contact_email"
                            type="email"
                            value={formData.client_contact_email}
                            onChange={(e) => setFormData(prev => ({...prev, client_contact_email: e.target.value}))}
                            placeholder="contact@company.com"
                            className="bg-transparent mt-1"
                            style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
                          />
                        </div>

                        <div>
                          <Label htmlFor="client_contact_phone">Contact Phone</Label>
                          <Input
                            id="client_contact_phone"
                            value={formData.client_contact_phone}
                            onChange={(e) => setFormData(prev => ({...prev, client_contact_phone: e.target.value}))}
                            placeholder="+31 6 1234 5678"
                            className="bg-transparent mt-1"
                            style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="client_preferences">Client Preferences</Label>
                        <Textarea
                          id="client_preferences"
                          value={formData.client_preferences}
                          onChange={(e) => setFormData(prev => ({...prev, client_preferences: e.target.value}))}
                          placeholder="Culture fit, specific requirements..."
                          rows={3}
                          className="bg-transparent mt-1"
                          style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Location Specific Section */}
              {formData.project_type === 'location_specific' && (
                <div className="space-y-4">
                  <h3 className="font-medium text-lg" style={{color: 'var(--txt)'}}>Location Information</h3>
                  <LocationMap
                    locationDescription={formData.location_description}
                    onLocationDataChange={(locationData, description) => {
                      setFormData(prev => ({
                        ...prev,
                        location_data: locationData,
                        location_description: description
                      }));
                    }}
                  />
                </div>
              )}

              {/* Project Management */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg" style={{color: 'var(--txt)'}}>Project Management</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Deadline</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start mt-1 bg-transparent"
                          style={{borderColor: 'rgba(255,255,255,.12)'}}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.deadline ? format(formData.deadline, 'PPP') : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.deadline}
                          onSelect={(date) => setFormData(prev => ({...prev, deadline: date}))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label htmlFor="budget">Budget (€)</Label>
                    <Input
                      id="budget"
                      type="number"
                      value={formData.budget}
                      onChange={(e) => setFormData(prev => ({...prev, budget: e.target.value}))}
                      placeholder="25000"
                      className="bg-transparent mt-1"
                      style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Internal Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))}
                    placeholder="Internal notes, strategy, market intel..."
                    rows={3}
                    className="bg-transparent mt-1"
                    style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
                  />
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t flex-shrink-0" style={{borderColor: 'rgba(255,255,255,.06)'}}>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Saving...' : (project ? 'Update Project' : 'Create Project')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
