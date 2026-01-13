import React from 'react';
import { Activity, User, Stethoscope, LogOut, Languages } from 'lucide-react';
import { UserRole, Language } from '../types';
import { t } from '../translations';

interface HeaderProps {
  role: UserRole;
  onLogout: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const Header: React.FC<HeaderProps> = ({ role, onLogout, language, setLanguage }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-teal-600 p-2 rounded-lg shadow-md">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-800 tracking-tight">
            {language === 'hi' ? 'आरोग्य' : 'Aarogya'}
            <span className="text-teal-600"> {language === 'hi' ? 'साथी' : 'Saathi'}</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Language Toggle */}
          <button 
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-200 text-sm font-medium"
          >
            <Languages className="w-4 h-4" />
            {language === 'en' ? 'हिंदी' : 'English'}
          </button>

          {role !== UserRole.NONE && (
            <div className="flex items-center gap-4 border-l border-slate-200 pl-4">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
                {role === UserRole.PATIENT ? (
                  <User className="w-4 h-4 text-slate-500" />
                ) : (
                  <Stethoscope className="w-4 h-4 text-slate-500" />
                )}
                <span className="text-sm font-medium text-slate-600 capitalize">
                  {role === UserRole.PATIENT ? t('patient_portal', language) : t('doctor_portal', language)}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{t('logout', language)}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};