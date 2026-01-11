import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/api/supabaseClient';
import { Loader2, CheckCircle, AlertCircle, Send, Zap, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ACTION_CONFIGS = {
  calendar: [
    {
      id: 'create_event',
      label: 'Create Event',
      description: 'Schedule a new calendar event',
      fields: [
        { name: 'subject', label: 'Event Title', type: 'text', required: true },
        { name: 'description', label: 'Description', type: 'textarea', required: false },
        { name: 'start_time', label: 'Start Time', type: 'datetime-local', required: true },
        { name: 'end_time', label: 'End Time', type: 'datetime-local', required: true },
        { name: 'location', label: 'Location', type: 'text', required: false }
      ]
    },
    {
      id: 'list_events',
      label: 'List Events',
      description: 'Retrieve upcoming calendar events',
      fields: []
    },
    {
      id: 'list_calendars',
      label: 'List Calendars',
      description: 'Retrieve available calendars',
      fields: []
    }
  ],
  email: [
    {
      id: 'send_email',
      label: 'Send Email',
      description: 'Compose and send an email',
      fields: [
        { name: 'to', label: 'To (Email)', type: 'email', required: true },
        { name: 'subject', label: 'Subject', type: 'text', required: true },
        { name: 'body', label: 'Message Body', type: 'textarea', required: true },
        { name: 'cc', label: 'CC (optional)', type: 'email', required: false },
        { name: 'bcc', label: 'BCC (optional)', type: 'email', required: false }
      ]
    },
    {
      id: 'list_emails',
      label: 'List Emails',
      description: 'Retrieve recent emails',
      fields: []
    },
    {
      id: 'list_threads',
      label: 'List Threads',
      description: 'Retrieve email threads',
      fields: []
    },
    {
      id: 'list_folders',
      label: 'List Folders',
      description: 'Retrieve email folders',
      fields: []
    }
  ],
  crm: [
    {
      id: 'create_contact',
      label: 'Create Contact',
      description: 'Create a new contact in your CRM',
      fields: [
        { name: 'first_name', label: 'First Name', type: 'text', required: true },
        { name: 'last_name', label: 'Last Name', type: 'text', required: true },
        { name: 'email_addresses', label: 'Email', type: 'email', required: false, isArray: true },
        { name: 'phone_numbers', label: 'Phone', type: 'tel', required: false, isArray: true }
      ]
    },
    {
      id: 'create_lead',
      label: 'Create Lead',
      description: 'Create a new lead in your CRM',
      fields: [
        { name: 'lead_source', label: 'Lead Source', type: 'text', required: false },
        { name: 'title', label: 'Title', type: 'text', required: false },
        { name: 'company', label: 'Company', type: 'text', required: false },
        { name: 'first_name', label: 'First Name', type: 'text', required: true },
        { name: 'last_name', label: 'Last Name', type: 'text', required: true },
        { name: 'email_addresses', label: 'Email', type: 'email', required: false, isArray: true }
      ]
    },
    {
      id: 'create_task',
      label: 'Create Task',
      description: 'Create a new task',
      fields: [
        { name: 'subject', label: 'Subject', type: 'text', required: true },
        { name: 'content', label: 'Description', type: 'textarea', required: false },
        { name: 'due_date', label: 'Due Date', type: 'date', required: false }
      ]
    },
    {
      id: 'list_contacts',
      label: 'List Contacts',
      description: 'Retrieve contacts from your CRM',
      fields: []
    }
  ],
  ticketing: [
    {
      id: 'create_ticket',
      label: 'Create Ticket',
      description: 'Create a new ticket/issue',
      fields: [
        { name: 'name', label: 'Title', type: 'text', required: true },
        { name: 'description', label: 'Description', type: 'textarea', required: false },
        { name: 'priority', label: 'Priority', type: 'select', required: false, options: [
          { value: 'URGENT', label: 'Urgent' },
          { value: 'HIGH', label: 'High' },
          { value: 'NORMAL', label: 'Normal' },
          { value: 'LOW', label: 'Low' }
        ]},
        { name: 'status', label: 'Status', type: 'select', required: false, options: [
          { value: 'OPEN', label: 'Open' },
          { value: 'IN_PROGRESS', label: 'In Progress' },
          { value: 'CLOSED', label: 'Closed' }
        ]}
      ]
    },
    { id: 'list_tickets', label: 'List Tickets', description: 'Retrieve tickets', fields: [] },
    { id: 'list_projects', label: 'List Projects', description: 'Retrieve projects', fields: [] }
  ],
  hris: [
    { id: 'list_employees', label: 'List Employees', description: 'Retrieve employee list', fields: [] },
    { id: 'list_teams', label: 'List Teams', description: 'Retrieve team list', fields: [] }
  ],
  accounting: [
    {
      id: 'create_contact',
      label: 'Create Contact',
      description: 'Create a new contact',
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'is_customer', label: 'Is Customer', type: 'checkbox', required: false },
        { name: 'is_supplier', label: 'Is Supplier', type: 'checkbox', required: false },
        { name: 'email_address', label: 'Email', type: 'email', required: false }
      ]
    },
    { id: 'list_invoices', label: 'List Invoices', description: 'Retrieve invoices', fields: [] },
    { id: 'list_contacts', label: 'List Contacts', description: 'Retrieve contacts', fields: [] }
  ],
  filestorage: [
    { id: 'list_files', label: 'List Files', description: 'Retrieve files', fields: [] },
    { id: 'list_folders', label: 'List Folders', description: 'Retrieve folders', fields: [] }
  ],
  ats: [
    { id: 'list_candidates', label: 'List Candidates', description: 'Retrieve candidates', fields: [] },
    { id: 'list_jobs', label: 'List Jobs', description: 'Retrieve job postings', fields: [] }
  ]
};

