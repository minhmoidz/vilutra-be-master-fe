import React from 'react';
import 'antd/dist/reset.css'; 
import { JobDashboard } from './components/jobs/JobDashboard';


const App: React.FC = () => {
  return (
      <JobDashboard />
  );
};

export default App;