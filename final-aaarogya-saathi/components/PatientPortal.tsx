import React, { useState, useRef } from 'react';
import { Send, Sparkles, Clock, CheckCircle, ChevronDown, ChevronUp, Mic, MicOff, Camera, Image as ImageIcon, Trash2, Bell, Video, Calendar, Pill, Syringe, AlertTriangle } from 'lucide-react';
import { Visit, VisitStatus, Language, Reminder, ReminderType, Alert } from '../types';
import { getSymptomAnalysis } from '../services/geminiService';
import { t } from '../translations';

interface PatientPortalProps {
  visits: Visit[];
  onAddVisit: (symptoms: string, aiAdvice: string, imageData?: string) => void;
  language: Language;
  patientId: string;
  reminders: Reminder[];
  onAddReminder: (reminder: Reminder) => void;
  alerts: Alert[];
}

export const PatientPortal: React.FC<PatientPortalProps> = ({ 
  visits, 
  onAddVisit, 
  language, 
  patientId, 
  reminders,
  onAddReminder,
  alerts
}) => {
  const [symptoms, setSymptoms] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Reminder State
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [newReminder, setNewReminder] = useState<Partial<Reminder>>({ type: ReminderType.MEDICATION });

  // Video State
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSymptoms((prev) => prev ? `${prev} ${transcript}` : transcript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event);
        setIsListening(false);
      };

      recognition.onend = () => setIsListening(false);

      recognition.start();
    } else {
      alert(t('listening_error', language));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim()) return;

    setIsAnalyzing(true);
    try {
      const advice = await getSymptomAnalysis(symptoms, language, selectedImage || undefined);
      onAddVisit(symptoms, advice, selectedImage || undefined);
      setSymptoms('');
      setSelectedImage(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedVisitId(expandedVisitId === id ? null : id);
  };

  const handleAddReminder = () => {
    if (newReminder.title && newReminder.time) {
      onAddReminder({
        id: Date.now().toString(),
        type: newReminder.type || ReminderType.MEDICATION,
        title: newReminder.title,
        time: newReminder.time
      });
      setNewReminder({ type: ReminderType.MEDICATION, title: '', time: '' });
      setShowReminderForm(false);
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
    <div className="max-w-6xl mx-auto py-8 px-4">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Consultation */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* New Visit Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-teal-500" />
                {t('new_consultation', language)}
              </h2>
              <button 
                onClick={startVideo}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Video className="w-4 h-4" />
                {t('start_video', language)}
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 md:p-8">
              <form onSubmit={handleSubmit}>
                <label className="block text-sm font-bold text-slate-700 mb-3">
                  {t('symptoms_label', language)}
                </label>
                
                <div className="relative mb-4">
                  <textarea
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder={t('symptoms_placeholder', language)}
                    className="w-full h-40 p-4 pr-12 rounded-xl border-2 border-slate-200 focus:bg-white focus:ring-4 focus:ring-teal-50 focus:border-teal-500 resize-none transition-all text-slate-900 placeholder:text-slate-400 text-lg"
                    disabled={isAnalyzing}
                  />
                  <button
                    type="button"
                    onClick={startListening}
                    className={`absolute right-3 bottom-3 p-3 rounded-full transition-colors shadow-sm ${
                      isListening 
                        ? 'bg-red-500 text-white animate-pulse' 
                        : 'bg-slate-100 text-slate-600 hover:bg-teal-100 hover:text-teal-700'
                    }`}
                    title="Use Voice Input"
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                </div>

                {/* Image Upload */}
                <div className="mb-6">
                  {!selectedImage ? (
                    <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-teal-400 transition-all">
                      <div className="flex flex-col items-center pt-2 pb-3">
                        <Camera className="w-6 h-6 text-slate-400 mb-1" />
                        <p className="text-sm text-slate-500 font-medium">{t('upload_photo', language)}</p>
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                  ) : (
                    <div className="relative inline-block">
                      <img src={selectedImage} alt="Preview" className="h-40 w-auto rounded-xl border border-slate-200 shadow-sm" />
                      <button
                        type="button"
                        onClick={() => setSelectedImage(null)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 shadow-md"
                        title={t('remove_image', language)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-500 italic">
                    {t('disclaimer', language)}
                  </p>
                  <button
                    type="submit"
                    disabled={(!symptoms.trim() && !selectedImage) || isAnalyzing}
                    className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white transition-all shadow-md hover:shadow-xl transform active:scale-95 ${
                      (!symptoms.trim() && !selectedImage) || isAnalyzing
                        ? 'bg-slate-300 cursor-not-allowed'
                        : 'bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800'
                    }`}
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {t('analyzing', language)}
                      </>
                    ) : (
                      <>
                        {t('get_solution', language)} <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* History Section */}
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="w-6 h-6 text-indigo-600" />
              {t('visit_history', language)}
            </h2>
            
            <div className="space-y-4">
              {visits.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-500 font-medium">{t('no_visits', language)}</p>
                </div>
              ) : (
                visits.map((visit) => (
                  <div 
                    key={visit.id} 
                    className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md group"
                  >
                    {/* Card Header */}
                    <div 
                      onClick={() => toggleExpand(visit.id)}
                      className="p-5 flex items-center justify-between cursor-pointer bg-white group-hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                            visit.status === VisitStatus.COMPLETED 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {visit.status === VisitStatus.COMPLETED ? t('reviewed', language) : t('pending_review', language)}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(visit.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          {visit.imageData && (
                            <ImageIcon className="w-5 h-5 text-slate-400" />
                          )}
                          <p className="text-slate-800 font-semibold truncate pr-4 text-lg">
                            {visit.symptoms}
                          </p>
                        </div>
                      </div>
                      <div className="ml-4 text-slate-400">
                        {expandedVisitId === visit.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {expandedVisitId === visit.id && (
                      <div className="px-6 pb-8 pt-2 border-t border-slate-100 bg-slate-50/50">
                        {visit.imageData && (
                           <div className="mt-4 mb-2">
                             <img src={visit.imageData} alt="Symptom" className="max-h-48 rounded-lg border border-slate-200" />
                           </div>
                        )}
                        <div className="grid md:grid-cols-2 gap-6 mt-4">
                          {/* AI Section */}
                          <div className="bg-teal-50/50 p-5 rounded-xl border border-teal-100">
                            <h4 className="text-sm font-bold text-teal-800 mb-3 flex items-center gap-2 uppercase tracking-wide">
                              <Sparkles className="w-4 h-4" />
                              {t('ai_solution', language)}
                            </h4>
                            <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                              {visit.aiAdvice}
                            </div>
                          </div>

                          {/* Doctor Section */}
                          <div className={`p-5 rounded-xl border ${
                            visit.status === VisitStatus.COMPLETED
                              ? 'bg-green-50/50 border-green-100'
                              : 'bg-white border-slate-200 border-dashed'
                          }`}>
                            <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 uppercase tracking-wide ${
                              visit.status === VisitStatus.COMPLETED ? 'text-green-800' : 'text-slate-400'
                            }`}>
                              {visit.status === VisitStatus.COMPLETED ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                <Clock className="w-4 h-4" />
                              )}
                              {t('doc_recommendation', language)}
                            </h4>
                            {visit.status === VisitStatus.COMPLETED ? (
                              <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                                {visit.doctorRecommendation}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-400 italic">
                                {t('waiting_doc', language)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Alerts & Reminders */}
        <div className="space-y-8">
          
          {/* Alerts Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
            <div className="bg-red-50 p-4 border-b border-red-100 flex items-center justify-between">
              <h3 className="font-bold text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {t('health_alerts', language)}
              </h3>
              <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-medium">Local</span>
            </div>
            <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">{t('no_alerts', language)}</p>
              ) : (
                alerts.map(alert => (
                  <div key={alert.id} className="bg-red-50/50 border border-red-100 p-3 rounded-lg">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-red-700 text-sm">{alert.disease}</span>
                      <span className="text-[10px] text-slate-400">{alert.date}</span>
                    </div>
                    <p className="text-xs text-slate-700">{alert.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Reminders Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Bell className="w-5 h-5 text-teal-600" />
                {t('reminders', language)}
              </h3>
              <button 
                onClick={() => setShowReminderForm(!showReminderForm)}
                className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-md font-medium hover:bg-teal-200 transition-colors"
              >
                + {t('add_reminder', language)}
              </button>
            </div>
            
            {showReminderForm && (
              <div className="p-4 bg-slate-50 border-b border-slate-100 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button onClick={() => setNewReminder({...newReminder, type: ReminderType.MEDICATION})} className={`flex-1 py-1.5 text-xs rounded-md border ${newReminder.type === ReminderType.MEDICATION ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-slate-200'}`}>{t('medication', language)}</button>
                    <button onClick={() => setNewReminder({...newReminder, type: ReminderType.VACCINE})} className={`flex-1 py-1.5 text-xs rounded-md border ${newReminder.type === ReminderType.VACCINE ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-white border-slate-200'}`}>{t('vaccine', language)}</button>
                    <button onClick={() => setNewReminder({...newReminder, type: ReminderType.APPOINTMENT})} className={`flex-1 py-1.5 text-xs rounded-md border ${newReminder.type === ReminderType.APPOINTMENT ? 'bg-green-100 border-green-300 text-green-800' : 'bg-white border-slate-200'}`}>{t('appointment', language)}</button>
                  </div>
                  <input
                    type="text"
                    placeholder={t('title_label', language)}
                    value={newReminder.title || ''}
                    onChange={e => setNewReminder({...newReminder, title: e.target.value})}
                    className="w-full px-3 py-2 text-sm rounded-md border border-slate-300"
                  />
                  <input
                    type="datetime-local"
                    value={newReminder.time || ''}
                    onChange={e => setNewReminder({...newReminder, time: e.target.value})}
                    className="w-full px-3 py-2 text-sm rounded-md border border-slate-300"
                  />
                  <button 
                    onClick={handleAddReminder}
                    className="w-full py-2 bg-teal-600 text-white text-sm rounded-md font-medium hover:bg-teal-700"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            <div className="p-4 space-y-3">
              {reminders.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">{t('no_reminders', language)}</p>
              ) : (
                reminders.map(reminder => (
                  <div key={reminder.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className={`p-2 rounded-full ${
                      reminder.type === ReminderType.MEDICATION ? 'bg-blue-100 text-blue-600' :
                      reminder.type === ReminderType.VACCINE ? 'bg-purple-100 text-purple-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {reminder.type === ReminderType.MEDICATION && <Pill className="w-4 h-4" />}
                      {reminder.type === ReminderType.VACCINE && <Syringe className="w-4 h-4" />}
                      {reminder.type === ReminderType.APPOINTMENT && <Calendar className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{reminder.title}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(reminder.time).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Video Modal */}
      {showVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl overflow-hidden w-full max-w-4xl mx-4 relative shadow-2xl">
            <div className="bg-slate-900 p-4 flex justify-between items-center">
              <div className="flex items-center gap-2 text-white">
                 <Video className="w-5 h-5 text-red-500 animate-pulse" />
                 <span className="font-medium">Live Consultation</span>
              </div>
              <button onClick={stopVideo} className="bg-red-600 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-red-700">
                {t('close_video', language)}
              </button>
            </div>
            <div className="aspect-video bg-slate-900 relative">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute bottom-4 right-4 w-32 h-24 bg-slate-800 rounded-lg border border-slate-600 overflow-hidden shadow-lg">
                 {/* Simulated remote stream placeholder */}
                 <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs text-center p-2">
                   Waiting for doctor...
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};