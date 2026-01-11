import React, { useState } from "react";
import { 
  ArrowLeft, 
  Lightbulb, 
  ThumbsUp, 
  Filter,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { db } from "@/api/supabaseClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export default function FeatureList({ onBack }) {
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [newFeature, setNewFeature] = useState({ title: "", description: "" });
  
  const queryClient = useQueryClient();

  const { data: features, isLoading } = useQuery({
    queryKey: ['features'],
    queryFn: () => db.entities.FeatureRequest.list(),
    initialData: []
  });

  const createFeatureMutation = useMutation({
    mutationFn: async (data) => {
      const user = await db.auth.me();
      return db.entities.FeatureRequest.create({
        ...data,
        votes: [user.id], // Auto vote for own feature
        user_id: user.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['features']);
      setIsRequestOpen(false);
      setNewFeature({ title: "", description: "" });
    }
  });

  const voteMutation = useMutation({
    mutationFn: async (feature) => {
      const user = await db.auth.me();
      const currentVotes = feature.votes || [];
      const newVotes = currentVotes.includes(user.id) 
        ? currentVotes.filter(id => id !== user.id)
        : [...currentVotes, user.id];
      
      return db.entities.FeatureRequest.update(feature.id, { votes: newVotes });
    },
    onSuccess: () => queryClient.invalidateQueries(['features'])
  });

  const sortedFeatures = [...features].sort((a, b) => {
    // Sort by vote count descending
    return (b.votes?.length || 0) - (a.votes?.length || 0);
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="text-gray-400 hover:text-white pl-0 gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Support
        </Button>

        <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-500 hover:bg-amber-600 text-black border-0 font-medium">
              <Plus className="w-4 h-4 mr-2" /> Request Feature
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0A0A0A] border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle>Request a New Feature</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Feature Title</label>
                <Input 
                  value={newFeature.title}
                  onChange={(e) => setNewFeature({...newFeature, title: e.target.value})}
                  placeholder="e.g., Dark Mode for PDF Exports"
                  className="bg-gray-800/50 border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Description</label>
                <Textarea 
                  value={newFeature.description}
                  onChange={(e) => setNewFeature({...newFeature, description: e.target.value})}
                  placeholder="Describe the feature and why it would be useful..."
                  className="bg-gray-800/50 border-gray-700 h-32"
                />
              </div>
              <Button 
                onClick={() => createFeatureMutation.mutate(newFeature)}
                disabled={!newFeature.title || !newFeature.description || createFeatureMutation.isPending}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black"
              >
                Submit Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Lightbulb className="w-5 h-5 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Feature Requests</h1>
        </div>

        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[140px] bg-gray-900 border-gray-700 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="most_voted">
            <SelectTrigger className="w-[140px] bg-gray-900 border-gray-700 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="most_voted">Most Voted</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {sortedFeatures.length > 0 ? (
        <div className="grid gap-4">
          {sortedFeatures.map((feature) => (
            <Card key={feature.id} className="glass-card border-0 p-6 flex gap-6 group hover:border-gray-700 transition-colors">
               <div className="flex flex-col items-center gap-1 min-w-[60px]">
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   onClick={() => voteMutation.mutate(feature)}
                   className="h-auto p-2 hover:bg-amber-500/10 hover:text-amber-400 text-gray-400"
                 >
                   <ThumbsUp className="w-5 h-5" />
                 </Button>
                 <span className="text-lg font-bold text-white">{feature.votes?.length || 0}</span>
               </div>
               <div className="flex-1">
                 <div className="flex items-start justify-between mb-2">
                   <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                   <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-medium
                      ${feature.status === 'completed' ? 'text-green-400 border-green-500/30 bg-green-500/10' : 
                        feature.status === 'planned' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' :
                        'text-gray-400 border-gray-500/30 bg-gray-500/10'}
                   `}>
                      {feature.status.replace('_', ' ')}
                   </span>
                 </div>
                 <p className="text-gray-400 text-sm">{feature.description}</p>
               </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="glass-card border-0 p-12 text-center min-h-[400px] flex flex-col items-center justify-center">
          <Lightbulb className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No feature requests found</h3>
          <p className="text-gray-500 mb-6">Be the first to request a feature</p>
          <Button 
            onClick={() => setIsRequestOpen(true)}
            className="bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Request Feature
          </Button>
        </Card>
      )}
    </div>
  );
}