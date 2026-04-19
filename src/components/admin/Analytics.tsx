import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Star, Users, Award, Activity, BarChart2 } from 'lucide-react';
import { getAllDoctors, type DbDoctor } from '../../firebase/firebaseDb';

const COLORS = ['bg-teal-500', 'bg-teal-600', 'bg-green-500', 'bg-teal-700', 'bg-teal-500', 'bg-orange-400', 'bg-teal-300'];
const DAYS   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Analytics() {
  const [doctors, setDoctors] = useState<DbDoctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllDoctors()
      .then(d => { setDoctors(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Compute "weekly appointment data" from doctor queue sizes (approximation using review counts as proxy)
  const maxReviews = Math.max(...doctors.map(d => d.reviews), 1);

  // Specialization frequency for bar chart
  const specMap: Record<string, number> = {};
  doctors.forEach(d => { specMap[d.specialization] = (specMap[d.specialization] || 0) + 1; });
  const specEntries = Object.entries(specMap).slice(0, 7);
  const maxSpec     = Math.max(...specEntries.map(([, v]) => v), 1);

  const topDoctors = [...doctors].sort((a, b) => b.rating - a.rating).slice(0, 5);

  const kpiCards = [
    { label: 'Total Doctors',    value: String(doctors.length),                           change: 'Active',      up: true,  color: 'text-teal-700',   bg: 'bg-teal-50'   },
    { label: 'Avg. Rating',      value: doctors.length ? (doctors.reduce((s, d) => s + d.rating, 0) / doctors.length).toFixed(2) : '—', change: 'out of 5.0', up: true,  color: 'text-green-700',  bg: 'bg-green-50'  },
    { label: 'Avg. Fee',         value: doctors.length ? `₹${Math.round(doctors.reduce((s, d) => s + d.fee, 0) / doctors.length)}` : '—', change: 'per visit',   up: false, color: 'text-orange-700', bg: 'bg-orange-50' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpiCards.map(stat => (
          <div key={stat.label} className={`${stat.bg} rounded-2xl p-5`}>
            <p className="text-xs text-gray-500 font-medium mb-2">{stat.label}</p>
            {loading
              ? <div className="h-8 bg-white/60 animate-pulse rounded w-20 mb-2" />
              : <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>}
            <div className={`flex items-center gap-1 mt-1 ${stat.up ? 'text-green-600' : 'text-teal-600'}`}>
              {stat.up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span className="text-xs font-semibold">{stat.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Specialization breakdown bar chart */}
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-teal-600" />
              <h3 className="font-semibold text-teal-900">Doctors by Specialization</h3>
            </div>
            <span className="text-xs text-teal-600 font-medium bg-teal-50 px-2 py-1 rounded-lg border border-teal-200">
              Live
            </span>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : specEntries.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No doctors added yet</p>
          ) : (
            <div className="space-y-3">
              {specEntries.map(([spec, count], i) => (
                <div key={spec}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600 truncate flex-1 mr-2">{spec}</span>
                    <span className="text-xs font-bold text-teal-900">{count} doctor{count > 1 ? 's' : ''}</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${COLORS[i % COLORS.length]} transition-all duration-700`}
                      style={{ width: `${(count / maxSpec) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rating distribution */}
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              <h3 className="font-semibold text-teal-900">Review Volume by Doctor</h3>
            </div>
            <span className="text-xs text-gray-500">Top 7</span>
          </div>
          {loading ? (
            <div className="flex items-end gap-3 h-36">
              {[1,2,3,4,5,6,7].map(i => (
                <div key={i} className="flex-1 bg-gray-100 animate-pulse rounded-t-lg" style={{ height: `${i * 14}px` }} />
              ))}
            </div>
          ) : (
            <div className="flex items-end gap-2 h-36">
              {doctors.slice(0, 7).map((d, i) => (
                <div key={d.uid} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-gray-400">{d.reviews}</span>
                  <div className="w-full flex items-end" style={{ height: '100px' }}>
                    <div
                      className={`w-full rounded-t-lg ${COLORS[i]} hover:opacity-80 transition-all`}
                      style={{ height: `${Math.max((d.reviews / maxReviews) * 100, 2)}px` }}
                      title={d.name}
                    />
                  </div>
                  <span className="text-[8px] text-gray-400 text-center truncate w-full">
                    {d.name.replace('Dr. ', '')}
                  </span>
                </div>
              ))}
              {doctors.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-gray-300 text-sm">
                  No data
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Doctor performance table — real data */}
      <div className="bg-white rounded-2xl shadow-card p-5">
        <div className="flex items-center gap-2 mb-5">
          <Award className="w-4 h-4 text-teal-600" />
          <h3 className="font-semibold text-teal-900">Doctor Performance Ranking</h3>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : topDoctors.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6">No doctors yet. Add doctors to see rankings.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 pb-3 pr-4">Doctor</th>
                  <th className="text-left text-xs font-semibold text-gray-500 pb-3 px-4">Specialization</th>
                  <th className="text-center text-xs font-semibold text-gray-500 pb-3 px-4">Reviews</th>
                  <th className="text-center text-xs font-semibold text-gray-500 pb-3 px-4">Rating</th>
                  <th className="text-left text-xs font-semibold text-gray-500 pb-3 px-4">Rating Bar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topDoctors.map((doc, i) => (
                  <tr key={doc.uid} className="hover:bg-teal-50/50 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${
                          i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-teal-200 text-teal-700'
                        }`}>
                          {i + 1}
                        </div>
                        <span className="text-sm font-medium text-teal-900 whitespace-nowrap">{doc.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 truncate max-w-[120px]">{doc.specialization}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="w-3 h-3 text-teal-500" />
                        <span className="text-sm font-semibold text-teal-900">{doc.reviews}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm font-bold text-teal-900">{doc.rating.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-16">
                          <div
                            className={`h-full rounded-full ${doc.rating >= 4.5 ? 'bg-green-500' : doc.rating >= 4.0 ? 'bg-teal-500' : 'bg-orange-400'}`}
                            style={{ width: `${(doc.rating / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-teal-900 w-8">{doc.rating.toFixed(1)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-teal-600 bg-teal-50 border border-teal-200 rounded-xl p-3">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        All analytics are computed live from Firebase Realtime Database
      </div>
    </div>
  );
}
