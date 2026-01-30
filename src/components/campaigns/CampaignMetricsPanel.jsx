import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Users, MessageSquare, Calendar, TrendingUp, Plus, Minus,
  CheckCircle2, Euro
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { db } from "@/api/supabaseClient";
import { toast } from "sonner";

function MetricCard({ label, value, icon: Icon, color, onIncrement, onDecrement, editable = true }) {
  return (
    <div className={cn(
      "bg-zinc-800/50 rounded-xl p-4 border transition-all",
      editable ? "border-zinc-700 hover:border-zinc-600" : "border-zinc-800"
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-zinc-500 text-xs">
          <Icon className={cn("w-4 h-4", color)} />
          {label}
        </div>
        {editable && (
          <div className="flex items-center gap-1">
            <button
              onClick={onDecrement}
              className="w-6 h-6 rounded bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center transition-colors"
            >
              <Minus className="w-3 h-3 text-zinc-400" />
            </button>
            <button
              onClick={onIncrement}
              className="w-6 h-6 rounded bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center transition-colors"
            >
              <Plus className="w-3 h-3 text-zinc-400" />
            </button>
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

export default function CampaignMetricsPanel({ campaign, onUpdate }) {
  const [updating, setUpdating] = useState(false);

  const updateMetric = async (field, delta) => {
    const newValue = Math.max(0, (campaign[field] || 0) + delta);
    setUpdating(true);
    
    try {
      await db.entities.GrowthCampaign.update(campaign.id, { [field]: newValue });
      onUpdate({ ...campaign, [field]: newValue });
      toast.success('Metric updated');
    } catch (error) {
      toast.error('Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  const responseRate = campaign.contacted > 0 
    ? Math.round((campaign.responded / campaign.contacted) * 100) 
    : 0;
  const meetingRate = campaign.responded > 0 
    ? Math.round((campaign.meetings_booked / campaign.responded) * 100) 
    : 0;
  const progress = campaign.total_contacts > 0 
    ? Math.round((campaign.contacted / campaign.total_contacts) * 100) 
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-medium">Campaign Metrics</h3>
        <span className="text-xs text-zinc-500">{progress}% complete</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-red-500 to-red-600"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Contacted"
          value={campaign.contacted || 0}
          icon={Users}
          color="text-red-400"
          onIncrement={() => updateMetric('contacted', 1)}
          onDecrement={() => updateMetric('contacted', -1)}
        />
        <MetricCard
          label="Responded"
          value={campaign.responded || 0}
          icon={MessageSquare}
          color="text-red-400"
          onIncrement={() => updateMetric('responded', 1)}
          onDecrement={() => updateMetric('responded', -1)}
        />
        <MetricCard
          label="Meetings"
          value={campaign.meetings_booked || 0}
          icon={Calendar}
          color="text-red-400"
          onIncrement={() => updateMetric('meetings_booked', 1)}
          onDecrement={() => updateMetric('meetings_booked', -1)}
        />
        <MetricCard
          label="Deals Won"
          value={campaign.deals_won || 0}
          icon={CheckCircle2}
          color="text-red-400"
          onIncrement={() => updateMetric('deals_won', 1)}
          onDecrement={() => updateMetric('deals_won', -1)}
        />
      </div>

      {/* Rates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-800/30 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-1">Response Rate</p>
          <p className="text-xl font-bold text-white">{responseRate}%</p>
        </div>
        <div className="bg-zinc-800/30 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-1">Meeting Rate</p>
          <p className="text-xl font-bold text-white">{meetingRate}%</p>
        </div>
      </div>

      {/* Revenue */}
      <div className="bg-gradient-to-br from-red-500/10 to-red-500/10 rounded-xl p-4 border border-red-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-red-400/70 mb-1 flex items-center gap-1.5">
              <Euro className="w-3.5 h-3.5" />
              Revenue Attributed
            </p>
            <p className="text-2xl font-bold text-white">
              €{(campaign.revenue_attributed || 0).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              defaultValue={campaign.revenue_attributed || 0}
              onBlur={(e) => {
                const val = parseFloat(e.target.value) || 0;
                if (val !== campaign.revenue_attributed) {
                  db.entities.GrowthCampaign.update(campaign.id, { revenue_attributed: val })
                    .then(() => onUpdate({ ...campaign, revenue_attributed: val }));
                }
              }}
              className="w-28 bg-zinc-900/50 border-red-500/30 text-white text-right"
            />
          </div>
        </div>
      </div>
    </div>
  );
}