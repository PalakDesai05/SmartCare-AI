import { X, Calendar, Clock, User, MapPin, CheckCircle, Star } from 'lucide-react';
import { useState } from 'react';
import type { Doctor } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { bookAppointment } from '../../firebase/firebaseDb';

interface BookingModalProps {
  doctor: Doctor;
  onClose: () => void;
  onConfirm: (tokenNumber: number) => void;
}

function getNextDates(n: number): { label: string; iso: string }[] {
  const result = [];
  for (let i = 1; i <= n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    result.push({
      label: d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }),
      iso:   d.toISOString().split('T')[0],
    });
  }
  return result;
}

const dates     = getNextDates(6);
const timeSlots = ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
                   '2:00 PM', '2:30 PM',  '3:00 PM',  '3:30 PM',  '4:00 PM',  '4:30 PM'];

export default function BookingModal({ doctor, onClose, onConfirm }: BookingModalProps) {
  const { user } = useAuth();

  const [selectedDate, setSelectedDate] = useState(dates[0].iso);
  const [selectedTime, setSelectedTime] = useState('');
  const [reason,       setReason]       = useState('');
  const [confirmed,    setConfirmed]    = useState(false);
  const [booking,      setBooking]      = useState(false);
  const [tokenNumber,  setTokenNumber]  = useState(0);
  const [error,        setError]        = useState('');

  const handleBook = async () => {
    if (!selectedTime || !user?.firebaseUid) return;
    setBooking(true);
    setError('');
    try {
      // Calculate token: count today's appointments for this doctor (best-effort)
      const token = Math.floor(Math.random() * 40) + 1; // fallback; ideally read from RTDB
      setTokenNumber(token);

      await bookAppointment(user.firebaseUid, {
        patientUid:  user.firebaseUid,
        patientName: user.name,
        doctorUid:   doctor.id,         // Firebase UID of the doctor
        doctorName:  doctor.name,
        date:        selectedDate,
        time:        selectedTime,
        type:        reason.trim() || 'General Consultation',
        status:      'scheduled',
        tokenNumber: token,
        createdAt:   Date.now(),
      });

      setConfirmed(true);
      onConfirm(token);
    } catch (e: any) {
      setError('Booking failed. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  const selectedLabel = dates.find(d => d.iso === selectedDate)?.label ?? selectedDate;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-soft w-full max-w-lg animate-slide-up overflow-hidden">
        {confirmed ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-teal-900 mb-2">Appointment Booked!</h3>
            <p className="text-gray-500 text-sm mb-4">
              Your appointment with <strong>{doctor.name}</strong> on{' '}
              <strong>{selectedLabel}</strong> at <strong>{selectedTime}</strong> is confirmed.
            </p>
            <div className="inline-flex flex-col items-center bg-teal-50 border border-teal-200 rounded-2xl px-8 py-5">
              <p className="text-xs text-teal-600 font-medium uppercase tracking-wider">Your Token</p>
              <p className="text-6xl font-black text-teal-700 mt-1">#{tokenNumber}</p>
              <p className="text-xs text-teal-500 mt-2">Check "My Queue" for live status</p>
            </div>
            <button
              onClick={onClose}
              className="mt-5 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-sm transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-teal-900 text-lg">Book Appointment</h3>
              <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Doctor info */}
              <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-xl">
                <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {doctor.name.replace('Dr. ', '').split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-teal-900">{doctor.name}</p>
                  <p className="text-teal-600 text-xs">{doctor.specialization}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-3 h-3 ${s <= Math.floor(doctor.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                    ))}
                    <span className="text-xs font-medium text-teal-800 ml-1">{doctor.rating}</span>
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-teal-900 font-bold text-lg">₹{doctor.fee}</p>
                  <p className="text-gray-400 text-xs">Consultation</p>
                </div>
              </div>

              {/* Date */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-600" />
                  <p className="text-sm font-semibold text-teal-900">Select Date</p>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {dates.map(d => (
                    <button key={d.iso} onClick={() => setSelectedDate(d.iso)}
                      className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        selectedDate === d.iso ? 'bg-teal-600 text-white shadow-glow' : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200'
                      }`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <Clock className="w-3.5 h-3.5 text-teal-600" />
                  <p className="text-sm font-semibold text-teal-900">Select Time</p>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map(time => (
                    <button key={time} onClick={() => setSelectedTime(time)}
                      className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                        selectedTime === time ? 'bg-teal-600 text-white shadow-glow' : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200'
                      }`}>
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-3.5 h-3.5 text-teal-600" />
                  <p className="text-sm font-semibold text-teal-900">Reason for Visit</p>
                </div>
                <textarea
                  value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="Briefly describe your symptoms or reason..."
                  className="w-full p-3 rounded-xl border border-teal-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none h-20 text-gray-700 placeholder-gray-400"
                />
              </div>

              {doctor.location && (
                <div className="flex items-center gap-2 text-xs text-gray-500 p-2 bg-gray-50 rounded-xl">
                  <MapPin className="w-3.5 h-3.5 text-teal-500" />
                  <span>{doctor.location}</span>
                </div>
              )}

              {error && (
                <p className="text-red-500 text-xs text-center">{error}</p>
              )}

              <button onClick={handleBook} disabled={!selectedTime || booking}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  selectedTime && !booking
                    ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-glow'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}>
                {booking
                  ? <><div className="w-4 h-4 border-2 border-gray-300 border-t-teal-600 rounded-full animate-spin" /> Saving…</>
                  : selectedTime
                  ? `Confirm Booking · ₹${doctor.fee}`
                  : 'Select a time slot'
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
