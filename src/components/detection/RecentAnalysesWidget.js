import React, { useEffect, useState } from 'react';
import AnalysisHistory from './AnalysisHistory';
import analysisSupabaseService from '../../services/AnalysisSupabaseService';
import { useAuth } from '../../context/AuthContext';

export default function RecentAnalysesWidget() {
  const { currentUser } = useAuth();
  const [analysisHistory, setAnalysisHistory] = useState([]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        if (!currentUser?.uid) {
          setAnalysisHistory([]);
          return;
        }
        const items = await analysisSupabaseService.listUserAnalyses(currentUser.uid, 10);
        if (isMounted) setAnalysisHistory(items);
      } catch (e) {
        console.error('Failed to load recent analyses:', e);
      }
    })();
    return () => { isMounted = false; };
  }, [currentUser?.uid]);

  return (
    <AnalysisHistory
      analysisHistory={analysisHistory}
      setAnalysisHistory={setAnalysisHistory}
    />
  );
}


