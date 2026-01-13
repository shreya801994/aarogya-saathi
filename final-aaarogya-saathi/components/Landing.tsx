import React, { useState } from 'react';
import { User, Stethoscope, ArrowRight, ShieldCheck } from 'lucide-react';
import { UserRole, Language } from '../types';
import { t } from '../translations';

interface LandingProps {
  onLogin: (role: UserRole, id: string) => void;
  language: Language;
}

export const Landing: React.FC<LandingProps> = ({ onLogin, language }) => {
  const [activeTab, setActiveTab] = useState<UserRole>(UserRole.PATIENT);
  const [identifier, setIdentifier] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (identifier.trim()) {
      onLogin(activeTab, identifier);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-gradient-to-b from-teal-50 to-slate-50 px-4 py-12">
      <div className="text-center mb-10 max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
          {t('login_title', language)}
        </h1>
        <p className="text-lg text-slate-600">
          {t('login_subtitle', language)}
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => { setActiveTab(UserRole.PATIENT); setIdentifier(''); }}
            className={`flex-1 py-4 text-center font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
              activeTab === UserRole.PATIENT
                ? 'bg-white text-teal-700 border-b-2 border-teal-600'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            <User className="w-4 h-4" />
            {t('i_am_patient', language)}
          </button>
          <button
            onClick={() => { setActiveTab(UserRole.DOCTOR); setIdentifier(''); }}
            className={`flex-1 py-4 text-center font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
              activeTab === UserRole.DOCTOR
                ? 'bg-white text-blue-700 border-b-2 border-blue-600'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            {t('i_am_doctor', language)}
          </button>
        </div>

        {/* Login Form */}
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className={`p-4 rounded-full ${activeTab === UserRole.PATIENT ? 'bg-teal-100 text-teal-600' : 'bg-blue-100 text-blue-600'}`}>
              {activeTab === UserRole.PATIENT ? <User className="w-8 h-8" /> : <Stethoscope className="w-8 h-8" />}
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {activeTab === UserRole.PATIENT ? t('enter_abha', language) : t('enter_doc_id', language)}
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={activeTab === UserRole.PATIENT ? "xx-xxxx-xxxx-xxxx" : "DOC-12345"}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>
            
            {activeTab === UserRole.DOCTOR && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('enter_password', language)}
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            )}

            <button
              type="submit"
              className={`w-full py-3 rounded-lg text-white font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 ${
                activeTab === UserRole.PATIENT ? 'bg-teal-600 hover:bg-teal-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {t('login_btn', language)} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {activeTab === UserRole.PATIENT && (
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400 bg-slate-50 p-2 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-teal-500" />
              ABHA Verified Secure Login
            </div>
          )}
        </div>
      </div>
    </div>
  );
};