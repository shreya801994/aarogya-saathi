import React, { useState } from 'react';
import { Header } from './components/Header';
import { Landing } from './components/Landing';
import { PatientPortal } from './components/PatientPortal';
import { DoctorPortal } from './components/DoctorPortal';
import { Visit, VisitStatus, UserRole, Language, Reminder, Alert } from './types';

const App: React.FC = () => {
  // Application State
  const [userRole, setUserRole] = useState<UserRole>(UserRole.NONE);
  const [language, setLanguage] = useState<Language>('en');
  const [userId, setUserId] = useState<string>(''); // Store ABHA or Doctor ID
  
  // Mock Database State
  const [visits, setVisits] = useState<Visit[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const handleLogin = (role: UserRole, id: string) => {
    setUserRole(role);
    setUserId(id);
  };

  const handleAddVisit = (symptoms: string, aiAdvice: string, imageData?: string) => {
    const newVisit: Visit = {
      id: Date.now().toString(),
      patientName: userId || 'Anonymous Patient', // Use ABHA ID
      symptoms,
      imageData,
      aiAdvice,
      status: VisitStatus.PENDING,
      timestamp: Date.now(),
    };
    // Prepend so newest is first
    setVisits([newVisit, ...visits]);
  };

  const handleCompleteVisit = (id: string, recommendation: string) => {
    setVisits(visits.map(visit => 
      visit.id === id 
        ? { ...visit, status: VisitStatus.COMPLETED, doctorRecommendation: recommendation } 
        : visit
    ));
  };

  const handleAddReminder = (reminder: Reminder) => {
    setReminders([reminder, ...reminders]);
  };

  const handleBroadcastAlert = (disease: string, message: string, severity: 'high'|'medium'|'low') => {
    const newAlert: Alert = {
      id: Date.now().toString(),
      disease,
      message,
      severity,
      date: new Date().toLocaleDateString()
    };
    setAlerts([newAlert, ...alerts]);
  };

  const handleLogout = () => {
    setUserRole(UserRole.NONE);
    setUserId('');
  };

  // Render content based on current role
  const renderContent = () => {
    switch (userRole) {
      case UserRole.PATIENT:
        return (
          <PatientPortal 
            visits={visits.filter(v => v.patientName === userId)} // Only show own visits
            onAddVisit={handleAddVisit} 
            language={language}
            patientId={userId}
            reminders={reminders}
            onAddReminder={handleAddReminder}
            alerts={alerts}
          />
        );
      case UserRole.DOCTOR:
        return (
          <DoctorPortal 
            visits={visits} // Doctor sees all
            onCompleteVisit={handleCompleteVisit} 
            language={language}
            onBroadcastAlert={handleBroadcastAlert}
          />
        );
      default:
        return <Landing onLogin={handleLogin} language={language} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <Header 
        role={userRole} 
        onLogout={handleLogout} 
        language={language}
        setLanguage={setLanguage}
      />
      <main className="flex-1">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;