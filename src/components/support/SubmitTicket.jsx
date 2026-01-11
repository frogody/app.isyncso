import React, { useState } from "react";
import { 
  ArrowLeft, 
  Upload, 
  X, 
  Loader2,
  CheckCircle,
  MessageSquarePlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { db } from "@/api/supabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function SubmitTicket({ onBack }) {
  const [formData, setFormData] = useState({
    title: "",
    category: "general",
    description: ""
  });
  const [file, setFile] = useState(null);
  const queryClient = useQueryClient();

  const createTicketMutation = useMutation({
    mutationFn: async (data) => {
      // If there's a file, upload it first (mock implementation as integration requires more setup)
      let attachments = [];
      if (file) {
        // In a real app, upload file here
        // const { file_url } = await db.integrations.Core.UploadFile({ file });
        // attachments.push(file_url);
      }
      
      const user = await db.auth.me();
      return db.entities.SupportTicket.create({
        ...data,
        attachments,
        user_id: user.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['recentTickets']);
      onBack();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createTicketMutation.mutate(formData);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Button 
        variant="ghost" 
        onClick={onBack}
        className="text-gray-400 hover:text-white pl-0 gap-2"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Support
      </Button>

      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <MessageSquarePlus className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Submit a Support Ticket</h1>
          <p className="text-gray-400">We'll get back to you as soon as possible</p>
        </div>
      </div>

      <Card className="glass-card border-0 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Title *</label>
            <Input 
              required
              placeholder="Brief summary of your issue"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="bg-gray-800/50 border-gray-700"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Category</label>
            <Select 
              value={formData.category} 
              onValueChange={(val) => setFormData({...formData, category: val})}
            >
              <SelectTrigger className="bg-gray-800/50 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="general">General Inquiry</SelectItem>
                <SelectItem value="technical">Technical Issue</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
                <SelectItem value="feature_request">Feature Request</SelectItem>
                <SelectItem value="content">Content Issue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Description *</label>
            <Textarea 
              required
              placeholder="Please describe your issue in detail..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="bg-gray-800/50 border-gray-700 h-32"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Attachments</label>
            <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors text-center cursor-pointer relative">
              <input 
                type="file" 
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => setFile(e.target.files[0])}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-cyan-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <Upload className="w-8 h-8 mb-1" />
                  <span className="text-sm">Click to upload or drag and drop</span>
                  <span className="text-xs text-gray-500">SVG, PNG, JPG or GIF (max. 800x400px)</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onBack} className="border-gray-700 text-gray-300 hover:text-white hover:bg-white/5">
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-red-500 hover:bg-red-600 text-white border-0"
              disabled={createTicketMutation.isPending}
            >
              {createTicketMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Ticket"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}