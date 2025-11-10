import React, { useState, useEffect } from 'react';
import { JobDetailAntd } from './components/jobs/JobDetail';
import { JobListAntd } from './components/jobs/JobList';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'list' | 'detail'>('list');
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/job/')) {
        const jobId = hash.replace('#/job/', '');
        setSelectedJobId(jobId);
        setCurrentView('detail');
      } else {
        setCurrentView('list');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleBack = () => {
    window.location.hash = '#/';
    setCurrentView('list');
  };

  return (
    <>
      {currentView === 'list' ? (
        <JobListAntd />
      ) : (
        <JobDetailAntd jobId={selectedJobId} onBack={handleBack} />
      )}
    </>
  );
};

export default App;