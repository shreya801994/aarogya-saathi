import React, { useState, useRef } from 'react';
import { CheckSquare, MessageSquare, User, Clock, Send, CheckCircle2, AlertTriangle, Video, Megaphone } from 'lucide-react';
import { Visit, VisitStatus, Language, Alert } from '../types';
import { t } from '../translations';

interface DoctorPortalProps {
  visits: Visit[];
  onCompleteVisit: (id: string, recommendation: string) => void;
  language: Language;
  onBroadcastAlert: (disease: string, message: string, severity: 'high'|'medium'|'low') => void;
}

export const DoctorPortal: React.FC<DoctorPortalProps> = ({ visits, onCompleteVisit, language, onBroadcastAlert }) => {
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState('');
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [alertData, setAlertData] = useState({ disease: '', message: '', severity: 'medium' as const });

  // Video State
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const pendingVisits = visits.filter(v => v.status === VisitStatus.PENDING);
  const completedVisits = visits.filter(v => v.status === VisitStatus.COMPLETED);
  
  const selectedVisit = visits.find(v => v.id === selectedVisitId);

  const handleSendRecommendation = () => {
    if (selectedVisitId && recommendation.trim()) {
      onCompleteVisit(selectedVisitId, recommendation);
      setRecommendation('');
      setSelectedVisitId(null);
    }
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (alertData.disease && alertData.message) {
      onBroadcastAlert(alertData.disease, alertData.message, alertData.severity);
      setAlertData({ disease: '', message: '', severity: 'medium' });
      setShowAlertForm(false);
      alert(t('alert_sent', language));
    }
  };

  const startVideo = async () => {
    setShowVideo(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert(t('camera_permission', language));
      setShowVideo(false);
    }
  };

  const stopVideo = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setShowVideo(false);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 h-[calc(100vh-4rem)] flex flex-col md:flex-row gap-6">
      
      {/* Left Sidebar: Patient Queue */}
      <div className="w-full md:w-1/3 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <User className="w-5 h-5 text-slate-500" />
            {t('patient_queue', language)}
          </h2>
          <button onClick={() => setShowAlertForm(true)} className="text-red-600 hover:bg-red-50 p-2 rounded-full" title={t('broadcast_alert', language)}>
            <Megaphone className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
           {pendingVisits.length === 0 && completedVisits.length === 0 && (
             <div className="text-center py-8 text-slate-400 text-sm">{t('no_cases', language)}</div>
           )}

           {pendingVisits.length > 0 && (
             <div className="mb-4">
               <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2 mt-2">{t('pending_review', language)}</h3>
               {pendingVisits.map(visit => (
                 <button
                   key={visit.id}
                   onClick={() => setSelectedVisitId(visit.id)}
                   className={`w-full text-left p-3 rounded-xl transition-all border ${
                     selectedVisitId === visit.id
                       ? 'bg-blue-50 border-blue-200 shadow-sm'
                       : 'hover:bg-slate-50 border-transparent hover:border-slate-100'
                   }`}
                 >
                   <div className="flex justify-between items-start mb-1">
                     <span className="font-semibold text-slate-800 text-sm">{visit.patientName}</span>
                     <span className="text-xs text-slate-400">{new Date(visit.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                   </div>
                   <p className="text-xs text-slate-600 line-clamp-2">{visit.symptoms}</p>
                 </button>
               ))}
             </div>
           )}

          {completedVisits.length > 0 && (
             <div>
               <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2 mt-4">{t('completed', language)}</h3>
               {completedVisits.map(visit => (
                 <button
                   key={visit.id}
                   onClick={() => setSelectedVisitId(visit.id)}
                   className={`w-full text-left p-3 rounded-xl transition-all border ${
                     selectedVisitId === visit.id
                       ? 'bg-slate-100 border-slate-200'
                       : 'hover:bg-slate-50 border-transparent opacity-60 hover:opacity-100'
                   }`}
                 >
                   <div className="flex justify-between items-start mb-1">
                     <span className="font-medium text-slate-700 text-sm">{visit.patientName}</span>
                     <CheckCircle2 className="w-3 h-3 text-green-500" />
                   </div>
                   <p className="text-xs text-slate-500 line-clamp-1">{visit.symptoms}</p>
                 </button>
               ))}
             </div>
           )}
        </div>
      </div>

      {/* Right Area: Detailed View */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
        {selectedVisit ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{selectedVisit.patientName}</h2>
                <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  Visited {new Date(selectedVisit.timestamp).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={startVideo} className="bg-indigo-100 text-indigo-700 p-2 rounded-full hover:bg-indigo-200 transition-colors">
                   <Video className="w-5 h-5" />
                </button>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedVisit.status === VisitStatus.PENDING 
                    ? 'bg-amber-100 text-amber-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {selectedVisit.status === VisitStatus.PENDING ? t('pending_review', language) : t('reviewed', language)}
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Symptoms & Image */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  {t('reported_symptoms', language)}
                </h3>
                <div className="flex flex-col gap-4">
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-slate-800 leading-relaxed">
                    {selectedVisit.symptoms}
                  </div>
                  {selectedVisit.imageData && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden max-w-md">
                      <img src={selectedVisit.imageData} alt="Patient Upload" className="w-full h-auto" />
                    </div>
                  )}
                </div>
              </div>

              {/* AI Analysis */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  {t('ai_solution', language)}
                </h3>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedVisit.aiAdvice}
                </div>
              </div>

              {/* Recommendation Form / View */}
              <div className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-teal-600" />
                  {t('doc_recommendation', language)}
                </h3>
                
                {selectedVisit.status === VisitStatus.COMPLETED ? (
                  <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-slate-800 whitespace-pre-wrap">
                     {selectedVisit.doctorRecommendation}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <textarea
                      value={recommendation}
                      onChange={(e) => setRecommendation(e.target.value)}
                      placeholder={t('write_advice', language)}
                      className="w-full h-40 p-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleSendRecommendation}
                        disabled={!recommendation.trim()}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-white transition-colors ${
                          !recommendation.trim() 
                            ? 'bg-slate-300 cursor-not-allowed' 
                            : 'bg-teal-600 hover:bg-teal-700'
                        }`}
                      >
                        <Send className="w-4 h-4" />
                        {t('send_to_patient', language)}
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <div className="bg-slate-50 p-6 rounded-full mb-4">
              <User className="w-12 h-12 text-slate-300" />
            </div>
            <p className="text-lg font-medium">{t('select_patient', language)}</p>
            <p className="text-sm opacity-75">Choose from the pending list on the left</p>
          </div>
        )}
      </div>

      {/* Broadcast Alert Modal */}
      {showAlertForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-red-700 mb-4 flex items-center gap-2">
              <Megaphone className="w-5 h-5" />
              {t('broadcast_alert', language)}
            </h3>
            <form onSubmit={handleBroadcast} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('disease_type', language)}</label>
                <select 
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  value={alertData.disease}
                  onChange={e => setAlertData({...alertData, disease: e.target.value})}
                  required
                >
                  <option value="">Select...</option>
                  <option value="Dengue">Dengue</option>
                  <option value="Malaria">Malaria</option>
                  <option value="Viral Fever">Viral Fever</option>
                  <option value="COVID-19">COVID-19</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('severity', language)}</label>
                <select 
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  value={alertData.severity}
                  onChange={e => setAlertData({...alertData, severity: e.target.value as any})}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('message_label', language)}</label>
                <textarea 
                  className="w-full p-2 border border-slate-300 rounded-lg h-24 resize-none"
                  value={alertData.message}
                  onChange={e => setAlertData({...alertData, message: e.target.value})}
                  placeholder="Area-wide warning for..."
                  required
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowAlertForm(false)} className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">{t('logout', language) === "लॉग आउट" ? "रद्द करें" : "Cancel"}</button>
                <button type="submit" className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Broadcast</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video Modal */}
      {showVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl overflow-hidden w-full max-w-4xl mx-4 relative shadow-2xl">
            <div className="bg-slate-900 p-4 flex justify-between items-center">
              <div className="flex items-center gap-2 text-white">
                 <Video className="w-5 h-5 text-teal-500 animate-pulse" />
                 <span className="font-medium">Doctor's Console</span>
              </div>
              <button onClick={stopVideo} className="bg-red-600 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-red-700">
                {t('close_video', language)}
              </button>
            </div>
            <div className="aspect-video bg-slate-900 relative">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute bottom-4 right-4 w-32 h-24 bg-slate-800 rounded-lg border border-slate-600 overflow-hidden shadow-lg">
                 <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs text-center p-2">
                   Patient Feed
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};