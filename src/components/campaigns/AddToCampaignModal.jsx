
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter, // Added for the main action button
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
// Campaign and User entities are no longer directly used for data fetching within this component,
// as campaigns and user data are now passed as props.
// The parent component is responsible for providing these.
// import { Campaign } from "@/api/entities";
// import { User } from "@/api/entities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Loader2, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
// The generateOutreachMessage function will now be dynamically imported as per the changes.
// import { generateOutreachMessage } from "@/api/functions";

export default function AddToCampaignModal({ open, onClose, candidate, campaigns = [], onAdd, user }) {
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Removed internal state for campaigns, loading, saving, and user as they are now props or derived.
  // Removed useEffect for loading campaigns.

  const handleAdd = async () => {
    if (!selectedCampaignId) {
      alert(user?.language === 'nl' ? 'Selecteer eerst een campaign' : 'Please select a campaign first');
      return;
    }

    // Check if the candidate is already in the selected campaign before proceeding
    const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);
    if (selectedCampaign) {
      const alreadyExists = selectedCampaign.matched_candidates?.some(c => c.candidate_id === candidate.id);
      if (alreadyExists) {
        alert(user?.language === 'nl' 
          ? 'Kandidaat zit al in deze campaign'
          : 'Candidate is already in this campaign');
        return; // Do not proceed if already exists
      }
    }

    setIsAdding(true);
    try {
      // Import the generateOutreachMessage function dynamically
      const { generateOutreachMessage } = await import('@/api/functions');
      
      // Generate outreach message
      console.log('Generating outreach message for candidate and selected campaign...');
      let outreachMessage = null;
      try {
        const messageResponse = await generateOutreachMessage({
          candidate: candidate,
          campaign_id: selectedCampaignId
        });
        
        if (messageResponse && messageResponse.data?.message) { // Changed to messageResponse.data?.message
          outreachMessage = messageResponse.data.message;
          console.log('Outreach message generated successfully');
        }
      } catch (error) {
        console.error('Failed to generate outreach message:', error);
        // Continue even if message generation fails, as per original logic.
      }

      // Add candidate to campaign with generated message
      await onAdd(selectedCampaignId, outreachMessage);
      onClose(); // Close the modal after successful addition
    } catch (error) {
      console.error('Error adding candidate to campaign:', error);
      alert(user?.language === 'nl' 
        ? 'Fout bij toevoegen aan campaign' 
        : 'Error adding to campaign');
    } finally {
      setIsAdding(false);
    }
  };

  // Removed handleAddToCampaign function as it's replaced by handleAdd and parent's onAdd.

  const getStatusColor = (status) => {
    const colors = {
      draft: "bg-gray-500/10 border-gray-500/30 text-gray-400",
      analyzing: "bg-purple-500/10 border-purple-500/30 text-purple-400",
      active: "bg-green-500/10 border-green-500/30 text-green-400",
      paused: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
    };
    return colors[status] || colors.draft;
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: user?.language === 'nl' ? 'Concept' : 'Draft',
      analyzing: user?.language === 'nl' ? 'Analyseren' : 'Analyzing',
      active: user?.language === 'nl' ? 'Actief' : 'Active',
      paused: user?.language === 'nl' ? 'Gepauzeerd' : 'Paused'
    };
    return labels[status] || status;
  };

  // Safety check for campaigns
  const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl max-h-[80vh] border-0"
        style={{
          background: 'rgba(12,16,20,0.98)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: '16px'
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2" style={{color: 'var(--txt)'}}>
            <Megaphone className="w-5 h-5" />
            {user?.language === 'nl' ? 'Toevoegen aan Campaign' : 'Add to Campaign'}
          </DialogTitle>
          <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
            {user?.language === 'nl'
              ? `Voeg ${candidate.first_name} ${candidate.last_name} toe aan een bestaande campaign`
              : `Add ${candidate.first_name} ${candidate.last_name} to an existing campaign`}
          </p>
        </DialogHeader>

        {safeCampaigns.length === 0 ? (
          <div className="text-center py-12">
            <Megaphone className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--muted)' }} />
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {user?.language === 'nl'
                ? 'Geen actieve campaigns gevonden'
                : 'No active campaigns found'}
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-3 pr-4">
                {safeCampaigns.map((campaign) => {
                  const isAlreadyAdded = campaign.matched_candidates?.some(c => c.candidate_id === candidate.id);
                  const isSelected = selectedCampaignId === campaign.id;

                  return (
                    <Card 
                      key={campaign.id} 
                      className={`glass-card cursor-pointer ${isAlreadyAdded ? 'opacity-50 pointer-events-none' : ''} ${isSelected ? 'border border-accent' : ''}`}
                      onClick={() => !isAlreadyAdded && setSelectedCampaignId(campaign.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1" style={{ color: 'var(--txt)' }}>
                              {campaign.name}
                            </h3>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={`${getStatusColor(campaign.status)} px-2 py-0.5 text-xs`}>
                                {getStatusLabel(campaign.status)}
                              </Badge>
                              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                                {campaign.matched_candidates?.length || 0} {user?.language === 'nl' ? 'kandidaten' : 'candidates'}
                              </span>
                            </div>
                            {campaign.description && (
                              <p className="text-sm line-clamp-2" style={{ color: 'var(--muted)' }}>
                                {campaign.description}
                              </p>
                            )}
                          </div>
                          {isAlreadyAdded && (
                            <div className="flex items-center gap-2 text-sm text-green-500 ml-4">
                              <CheckCircle2 className="w-4 h-4" />
                              {user?.language === 'nl' ? 'Toegevoegd' : 'Added'}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
            <DialogFooter className="mt-4">
              <Button 
                onClick={handleAdd}
                disabled={isAdding || !selectedCampaignId}
                className="btn-primary w-full"
              >
                {isAdding ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Megaphone className="w-4 h-4 mr-2" />
                )}
                {isAdding 
                  ? (user?.language === 'nl' ? 'Bezig met toevoegen...' : 'Adding...')
                  : (user?.language === 'nl' ? 'Toevoegen aan Campaign' : 'Add to Campaign')
                }
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
