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
  Stethoscope, Smartphone, Send, Check, X
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

  // Mobile App Simulator Interactive State
  const [simRole, setSimRole] = useState<'PATIENT' | 'THERAPIST'>('PATIENT');
  const [simActiveTab, setSimActiveTab] = useState<'request' | 'status' | 'profile'>('request');
  const [simCategory, setSimCategory] = useState(THERAPY_CATEGORIES[0]);
  const [simDate, setSimDate] = useState({ id: 'tom', day: 'Tomorrow', date: 'Sep 10' });
  const [simPeriod, setSimPeriod] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [simTimeSlot, setSimTimeSlot] = useState('10:45 AM');
  const [simPainAreas, setSimPainAreas] = useState<string[]>(['Lower Back', 'Sciatic Nerve']);
  const [simPainSeverity, setSimPainSeverity] = useState<number>(6);
  const [simPaymentMode, setSimPaymentMode] = useState<'CASH' | 'CARD'>('CASH');
  const [simBookSuccess, setSimBookSuccess] = useState(false);
  const [simProfile, setSimProfile] = useState({
    fullName: 'Johnathan Doe',
    phone: '+1 (555) 349-2810',
    email: 'johnathan.doe@gmail.com',
    age: '38',
    gender: 'Male',
    bloodGroup: 'O+',
    conditions: ['Hypertension', 'Spinal Surgery History'] as string[],
    emergencyName: 'Eleanor Doe',
    emergencyRelation: 'Spouse',
    emergencyPhone: '+1 (555) 839-2019',
    primaryAddress: '742 Evergreen Terrace, Apt 4B, New York',
    entryNotes: 'Door buzzer #402. Elevator on left.'
  });
  const [simProfileSavedNotice, setSimProfileSavedNotice] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

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
        showToast('Therapist dispatched and appointment scheduled!', 'success');
        fetchData();
        setActiveTab('appointments');
      }
    } catch (e) {
      showToast('Therapist assigned in local session.', 'info');
      setSelectedRequest(null);
    }
  };

  // Handle New Phone Request Submission
  const handleCreatePhoneRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName || !newPatientPhone || !newAddress) {
      showToast('Please fill in required fields (Patient Name, Phone, and Address).', 'error');
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
        showToast('Phone visit request created and added to triage queue!', 'success');
        fetchData();
        setActiveTab('queue');
      }
    } catch (e) {
      showToast('Request created locally.', 'info');
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased">
      {/* TOP CLINICAL PORTAL HEADER */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 lg:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="bg-teal-700 p-2.5 rounded-2xl shadow-sm text-white flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-black tracking-tight text-slate-900">TherapyCare</h1>
              <span className="bg-teal-50 border border-teal-200/80 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                CLINICAL PORTAL
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">In-Home Physiotherapy Dispatch & Triage Hub</p>
          </div>
        </div>

        {/* ROLE INDICATOR & ACTIONS */}
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setActiveTab('new-request')}
            className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Intake Phone Request</span>
          </button>

          <div className="flex items-center space-x-3 bg-slate-100/80 hover:bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-200/80 transition">
            <div className="w-8 h-8 rounded-full bg-teal-700 text-white font-bold flex items-center justify-center text-xs shadow-xs">
              {currentUser.fullName.charAt(0)}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-slate-900 leading-tight">{currentUser.fullName}</p>
              <p className="text-[10px] text-teal-700 font-bold uppercase tracking-wider">{currentUser.role.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN NAVIGATION BAR */}
      <nav className="bg-white border-b border-slate-200/80 px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/70">
          <button 
            onClick={() => setActiveTab('queue')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-2 ${
              activeTab === 'queue' 
                ? 'bg-white text-teal-800 shadow-xs border border-slate-200/60' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Pending Triage</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'queue' ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {requests.filter(r => r.status === 'REQUEST_SUBMITTED').length}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('appointments')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-2 ${
              activeTab === 'appointments' 
                ? 'bg-white text-teal-800 shadow-xs border border-slate-200/60' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-teal-600" />
            <span>Active Dispatches</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'appointments' ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {appointments.length}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('therapists')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-2 ${
              activeTab === 'therapists' 
                ? 'bg-white text-teal-800 shadow-xs border border-slate-200/60' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-teal-600" />
            <span>Therapist Roster</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'therapists' ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {therapists.length}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('mobile-sim')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-2 ${
              activeTab === 'mobile-sim' 
                ? 'bg-teal-600 text-white shadow-xs' 
                : 'text-teal-700 hover:bg-teal-50/80 hover:text-teal-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>📱 Mobile App Simulator</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200/80 text-emerald-800 px-3 py-1.5 rounded-full text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Live Clinical Dispatch Active</span>
        </div>
      </nav>

      {/* CONTENT AREA */}
      <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* TAB 1: PENDING REQUESTS QUEUE */}
        {activeTab === 'queue' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Incoming Patient Requests</h2>
                <p className="text-xs text-slate-500 mt-0.5">Review patient clinical needs, assign verified therapists, and confirm visit time.</p>
              </div>
              <button 
                onClick={fetchData} 
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-xl transition shadow-xs"
              >
                <span>🔄 Refresh Queue</span>
              </button>
            </div>

            {requests.filter(r => r.status === 'REQUEST_SUBMITTED').length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200/70 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8 text-teal-600" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Dispatch Queue is Clear</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">All incoming patient requests have been triaged, scheduled, and assigned to licensed clinicians.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requests.filter(r => r.status === 'REQUEST_SUBMITTED').map((req) => (
                  <div key={req.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-teal-400 transition-all duration-200 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200/80">
                            {req.category.name}
                          </span>
                          {req.urgency === 'URGENT' && (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                              🚨 URGENT
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-black text-slate-900 mt-1.5">{req.patient.fullName}</h3>
                        <p className="text-xs text-slate-500 flex items-center space-x-1.5 mt-0.5 font-medium">
                          <Phone className="w-3.5 h-3.5 text-teal-600" />
                          <span>{req.patient.phone}</span>
                        </p>
                      </div>
                      <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200/60 font-semibold">
                        {req.id}
                      </span>
                    </div>

                    <div className="bg-slate-50/80 p-3.5 rounded-xl text-xs space-y-2 text-slate-700 border border-slate-100">
                      <p className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                        <span className="font-medium text-slate-800">{req.address.addressLine}, {req.address.city}</span>
                      </p>
                      <p className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Preferred Window: <strong className="text-slate-900 font-bold">{req.preferredTimeWindow}</strong></span>
                      </p>
                      <p className="flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-teal-600 shrink-0" />
                        <span>Target Pain Focus: <strong className="text-slate-900 font-bold">{req.painAreas.join(', ')}</strong></span>
                      </p>
                    </div>

                    <div className="bg-amber-50/60 border border-amber-200/60 p-2.5 rounded-xl">
                      <p className="text-xs text-amber-900 italic font-medium">"{req.conditionDescription}"</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-xs text-slate-500 font-medium">
                        Est. Duration: <strong className="text-slate-800 font-bold">{req.category.standardDurationMinutes} mins</strong> (${req.category.basePriceUSD}.00)
                      </div>
                      <button 
                        onClick={() => setSelectedRequest(req)}
                        className="bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
                      >
                        <span>Schedule & Assign PT</span>
                        <span>→</span>
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
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Active Dispatches & Confirmed Visits</h2>
              <p className="text-xs text-slate-500 mt-0.5">Live monitoring of therapist travel, arrival, session execution, and payments.</p>
            </div>

            <div className="space-y-3">
              {appointments.map((apt) => (
                <div key={apt.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        apt.status === 'ASSIGNED' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                        apt.status === 'EN_ROUTE' ? 'bg-teal-50 text-teal-800 border border-teal-200 animate-pulse' :
                        apt.status === 'ARRIVED' ? 'bg-sky-50 text-sky-800 border border-sky-200' :
                        apt.status === 'IN_SESSION' ? 'bg-purple-50 text-purple-800 border border-purple-200' :
                        'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        {apt.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-slate-400 font-mono font-medium">ID: {apt.id}</span>
                    </div>
                    <h3 className="text-base font-black text-slate-900">{apt.request?.category?.name || 'Physiotherapy Visit'}</h3>
                    <p className="text-xs text-slate-600 font-medium">
                      Patient: <strong className="text-slate-900 font-bold">{apt.patient?.fullName}</strong> ({apt.patient?.phone})
                    </p>
                    <p className="text-xs text-slate-500 flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>{apt.request?.address?.addressLine}</span>
                    </p>
                  </div>

                  {/* THERAPIST & TIMING */}
                  <div className="bg-slate-50/80 p-3.5 rounded-xl text-xs space-y-1.5 md:w-64 border border-slate-100">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Assigned Clinician:</p>
                    <p className="font-bold text-slate-900 flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-teal-600" />
                      <span>{apt.therapist?.user?.fullName || 'Assigned Therapist'}</span>
                    </p>
                    <p className="text-slate-600 flex items-center space-x-1.5 mt-1 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      <span>{new Date(apt.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  </div>

                  {/* FINANCIALS & OTP */}
                  <div className="text-right space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Fee</p>
                    <p className="text-xl font-black text-teal-700">${apt.totalAmount}</p>
                    <div className="flex items-center justify-end space-x-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        apt.paymentStatus === 'CASH_COLLECTED' || apt.paymentStatus === 'PAID_ONLINE' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {apt.paymentStatus.replace('_', ' ')}
                      </span>
                      {apt.cashConfirmationOtp && (
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg font-mono font-bold border border-slate-200/60">
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
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Physiotherapist Roster & Active Coverage Zones</h2>
              <p className="text-xs text-slate-500 mt-0.5">Certified care providers ready for in-home clinical dispatches.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {therapists.map((pt) => (
                <div key={pt.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-teal-400 transition-all duration-200 flex items-start space-x-4">
                  <img src={pt.user.avatarUrl} alt={pt.user.fullName} className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-xs shrink-0" />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-900 truncate">{pt.user.fullName}</h3>
                      <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg flex items-center space-x-1 shrink-0">
                        <span>★</span>
                        <span>{pt.rating}</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">{pt.seniority.replace('_', ' ')} • {pt.yearsOfExperience} yrs clinical experience</p>
                    <p className="text-xs text-slate-600">License: <strong className="font-mono text-slate-800">{pt.licenseNumber}</strong></p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {pt.specializations.map(s => (
                        <span key={s} className="text-[10px] bg-teal-50 text-teal-800 border border-teal-200/60 px-2 py-0.5 rounded-md font-semibold">
                          {s}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-teal-700 font-bold bg-teal-50 border border-teal-200/70 px-2.5 py-1 rounded-lg inline-block mt-1">
                      Coverage Radius: Up to {pt.serviceRadiusKm} km from Clinic Base
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: NEW PHONE REQUEST MODAL/VIEW */}
        {activeTab === 'new-request' && (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs space-y-6">
            <div>
              <div className="inline-flex items-center space-x-1.5 bg-teal-50 border border-teal-200/80 text-teal-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full mb-2">
                <Phone className="w-3 h-3" />
                <span>FRONT DESK INTAKE</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Create Patient Request (Phone Call / Inquiry)</h2>
              <p className="text-xs text-slate-500 mt-1">Take details from caller to register in the central dispatch queue.</p>
            </div>

            <form onSubmit={handleCreatePhoneRequest} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Patient Full Name *</label>
                  <input 
                    type="text" 
                    value={newPatientName} 
                    onChange={e => setNewPatientName(e.target.value)} 
                    placeholder="e.g. Robert Smith" 
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 bg-slate-50/40 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone Number *</label>
                  <input 
                    type="text" 
                    value={newPatientPhone} 
                    onChange={e => setNewPatientPhone(e.target.value)} 
                    placeholder="+1 (555) 000-0000" 
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 bg-slate-50/40 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium" 
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Home Address & Landmark *</label>
                <input 
                  type="text" 
                  value={newAddress} 
                  onChange={e => setNewAddress(e.target.value)} 
                  placeholder="Street, Apt #, Landmark" 
                  className="w-full text-sm p-3 rounded-xl border border-slate-300 bg-slate-50/40 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium" 
                  required 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Therapy Category</label>
                  <select 
                    value={newCategory} 
                    onChange={e => setNewCategory(e.target.value)} 
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 bg-slate-50/40 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium"
                  >
                    {THERAPY_CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.name} (${c.basePriceUSD})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Preferred Time Window</label>
                  <select 
                    value={newTimeWindow} 
                    onChange={e => setNewTimeWindow(e.target.value)} 
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 bg-slate-50/40 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium"
                  >
                    <option>Morning (9:00 AM - 12:00 PM)</option>
                    <option>Afternoon (1:00 PM - 4:00 PM)</option>
                    <option>Evening (5:00 PM - 8:00 PM)</option>
                    <option>Earliest Available</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Symptoms / Condition Notes</label>
                <textarea 
                  value={newSymptoms} 
                  onChange={e => setNewSymptoms(e.target.value)} 
                  placeholder="Describe patient pain, mobility restriction, or post-surgery history..." 
                  className="w-full text-sm p-3 rounded-xl border border-slate-300 bg-slate-50/40 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium h-24"
                ></textarea>
              </div>

              <div className="flex items-center space-x-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <input 
                  type="checkbox" 
                  id="urgentCheck" 
                  checked={isUrgent} 
                  onChange={e => setIsUrgent(e.target.checked)} 
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer" 
                />
                <label htmlFor="urgentCheck" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Mark as Urgent / Same-Day Dispatch (+$10)
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setActiveTab('queue')} 
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white px-6 py-3 rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Submit to Dispatch Queue
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL: ASSIGN & SCHEDULE THERAPIST */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="inline-flex items-center space-x-1.5 bg-teal-50 border border-teal-200/80 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1">
                    <span>CLINICAL DISPATCH</span>
                  </div>
                  <h3 className="text-base font-black text-slate-900">Schedule & Assign Clinician</h3>
                  <p className="text-xs text-slate-500 font-medium">Patient: {selectedRequest.patient.fullName} • {selectedRequest.category.name}</p>
                </div>
                <button 
                  onClick={() => setSelectedRequest(null)} 
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 text-sm font-bold transition"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Select Qualified Physiotherapist</label>
                  <select 
                    value={selectedTherapistId} 
                    onChange={e => setSelectedTherapistId(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-slate-50/40 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none font-medium"
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
                    <label className="block font-bold text-slate-700 mb-1.5">Date</label>
                    <input 
                      type="text" 
                      value={scheduledDate} 
                      onChange={e => setScheduledDate(e.target.value)} 
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50/40 focus:bg-white focus:ring-2 focus:ring-teal-500 text-xs font-medium" 
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Time Slot</label>
                    <input 
                      type="text" 
                      value={scheduledTime} 
                      onChange={e => setScheduledTime(e.target.value)} 
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50/40 focus:bg-white focus:ring-2 focus:ring-teal-500 text-xs font-medium" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Payment Collection Mode</label>
                  <select 
                    value={paymentMode} 
                    onChange={e => setPaymentMode(e.target.value as any)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-slate-50/40 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none font-medium"
                  >
                    <option value="CASH_ON_SERVICE">Cash on Service (Pay at Home)</option>
                    <option value="ONLINE_CARD">Online Pre-Payment (Card / Apple Pay)</option>
                  </select>
                </div>

                {/* AUTOMATED FEE CALCULATION BREAKDOWN */}
                {feeEstimate && (
                  <div className="bg-teal-50/80 border border-teal-200/80 rounded-2xl p-4 space-y-1.5 text-slate-800">
                    <p className="font-bold text-teal-900 mb-1 text-xs">Automated Fee Calculation:</p>
                    <div className="flex justify-between text-[11px] font-medium">
                      <span>Base Category Fee ({selectedRequest.category.name}):</span>
                      <span>${feeEstimate.baseAmount}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-medium">
                      <span>Seniority Surcharge ({selectedTherapistObj.seniority}):</span>
                      <span>+${feeEstimate.senioritySurcharge}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-medium">
                      <span>Travel Surcharge (4.8 km):</span>
                      <span>+${feeEstimate.travelAmount}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-teal-900 border-t border-teal-200/80 pt-1.5 mt-1.5">
                      <span>Total Amount Payable:</span>
                      <span>${feeEstimate.totalAmount}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2.5 pt-2">
                <button 
                  onClick={() => setSelectedRequest(null)} 
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAssignTherapist} 
                  className="bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Approve & Dispatch Clinician
                </button>
              </div>
            </div>
          </div>
        )}
      
        {/* TAB: MOBILE APP SIMULATOR */}
        {activeTab === 'mobile-sim' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center space-x-2 bg-teal-50 border border-teal-200/80 text-teal-800 px-3.5 py-1 rounded-full text-xs font-bold mb-2">
                <Smartphone className="w-3.5 h-3.5 text-teal-700" />
                <span>Interactive Mobile Experience</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">📱 Mobile App Simulator (Patient & Clinician)</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto font-medium">
                Test the complete in-home booking lifecycle with interactive date/time pickers, pain map chips, VAS scale, and live status dispatch!
              </p>
            </div>

            <div className="flex justify-center">
              {/* PHONE FRAME */}
              <div className="w-[410px] bg-slate-950 rounded-[48px] p-3.5 shadow-2xl border-4 border-slate-800 flex flex-col">
                {/* NOTCH & STATUS BAR */}
                <div className="flex justify-between items-center px-5 pt-1.5 pb-2 text-[10px] text-slate-400 font-bold">
                  <span>9:41</span>
                  <div className="w-24 h-4 bg-slate-900 rounded-full"></div>
                  <div className="flex items-center space-x-1.5">
                    <span>5G</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  </div>
                </div>

                {/* APP VIEWPORT */}
                <div className="bg-slate-50 rounded-[36px] overflow-hidden text-slate-800 min-h-[640px] max-h-[640px] flex flex-col border border-slate-200">
                  {/* TOP HEADER */}
                  <div className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between shadow-xs">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center text-xs text-white">
                        🩺
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-extrabold text-xs text-slate-900">TherapyCare</span>
                          <span className="bg-teal-50 text-teal-700 border border-teal-200 text-[8px] font-bold px-1 rounded">HOME CARE</span>
                        </div>
                        <p className="text-[9px] text-slate-500">Certified Home Physio</p>
                      </div>
                    </div>

                    {/* ROLE TOGGLE */}
                    <div className="bg-slate-100 p-0.5 rounded-lg flex border border-slate-200">
                      <button 
                        onClick={() => setSimRole('PATIENT')}
                        className={`text-[10px] font-bold px-2 py-1 rounded-md transition ${
                          simRole === 'PATIENT' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Patient
                      </button>
                      <button 
                        onClick={() => setSimRole('THERAPIST')}
                        className={`text-[10px] font-bold px-2 py-1 rounded-md transition ${
                          simRole === 'THERAPIST' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Clinician
                      </button>
                    </div>
                  </div>

                  {simRole === 'PATIENT' && (
                    <div className="bg-white border-b border-slate-200 flex text-[11px] font-semibold text-slate-500">
                      <button 
                        onClick={() => setSimActiveTab('request')}
                        className={`flex-1 py-2 text-center border-b-2 transition ${
                          simActiveTab === 'request' ? 'border-teal-600 text-teal-700 font-bold bg-teal-50/40' : 'border-transparent hover:text-slate-800'
                        }`}
                      >
                        ✨ Book Visit
                      </button>
                      <button 
                        onClick={() => setSimActiveTab('status')}
                        className={`flex-1 py-2 text-center border-b-2 transition ${
                          simActiveTab === 'status' ? 'border-teal-600 text-teal-700 font-bold bg-teal-50/40' : 'border-transparent hover:text-slate-800'
                        }`}
                      >
                        📍 Live Status
                      </button>
                      <button 
                        onClick={() => setSimActiveTab('profile')}
                        className={`flex-1 py-2 text-center border-b-2 transition ${
                          simActiveTab === 'profile' ? 'border-teal-600 text-teal-700 font-bold bg-teal-50/40' : 'border-transparent hover:text-slate-800'
                        }`}
                      >
                        👤 Personal Info
                      </button>
                    </div>
                  )}

                  {/* SCROLLABLE VIEWPORT CONTENT */}
                  <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs bg-slate-50">
                    {simRole === 'PATIENT' ? (
                      <>
                        {/* TAB 1: REQUEST VISIT */}
                        {simActiveTab === 'request' && (
                          <div className="space-y-3">
                            {/* GREETING CARD */}
                            <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex items-center justify-between">
                              <div>
                                <p className="font-bold text-slate-900 text-xs">Good Morning, {simProfile.fullName.split(' ')[0]} 👋</p>
                                <p className="text-[10px] text-slate-500">Licensed in-home physiotherapy session.</p>
                              </div>
                              <button 
                                onClick={() => setSimActiveTab('profile')}
                                className="bg-teal-50 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-200 hover:bg-teal-100 transition"
                              >
                                Edit Info
                              </button>
                            </div>

                            {/* 1. SELECT SPECIALTY */}
                            <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-900 text-xs">1. Select Specialty</span>
                                <span className="text-[10px] text-teal-700 font-semibold">45-60 min care</span>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                {THERAPY_CATEGORIES.slice(0, 4).map((cat) => (
                                  <button
                                    key={cat.id}
                                    onClick={() => setSimCategory(cat)}
                                    className={`p-2 rounded-xl text-left border transition ${
                                      simCategory.id === cat.id 
                                        ? 'border-teal-600 bg-teal-50/60 text-slate-900 shadow-xs' 
                                        : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-300'
                                    }`}
                                  >
                                    <div className="flex justify-between items-center text-sm mb-1">
                                      <span>{cat.id === 'cat_ortho' ? '🦴' : cat.id === 'cat_post_op' ? '🩹' : cat.id === 'cat_neuro' ? '🧠' : '⚡'}</span>
                                      <span className="text-[10px] font-bold bg-white border border-slate-200 px-1.5 py-0.5 rounded text-teal-700">${cat.basePriceUSD}</span>
                                    </div>
                                    <p className="font-bold text-[11px] leading-tight truncate">{cat.name}</p>
                                    <p className="text-[9px] text-slate-500 mt-0.5">⏱ {cat.standardDurationMinutes} mins</p>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* 2. PAIN FOCUS & VAS SCALE */}
                            <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs space-y-2">
                              <span className="font-bold text-slate-900 text-xs">2. Pain Focus & VAS Severity</span>
                              
                              <div className="flex flex-wrap gap-1.5">
                                {['🦴 Lower Back', '🧣 Neck', '🦵 Knee', '🏊 Shoulder', '⚡ Sciatica', '🚶 Hip'].map((chip) => {
                                  const isPicked = simPainAreas.includes(chip);
                                  return (
                                    <button
                                      key={chip}
                                      onClick={() => {
                                        if (isPicked) {
                                          if (simPainAreas.length > 1) setSimPainAreas(simPainAreas.filter(p => p !== chip));
                                        } else {
                                          setSimPainAreas([...simPainAreas, chip]);
                                        }
                                      }}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition ${
                                        isPicked ? 'bg-teal-600 border-teal-600 text-white' : 'bg-slate-100 border-slate-200 text-slate-700'
                                      }`}
                                    >
                                      {chip}
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-slate-500 font-semibold">Clinical Pain Scale (VAS):</span>
                                  <span className="font-bold text-amber-700">{simPainSeverity} / 10 (Moderate)</span>
                                </div>
                                <div className="flex justify-between">
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                    <button
                                      key={num}
                                      onClick={() => setSimPainSeverity(num)}
                                      className={`w-6 h-6 rounded-full text-[10px] font-bold transition flex items-center justify-center ${
                                        simPainSeverity === num 
                                          ? 'bg-amber-500 text-white font-black shadow-xs' 
                                          : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                                      }`}
                                    >
                                      {num}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* 3. INTERACTIVE DATE & TIME PICKER */}
                            <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs space-y-2.5">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-900 text-xs">3. Choose Date & Time Slot</span>
                                <span className="text-[10px] text-teal-700 font-semibold">Live Slots</span>
                              </div>

                              <div className="flex space-x-1.5 overflow-x-auto pb-1">
                                {[
                                  { id: 'today', day: 'Today', date: 'Sep 9', badge: 'Fastest' },
                                  { id: 'tom', day: 'Tomorrow', date: 'Sep 10', badge: 'Popular' },
                                  { id: 'thu', day: 'Thursday', date: 'Sep 11' },
                                  { id: 'fri', day: 'Friday', date: 'Sep 12' },
                                ].map((d) => (
                                  <button
                                    key={d.id}
                                    onClick={() => setSimDate(d)}
                                    className={`flex-1 min-w-[76px] py-1.5 px-2 rounded-xl text-center border transition ${
                                      simDate.id === d.id 
                                        ? 'bg-teal-600 border-teal-600 text-white font-bold shadow-xs' 
                                        : 'bg-slate-50 border-slate-200 text-slate-700'
                                    }`}
                                  >
                                    {d.badge && <span className={`block text-[8px] font-black uppercase ${simDate.id === d.id ? 'text-amber-200' : 'text-amber-700'}`}>{d.badge}</span>}
                                    <span className="block text-[11px] leading-tight">{d.day}</span>
                                    <span className="block text-[9px] opacity-80">{d.date}</span>
                                  </button>
                                ))}
                              </div>

                              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                                {[
                                  { id: 'morning', label: '🌅 Morning' },
                                  { id: 'afternoon', label: '☀️ Afternoon' },
                                  { id: 'evening', label: '🌙 Evening' }
                                ].map((p) => (
                                  <button
                                    key={p.id}
                                    onClick={() => {
                                      setSimPeriod(p.id as any);
                                      setSimTimeSlot(p.id === 'morning' ? '10:45 AM' : p.id === 'afternoon' ? '02:30 PM' : '06:30 PM');
                                    }}
                                    className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition ${
                                      simPeriod === p.id ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                  >
                                    {p.label}
                                  </button>
                                ))}
                              </div>

                              <div className="grid grid-cols-3 gap-1.5">
                                {(simPeriod === 'morning' 
                                  ? ['08:30 AM', '09:45 AM', '10:45 AM', '11:30 AM']
                                  : simPeriod === 'afternoon'
                                  ? ['01:15 PM', '02:30 PM', '03:45 PM', '04:30 PM']
                                  : ['05:30 PM', '06:30 PM', '07:15 PM']
                                ).map((slot) => (
                                  <button
                                    key={slot}
                                    onClick={() => setSimTimeSlot(slot)}
                                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition text-center ${
                                      simTimeSlot === slot 
                                        ? 'bg-teal-600 border-teal-600 text-white shadow-xs' 
                                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                                    }`}
                                  >
                                    {slot}
                                  </button>
                                ))}
                              </div>

                              <div className="bg-teal-50/80 border border-teal-200 rounded-xl p-2 flex items-center justify-between text-[10px]">
                                <div className="flex items-center space-x-1.5">
                                  <span className="text-base">🗓️</span>
                                  <div>
                                    <p className="font-bold text-teal-900">Confirmed Booking Slot:</p>
                                    <p className="text-slate-900 font-semibold">{simDate.day} ({simDate.date}) at {simTimeSlot}</p>
                                  </div>
                                </div>
                                <span className="bg-teal-600 text-white font-black px-2 py-0.5 rounded text-[9px]">READY</span>
                              </div>
                            </div>

                            {/* 4. ADDRESS & RECEIPT */}
                            <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-900 text-xs">4. Home Location</span>
                                <button onClick={() => setSimActiveTab('profile')} className="text-[10px] text-teal-700 font-bold hover:underline">
                                  Edit in Profile
                                </button>
                              </div>
                              
                              <p className="text-[11px] text-slate-800 bg-slate-50 p-2 rounded-xl border border-slate-200 font-medium">
                                📍 {simProfile.primaryAddress}
                              </p>
                              <p className="text-[10px] text-slate-500">Patient: {simProfile.fullName} • Phone: {simProfile.phone}</p>

                              {/* RECEIPT */}
                              <div className="bg-slate-50 rounded-xl p-2.5 text-[10px] space-y-1 text-slate-600 border border-slate-200">
                                <div className="flex justify-between">
                                  <span>Specialty Session ({simCategory.name})</span>
                                  <span className="text-slate-900 font-bold">${simCategory.basePriceUSD}.00</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>In-Home Transit & Sterilized Mobile Kit</span>
                                  <span className="text-teal-700 font-bold">FREE INCLUDED</span>
                                </div>
                                <div className="flex justify-between pt-1 border-t border-slate-200 text-xs font-black text-slate-900">
                                  <span>Total Payable (Pay After Visit)</span>
                                  <span className="text-teal-700">${simCategory.basePriceUSD}.00</span>
                                </div>
                              </div>

                              {/* SUBMIT BUTTON */}
                              <button
                                onClick={async () => {
                                  try {
                                    await fetch(`${API_BASE}/requests`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        createdByUserRole: 'PATIENT',
                                        categoryId: simCategory.id,
                                        address: {
                                          addressLine: simProfile.primaryAddress,
                                          city: 'New York',
                                          pinCode: '10024',
                                          coordinates: { latitude: 40.7850, longitude: -73.9680 }
                                        },
                                        painAreas: simPainAreas,
                                        conditionDescription: `[Patient: ${simProfile.fullName}, Age: ${simProfile.age}, Conditions: ${simProfile.conditions.join(', ')}] [VAS ${simPainSeverity}/10] Acute session requested from mobile simulator.`,
                                        preferredTimeWindow: `${simDate.day} (${simDate.date}) at ${simTimeSlot}`,
                                        urgency: simPainSeverity >= 8 ? 'URGENT' : 'NORMAL'
                                      })
                                    });
                                    setSimBookSuccess(true);
                                    fetchData();
                                    setTimeout(() => setSimBookSuccess(false), 4000);
                                  } catch (e) {
                                    showToast('Request logged in offline preview mode.', 'info');
                                  }
                                }}
                                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-extrabold py-2.5 rounded-xl text-xs transition shadow-xs flex items-center justify-center space-x-1.5"
                              >
                                <span>Confirm In-Home Visit (${simCategory.basePriceUSD}.00) →</span>
                              </button>

                              {simBookSuccess && (
                                <div className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-bold p-2 rounded-xl text-center">
                                  🎉 In-Home Visit Confirmed! Check Pending Triage Queue above.
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* TAB 2: LIVE VISIT STATUS */}
                        {simActiveTab === 'status' && (
                          <div className="space-y-3">
                            {appointments.length > 0 ? (
                              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full uppercase">
                                    {appointments[0].status.replace('_', ' ')}
                                  </span>
                                  <span className="text-[11px] text-teal-700 font-bold">${appointments[0].totalAmount}.00</span>
                                </div>
                                <h4 className="font-bold text-slate-900 text-sm">{appointments[0].request?.category?.name}</h4>
                                <p className="text-[11px] text-slate-600">Assigned Clinician: <strong className="text-slate-900">{appointments[0].therapist?.user?.fullName}</strong></p>

                                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5 text-[11px] text-slate-600">
                                  <p className="font-bold text-slate-900 text-[10px] uppercase">Real-Time Progress:</p>
                                  <p>✅ 1. Request Confirmed & Clinician Assigned</p>
                                  <p>🚗 2. Clinician traveling (ETA ~14 mins)</p>
                                  <p>🏡 3. Arrived at door</p>
                                  <p>🩺 4. Treatment active (45 mins)</p>
                                  <p>🎉 5. Complete & Care Plan</p>
                                </div>

                                <div className="bg-teal-50 border border-teal-200 p-2.5 rounded-xl text-center">
                                  <p className="text-[10px] text-teal-900 uppercase font-bold">Cash Collection Security Code (Show Therapist):</p>
                                  <p className="text-base font-black text-teal-700 tracking-widest font-mono">{appointments[0].cashConfirmationOtp || '7492'}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-white rounded-2xl p-6 text-center border border-slate-200 text-slate-500">
                                <p className="text-xs">No active appointment in progress.</p>
                                <button 
                                  onClick={() => setSimActiveTab('request')}
                                  className="mt-3 bg-teal-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                                >
                                  Book First Visit
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* TAB 3: PERSONAL INFO & MEDICAL PROFILE */}
                        {simActiveTab === 'profile' && (
                          <div className="space-y-3">
                            <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex items-center space-x-3">
                              <div className="w-11 h-11 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-sm">
                                {simProfile.fullName.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-xs">{simProfile.fullName}</p>
                                <p className="text-[10px] text-slate-500">{simProfile.email}</p>
                                <span className="inline-block bg-teal-50 text-teal-700 border border-teal-200 text-[8px] font-bold px-1.5 py-0.5 rounded mt-0.5">
                                  🛡️ Verified Patient
                                </span>
                              </div>
                            </div>

                            {/* BASIC DETAILS */}
                            <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs space-y-2">
                              <span className="font-bold text-slate-900 text-xs">Personal & Contact Info</span>
                              <div>
                                <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Full Name</label>
                                <input 
                                  type="text" 
                                  value={simProfile.fullName} 
                                  onChange={e => setSimProfile({ ...simProfile, fullName: e.target.value })}
                                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Phone Number</label>
                                  <input 
                                    type="text" 
                                    value={simProfile.phone} 
                                    onChange={e => setSimProfile({ ...simProfile, phone: e.target.value })}
                                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Age</label>
                                  <input 
                                    type="text" 
                                    value={simProfile.age} 
                                    onChange={e => setSimProfile({ ...simProfile, age: e.target.value })}
                                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* MEDICAL PRECAUTIONS */}
                            <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs space-y-2">
                              <span className="font-bold text-slate-900 text-xs">Medical Conditions & Blood Group</span>
                              <div>
                                <label className="block text-[10px] text-slate-500 font-semibold mb-1">Blood Group</label>
                                <div className="flex flex-wrap gap-1">
                                  {BLOOD_GROUPS.map((bg) => (
                                    <button 
                                      key={bg}
                                      onClick={() => setSimProfile({ ...simProfile, bloodGroup: bg })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                                        simProfile.bloodGroup === bg ? 'bg-rose-600 border-rose-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'
                                      }`}
                                    >
                                      {bg}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] text-slate-500 font-semibold mb-1">Pre-existing Health Conditions</label>
                                <div className="flex flex-wrap gap-1">
                                  {CHRONIC_CONDITIONS.map((cond) => {
                                    const isSel = simProfile.conditions.includes(cond);
                                    return (
                                      <button 
                                        key={cond}
                                        onClick={() => {
                                          if (cond === 'None / Healthy') {
                                            setSimProfile({ ...simProfile, conditions: ['None / Healthy'] });
                                            return;
                                          }
                                          const filtered = simProfile.conditions.filter(c => c !== 'None / Healthy');
                                          if (filtered.includes(cond)) {
                                            setSimProfile({ ...simProfile, conditions: filtered.filter(c => c !== cond) });
                                          } else {
                                            setSimProfile({ ...simProfile, conditions: [...filtered, cond] });
                                          }
                                        }}
                                        className={`px-2 py-1 rounded text-[10px] font-semibold border transition ${
                                          isSel ? 'bg-teal-50 border-teal-600 text-teal-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
                                        }`}
                                      >
                                        {isSel ? '✓ ' : '+ '}{cond}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* PRIMARY ADDRESS */}
                            <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs space-y-2">
                              <span className="font-bold text-slate-900 text-xs">Primary Home Address</span>
                              <div>
                                <input 
                                  type="text" 
                                  value={simProfile.primaryAddress} 
                                  onChange={e => setSimProfile({ ...simProfile, primaryAddress: e.target.value })}
                                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Entry / Buzzer Instructions</label>
                                <input 
                                  type="text" 
                                  value={simProfile.entryNotes} 
                                  onChange={e => setSimProfile({ ...simProfile, entryNotes: e.target.value })}
                                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900"
                                />
                              </div>
                            </div>

                            {/* SAVE BUTTON */}
                            <button 
                              onClick={() => {
                                setSimProfileSavedNotice(true);
                                setTimeout(() => setSimProfileSavedNotice(false), 3000);
                              }}
                              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 rounded-xl text-xs transition shadow-xs"
                            >
                              💾 Save Personal Details
                            </button>

                            {simProfileSavedNotice && (
                              <div className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-bold p-2 rounded-xl text-center">
                                ✅ Personal details updated & synchronized!
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      /* CLINICIAN COCKPIT VIEW IN SIMULATOR */
                      <div className="space-y-3">
                        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-2.5">
                          <div className="w-9 h-9 rounded-full bg-teal-700 flex items-center justify-center font-bold text-white text-xs shadow-xs">
                            SJ
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs">Dr. Sarah Jenkins, PT, DPT</p>
                            <p className="text-[9px] text-teal-700 font-bold">Senior Orthopedic Clinician • NY Board</p>
                          </div>
                        </div>

                        {appointments.length > 0 ? (
                          <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs space-y-2.5">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-xs text-slate-900">Assigned Home Visit</span>
                              <span className="text-[9px] bg-teal-50 text-teal-800 px-2 py-0.5 rounded-full font-bold border border-teal-200">10:00 AM</span>
                            </div>
                            <p className="text-[11px] text-slate-700">Patient: <strong className="text-slate-900">{appointments[0].patient?.fullName}</strong></p>
                            <p className="text-[10px] text-slate-500">📍 {appointments[0].request?.address?.addressLine}</p>

                            <div className="pt-2 border-t border-slate-100 space-y-1.5">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Update Visit Status:</p>
                              <div className="grid grid-cols-2 gap-1.5">
                                <button 
                                  onClick={async () => {
                                    await fetch(`${API_BASE}/appointments/${appointments[0].id}/status`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ status: 'EN_ROUTE' })
                                    });
                                    fetchData();
                                  }}
                                  className="bg-teal-600 hover:bg-teal-700 text-white py-1.5 rounded-xl text-[10px] font-bold transition shadow-xs"
                                >
                                  🚗 1. On The Way
                                </button>
                                <button 
                                  onClick={async () => {
                                    await fetch(`${API_BASE}/appointments/${appointments[0].id}/status`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ status: 'ARRIVED' })
                                    });
                                    fetchData();
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded-xl text-[10px] font-bold transition shadow-xs"
                                >
                                  🏡 2. Arrived
                                </button>
                                <button 
                                  onClick={async () => {
                                    await fetch(`${API_BASE}/appointments/${appointments[0].id}/status`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ status: 'IN_SESSION' })
                                    });
                                    fetchData();
                                  }}
                                  className="bg-teal-800 hover:bg-teal-900 text-white py-1.5 rounded-xl text-[10px] font-bold transition shadow-xs"
                                >
                                  🩺 3. In Session
                                </button>
                                <button 
                                  onClick={async () => {
                                    await fetch(`${API_BASE}/appointments/${appointments[0].id}/status`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ status: 'COMPLETED', clinicalNotes: 'Lumbar mobilization and taught stretches.' })
                                    });
                                    fetchData();
                                  }}
                                  className="bg-emerald-700 hover:bg-emerald-800 text-white py-1.5 rounded-xl text-[10px] font-bold transition shadow-xs"
                                >
                                  ✅ 4. Complete
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white p-6 rounded-2xl text-center text-slate-400 border border-slate-200">
                            <p className="text-xs">No active appointment assigned yet.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Clinical Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 max-w-sm w-full bg-white shadow-2xl rounded-2xl border border-slate-200/80 p-4 flex items-start space-x-3 transition-all duration-300">
          <div className={`p-2 rounded-xl flex-shrink-0 ${
            toast.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
            toast.type === 'error' ? 'bg-rose-100 text-rose-600' :
            'bg-teal-100 text-teal-600'
          }`}>
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {toast.type === 'info' && <Activity className="w-5 h-5" />}
          </div>
          <div className="flex-1 pt-0.5">
            <p className={`text-xs font-bold ${
              toast.type === 'success' ? 'text-emerald-950' :
              toast.type === 'error' ? 'text-rose-950' :
              'text-teal-950'
            }`}>
              {toast.type === 'success' ? 'Action Completed' : toast.type === 'error' ? 'Attention Required' : 'Clinical Notice'}
            </p>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed font-medium">{toast.message}</p>
          </div>
          <button 
            onClick={() => setToast(null)} 
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
