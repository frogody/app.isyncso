import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { clearOutreachAndTasks } from "@/api/functions";

export default function SettingsPage() {
  const [_user, setUser] = useState(null);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await User.me();
      setUser(userData);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const handleClearData = async () => {
    if (!confirm("Weet je zeker dat je ALLE outreach berichten en tasks wilt verwijderen? Dit kan niet ongedaan worden gemaakt!")) {
      return;
    }

    setIsClearing(true);
    try {
      const response = await clearOutreachAndTasks();
      
      if (response.data?.success) {
        alert(`Succesvol verwijderd:\n- ${response.data.deleted_messages} outreach berichten\n- ${response.data.deleted_tasks} tasks`);
      } else {
        throw new Error("Failed to clear data");
      }
    } catch (error) {
      console.error("Error clearing data:", error);
      alert("Fout bij verwijderen data: " + error.message);
    }
    setIsClearing(false);
  };

  return (
    <div className="min-h-screen p-4 md:p-6" style={{background: 'var(--bg)'}}>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold" style={{color: 'var(--txt)'}}>
          Instellingen
        </h1>

        {/* Danger Zone */}
        <Card className="glass-card border-red-500/20">
          <CardHeader>
            <CardTitle className="text-red-400">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label style={{color: 'var(--txt)'}}>Verwijder alle Outreach & Tasks</Label>
              <p className="text-sm mb-3" style={{color: 'var(--muted)'}}>
                Dit verwijdert ALLE outreach berichten en tasks van je organisatie. Dit kan niet ongedaan worden gemaakt!
              </p>
              <Button
                onClick={handleClearData}
                disabled={isClearing}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isClearing ? 'Bezig met verwijderen...' : 'Verwijder Alle Data'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}