export default function ExecuteActionModal({ 
  open, 
  onClose, 
  integration,
  onActionComplete
}) {
  const [selectedAction, setSelectedAction] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const availableActions = ACTION_CONFIGS[integration?.category] || [];

  const handleActionSelect = (actionId) => {
    const action = availableActions.find(a => a.id === actionId);
    setSelectedAction(action);
    setFormData({});
    setResult(null);
    setError(null);
  };

  const handleFieldChange = (fieldName, value, field) => {
    if (field.isArray) {
      if (fieldName === 'email_addresses') {
        setFormData(prev => ({
          ...prev,
          [fieldName]: value ? [{ email_address: value, email_address_type: 'WORK' }] : []
        }));
      } else if (fieldName === 'phone_numbers') {
        setFormData(prev => ({
          ...prev,
          [fieldName]: value ? [{ phone_number: value, phone_number_type: 'WORK' }] : []
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [fieldName]: value ? [value] : []
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [fieldName]: value }));
    }
  };

  const handleExecute = async () => {
    if (!selectedAction || !integration) return;
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await db.functions.invoke('mergeExecuteAction', {
        integration_id: integration.id,
        action_type: selectedAction.id,
        payload: selectedAction.fields.length > 0 ? formData : undefined
      });

      if (response.data.success) {
        setResult(response.data.data);
        toast.success('Action executed successfully!');
        onActionComplete?.(response.data);
      } else {
        throw new Error(response.data.error || 'Action failed');
      }
    } catch (err) {
      console.error('Error executing action:', err);
      const errorData = err.response?.data;
      const errorMessage = errorData?.message || errorData?.details?.detail || errorData?.error || err.message || 'Failed to execute action';
      setError(errorMessage);
      toast.error(typeof errorMessage === 'string' ? errorMessage : 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedAction(null);
    setFormData({});
    setResult(null);
    setError(null);
    onClose();
  };

  const renderField = (field) => {
    const value = formData[field.name] || '';
    
    if (field.type === 'textarea') {
      return (
        <Textarea
          value={value}
          onChange={(e) => handleFieldChange(field.name, e.target.value, field)}
          placeholder={field.label}
          className="bg-zinc-800/50 border-zinc-700 text-white focus:border-orange-500 min-h-[100px]"
        />
      );
    }
    
    if (field.type === 'select') {
      return (
        <Select value={value} onValueChange={(v) => handleFieldChange(field.name, v, field)}>
          <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white focus:border-orange-500">
            <SelectValue placeholder={`Select ${field.label}`} />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            {field.options?.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-zinc-700">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (field.type === 'checkbox') {
      return (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => handleFieldChange(field.name, e.target.checked, field)}
            className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-orange-500 focus:ring-orange-500"
          />
          <span className="text-sm text-zinc-300">{field.label}</span>
        </label>
      );
    }

    let displayValue = value;
    if (field.isArray && Array.isArray(value) && value.length > 0) {
      if (field.name === 'email_addresses') {
        displayValue = value[0]?.email_address || '';
      } else if (field.name === 'phone_numbers') {
        displayValue = value[0]?.phone_number || '';
      }
    }

    return (
      <Input
        type={field.type}
        value={displayValue}
        onChange={(e) => handleFieldChange(field.name, e.target.value, field)}
        placeholder={field.label}
        className="bg-zinc-800/50 border-zinc-700 text-white focus:border-orange-500 h-11"
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            {integration?.integration_name}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Select and execute an action through your connected integration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Action Selector */}
          {!selectedAction ? (
            <div className="grid grid-cols-1 gap-3">
              {availableActions.map((action, i) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleActionSelect(action.id)}
                  className="p-4 rounded-xl border border-zinc-700 bg-zinc-800/30 hover:bg-zinc-800/50 hover:border-orange-500/50 transition-all text-left group flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-medium text-white group-hover:text-orange-400 transition-colors">{action.label}</h4>
                    <p className="text-sm text-zinc-500">{action.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-orange-400 transition-colors" />
                </motion.button>
              ))}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <button
                  onClick={() => setSelectedAction(null)}
                  className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  ← Back to actions
                </button>

                <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <h4 className="font-medium text-white">{selectedAction.label}</h4>
                  <p className="text-sm text-zinc-400">{selectedAction.description}</p>
                </div>

                {selectedAction.fields.length > 0 && (
                  <div className="space-y-4">
                    {selectedAction.fields.map(field => (
                      <div key={field.name}>
                        <Label className="text-zinc-300 text-sm mb-2 block">
                          {field.label} {field.required && <span className="text-red-400">*</span>}
                        </Label>
                        {renderField(field)}
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  onClick={handleExecute}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold h-12"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Executing...</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" />Execute Action</>
                  )}
                </Button>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-red-500/10 border border-red-500/30"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-red-400 font-medium">Action Failed</h4>
                        <p className="text-sm text-red-300/80 mt-1">
                          {typeof error === 'object' ? JSON.stringify(error, null, 2) : error}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-green-500/10 border border-green-500/30"
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-green-400 font-medium">Success!</h4>
                        <div className="mt-2 p-3 bg-zinc-900/80 rounded-xl text-xs text-zinc-300 overflow-auto max-h-48 border border-zinc-800">
                          <pre className="whitespace-pre-wrap break-words font-mono">
                            {JSON.stringify(result, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}