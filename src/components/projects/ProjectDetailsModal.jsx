
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
import { Badge } from "@/components/ui/badge";
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
import {
  Calendar as CalendarIcon,
  Plus,
  X,
  Edit3,
  Save,
  Users,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Clock
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Project } from "@/api/entities";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Role } from "@/api/entities";
import RoleCard from "./RoleCard"; // Assuming this component exists
import RoleModal from "./RoleModal"; // Assuming this component exists

export default function ProjectDetailsModal({ open, project, onClose, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roles, setRoles] = useState([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        ...project,
        deadline: project.deadline ? new Date(project.deadline) : null,
        // Initialize new location fields for editing
        location_country: project.location_country || '',
        location_city: project.location_city || '',
        location_address: project.location_address || '',
        // Initialize client contact fields for editing
        client_contact_name: project.client_contact_name || '',
        client_contact_email: project.client_contact_email || '',
        client_contact_phone: project.client_contact_phone || '',
        client_preferences: project.client_preferences || '',
      });
      loadRoles();
    }
  }, [project]);

  const loadRoles = async () => {
    if (!project) return;
    setLoading(true);
    try {
      const projectRoles = await Role.filter({ project_id: project.id });
      setRoles(projectRoles);
    } catch (error) {
      console.error("Error loading roles:", error);
    }
    setLoading(false);
  };

  if (!project) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const updatedProject = await Project.update(project.id, {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        deadline: formData.deadline ? formData.deadline.toISOString().split('T')[0] : undefined,
      });

      onUpdate(updatedProject);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating project:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveRole = async (roleData) => {
    try {
      if (editingRole) {
        await Role.update(editingRole.id, roleData);
      } else {
        await Role.create(roleData);
      }
      loadRoles();
      setShowRoleModal(false);
      setEditingRole(null);
    } catch (error) {
      console.error("Error saving role:", error);
    }
  };

  const handleDeleteRole = async (role) => {
    if (confirm('Are you sure you want to delete this role?')) {
      try {
        await Role.delete(role.id);
        loadRoles();
      } catch (error) {
        console.error("Error deleting role:", error);
      }
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      discovery: "bg-blue-100 text-blue-800",
      active: "bg-green-100 text-green-800",
      on_hold: "bg-red-100 text-red-800",
      completed: "bg-gray-100 text-gray-800",
      archived: "bg-gray-100 text-gray-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  // Determine the number of columns for TabsList based on whether the location tab is present
  const tabGridColsClass = project.project_type === 'location_specific' ? 'grid-cols-4' : 'grid-cols-3';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-5xl max-h-[90vh] overflow-hidden border-0"
        style={{
          background: 'rgba(26,32,38,0.98)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: '16px',
          color: 'var(--txt)'
        }}
      >
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold" style={{color: 'var(--txt)'}}>
                {project.title}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getStatusColor(project.status)}>
                  {project.status.replace('_', ' ')}
                </Badge>
                <Badge variant="outline" style={{ background: 'rgba(255,255,255,.05)', color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}>
                  {project.project_type?.replace('_', ' ') || 'general'}
                </Badge>
                <Badge variant="outline" style={{ background: 'rgba(255,255,255,.05)', color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}>
                  {project.priority}
                </Badge>
              </div>
            </div>
            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant="outline"
              size="sm"
              style={{ background: 'rgba(255,255,255,.04)', color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}
            >
              {isEditing ? <X className="w-4 h-4 mr-2" /> : <Edit3 className="w-4 h-4 mr-2" />}
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-2">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Tabs defaultValue="details" className="w-full">
                <TabsList className={`grid w-full ${tabGridColsClass}`} style={{ background: 'rgba(255,255,255,.04)' }}>
                  <TabsTrigger value="details" style={{ color: 'var(--txt)' }}>Project Details</TabsTrigger>
                  <TabsTrigger value="client" style={{ color: 'var(--txt)' }}>Client Info</TabsTrigger>
                  {project.project_type === 'location_specific' && (
                    <TabsTrigger value="location" style={{ color: 'var(--txt)' }}>Location</TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="details" className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title" style={{ color: 'var(--txt)' }}>Project Title</Label>
                      <Input
                        id="title"
                        value={formData.title || ''}
                        onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
                        className="bg-transparent mt-1"
                        style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)', background: 'rgba(255,255,255,.02)'}}
                      />
                    </div>
                    {/* client_company moved to client tab in edit mode */}
                    <div>
                      <Label htmlFor="project_type" style={{ color: 'var(--txt)' }}>Project Type</Label>
                      <Select
                        value={formData.project_type || 'general'}
                        onValueChange={(value) => setFormData(prev => ({...prev, project_type: value}))}
                      >
                        <SelectTrigger className="mt-1" style={{ background: 'rgba(255,255,255,.02)', color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent style={{ background: 'rgba(15,20,24,.98)', color: 'var(--txt)', borderColor: 'rgba(255,255,255,.08)' }}>
                          <SelectItem value="client_specific">Client Specific</SelectItem>
                          <SelectItem value="role_specific">Role Specific</SelectItem>
                          <SelectItem value="industry_specific">Industry Specific</SelectItem>
                          <SelectItem value="location_specific">Location Specific</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="status" style={{ color: 'var(--txt)' }}>Status</Label>
                      <Select
                        value={formData.status || 'discovery'}
                        onValueChange={(value) => setFormData(prev => ({...prev, status: value}))}
                      >
                        <SelectTrigger className="mt-1" style={{ background: 'rgba(255,255,255,.02)', color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent style={{ background: 'rgba(15,20,24,.98)', color: 'var(--txt)', borderColor: 'rgba(255,255,255,.08)' }}>
                          <SelectItem value="discovery">Discovery</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="priority" style={{ color: 'var(--txt)' }}>Priority</Label>
                      <Select
                        value={formData.priority || 'medium'}
                        onValueChange={(value) => setFormData(prev => ({...prev, priority: value}))}
                      >
                        <SelectTrigger className="mt-1" style={{ background: 'rgba(255,255,255,.02)', color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent style={{ background: 'rgba(15,20,24,.98)', color: 'var(--txt)', borderColor: 'rgba(255,255,255,.08)' }}>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description" style={{ color: 'var(--txt)' }}>Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description || ''}
                      onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                      rows={4}
                      className="bg-transparent mt-1"
                      style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)', background: 'rgba(255,255,255,.02)'}}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label style={{ color: 'var(--txt)' }}>Deadline</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start mt-1"
                            style={{borderColor: 'rgba(255,255,255,.12)', background: 'rgba(255,255,255,.02)', color: 'var(--txt)'}}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.deadline ? format(formData.deadline, 'PPP') : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" style={{ background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.08)' }}>
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
                      <Label htmlFor="budget" style={{ color: 'var(--txt)' }}>Budget (€)</Label>
                      <Input
                        id="budget"
                        type="number"
                        value={formData.budget || ''}
                        onChange={(e) => setFormData(prev => ({...prev, budget: e.target.value}))}
                        className="bg-transparent mt-1"
                        style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)', background: 'rgba(255,255,255,.02)'}}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes" style={{ color: 'var(--txt)' }}>Internal Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes || ''}
                      onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))}
                      rows={4}
                      className="bg-transparent mt-1"
                      style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)', background: 'rgba(255,255,255,.02)'}}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="client" className="mt-4 space-y-4">
                  <div>
                    <Label htmlFor="client_company" style={{ color: 'var(--txt)' }}>Client Company</Label>
                    <Input
                      id="client_company"
                      value={formData.client_company || ''}
                      onChange={(e) => setFormData(prev => ({...prev, client_company: e.target.value}))}
                      className="mt-1"
                      style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)', background: 'rgba(255,255,255,.02)'}}
                    />
                  </div>
                  <div>
                    <Label htmlFor="client_contact_name" style={{ color: 'var(--txt)' }}>Contact Name</Label>
                    <Input
                      id="client_contact_name"
                      value={formData.client_contact_name || ''}
                      onChange={(e) => setFormData(prev => ({...prev, client_contact_name: e.target.value}))}
                      className="bg-transparent mt-1"
                      style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)', background: 'rgba(255,255,255,.02)'}}
                    />
                  </div>
                  <div>
                    <Label htmlFor="client_contact_email" style={{ color: 'var(--txt)' }}>Contact Email</Label>
                    <Input
                      id="client_contact_email"
                      type="email"
                      value={formData.client_contact_email || ''}
                      onChange={(e) => setFormData(prev => ({...prev, client_contact_email: e.target.value}))}
                      className="bg-transparent mt-1"
                      style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)', background: 'rgba(255,255,255,.02)'}}
                    />
                  </div>
                  <div>
                    <Label htmlFor="client_contact_phone" style={{ color: 'var(--txt)' }}>Contact Phone</Label>
                    <Input
                      id="client_contact_phone"
                      type="tel"
                      value={formData.client_contact_phone || ''}
                      onChange={(e) => setFormData(prev => ({...prev, client_contact_phone: e.target.value}))}
                      className="bg-transparent mt-1"
                      style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)', background: 'rgba(255,255,255,.02)'}}
                    />
                  </div>
                  <div>
                    <Label htmlFor="client_preferences" style={{ color: 'var(--txt)' }}>Client Preferences</Label>
                    <Textarea
                      id="client_preferences"
                      value={formData.client_preferences || ''}
                      onChange={(e) => setFormData(prev => ({...prev, client_preferences: e.target.value}))}
                      rows={4}
                      className="bg-transparent mt-1"
                      style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)', background: 'rgba(255,255,255,.02)'}}
                    />
                  </div>
                </TabsContent>

                {project.project_type === 'location_specific' && (
                  <TabsContent value="location" className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="location_country" style={{ color: 'var(--txt)' }}>Country</Label>
                        <Input
                          id="location_country"
                          value={formData.location_country || ''}
                          onChange={(e) => setFormData(prev => ({...prev, location_country: e.target.value}))}
                          className="bg-transparent mt-1"
                          style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)', background: 'rgba(255,255,255,.02)'}}
                        />
                      </div>
                      <div>
                        <Label htmlFor="location_city" style={{ color: 'var(--txt)' }}>City</Label>
                        <Input
                          id="location_city"
                          value={formData.location_city || ''}
                          onChange={(e) => setFormData(prev => ({...prev, location_city: e.target.value}))}
                          className="bg-transparent mt-1"
                          style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)', background: 'rgba(255,255,255,.02)'}}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="location_address" style={{ color: 'var(--txt)' }}>Address</Label>
                      <Textarea
                        id="location_address"
                        value={formData.location_address || ''}
                        onChange={(e) => setFormData(prev => ({...prev, location_address: e.target.value}))}
                        rows={3}
                        className="bg-transparent mt-1"
                        style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)', background: 'rgba(255,255,255,.02)'}}
                      />
                    </div>
                  </TabsContent>
                )}
              </Tabs>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)} style={{ background: 'rgba(255,255,255,.04)', color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="btn-primary">
                  <Save className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          ) : ( // NOT Editing (View Mode)
            <Tabs defaultValue="roles" className="w-full">
              <TabsList className={`grid w-full ${tabGridColsClass}`} style={{ background: 'rgba(255,255,255,.04)' }}>
                <TabsTrigger value="roles" style={{ color: 'var(--txt)' }}>Open Roles ({roles.length})</TabsTrigger>
                <TabsTrigger value="details" style={{ color: 'var(--txt)' }}>Project Details</TabsTrigger>
                <TabsTrigger value="client" style={{ color: 'var(--txt)' }}>Client Info</TabsTrigger>
                {project.project_type === 'location_specific' && (
                  <TabsTrigger value="location" style={{ color: 'var(--txt)' }}>Location</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="roles" className="mt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-lg" style={{color: 'var(--txt)'}}>Open Roles</h3>
                  <Button
                    onClick={() => {
                      setEditingRole(null);
                      setShowRoleModal(true);
                    }}
                    className="btn-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Role
                  </Button>
                </div>

                {loading ? (
                  <div className="text-center py-8" style={{ color: 'var(--muted)' }}>
                    Loading roles...
                  </div>
                ) : roles.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="mb-4" style={{ color: 'var(--muted)' }}>
                      No roles added yet. Add your first role to start recruiting.
                    </p>
                    <Button
                      onClick={() => {
                        setEditingRole(null);
                        setShowRoleModal(true);
                      }}
                      className="btn-primary"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Role
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {roles.map((role) => (
                      <RoleCard
                        key={role.id}
                        role={role}
                        onEdit={(r) => {
                          setEditingRole(r);
                          setShowRoleModal(true);
                        }}
                        onDelete={handleDeleteRole}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="details" className="mt-4">
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-2" style={{color: 'var(--txt)'}}>Project Information</h4>
                    {project.description && (
                      <p className="text-sm mb-4" style={{color: 'var(--muted)'}}>{project.description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      {project.deadline && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" style={{color: 'var(--muted)'}} />
                          <span style={{color: 'var(--txt)'}}>Due: {format(new Date(project.deadline), 'PPP')}</span>
                        </div>
                      )}
                      {project.budget && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" style={{color: 'var(--muted)'}} />
                          <span style={{color: 'var(--txt)'}}>€{project.budget.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {project.notes && (
                    <div>
                      <h4 className="font-medium mb-2" style={{color: 'var(--txt)'}}>Internal Notes</h4>
                      <p className="text-sm" style={{color: 'var(--muted)'}}>{project.notes}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="client" className="mt-4">
                <div className="space-y-4">
                  {project.client_company && (
                    <div>
                      <h4 className="font-medium mb-2" style={{color: 'var(--txt)'}}>Client Company</h4>
                      <p className="text-sm" style={{color: 'var(--muted)'}}>{project.client_company}</p>
                    </div>
                  )}

                  {(project.client_contact_name || project.client_contact_email || project.client_contact_phone) && (
                    <div>
                      <h4 className="font-medium mb-2" style={{color: 'var(--txt)'}}>Contact Information</h4>
                      <div className="space-y-2 text-sm" style={{color: 'var(--muted)'}}>
                        {project.client_contact_name && (
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" style={{color: 'var(--muted)'}} />
                            <span>{project.client_contact_name}</span>
                          </div>
                        )}
                        {project.client_contact_email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" style={{color: 'var(--muted)'}} />
                            <a href={`mailto:${project.client_contact_email}`} className="hover:underline" style={{ color: '#60A5FA' }}>
                              {project.client_contact_email}
                            </a>
                          </div>
                        )}
                        {project.client_contact_phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" style={{color: 'var(--muted)'}} />
                            <a href={`tel:${project.client_contact_phone}`} className="hover:underline" style={{ color: '#60A5FA' }}>
                              {project.client_contact_phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {project.client_preferences && (
                    <div>
                      <h4 className="font-medium mb-2" style={{color: 'var(--txt)'}}>Client Preferences</h4>
                      <p className="text-sm" style={{color: 'var(--muted)'}}>{project.client_preferences}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {project.project_type === 'location_specific' && (
                <TabsContent value="location" className="mt-4">
                  <div className="space-y-4">
                    <h4 className="font-medium mb-2" style={{color: 'var(--txt)'}}>Location Details</h4>
                    {(project.location_country || project.location_city || project.location_address) ? (
                      <div className="space-y-2 text-sm" style={{color: 'var(--muted)'}}>
                        {project.location_country && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" style={{color: 'var(--muted)'}} />
                            <span>
                              {project.location_address && `${project.location_address}, `}
                              {project.location_city && `${project.location_city}, `}
                              {project.location_country}
                            </span>
                          </div>
                        )}
                        {/* More granular display if only parts are available */}
                        {!project.location_country && project.location_city && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" style={{color: 'var(--muted)'}} />
                            <span>{project.location_city}</span>
                          </div>
                        )}
                        {!project.location_country && !project.location_city && project.location_address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" style={{color: 'var(--muted)'}} />
                            <span>{project.location_address}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm" style={{color: 'var(--muted)'}}>No location details provided for this project.</p>
                    )}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          )}
        </ScrollArea>
      </DialogContent>

      {showRoleModal && (
        <RoleModal
          open={showRoleModal}
          onClose={() => {
            setShowRoleModal(false);
            setEditingRole(null);
          }}
          role={editingRole}
          projectId={project.id}
          onSave={handleSaveRole}
        />
      )}
    </Dialog>
  );
}
