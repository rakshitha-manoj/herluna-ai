import React, { useState } from 'react';
import { useLuna } from '../LunaContext';
import { motion, AnimatePresence } from 'motion/react';
import { Settings as SettingsIcon, Moon, Shield, Download, FileText, Heart, Trash2, ChevronRight, User, Mail, Activity, Database, LogIn, LogOut, X } from 'lucide-react';

export const Settings: React.FC = () => {
  const { profile, setProfile, logs, user, login, logout, resetAllData } = useLuna();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const ageGroups = ['13-18', '19-25', '26-35', '36-45', '46+'];
  const activityLevels = ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active'];

  const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-luna-cream rounded-3xl p-8 shadow-2xl overflow-hidden"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-serif">{title}</h3>
              <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4 text-sm leading-relaxed opacity-80">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="space-y-6 pb-24 bg-luna-cream min-h-screen">
      <header className="px-4 pt-8 flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-4xl font-serif text-luna-purple">Settings</h1>
          {user && (
            <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-luna-purple/40">
              Logged in as <span className="text-luna-purple">{user.email}</span>
            </p>
          )}
          {!user && <p className="opacity-50 text-sm">Manage your profile and data</p>}
        </div>
        <button 
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-rose-100 transition-colors border border-rose-100 shadow-sm"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </header>

      {user && (
        <section className="px-4">
          <div className="luna-card bg-luna-purple/5 border-luna-purple/10">
            <div className="flex items-center gap-4">
              <img src={user.photoURL || ''} alt="" className="w-12 h-12 rounded-full border-2 border-luna-purple/20" />
              <div>
                <h3 className="font-bold">{user.displayName}</h3>
                <p className="text-xs opacity-50">{user.email}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="px-4">
        <div className="luna-card space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-luna-purple/10 flex items-center justify-center">
              <User className="w-6 h-6 text-luna-purple" />
            </div>
            <div>
              <h3 className="text-xl font-serif">Personal Profile</h3>
              <p className="text-xs opacity-40">Your basic information</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 ml-1">Name</label>
              <div className="flex items-center gap-3 bg-black/5 p-4 rounded-2xl">
                <User className="w-4 h-4 opacity-30" />
                <input 
                  type="text" 
                  value={profile?.name || ''} 
                  onChange={e => profile && setProfile({...profile, name: e.target.value})}
                  className="bg-transparent border-none p-0 text-sm w-full focus:ring-0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 ml-1">Email</label>
              <div className="flex items-center gap-3 bg-black/5 p-4 rounded-2xl">
                <Mail className="w-4 h-4 opacity-30" />
                <input 
                  type="email" 
                  value={profile?.email || ''} 
                  onChange={e => profile && setProfile({...profile, email: e.target.value})}
                  className="bg-transparent border-none p-0 text-sm w-full focus:ring-0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 ml-1">Age Group</label>
                <select 
                  value={profile?.ageGroup || ''}
                  onChange={e => profile && setProfile({...profile, ageGroup: e.target.value as any})}
                  className="w-full bg-black/5 border-none rounded-2xl p-4 text-sm focus:ring-0"
                >
                  {ageGroups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 ml-1">Activity</label>
                <select 
                  value={profile?.activityLevel || ''}
                  onChange={e => profile && setProfile({...profile, activityLevel: e.target.value as any})}
                  className="w-full bg-black/5 border-none rounded-2xl p-4 text-sm focus:ring-0"
                >
                  {activityLevels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between bg-black/5 p-4 rounded-2xl">
              <div>
                <h4 className="text-sm font-bold">Irregular Periods</h4>
                <p className="text-[10px] opacity-50">Toggle if your cycle is unpredictable</p>
              </div>
              <button 
                onClick={() => profile && setProfile({...profile, isIrregular: !profile.isIrregular})}
                className={`w-12 h-6 rounded-full transition-all relative ${profile?.isIrregular ? 'bg-luna-purple' : 'bg-black/10'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${profile?.isIrregular ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4">
        <div className="luna-card space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <Database className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-serif">Storage & Privacy</h3>
                <p className="text-xs opacity-40">Current mode: {profile?.storageMode}</p>
              </div>
            </div>
            <button 
              onClick={() => profile && setProfile({...profile, storageMode: profile.storageMode === 'Local' ? 'Cloud' : 'Local'})}
              className="px-3 py-1 bg-black/5 rounded-full text-[10px] font-bold uppercase tracking-widest"
            >
              Switch
            </button>
          </div>
          
          <div className="bg-black/5 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="opacity-60">Storage Mode</span>
              <span className="font-bold uppercase tracking-widest text-[10px]">{profile?.storageMode}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="opacity-60">Encryption</span>
              <span className="text-emerald-600 font-bold uppercase tracking-widest text-[10px]">Active</span>
            </div>
          </div>

          <p className="text-xs italic opacity-40 leading-relaxed">
            {profile?.storageMode === 'Local' 
              ? "Your data stays strictly on this device. No cloud sync is active."
              : "Your data is end-to-end encrypted and synced to our secure cloud."}
          </p>
        </div>
      </section>

      <section className="px-4 space-y-3">
        {[
          { icon: <Download className="w-5 h-5" />, label: "Export Data (JSON)", onClick: () => {
            const data = { profile, logs };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'luna-wellness-data.json';
            a.click();
          }},
          { icon: <FileText className="w-5 h-5" />, label: "Privacy & Ethics Policy", onClick: () => setShowPrivacy(true) },
          { icon: <Heart className="w-5 h-5" />, label: "Support HerLuna", onClick: () => setShowSupport(true) },
          { icon: <Trash2 className="w-5 h-5 text-rose-500" />, label: "Reset All Data", danger: true, onClick: () => setShowResetConfirm(true) },
        ].map((item, i) => (
          <button 
            key={i} 
            onClick={item.onClick}
            className="luna-card w-full flex items-center justify-between py-5 hover:bg-black/5 transition-colors"
          >
            <div className={`flex items-center gap-4 ${item.danger ? 'text-rose-500' : ''}`}>
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </div>
            <ChevronRight className="w-5 h-5 opacity-20" />
          </button>
        ))}
      </section>

      <Modal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} title="Privacy & Ethics">
        <p>At HerLuna, we believe your health data is your most private asset. Our ethics policy is built on three pillars:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Data Sovereignty:</strong> You choose where your data lives. Local mode ensures zero server-side storage.</li>
          <li><strong>No Surveillance:</strong> We do not sell, share, or monetize your cycle data with third parties or advertisers.</li>
          <li><strong>Encryption:</strong> Cloud storage uses end-to-end encryption, meaning even we cannot read your logs.</li>
        </ul>
        <p className="pt-4 italic">Your trust is our foundation.</p>
      </Modal>

      <Modal isOpen={showSupport} onClose={() => setShowSupport(false)} title="Support HerLuna">
        <p>HerLuna is an independent project dedicated to women's health autonomy.</p>
        <p>You can support us by:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Sharing the app with friends and family.</li>
          <li>Providing feedback on features you'd like to see.</li>
          <li>Contributing to our open-source community (coming soon).</li>
        </ul>
        <div className="pt-4 p-4 bg-luna-purple/5 rounded-2xl text-center">
          <p className="font-bold text-luna-purple">Thank you for being part of our journey!</p>
        </div>
      </Modal>

      <Modal isOpen={showResetConfirm} onClose={() => setShowResetConfirm(false)} title="Reset All Data">
        <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 mb-4">
          <p className="text-rose-600 font-bold">Warning: This action is permanent.</p>
        </div>
        <p>This will delete all your local logs, profile settings, and travel plans. If you are in Cloud mode, your remote data will also be inaccessible from this device.</p>
        <div className="flex gap-4 pt-6">
          <button 
            onClick={() => setShowResetConfirm(false)}
            className="flex-1 py-3 bg-black/5 rounded-2xl font-bold"
          >
            Cancel
          </button>
          <button 
            onClick={resetAllData}
            className="flex-1 py-3 bg-rose-500 text-white rounded-2xl font-bold"
          >
            Delete Everything
          </button>
        </div>
      </Modal>

      <div className="px-4 py-8 text-center space-y-4">
        <p className="text-[10px] uppercase tracking-widest font-bold opacity-30">Our Ethos</p>
        <p className="text-sm italic opacity-40 leading-relaxed max-w-xs mx-auto">
          We believe in your right to pattern understanding without surveillance. Your device is the ultimate source of truth.
        </p>
      </div>
    </div>
  );
};
