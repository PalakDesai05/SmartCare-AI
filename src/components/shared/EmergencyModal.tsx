import { X, Phone, AlertTriangle, MapPin, Clock } from 'lucide-react';
import { useState } from 'react';

interface EmergencyModalProps {
  onClose: () => void;
}

export default function EmergencyModal({ onClose }: EmergencyModalProps) {
  const [triggered, setTriggered] = useState(false);
  const [type, setType] = useState('');

  const emergencyTypes = [
    { id: 'cardiac', label: 'Cardiac Emergency', color: 'border-red-400 text-red-600 hover:bg-red-50' },
    { id: 'accident', label: 'Accident / Trauma', color: 'border-orange-400 text-orange-600 hover:bg-orange-50' },
    { id: 'respiratory', label: 'Breathing Difficulty', color: 'border-red-400 text-red-600 hover:bg-red-50' },
    { id: 'other', label: 'Other Emergency', color: 'border-yellow-400 text-yellow-700 hover:bg-yellow-50' },
  ];

  const handleTrigger = () => {
    if (!type) return;
    setTriggered(true);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-soft w-full max-w-sm animate-slide-up overflow-hidden">
        <div className="bg-red-500 p-5 text-white text-center">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-7 h-7 text-white animate-pulse" />
          </div>
          <h3 className="font-bold text-xl">Emergency Alert</h3>
          <p className="text-red-100 text-sm mt-1">Help is being dispatched immediately</p>
        </div>

        {!triggered ? (
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600 text-center font-medium">Select emergency type:</p>
            <div className="space-y-2">
              {emergencyTypes.map(et => (
                <button
                  key={et.id}
                  onClick={() => setType(et.id)}
                  className={`w-full py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all text-left ${type === et.id ? 'bg-red-50 border-red-400 text-red-600' : `border-gray-200 text-gray-700 ${et.color}`}`}
                >
                  {et.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleTrigger}
              disabled={!type}
              className={`w-full py-3.5 rounded-xl font-black text-base transition-all ${type ? 'bg-red-500 hover:bg-red-600 text-white shadow-sm animate-pulse-slow' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            >
              SEND EMERGENCY ALERT
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <Phone className="w-3.5 h-3.5" />
              <span>Or call: 108 / 1800-xxx-xxxx</span>
            </div>

            <button onClick={onClose} className="w-full text-gray-400 text-sm hover:text-gray-600 flex items-center justify-center gap-1.5 py-2">
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-7 h-7 text-green-500 animate-bounce" />
            </div>
            <h4 className="font-bold text-teal-900 text-lg mb-2">Alert Sent!</h4>
            <p className="text-gray-500 text-sm mb-4">Emergency team has been notified. Help is on the way.</p>
            <div className="space-y-2 mb-5">
              <div className="flex items-center gap-2 text-xs text-gray-500 justify-center">
                <MapPin className="w-3.5 h-3.5 text-teal-500" />
                <span>Location shared with emergency team</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 justify-center">
                <Clock className="w-3.5 h-3.5 text-teal-500" />
                <span>Estimated response: 3-5 minutes</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-sm transition-all"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
