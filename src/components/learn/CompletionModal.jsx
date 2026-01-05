import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Award, Download, Share2, CheckCircle, X } from "lucide-react";

export default function CompletionModal({ 
  course, 
  completionData, 
  certificate,
  onClose, 
  onDashboard 
}) {
  const handleShare = () => {
    const text = `I just completed "${course.title}" and earned a certificate! 🎉`;
    const url = certificate ? `${window.location.origin}/verify/${certificate.verification_code}` : '';
    
    // LinkedIn share URL
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`;
    window.open(linkedInUrl, '_blank');
  };

  const handleVerify = () => {
    if (certificate) {
      window.open(`/verify/${certificate.verification_code}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full bg-gradient-to-br from-gray-900 to-black border-yellow-500/30 relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Celebration Background Effect */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl animate-pulse delay-150"></div>
        </div>

        <CardContent className="p-8 relative z-10">
          {/* Celebration Icon */}
          <div className="text-center mb-6">
            <div className="inline-block p-4 bg-gradient-to-br from-yellow-500/20 to-amber-500/20 rounded-full mb-4">
              <Trophy className="w-16 h-16 text-yellow-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">🎉 Congratulations!</h2>
            <p className="text-lg text-gray-300">You've completed</p>
            <h3 className="text-2xl font-bold text-yellow-400 mt-2">{course.title}</h3>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {completionData.score !== null && (
              <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="text-2xl font-bold text-green-400">{completionData.score}%</div>
                <div className="text-sm text-gray-400">Score</div>
              </div>
            )}
            {completionData.timeSpent && (
              <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="text-2xl font-bold text-blue-400">{completionData.timeSpent}h</div>
                <div className="text-sm text-gray-400">Time</div>
              </div>
            )}
            <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="text-2xl font-bold text-yellow-400">+{completionData.pointsEarned}</div>
              <div className="text-sm text-gray-400">Points</div>
            </div>
          </div>

          {/* Badges Earned */}
          {completionData.badgesEarned && completionData.badgesEarned.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-center gap-4 flex-wrap">
                {completionData.badgesEarned.map((badge, index) => (
                  <Badge 
                    key={index}
                    className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-sm px-3 py-1"
                  >
                    🏆 {badge.badge_name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Skills Improved */}
          {completionData.skillsImproved && completionData.skillsImproved.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-400 mb-3 text-center">Skills Improved</h4>
              <div className="space-y-3">
                {completionData.skillsImproved.map((skill, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{skill.skill_name}</span>
                      <span className="text-sm font-bold text-green-400">+{skill.new_score - skill.old_score}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                      <span>{skill.old_score}%</span>
                      <span>→</span>
                      <span className="text-white font-semibold">{skill.new_score}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${skill.new_score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certificate Section */}
          {certificate && (
            <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Award className="w-8 h-8 text-yellow-400" />
                <div>
                  <h4 className="text-lg font-semibold text-white">Certificate Earned</h4>
                  <p className="text-sm text-gray-400">Your achievement has been certified</p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Certificate #:</span>
                  <span className="text-white font-mono">{certificate.certificate_number}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Verification Code:</span>
                  <span className="text-white font-mono">{certificate.verification_code}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleShare}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share on LinkedIn
                </Button>
                <Button 
                  onClick={handleVerify}
                  variant="outline"
                  className="flex-1 border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verify
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Continue Learning
            </Button>
            <Button 
              onClick={onDashboard}
              className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white"
            >
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}