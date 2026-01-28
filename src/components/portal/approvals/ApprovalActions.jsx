import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  MessageSquare,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/api/supabaseClient';

export default function ApprovalActions({ approval, clientId, onUpdate, settings }) {
  const [loading, setLoading] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedAction, setSelectedAction] = useState(null);

  const handleAction = async (status) => {
    if (status === 'rejected' || status === 'revision_requested') {
      setSelectedAction(status);
      setShowNotes(true);
      return;
    }

    await submitDecision(status);
  };

  const submitDecision = async (status) => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('portal_approvals')
        .update({
          status,
          decided_by_client_id: clientId,
          decided_at: new Date().toISOString(),
          decision_notes: notes || null,
          revision_count: status === 'revision_requested'
            ? (approval.revision_count || 0) + 1
            : approval.revision_count,
        })
        .eq('id', approval.id)
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from('portal_activity').insert({
        organization_id: approval.organization_id,
        project_id: approval.project_id,
        client_id: clientId,
        action_type: 'approval_decision',
        entity_type: 'approval',
        entity_id: approval.id,
        description: `${status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Requested revision for'}: ${approval.title}`,
        metadata: { status, notes: notes || null },
      });

      // Create notification for team
      await supabase.from('portal_notifications').insert({
        organization_id: approval.organization_id,
        recipient_type: 'team',
        notification_type: 'approval_decision',
        title: `Approval ${status}: ${approval.title}`,
        body: notes || undefined,
        project_id: approval.project_id,
        related_entity_type: 'approval',
        related_entity_id: approval.id,
      });

      if (onUpdate) onUpdate(data);

      setShowNotes(false);
      setNotes('');
      setSelectedAction(null);
    } catch (err) {
      console.error('Error updating approval:', err);
    } finally {
      setLoading(false);
    }
  };

  if (approval.status !== 'pending') {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        {approval.status === 'approved' && (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400">Approved</span>
          </>
        )}
        {approval.status === 'rejected' && (
          <>
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-red-400">Rejected</span>
          </>
        )}
        {approval.status === 'revision_requested' && (
          <>
            <AlertCircle className="w-4 h-4 text-purple-400" />
            <span className="text-purple-400">Revision Requested</span>
          </>
        )}
        {approval.decided_at && (
          <span className="text-zinc-600 ml-2">
            on {new Date(approval.decided_at).toLocaleDateString()}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!showNotes ? (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleAction('approved')}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Approve
          </button>

          <button
            onClick={() => handleAction('revision_requested')}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 font-medium rounded-xl transition-colors disabled:opacity-50 border border-purple-500/30"
          >
            <MessageSquare className="w-4 h-4" />
            Request Revision
          </button>

          <button
            onClick={() => handleAction('rejected')}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium rounded-xl transition-colors disabled:opacity-50 border border-red-500/20"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              {selectedAction === 'revision_requested'
                ? 'What changes are needed?'
                : 'Reason for rejection (optional)'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                selectedAction === 'revision_requested'
                  ? 'Please describe the changes you need...'
                  : 'Add a note about your decision...'
              }
              rows={4}
              className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => submitDecision(selectedAction)}
              disabled={loading || (selectedAction === 'revision_requested' && !notes.trim())}
              className={`flex items-center gap-2 px-5 py-2.5 font-medium rounded-xl transition-colors disabled:opacity-50 ${
                selectedAction === 'revision_requested'
                  ? 'bg-purple-500 hover:bg-purple-400 text-white'
                  : 'bg-red-500 hover:bg-red-400 text-white'
              }`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : selectedAction === 'revision_requested' ? (
                <>
                  <MessageSquare className="w-4 h-4" />
                  Submit Revision Request
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Confirm Rejection
                </>
              )}
            </button>

            <button
              onClick={() => {
                setShowNotes(false);
                setNotes('');
                setSelectedAction(null);
              }}
              disabled={loading}
              className="px-5 py-2.5 text-zinc-400 hover:text-white font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
