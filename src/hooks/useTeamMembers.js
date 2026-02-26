import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';

export const PRESET_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
  '#14B8A6', '#6366F1', '#84CC16', '#E11D48',
];

export const DEFAULT_COLOR = '#3B82F6';

export default function useTeamMembers() {
  const { user } = useUser();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.company_id) {
      setLoading(false);
      return;
    }

    const fetchMembers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, email, avatar_url, user_color, job_title')
          .eq('company_id', user.company_id)
          .limit(100);

        if (error) throw error;
        setMembers(data || []);
      } catch (err) {
        console.error('[useTeamMembers] fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [user?.company_id]);

  const memberMap = useMemo(() => {
    const map = {};
    members.forEach((m) => {
      map[m.id] = m;
    });
    // Ensure current user is in the map
    if (user && !map[user.id]) {
      map[user.id] = {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        avatar_url: user.avatar_url,
        user_color: user.user_color || DEFAULT_COLOR,
        job_title: user.job_title,
      };
    }
    return map;
  }, [members, user]);

  const getMemberName = useCallback(
    (id) => {
      if (!id) return 'Unassigned';
      if (id === user?.id) return 'You';
      const m = memberMap[id];
      return m?.full_name || m?.email || id.slice(0, 8);
    },
    [memberMap, user?.id]
  );

  const getMember = useCallback(
    (id) => {
      if (!id) return null;
      return memberMap[id] || null;
    },
    [memberMap]
  );

  return { members, memberMap, getMemberName, getMember, loading };
}
