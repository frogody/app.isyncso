import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { learningTracker } from '@/components/learn/LearningTracker';
import { Clock, MessageSquare, Mic, CheckCircle } from 'lucide-react';

export function SessionRecap({ isOpen, onClose, lessonTitle }) {
  const stats = learningTracker.getSessionStats();

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return 'Less than 1 minute';
    if (minutes === 1) return '1 minute';
    return `${minutes} minutes`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Great Progress!
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            You've been working on "{lessonTitle}"
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <Clock className="w-5 h-5 text-purple-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-white">
                {formatDuration(stats.duration_ms)}
              </div>
              <div className="text-xs text-gray-500">Time Spent</div>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <MessageSquare className="w-5 h-5 text-blue-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-white">
                {stats.questions_asked}
              </div>
              <div className="text-xs text-gray-500">Questions</div>
            </div>
          </div>

          {stats.voice_interactions > 0 && (
            <div className="bg-yellow-500/10 rounded-lg p-3 flex items-center gap-3">
              <Mic className="w-5 h-5 text-yellow-400" />
              <div>
                <div className="text-white text-sm font-medium">
                  {stats.voice_interactions} voice interaction{stats.voice_interactions > 1 ? 's' : ''}
                </div>
                <div className="text-xs text-gray-400">
                  You're using the AI tutor like a pro!
                </div>
              </div>
            </div>
          )}

          <Button 
            onClick={onClose} 
            className="w-full bg-yellow-600 hover:bg-yellow-500 text-white"
          >
            Continue Learning
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}