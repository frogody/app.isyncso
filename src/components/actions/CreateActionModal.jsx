import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/api/supabaseClient';
import { toast } from 'sonner';
import {
  Mail, Users, Calendar, Ticket, Building2, FileText, MessageSquare,
  Zap, Loader2, ArrowRight, Clock
} from 'lucide-react';

const ACTION_TYPES = [
  { value: 'send_email', label: 'Send Email', icon: Mail, category: 'email', description: 'Send an email to a contact' },
  { value: 'create_contact', label: 'Create Contact', icon: Users, category: 'crm', description: 'Add a new contact to CRM' },
  { value: 'update_contact', label: 'Update Contact', icon: Users, category: 'crm', description: 'Update existing contact info' },
  { value: 'create_deal', label: 'Create Deal', icon: Building2, category: 'crm', description: 'Create a new deal/opportunity' },
  { value: 'schedule_meeting', label: 'Schedule Meeting', icon: Calendar, category: 'calendar', description: 'Add event to calendar' },
  { value: 'create_task', label: 'Create Task', icon: FileText, category: 'crm', description: 'Create a new task' },
  { value: 'create_ticket', label: 'Create Ticket', icon: Ticket, category: 'ticketing', description: 'Open a support ticket' },
  { value: 'send_message', label: 'Send Message', icon: MessageSquare, category: 'messaging', description: 'Send a message via Slack/Teams' },
  { value: 'add_note', label: 'Add Note', icon: FileText, category: 'crm', description: 'Add a note to a record' },
];

const PLATFORMS = {
  email: ['Gmail', 'Outlook', 'SendGrid'],
  crm: ['HubSpot', 'Salesforce', 'Pipedrive'],
  calendar: ['Google Calendar', 'Outlook Calendar'],
  ticketing: ['Jira', 'Zendesk', 'Linear'],
  messaging: ['Slack', 'Microsoft Teams'],
};

export default function CreateActionModal({ open, onClose, onSuccess, userId }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_entity: '',
    platform: '',
    priority: 'normal',
    scheduled_for: ''
  });

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setFormData(prev => ({
      ...prev,
      title: `${type.label}`,
      platform: PLATFORMS[type.category]?.[0] || ''
    }));
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!formData.title || !selectedType) return;
    
    setLoading(true);
    try {
      await db.entities.ActionLog.create({
        user_id: userId,
        action_type: selectedType.value,
        category: selectedType.category,
        platform: formData.platform,
        status: 'queued',
        priority: formData.priority,
        title: formData.title,
        description: formData.description,
        target_entity: formData.target_entity,
        scheduled_for: formData.scheduled_for || null,
        source: 'manual',
        request_payload: {}
      });
      
      toast.success('Action queued successfully!');
      onSuccess?.();
      handleClose();
    } catch (error) {
      toast.error('Failed to create action');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedType(null);
    setFormData({ title: '', description: '', target_entity: '', platform: '', priority: 'normal', scheduled_for: '' });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-400" />
            {step === 1 ? 'Create New Action' : 'Configure Action'}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <p className="text-sm text-zinc-400">Select the type of action you want to perform:</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ACTION_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      onClick={() => handleTypeSelect(type)}
                      className="flex items-start gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-800/30 hover:bg-zinc-800/60 hover:border-orange-500/30 transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors">
                        <Icon className="w-5 h-5 text-orange-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-white">{type.label}</h4>
                        <p className="text-xs text-zinc-500 mt-0.5">{type.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 2 && selectedType && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <selectedType.icon className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h4 className="font-medium text-white">{selectedType.label}</h4>
                  <p className="text-xs text-zinc-500">{selectedType.description}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-zinc-300">Action Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Send follow-up to John"
                    className="bg-zinc-800 border-zinc-700 text-white mt-1.5"
                  />
                </div>

                <div>
                  <Label className="text-zinc-300">Target (Contact/Company)</Label>
                  <Input
                    value={formData.target_entity}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_entity: e.target.value }))}
                    placeholder="e.g., john@company.com or Acme Inc"
                    className="bg-zinc-800 border-zinc-700 text-white mt-1.5"
                  />
                </div>

                <div>
                  <Label className="text-zinc-300">Description (Optional)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Add any additional details..."
                    className="bg-zinc-800 border-zinc-700 text-white mt-1.5 min-h-[80px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-zinc-300">Platform</Label>
                    <Select value={formData.platform} onValueChange={(v) => setFormData(prev => ({ ...prev, platform: v }))}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1.5">
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {PLATFORMS[selectedType.category]?.map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-zinc-300">Priority</Label>
                    <Select value={formData.priority} onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-zinc-300 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Schedule For (Optional)
                  </Label>
                  <Input
                    type="datetime-local"
                    value={formData.scheduled_for}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduled_for: e.target.value }))}
                    className="bg-zinc-800 border-zinc-700 text-white mt-1.5"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                <Button variant="outline" onClick={() => setStep(1)} className="border-zinc-700 text-zinc-300">
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={loading || !formData.title} className="bg-orange-500 hover:bg-orange-400 text-white">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                  Queue Action
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}