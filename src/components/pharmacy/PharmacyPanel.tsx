import { useState, useEffect } from 'react';
import {
  FileText, User, Calendar, Plus, CheckCircle, Clock,
  Search, Check, Send, Lock, RefreshCw, AlertCircle,
  Banknote, X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  listenPharmacyQueue,
  generateBill as dbGenerateBill,
  markBillReady as dbMarkBillReady,
  markBillCashPaid,
  type DbPrescription,
  type DbBill,
} from '../../firebase/firebaseDb';

export default function PharmacyPanel() {
  const { user } = useAuth();
  const pharmacyUid = user?.firebaseUid || '';

  const [prescriptions, setPrescriptions] = useState<DbPrescription[]>([]);
  const [bills,         setBills]         = useState<DbBill[]>([]);
  const [selectedRxId,  setSelectedRxId]  = useState<string | null>(null);
  const [search,        setSearch]        = useState('');
  const [loading,       setLoading]       = useState(true);
  const [rtdbError,     setRtdbError]     = useState(false);
  const [generating,    setGenerating]    = useState(false);
  const [cashPaying,    setCashPaying]    = useState(false);
  const [quantities,    setQuantities]    = useState<Record<string, number>>({});
  const [prices,        setPrices]        = useState<Record<string, number>>({});
  // availability checkboxes — true = in stock
  const [available,     setAvailable]     = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!pharmacyUid) return;
    const unsub = listenPharmacyQueue(
      pharmacyUid,
      rxs => { setPrescriptions(rxs); setLoading(false); setRtdbError(false); },
      _err => { setRtdbError(true);  setLoading(false); }
    );
    return unsub;
  }, [pharmacyUid]);

  const selectedRx   = prescriptions.find(r => r.id === selectedRxId);
  const selectedBill = selectedRx ? bills.find(b => b.prescriptionId === selectedRx.id) : null;

  const handleSelectRx = (rx: DbPrescription) => {
    setSelectedRxId(rx.id);
    const q: Record<string, number>  = {};
    const p: Record<string, number>  = {};
    const a: Record<string, boolean> = {};
    rx.medicines.forEach(m => {
      q[m] = 1;
      p[m] = Math.floor(Math.random() * 150) + 20;
      a[m] = true;   // all in-stock by default
    });
    setQuantities(q);
    setPrices(p);
    setAvailable(a);
  };

  const toggleAvailable = (med: string) =>
    setAvailable(prev => ({ ...prev, [med]: !prev[med] }));

  // Only count medicines the pharmacy has in stock
  const stockedMeds = selectedRx?.medicines.filter(m => available[m]) ?? [];

  const calculateTotal = () =>
    stockedMeds.reduce((acc, med) => acc + (quantities[med] || 0) * (prices[med] || 0), 0);

  const handleGenerate = async () => {
    if (!selectedRx) return;
    setGenerating(true);
    const items = stockedMeds.map(med => ({
      name:     med,
      quantity: quantities[med] || 0,
      price:    prices[med]    || 0,
      total:    (quantities[med] || 0) * (prices[med] || 0),
    }));
    const total = calculateTotal();
    try {
      const billId = await dbGenerateBill(
        selectedRx.patientUid,
        {
          prescriptionId: selectedRx.id,
          patientUid:     selectedRx.patientUid,
          patientName:    selectedRx.patientName,
          doctorName:     selectedRx.doctorName,
          items,
          total,
          createdAt:      Date.now(),
        },
        pharmacyUid
      );
      const newBill: DbBill = {
        id:             billId,
        prescriptionId: selectedRx.id,
        patientUid:     selectedRx.patientUid,
        patientName:    selectedRx.patientName,
        doctorName:     selectedRx.doctorName,
        items, total,
        status:         'generated',
        createdAt:      Date.now(),
      };
      setBills(prev => [...prev, newBill]);
      setPrescriptions(prev =>
        prev.map(p => p.id === selectedRx.id ? { ...p, billingStatus: 'billed' } : p)
      );
    } catch (e) {
      console.error('generateBill failed', e);
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkReady = async (rxId: string) => {
    if (!selectedRx) return;
    try {
      await dbMarkBillReady(selectedRx.patientUid, rxId, pharmacyUid);
      setPrescriptions(prev =>
        prev.map(p => p.id === rxId ? { ...p, billingStatus: 'ready' } : p)
      );
    } catch (e) {
      console.error('markBillReady failed', e);
    }
  };

  const handleCashPaid = async () => {
    if (!selectedRx || !selectedBill) return;
    setCashPaying(true);
    try {
      await markBillCashPaid(selectedRx.patientUid, selectedBill.id, selectedRx.id, pharmacyUid);
      setPrescriptions(prev =>
        prev.map(p => p.id === selectedRx.id ? { ...p, billingStatus: 'ready' } : p)
      );
    } catch (e) {
      console.error('cashPaid failed', e);
    } finally {
      setCashPaying(false);
    }
  };

  const filteredPrescriptions = prescriptions.filter(rx =>
    rx.patientName.toLowerCase().includes(search.toLowerCase()) ||
    rx.doctorName.toLowerCase().includes(search.toLowerCase())
  );

  if (rtdbError) {
    return (
      <div className="max-w-2xl mx-auto mt-8 animate-fade-in">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900 text-sm">Firebase Rules Not Configured</p>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              Go to <strong>Firebase Console → Realtime Database → Rules</strong> and paste:
            </p>
            <pre className="mt-2 text-[10px] bg-amber-100 rounded-lg p-3 text-amber-800 overflow-x-auto">{`{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}`}</pre>
            <p className="text-xs text-amber-700 mt-2">Then click <strong>Publish</strong> and reload the page.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const statusBadge = (status: DbPrescription['billingStatus']) => {
    const map: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
      pending:  { bg: 'bg-yellow-100 text-yellow-700', text: '', icon: <Clock className="w-3 h-3" />,        label: 'Pending' },
      billed:   { bg: 'bg-blue-100 text-blue-700',    text: '', icon: <Send className="w-3 h-3" />,          label: 'Billed'  },
      ready:    { bg: 'bg-green-100 text-green-700',  text: '', icon: <CheckCircle className="w-3 h-3" />,    label: 'Ready'   },
      paid:     { bg: 'bg-emerald-100 text-emerald-700', text: '', icon: <Banknote className="w-3 h-3" />,   label: 'Paid'    },
    };
    const cfg = map[status] ?? map.pending;
    return (
      <span className={`${cfg.bg} text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg flex items-center gap-1`}>
        {cfg.icon} {cfg.label}
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">

      {/* ── Left: Prescription Queue ── */}
      <div className="bg-white rounded-3xl shadow-card border border-teal-100 flex flex-col overflow-hidden animate-fade-in">
        <div className="p-5 border-b border-teal-100 bg-teal-50/50">
          <h2 className="text-lg font-bold text-teal-900 mb-1">Prescription Queue</h2>
          <p className="text-xs text-gray-500 mb-4">Live from Firebase • Patient-permitted only</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" placeholder="Search patients or doctors…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredPrescriptions.map(rx => (
            <button key={rx.id} onClick={() => handleSelectRx(rx)}
              className={`w-full text-left p-4 rounded-2xl transition-all duration-200 border ${
                selectedRxId === rx.id
                  ? 'bg-teal-600 border-teal-600 shadow-glow text-white'
                  : 'bg-white border-gray-100 hover:border-teal-300 hover:bg-teal-50 text-gray-800'
              }`}>
              <div className="flex justify-between items-start mb-2">
                <span className={`font-bold text-sm ${selectedRxId === rx.id ? 'text-white' : 'text-teal-900'}`}>
                  {rx.patientName}
                </span>
                {statusBadge(rx.billingStatus)}
              </div>
              <div className={`text-xs flex items-center gap-1.5 ${selectedRxId === rx.id ? 'text-teal-100' : 'text-gray-500'}`}>
                <User className="w-3 h-3" /> {rx.doctorName}
              </div>
              <div className={`text-xs mt-1 ${selectedRxId === rx.id ? 'text-teal-50' : 'text-gray-400'}`}>
                {rx.medicines.length} items • {rx.diagnosis}
              </div>
            </button>
          ))}

          {filteredPrescriptions.length === 0 && (
            <div className="p-6 text-center text-gray-400 text-sm">
              <Lock className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="font-medium">No accessible prescriptions</p>
              <p className="text-xs mt-1 leading-relaxed">
                Patients must grant pharmacy access from their Prescriptions page.
              </p>
            </div>
          )}
        </div>

        <div className="m-3 p-2.5 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-xs text-green-700">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
          Live sync via Firebase Realtime Database
        </div>
      </div>

      {/* ── Right: Details & Billing ── */}
      <div className="lg:col-span-2 bg-white rounded-3xl shadow-card border border-teal-100 flex flex-col overflow-hidden animate-fade-in">
        {selectedRx ? (
          <>
            <div className="p-6 border-b border-teal-100 bg-teal-50/30 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-teal-900 mb-1">
                  Prescription #{selectedRx.id.slice(-8).toUpperCase()}
                </h2>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><User className="w-4 h-4" /> {selectedRx.patientName}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />{new Date(selectedRx.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
                {selectedRx.diagnosis && (
                  <p className="text-xs text-teal-700 mt-1">Diagnosis: <strong>{selectedRx.diagnosis}</strong></p>
                )}
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-500">Prescribed by</span>
                <p className="font-semibold text-teal-700">{selectedRx.doctorName}</p>
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 justify-end mt-1">
                  <Check className="w-3 h-3" /> Patient Permitted
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {selectedRx.billingStatus === 'pending' ? (
                <div>
                  <h3 className="text-sm font-bold text-teal-900 uppercase tracking-wide mb-1 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-600" /> Generate Bill
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">Uncheck medicines that are not in stock — they will be excluded from the bill.</p>
                  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 font-medium w-10">In Stock</th>
                          <th className="px-4 py-3 font-medium">Medicine</th>
                          <th className="px-4 py-3 font-medium w-20">Qty</th>
                          <th className="px-4 py-3 font-medium w-24">Price (₹)</th>
                          <th className="px-4 py-3 font-medium text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedRx.medicines.map(med => {
                          const inStock = available[med] ?? true;
                          return (
                            <tr key={med} className={`text-sm transition-all ${inStock ? 'text-slate-700' : 'text-gray-300 bg-gray-50'}`}>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => toggleAvailable(med)}
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                    inStock ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-gray-300'
                                  }`}
                                >
                                  {inStock && <Check className="w-3 h-3" />}
                                </button>
                              </td>
                              <td className="px-4 py-3 font-medium">
                                {med}
                                {!inStock && <span className="ml-2 text-[10px] text-red-400 font-semibold">(Not Available)</span>}
                              </td>
                              <td className="px-4 py-3">
                                <input type="number" min="1" disabled={!inStock}
                                  value={quantities[med] || ''}
                                  onChange={e => setQuantities({ ...quantities, [med]: parseInt(e.target.value) || 0 })}
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed" />
                              </td>
                              <td className="px-4 py-3">
                                <input type="number" min="0" disabled={!inStock}
                                  value={prices[med] || ''}
                                  onChange={e => setPrices({ ...prices, [med]: parseFloat(e.target.value) || 0 })}
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed" />
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-teal-700">
                                {inStock ? `₹${((quantities[med] || 0) * (prices[med] || 0)).toFixed(2)}` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-teal-50">
                        <tr>
                          <td colSpan={4} className="px-4 py-4 text-right font-bold text-teal-900">
                            Total ({stockedMeds.length} of {selectedRx.medicines.length} items)
                          </td>
                          <td className="px-4 py-4 text-right font-bold text-teal-700 text-lg">₹{calculateTotal().toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-bold text-teal-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Check className="w-4 h-4 text-teal-600" /> Generated Bill
                  </h3>
                  {selectedBill && (
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-4">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3 font-medium">Medicine</th>
                            <th className="px-4 py-3 font-medium text-center">Qty</th>
                            <th className="px-4 py-3 font-medium text-right">Price</th>
                            <th className="px-4 py-3 font-medium text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedBill.items.map((item, idx) => (
                            <tr key={idx} className="text-sm text-slate-700">
                              <td className="px-4 py-3 font-medium">{item.name}</td>
                              <td className="px-4 py-3 text-center">{item.quantity}</td>
                              <td className="px-4 py-3 text-right">₹{item.price.toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-semibold text-teal-700">₹{item.total.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-teal-50 border-t border-teal-100">
                          <tr>
                            <td colSpan={3} className="px-4 py-4 text-right font-bold text-teal-900">Total</td>
                            <td className="px-4 py-4 text-right font-bold text-teal-700 text-lg">₹{selectedBill.total.toFixed(2)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* Status banners */}
                  {selectedRx.billingStatus === 'billed' && (
                    <div className="space-y-3">
                      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
                        <Send className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="text-sm font-bold text-blue-900">Awaiting Payment</p>
                          <p className="text-xs text-blue-700">Patient can pay via QR or at the counter. Mark as cash received below if patient pays in person.</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {(selectedRx.billingStatus === 'ready' || selectedRx.billingStatus === 'paid') && (
                    <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-sm font-bold text-green-900">Payment Confirmed — Medicines Ready</p>
                        <p className="text-xs text-green-700">Patient can collect their medicines now.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-teal-100 bg-gray-50 flex justify-end gap-3 flex-wrap">
              {selectedRx.billingStatus === 'pending' && (
                <button onClick={handleGenerate} disabled={generating || stockedMeds.length === 0}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-all shadow-glow flex items-center gap-2 disabled:opacity-70">
                  {generating
                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                    : <><Plus className="w-4 h-4" /> Generate Bill (₹{calculateTotal().toFixed(0)})</>}
                </button>
              )}
              {selectedRx.billingStatus === 'billed' && (
                <>
                  {/* Cash payment */}
                  <button onClick={handleCashPaid} disabled={cashPaying}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-70">
                    {cashPaying
                      ? <RefreshCw className="w-4 h-4 animate-spin" />
                      : <><Banknote className="w-4 h-4" /> Mark Cash Received</>}
                  </button>
                  {/* Ready for pickup */}
                  <button onClick={() => handleMarkReady(selectedRx.id)}
                    className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Mark as Ready
                  </button>
                </>
              )}
              {(selectedRx.billingStatus === 'ready' || selectedRx.billingStatus === 'paid') && (
                <button onClick={() => setSelectedRxId(null)}
                  className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 flex items-center gap-2">
                  <X className="w-4 h-4" /> Close
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-500 mb-1">No Prescription Selected</h3>
            <p className="text-sm">Select a prescription from the live queue to generate a bill.</p>
          </div>
        )}
      </div>
    </div>
  );
}
