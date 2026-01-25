import React, { useState, useEffect } from "react";
import { db } from "@/api/supabaseClient";
import { SkillsMaster, SkillApplication } from "@/api/entities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Flame,
  AlertTriangle,
  Clock
} from "lucide-react";

export default function SkillsOverview() {
  const [skills, setSkills] = useState([]);
  const [filteredSkills, setFilteredSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('proficiency');

  useEffect(() => {
    loadSkills();
  }, []);

  useEffect(() => {
    filterAndSortSkills();
  }, [skills, searchTerm, sortBy]);

  const loadSkills = async () => {
    try {
      const user = await db.auth.me();
      
      // Get skill applications
      const applications = await SkillApplication.filter({
        user_id: user.id
      });
      
      // Group by skill and calculate stats
      const skillStats = {};
      
      for (const app of applications) {
        if (!skillStats[app.skill_id]) {
          skillStats[app.skill_id] = {
            skill_id: app.skill_id,
            applications: [],
            last_used: app.application_timestamp,
            total_count: 0
          };
        }
        
        skillStats[app.skill_id].applications.push(app);
        skillStats[app.skill_id].total_count++;
        
        if (new Date(app.application_timestamp) > new Date(skillStats[app.skill_id].last_used)) {
          skillStats[app.skill_id].last_used = app.application_timestamp;
        }
      }
      
      // Enrich with skill details and calculate proficiency
      const enriched = [];
      for (const [skillId, stats] of Object.entries(skillStats)) {
        try {
          const skill = await SkillsMaster.get(skillId);
          const avgConfidence = stats.applications.reduce((sum, a) => sum + (a.confidence_score || 0), 0) / stats.applications.length;
          
          const daysSinceLastUse = Math.floor(
            (Date.now() - new Date(stats.last_used)) / (1000 * 60 * 60 * 24)
          );
          
          // Determine trajectory based on recent applications
          const recentApps = stats.applications.slice(-5);
          const recentConfidences = recentApps.map(a => a.confidence_score || 0);
          const trend = recentConfidences.length >= 2
            ? recentConfidences[recentConfidences.length - 1] - recentConfidences[0]
            : 0;
          
          let trajectory = 'stable';
          if (trend > 0.1) trajectory = 'improving';
          else if (trend < -0.1) trajectory = 'declining';
          if (daysSinceLastUse > 30) trajectory = 'unused';
          
          enriched.push({
            skill_id: skillId,
            skill_name: skill?.skill_name || 'Unknown Skill',
            skill_category: skill?.skill_category || 'general',
            current_proficiency: avgConfidence,
            total_applications: stats.total_count,
            last_used: stats.last_used,
            days_since_last_use: daysSinceLastUse,
            trajectory: trajectory,
            proficiency_indicators: stats.applications[stats.applications.length - 1]?.proficiency_indicators || {}
          });
        } catch (err) {
          console.error(`Error loading skill ${skillId}:`, err);
        }
      }
      
      setSkills(enriched);
    } catch (err) {
      console.error("Error loading skills:", err);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortSkills = () => {
    let filtered = [...skills];

    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.skill_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortBy === 'proficiency') {
      filtered.sort((a, b) => b.current_proficiency - a.current_proficiency);
    } else if (sortBy === 'recent') {
      filtered.sort((a, b) => 
        new Date(b.last_used) - new Date(a.last_used)
      );
    } else if (sortBy === 'needs_practice') {
      filtered.sort((a, b) => b.days_since_last_use - a.days_since_last_use);
    }

    setFilteredSkills(filtered);
  };

  const getTrajectoryIcon = (trajectory) => {
    if (trajectory === 'improving') return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    if (trajectory === 'declining') return <TrendingDown className="w-4 h-4 text-red-400" />;
    if (trajectory === 'unused') return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrajectoryColor = (trajectory) => {
    if (trajectory === 'improving') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (trajectory === 'declining') return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (trajectory === 'unused') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black px-4 lg:px-6 py-4">
        <div className="max-w-7xl mx-auto space-y-4">
          <Skeleton className="h-12 w-64 bg-gray-800" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array(6).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-48 bg-gray-800" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-4 lg:px-6 py-4 space-y-4">
      <div className="max-w-7xl mx-auto">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Your Skills</h1>
          <p className="text-gray-400">Track your skill proficiency and progress</p>
        </div>

        {/* Filters */}
        <Card className="glass-card border-0 p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search skills..."
                className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('proficiency')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'proficiency'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-800'
                }`}
              >
                Most Proficient
              </button>
              <button
                onClick={() => setSortBy('recent')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'recent'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-800'
                }`}
              >
                Recently Used
              </button>
              <button
                onClick={() => setSortBy('needs_practice')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'needs_practice'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-800'
                }`}
              >
                Needs Practice
              </button>
            </div>
          </div>
        </Card>

        {/* Skills Grid */}
        {filteredSkills.length === 0 ? (
          <Card className="glass-card border-0 p-8">
            <div className="text-center">
              <Brain className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">
                No Skills Tracked Yet
              </h3>
              <p className="text-gray-400 text-sm">
                Start using the LearningTracker app to track your skills automatically
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredSkills.map((skill) => (
              <Card key={skill.skill_id} className="glass-card border-0 hover-glow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-white mb-1">
                        {skill.skill_name}
                      </h3>
                      <p className="text-xs text-gray-400 capitalize">
                        {skill.skill_category}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {getTrajectoryIcon(skill.trajectory)}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-gray-400">Proficiency</span>
                        <span className="text-white font-medium">
                          {Math.round(skill.current_proficiency * 100)}%
                        </span>
                      </div>
                      <Progress
                        value={skill.current_proficiency * 100}
                        className="h-2"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-gray-400">
                        <Flame className="w-3 h-3" />
                        <span>{skill.total_applications} uses</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{skill.days_since_last_use}d ago</span>
                      </div>
                    </div>

                    <Badge className={getTrajectoryColor(skill.trajectory)}>
                      {skill.trajectory === 'improving' && 'Improving'}
                      {skill.trajectory === 'declining' && 'Declining'}
                      {skill.trajectory === 'unused' && 'Needs Practice'}
                      {skill.trajectory === 'stable' && 'Stable'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}