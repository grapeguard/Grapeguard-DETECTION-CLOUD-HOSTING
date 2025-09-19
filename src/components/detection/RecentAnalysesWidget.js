import React, { useEffect, useState } from 'react';
import AnalysisHistory from './AnalysisHistory';
import analysisSupabaseService from '../../services/AnalysisSupabaseService';
import { useAuth } from '../../context/AuthContext';

export default function RecentAnalysesWidget() {
  const { currentUser } = useAuth();
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [offset, setOffset] = useState(0);
  const LIMIT = 10;

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        if (!currentUser?.uid) {
          setAnalysisHistory([]);
          return;
        }
        const items = await analysisSupabaseService.listLiveHistory(currentUser.uid, LIMIT, offset);
        if (isMounted) setAnalysisHistory(items);
      } catch (e) {
        console.error('Failed to load recent analyses:', e);
      }
    })();
    return () => { isMounted = false; };
  }, [currentUser?.uid, offset]);

  return (
    <>
      <AnalysisHistory
        analysisHistory={analysisHistory}
        setAnalysisHistory={setAnalysisHistory}
        autoLoadFromCloud={false}
      />
      {analysisHistory.length >= LIMIT && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
          <button onClick={() => setOffset((prev) => prev + LIMIT)} style={{ padding: '0.5rem 1rem' }}>
            Show more
          </button>
        </div>
      )}
    </>
  );
}


