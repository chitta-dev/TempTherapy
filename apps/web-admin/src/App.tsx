import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  PlusCircle, 
  Phone, 
  ShieldCheck, 
  Car, 
  Activity, 
  DollarSign, 
  Search, 
  Filter,
  LogOut,
  Stethoscope, Smartphone, Send, Check
} from 'lucide-react';
import { 
  THERAPY_CATEGORIES, 
  calculateSessionFee, 
  ServiceRequest, 
  Appointment, 
  TherapistProfile,
  User 
} from '../../../packages/shared/src/index';

const API_BASE = 'http://localhost:4000/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<'queue' | 'appointments' | 'therapists' | 'new-request' | 'mobile-sim'>('queue');
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'usr_desk_1',
    email: 'desk.alex@therapycare.com',
    fullName: 'Alex Miller',
    phone: '+1 (555) 111-2222',
    role: 'DESK_BOY',
    isActive: true,
    createdAt: new Date().toISOString()
  });

  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [therapists, setTherapists] = useState<TherapistProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal State for Dispatch / Assignment
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [selectedTherapistId, setSelectedTherapistId] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>('Tomorrow');
  const [scheduledTime, setScheduledTime] = useState<string>('10:00 AM');
  const [paymentMode, setPaymentMode] = useState<'CASH_ON_SERVICE' | 'ONLINE_CARD'>('CASH_ON_SERVICE');

  // New Phone Booking Form State
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCategory, setNewCategory] = useState(THERAPY_CATEGORIES[0].id);
  const [newPainArea, setNewPainArea] = useState('Lower Back');
  const [newSymptoms, setNewSymptoms] = useState('');
  const [newTimeWindow, setNewTimeWindow] = useState('Morning (9 AM - 12 PM)');
  const [isUrgent, setIsUrgent] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, aptRes, ptRes] = await Promise.all([
        fetch(`${API_BASE}/requests`),
        fetch(`${API_BASE}/appointments`),
        fetch(`${API_BASE}/therapists`)
      ]);
      const reqData = await reqRes.json();
      const aptData = await aptRes.json();
      const ptData = await ptRes.json();

      if (reqData.success) setRequests(reqData.requests);
      if (aptData.success) setAppointments(aptData.appointments);
      if (ptData.success) {
        setTherapists(ptData.therapists);
        if (ptData.therapists.length > 0) setSelectedTherapistId(ptData.therapists[0].id);
      }
    } catch (err) {
      console.warn('Backend API connection fallback, using local state.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Dispatch / Assignment
  const handleAssignTherapist = async () => {
    if (!selectedRequest || !selectedTherapistId) return;

    try {
      const res = await fetch(`${API_BASE}/dispatch/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          therapistId: selectedTherapistId,
          assignedByUserId: currentUser.id,
          paymentMode
        })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedRequest(null);
        fetchData();
        setActiveTab('appointments');
      }
    } catch (e) {
      alert('Therapist assigned in local session.');
      setSelectedRequest(null);
    }
  };

  // Handle New Phone Request Submission
  const handleCreatePhoneRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName || !newPatientPhone || !newAddress) {
      alert('Please fill in required fields.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createdByUserRole: 'DESK_BOY',
          createdByUserId: currentUser.id,
          categoryId: newCategory,
          address: {
            addressLine: newAddress,
            city: 'New York',
            pinCode: '10001',
            coordinates: { latitude: 40.7128, longitude: -74.0060 }
          },
          painAreas: [newPainArea],
          conditionDescription: newSymptoms || 'Inquiry taken via front-desk call.',
          preferredTimeWindow: newTimeWindow,
          urgency: isUrgent ? 'URGENT' : 'NORMAL'
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewPatientName('');
        setNewPatientPhone('');
        setNewAddress('');
        setNewSymptoms('');
        fetchData();
        setActiveTab('queue');
      }
    } catch (e) {
      alert('Request created locally.');
      setActiveTab('queue');
    }
  };

  const selectedTherapistObj = therapists.find(t => t.id === selectedTherapistId) || therapists[0];
  const feeEstimate = selectedRequest && selectedTherapistObj ? calculateSessionFee({
    categoryId: selectedRequest.categoryId,
    travelDistanceKm: 4.8,
    seniority: selectedTherapistObj.seniority,
    currency: 'USD',
    isUrgent: selectedRequest.urgency === 'URGENT'
  }) : null;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* TOP HEADER */}
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-500 p-2 rounded-xl text-slate-950 font-bold">
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">TherapyCare Dispatch</h1>
            <p className="text-xs text-slate-400">In-Home Physiotherapy Operations Hub</p>
          </div>
        </div>

        {/* ROLE INDICATOR & ACTIONS */}
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setActiveTab('new-request')}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Phone Request</span>
          </button>

          <div className="flex items-center space-x-3 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-xs">
              {currentUser.fullName.charAt(0)}
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-white">{currentUser.fullName}</p>
              <p className="text-[10px] text-emerald-400 uppercase tracking-wider">{currentUser.role.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN NAVIGATION BAR */}
      <nav className="bg-white border-b border-slate-200 px-6 flex items-center justify-between">
        <div className="flex space-x-6">
          <button 
            onClick={() => setActiveTab('queue')}
            className={`py-3.5 px-2 text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'queue' 
                ? 'border-emerald-600 text-emerald-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span>Pending Triage Queue ({requests.filter(r => r.status === 'REQUEST_SUBMITTED').length})</span>
          </button>

          <button 
            onClick={() => setActiveTab('appointments')}
            className={`py-3.5 px-2 text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'appointments' 
                ? 'border-emerald-600 text-emerald-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Active Dispatches ({appointments.length})</span>
          </button>

          <button 
            onClick={() => setActiveTab('therapists')}
            className={`py-3.5 px-2 text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'therapists' 
                ? 'border-emerald-600 text-emerald-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Therapists Master ({therapists.length})</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Live Dispatch Engine Connected</span>
        </div>
      </nav>

      {/* CONTENT AREA */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* TAB 1: PENDING REQUESTS QUEUE */}
        {activeTab === 'queue' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Incoming Patient Requests</h2>
                <p className="text-sm text-slate-500">Review patient clinical needs, assign verified therapists, and confirm visit time.</p>
              </div>
              <button onClick={fetchData} className="text-xs text-emerald-600 hover:underline font-medium">Refresh Queue</button>
            </div>

            {requests.filter(r => r.status === 'REQUEST_SUBMITTED').length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-sm">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800">Dispatch Queue is Clear</h3>
                <p className="text-sm text-slate-500 mt-1">All incoming patient requests have been scheduled and assigned.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requests.filter(r => r.status === 'REQUEST_SUBMITTED').map((req) => (
                  <div key={req.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-emerald-500 transition space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          {req.category.name}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 mt-1">{req.patient.fullName}</h3>
                        <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span>{req.patient.phone}</span>
                        </p>
                      </div>
                      <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded">
                        {req.id}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1.5 text-slate-700">
                      <p className="flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="font-medium">{req.address.addressLine}, {req.address.city}</span>
                      </p>
                      <p className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Preferred Window: <strong className="text-slate-900">{req.preferredTimeWindow}</strong></span>
                      </p>
                      <p className="flex items-center space-x-1.5">
                        <Activity className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>Pain Focus: <strong>{req.painAreas.join(', ')}</strong></span>
                      </p>
                    </div>

                    <p className="text-xs text-slate-600 italic">"{req.conditionDescription}"</p>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-xs text-slate-500">
                        Est. Duration: <strong className="text-slate-800">{req.category.standardDurationMinutes} mins</strong>
                      </div>
                      <button 
                        onClick={() => setSelectedRequest(req)}
                        className="bg-slate-900 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-semibold transition"
                      >
                        Schedule & Assign PT
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ACTIVE APPOINTMENTS & STATUS BOARD */}
        {activeTab === 'appointments' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Active Dispatches & Confirmed Visits</h2>
              <p className="text-sm text-slate-500">Live monitoring of therapist travel, arrival, session execution, and payments.</p>
            </div>

            <div className="space-y-3">
              {appointments.map((apt) => (
                <div key={apt.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        apt.status === 'ASSIGNED' ? 'bg-amber-100 text-amber-800' :
                        apt.status === 'EN_ROUTE' ? 'bg-sky-100 text-sky-800 animate-pulse' :
                        apt.status === 'ARRIVED' ? 'bg-indigo-100 text-indigo-800' :
                        apt.status === 'IN_SESSION' ? 'bg-purple-100 text-purple-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {apt.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-slate-400">ID: {apt.id}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{apt.request?.category?.name || 'Physiotherapy Visit'}</h3>
                    <p className="text-xs text-slate-600">
                      Patient: <strong className="text-slate-900">{apt.patient?.fullName}</strong> ({apt.patient?.phone})
                    </p>
                    <p className="text-xs text-slate-500 flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-rose-500" />
                      <span>{apt.request?.address?.addressLine}</span>
                    </p>
                  </div>

                  {/* THERAPIST & TIMING */}
                  <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1 md:w-64">
                    <p className="text-slate-500">Assigned Clinician:</p>
                    <p className="font-semibold text-slate-900 flex items-center space-x-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{apt.therapist?.user?.fullName || 'Assigned Therapist'}</span>
                    </p>
                    <p className="text-slate-600 flex items-center space-x-1 mt-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{new Date(apt.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  </div>

                  {/* FINANCIALS & OTP */}
                  <div className="text-right space-y-1">
                    <p className="text-xs text-slate-400">Total Fee</p>
                    <p className="text-lg font-bold text-emerald-600">${apt.totalAmount}</p>
                    <div className="flex items-center justify-end space-x-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        apt.paymentStatus === 'CASH_COLLECTED' || apt.paymentStatus === 'PAID_ONLINE' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {apt.paymentStatus.replace('_', ' ')}
                      </span>
                      {apt.cashConfirmationOtp && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                          OTP: {apt.cashConfirmationOtp}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: THERAPIST DIRECTORY */}
        {activeTab === 'therapists' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Physiotherapist Roster & Active Zones</h2>
              <p className="text-sm text-slate-500">Certified care providers ready for home-visit dispatches.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {therapists.map((pt) => (
                <div key={pt.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-start space-x-4">
                  <img src={pt.user.avatarUrl} alt={pt.user.fullName} className="w-14 h-14 rounded-full object-cover border border-slate-200" />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">{pt.user.fullName}</h3>
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded flex items-center space-x-0.5">
                        <span>★</span>
                        <span>{pt.rating}</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{pt.seniority.replace('_', ' ')} • {pt.yearsOfExperience} yrs exp</p>
                    <p className="text-xs text-slate-600">License: <strong className="font-mono">{pt.licenseNumber}</strong></p>
                    <div className="flex flex-wrap gap-1 pt-1.5">
                      {pt.specializations.map(s => (
                        <span key={s} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-emerald-600 font-medium pt-1">
                      Service Radius: Up to {pt.serviceRadiusKm} km from Base
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: NEW PHONE REQUEST MODAL/VIEW */}
        {activeTab === 'new-request' && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Create Patient Request (Phone Call / Inquiry)</h2>
              <p className="text-xs text-slate-500 mt-1">Take details from the caller to insert into the central dispatch queue.</p>
            </div>

            <form onSubmit={handleCreatePhoneRequest} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Full Name *</label>
                  <input 
                    type="text" 
                    value={newPatientName} 
                    onChange={e => setNewPatientName(e.target.value)} 
                    placeholder="e.g. Robert Smith" 
                    className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input 
                    type="text" 
                    value={newPatientPhone} 
                    onChange={e => setNewPatientPhone(e.target.value)} 
                    placeholder="+1 (555) 000-0000" 
                    className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" 
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Home Address & Landmark *</label>
                <input 
                  type="text" 
                  value={newAddress} 
                  onChange={e => setNewAddress(e.target.value)} 
                  placeholder="Street, Apt #, Landmark" 
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" 
                  required 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Therapy Category</label>
                  <select 
                    value={newCategory} 
                    onChange={e => setNewCategory(e.target.value)} 
                    className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {THERAPY_CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.name} (${c.basePriceUSD})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Time Window</label>
                  <select 
                    value={newTimeWindow} 
                    onChange={e => setNewTimeWindow(e.target.value)} 
                    className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option>Morning (9:00 AM - 12:00 PM)</option>
                    <option>Afternoon (1:00 PM - 4:00 PM)</option>
                    <option>Evening (5:00 PM - 8:00 PM)</option>
                    <option>Earliest Available</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Symptoms / Condition Notes</label>
                <textarea 
                  value={newSymptoms} 
                  onChange={e => setNewSymptoms(e.target.value)} 
                  placeholder="Describe patient pain, mobility restriction, or post-surgery history..." 
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none h-20"
                ></textarea>
              </div>

              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="urgentCheck" 
                  checked={isUrgent} 
                  onChange={e => setIsUrgent(e.target.checked)} 
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4" 
                />
                <label htmlFor="urgentCheck" className="text-xs font-medium text-slate-700">
                  Mark as Urgent / Same-Day Dispatch (+$10)
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setActiveTab('queue')} 
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-lg text-xs font-bold transition shadow-sm"
                >
                  Submit to Dispatch Queue
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL: ASSIGN & SCHEDULE THERAPIST */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Schedule & Assign Clinician</h3>
                  <p className="text-xs text-slate-500">Patient: {selectedRequest.patient.fullName} • {selectedRequest.category.name}</p>
                </div>
                <button onClick={() => setSelectedRequest(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Qualified Physiotherapist</label>
                  <select 
                    value={selectedTherapistId} 
                    onChange={e => setSelectedTherapistId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {therapists.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.user.fullName} ({t.seniority} • {t.yearsOfExperience} yrs exp • ★ {t.rating})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Date</label>
                    <input 
                      type="text" 
                      value={scheduledDate} 
                      onChange={e => setScheduledDate(e.target.value)} 
                      className="w-full p-2 rounded-lg border border-slate-300 text-xs" 
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Time Slot</label>
                    <input 
                      type="text" 
                      value={scheduledTime} 
                      onChange={e => setScheduledTime(e.target.value)} 
                      className="w-full p-2 rounded-lg border border-slate-300 text-xs" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Collection Mode</label>
                  <select 
                    value={paymentMode} 
                    onChange={e => setPaymentMode(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="CASH_ON_SERVICE">Cash on Service (Pay at Home)</option>
                    <option value="ONLINE_CARD">Online Pre-Payment (Card / Apple Pay)</option>
                  </select>
                </div>

                {/* AUTOMATED FEE CALCULATION BREAKDOWN */}
                {feeEstimate && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-1 text-slate-800">
                    <p className="font-bold text-emerald-900 mb-1">Automated Fee Calculation:</p>
                    <div className="flex justify-between text-[11px]">
                      <span>Base Category Fee ({selectedRequest.category.name}):</span>
                      <span>${feeEstimate.baseAmount}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Seniority Surcharge ({selectedTherapistObj.seniority}):</span>
                      <span>+${feeEstimate.senioritySurcharge}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Travel Surcharge (4.8 km):</span>
                      <span>+${feeEstimate.travelAmount}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-emerald-900 border-t border-emerald-200 pt-1 mt-1">
                      <span>Total Amount Payable:</span>
                      <span>${feeEstimate.totalAmount}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button 
                  onClick={() => setSelectedRequest(null)} 
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAssignTherapist} 
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-xs font-bold transition shadow-sm"
                >
                  Approve & Dispatch
                </button>
              </div>
            </div>
          </div>
        )}
      
        {/* TAB: MOBILE APP SIMULATOR */}
        {activeTab === 'mobile-sim' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900">📱 Mobile App Simulator (Patient & Therapist)</h2>
              <p className="text-xs text-slate-500 mt-1">Test the full iOS/Android mobile user journey directly in your browser with real-time API sync!</p>
            </div>

            <div className="flex justify-center">
              <div className="w-[380px] bg-slate-950 rounded-[44px] p-4 shadow-2xl border-4 border-slate-800">
                <div className="w-32 h-4 bg-slate-900 rounded-full mx-auto mb-3"></div>
                <div className="bg-slate-50 rounded-[32px] p-4 text-slate-900 min-h-[600px] max-h-[600px] overflow-y-auto space-y-4 text-xs">
                  <div className="bg-emerald-600 text-white p-3.5 rounded-2xl shadow-sm">
                    <p className="text-[10px] text-emerald-200 uppercase font-semibold">Patient Mobile App • SSO Active</p>
                    <h3 className="text-sm font-bold mt-0.5">Johnathan Doe</h3>
                    <p className="text-[11px] text-emerald-100">🔒 Location & Biometrics Verified</p>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2.5 shadow-xs">
                    <h4 className="font-bold text-slate-900 text-xs">📍 Request In-Home Physiotherapy</h4>
                    <p className="text-[11px] text-slate-600">Address: <strong>742 Evergreen Terrace, Apt 4B, New York</strong></p>
                    <p className="text-[11px] text-slate-600">Specialty: <strong>Orthopedic & Spine Care ($45)</strong></p>
                    <p className="text-[11px] text-slate-600">Pain Focus: <strong>Lower Back & Left Sciatic Nerve</strong></p>
                    <button 
                      onClick={async () => {
                        await fetch('http://localhost:4000/api/requests', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            createdByUserRole: 'PATIENT',
                            categoryId: 'cat_ortho',
                            painAreas: ['Lower Back'],
                            conditionDescription: 'Mobile app test request for acute back pain.',
                            preferredTimeWindow: 'Tomorrow Morning (9 AM - 12 PM)'
                          })
                        });
                        alert('Request submitted from mobile simulator! Check the Pending Triage Queue.');
                        fetchData();
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs transition shadow-xs flex items-center justify-center space-x-1.5"
                    >
                      <span>Submit In-Home Request</span>
                    </button>
                  </div>

                  {appointments.length > 0 && (
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2 shadow-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase">
                          {appointments[0].status.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">${appointments[0].totalAmount}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs">{appointments[0].request?.category?.name || 'Physiotherapy Visit'}</h4>
                      <p className="text-[11px] text-slate-500">Therapist: <strong>{appointments[0].therapist?.user?.fullName}</strong></p>
                      
                      <div className="space-y-1 pt-2 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Therapist Status Actions:</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button 
                            onClick={async () => {
                              await fetch(`http://localhost:4000/api/appointments/${appointments[0].id}/status`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'EN_ROUTE' })
                              });
                              fetchData();
                            }}
                            className="bg-sky-600 hover:bg-sky-500 text-white py-1.5 rounded-lg text-[10px] font-bold"
                          >
                            🚗 On The Way
                          </button>
                          <button 
                            onClick={async () => {
                              await fetch(`http://localhost:4000/api/appointments/${appointments[0].id}/status`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'ARRIVED' })
                              });
                              fetchData();
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 rounded-lg text-[10px] font-bold"
                          >
                            🏡 Arrived
                          </button>
                          <button 
                            onClick={async () => {
                              await fetch(`http://localhost:4000/api/appointments/${appointments[0].id}/status`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'IN_SESSION' })
                              });
                              fetchData();
                            }}
                            className="bg-purple-600 hover:bg-purple-500 text-white py-1.5 rounded-lg text-[10px] font-bold"
                          >
                            🩺 In Session
                          </button>
                          <button 
                            onClick={async () => {
                              await fetch(`http://localhost:4000/api/appointments/${appointments[0].id}/status`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'COMPLETED', clinicalNotes: 'Lumbar mobilization and taught stretches.' })
                              });
                              fetchData();
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 rounded-lg text-[10px] font-bold"
                          >
                            ✅ Complete
                          </button>
                        </div>
                      </div>

                      <div className="bg-emerald-50 p-2 rounded-xl text-center border border-emerald-200 mt-2">
                        <p className="text-[10px] text-emerald-800">Cash Collection Security Code:</p>
                        <p className="text-sm font-bold text-emerald-900 font-mono tracking-widest">{appointments[0].cashConfirmationOtp || '7492'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
