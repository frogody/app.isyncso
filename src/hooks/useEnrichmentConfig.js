import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

export function useEnrichmentConfig() {
  const [config, setConfig] = useState({});
  const [configList, setConfigList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchConfig = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('enrichment_config')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      setError(error.message);
    } else if (data) {
      const configMap = {};
      data.forEach(item => {
        configMap[item.key] = item;
      });
      setConfig(configMap);
      setConfigList(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return { config, configList, loading, error, refetch: fetchConfig };
}
