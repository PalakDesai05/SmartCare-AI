import { useState, useEffect } from 'react';
import { Search, Star, MapPin, Clock, DollarSign, Filter, X, Calendar, CheckCircle } from 'lucide-react';
import { listenDoctors, type DbDoctor } from '../../firebase/firebaseDb';
import type { Doctor } from '../../types';

interface FindDoctorsProps {
  onBook: (doctor: Doctor) => void;
}

// Convert Firebase doctor to the Doctor type used by BookingModal
function toAppDoctor(d: DbDoctor): Doctor {
  return {
    id:             d.uid,
    name:           d.name || 'Doctor',
    specialization: d.specialization || 'General',
    rating:         Number(d.rating) || 4.5,
    reviews:        Number(d.reviews) || 0,
    available:      d.available ?? true,
    experience:     d.experience || 'N/A',
    image:          `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name || 'Dr')}&background=0d9488&color=fff&size=200`,
    nextSlot:       d.available ? 'Today' : 'Tomorrow',
    location:       d.location || 'Hospital',
    fee:            Number(d.fee) || 0,
  };
}

const SPECIALIZATIONS = ['All', 'Cardiologist', 'Neurologist', 'Pediatrician', 'Orthopedic Surgeon',
  'Dermatologist', 'General Physician', 'Psychiatrist', 'Gynecologist', 'Ophthalmologist'];

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden animate-pulse">
      <div className="h-28 bg-teal-100" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-8 bg-teal-50 rounded-xl w-full mt-2" />
      </div>
    </div>
  );
}

export default function FindDoctors({ onBook }: FindDoctorsProps) {
  const [doctors,          setDoctors]          = useState<DbDoctor[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [search,           setSearch]           = useState('');
  const [selectedSpec,     setSelectedSpec]     = useState('All');
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  // Real-time Firebase listener
  useEffect(() => {
    const unsub = listenDoctors(
      docs => { setDoctors(docs); setLoading(false); },
      ()   => setLoading(false),
    );
    return unsub;
  }, []);

  const filtered = doctors.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
                        d.specialization.toLowerCase().includes(search.toLowerCase());
    const matchSpec   = selectedSpec === 'All' || d.specialization === selectedSpec;
    const matchAvail  = !showAvailableOnly || d.available;
    return matchSearch && matchSpec && matchAvail;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500" />
          <input
            type="text"
            placeholder="Search doctors by name or specialization..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-3 rounded-xl border border-teal-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowAvailableOnly(!showAvailableOnly)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${showAvailableOnly ? 'bg-teal-600 text-white border-teal-600' : 'border-teal-200 text-teal-700 hover:bg-teal-50'}`}
        >
          <Filter className="w-4 h-4" /> Available Only
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {SPECIALIZATIONS.map(spec => (
          <button
            key={spec}
            onClick={() => setSelectedSpec(spec)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedSpec === spec ? 'bg-teal-600 text-white shadow-glow' : 'bg-white border border-teal-200 text-teal-700 hover:bg-teal-50'}`}
          >
            {spec}
          </button>
        ))}
      </div>

      {!loading && (
        <p className="text-sm text-gray-500">{filtered.length} doctor{filtered.length !== 1 ? 's' : ''} found</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : filtered.map(d => <DoctorCard key={d.uid} doctor={d} onBook={() => onBook(toAppDoctor(d))} />)
        }
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <Search className="w-10 h-10 text-teal-200 mx-auto mb-3" />
          <p className="text-teal-900 font-medium">No doctors found</p>
          <p className="text-gray-500 text-sm mt-1">
            {doctors.length === 0
              ? 'No doctors have been added yet. Ask your admin to add doctors.'
              : 'Try adjusting your search or filters'}
          </p>
        </div>
      )}
    </div>
  );
}

function DoctorCard({ doctor, onBook }: { doctor: DbDoctor; onBook: () => void }) {
  const safeName   = doctor.name || 'Doctor';
  const safeRating = Number(doctor.rating) || 4.5;
  const safeFee    = Number(doctor.fee) || 0;
  const initials   = safeName.replace('Dr. ', '').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-soft transition-all duration-300 group">
      <div className="relative h-28 bg-gradient-to-br from-teal-100 to-teal-200 overflow-hidden flex items-center justify-center">
        <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black group-hover:scale-110 transition-transform duration-500">
          {initials}
        </div>
        <div className="absolute top-3 right-3">
          <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${doctor.available ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}>
            {doctor.available ? 'Available' : 'Busy'}
          </span>
        </div>
      </div>
      <div className="p-4">
        <h4 className="font-bold text-teal-900 text-sm mb-0.5">{safeName}</h4>
        <p className="text-teal-600 text-xs font-medium mb-2">{doctor.specialization || 'General'}</p>
        <div className="flex items-center gap-1 mb-3">
          {[1,2,3,4,5].map(s => (
            <Star key={s} className={`w-3 h-3 ${s <= Math.floor(safeRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
          ))}
          <span className="text-xs font-semibold text-teal-900 ml-1">{safeRating.toFixed(1)}</span>
          <span className="text-xs text-gray-400">({Number(doctor.reviews) || 0})</span>
        </div>
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <MapPin className="w-3 h-3 text-teal-500 flex-shrink-0" />
            <span className="truncate">{doctor.location || 'Location TBD'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3 h-3 text-teal-500 flex-shrink-0" />
            <span>{doctor.experience} experience</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <CheckCircle className="w-3 h-3 text-teal-500 flex-shrink-0" />
            <span>{doctor.available ? 'Next: Today' : 'Next: Tomorrow'}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-gray-400" />
            <span className="text-sm font-bold text-teal-900">₹{safeFee}</span>
          </div>
          <button
            onClick={onBook}
            disabled={!doctor.available}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              doctor.available
                ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-glow hover:shadow-none'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            {doctor.available ? 'Book Now' : 'Unavailable'}
          </button>
        </div>
      </div>
    </div>
  );
}
