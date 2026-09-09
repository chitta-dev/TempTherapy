import React, { useState, useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
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
  IndianRupee, 
  Search, 
  Filter, 
  LogOut,
  Stethoscope, 
  Smartphone, 
  Send, 
  Check, 
  X, 
  Zap,
  Edit,
  Trash2,
  Lock,
  Mail,
  Tag,
  Layers,
  Award,
  DollarSign
} from 'lucide-react';
import { 
  calculateSessionFee, 
  ServiceRequest, 
  Appointment, 
  TherapistProfile,
  User 
} from '../../../packages/shared/src/index';

const API_BASE = 'http://localhost:4000/api';

interface CategoryItem {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  estimatedDurationMinutes: number;
  iconName: string;
}

interface UserItem {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: string;
  passwordHash?: string;
  createdAt: string;
}

export default function App() {
  // Authentication & Session
  const [currentUser, setCurrentUser] = useState<UserItem | null>(() => {
    try {
      const saved = localStorage.getItem('therapyhub_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loginEmail, setLoginEmail] = useState('admin@therapyhub.health');
  const [loginPassword, setLoginPassword] = useState('password@1234');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'queue' | 'appointments' | 'users' | 'categories' | 'new-request' | 'mobile-sim'>('queue');

  // Live Data State
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [therapists, setTherapists] = useState<TherapistProfile[]>([]);
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [categoriesList, setCategoriesList] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [signalrConnected, setSignalrConnected] = useState(false);

  // Modal State for Dispatch / Assignment
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [selectedTherapistId, setSelectedTherapistId] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'CASH_ON_SERVICE' | 'ONLINE_CARD'>('CASH_ON_SERVICE');

  // New Phone Booking Form State
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCategory, setNewCategory] = useState('cat_ortho');
  const [newPainArea, setNewPainArea] = useState('Lower Back');
  const [newSymptoms, setNewSymptoms] = useState('');
  const [newTimeWindow, setNewTimeWindow] = useState('Morning (9 AM - 12 PM)');
  const [isUrgent, setIsUrgent] = useState(false);

  // User Management Modals
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<'Admin' | 'Dispatcher' | 'Therapist' | 'Patient'>('Dispatcher');
  const [newUserPassword, setNewUserPassword] = useState('password@1234');
  const [newUserLicense, setNewUserLicense] = useState('PT-IND-92041');
  const [newUserExp, setNewUserExp] = useState(5);
  const [userActionLoading, setUserActionLoading] = useState(false);

  // Category Management Modals
  const [showCreateCatModal, setShowCreateCatModal] = useState(false);
  const [showEditCatModal, setShowEditCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryItem | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatPrice, setNewCatPrice] = useState('850');
  const [newCatDuration, setNewCatDuration] = useState('60');
  const [newCatIcon, setNewCatIcon] = useState('Bone');
  const [catActionLoading, setCatActionLoading] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const isAdmin = currentUser && (currentUser.role.toUpperCase().includes('ADMIN'));
  const isDeskBoy = currentUser && (currentUser.role.toUpperCase().includes('DESK') || currentUser.role.toUpperCase().includes('DISPATCH'));

  // Auth Handler
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();

      if (res.ok && data.user) {
        setCurrentUser(data.user);
        localStorage.setItem('therapyhub_admin_user', JSON.stringify(data.user));
        showToast(`Welcome back, ${data.user.fullName}!`, 'success');
      } else {
        setLoginError(data.message || 'Invalid credentials.');
      }
    } catch (err: any) {
      // Fallback local login for instant testing
      if ((loginEmail === 'admin@therapyhub.health' || loginEmail === 'admin@therapycare.health') && loginPassword === 'password@1234') {
        const rootAdmin: UserItem = {
          id: 'usr_admin',
          fullName: 'Dr. Arthur Mitchell (Root Admin)',
          email: 'admin@therapyhub.health',
          phoneNumber: '+91 98765 43210',
          role: 'Admin',
          createdAt: new Date().toISOString()
        };
        setCurrentUser(rootAdmin);
        localStorage.setItem('therapyhub_admin_user', JSON.stringify(rootAdmin));
        showToast('Logged in as Root Admin (offline fallback mode).', 'info');
      } else {
        setLoginError('Could not reach backend API. Make sure backend is running.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('therapyhub_admin_user');
    showToast('You have been logged out.', 'info');
  };

  // Fetch all live data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, aptRes, ptRes, catRes, usrRes] = await Promise.all([
        fetch(`${API_BASE}/requests`),
        fetch(`${API_BASE}/appointments`),
        fetch(`${API_BASE}/therapists`),
        fetch(`${API_BASE}/categories`),
        fetch(`${API_BASE}/users`)
      ]);

      const reqData = await reqRes.json();
      const aptData = await aptRes.json();
      const ptData = await ptRes.json();
      const catData = await catRes.json();
      const usrData = await usrRes.json();

      const reqList = Array.isArray(reqData) ? reqData : (reqData.requests || []);
      const aptList = Array.isArray(aptData) ? aptData : (aptData.appointments || []);
      const ptList = Array.isArray(ptData) ? ptData : (ptData.therapists || []);
      const catList = Array.isArray(catData) ? catData : [];
      const usrList = Array.isArray(usrData) ? usrData : [];

      setRequests(reqList);
      setAppointments(aptList);
      setTherapists(ptList);
      setCategoriesList(catList);
      setUsersList(usrList);

      if (ptList.length > 0 && !selectedTherapistId) {
        setSelectedTherapistId(ptList[0].id);
      }
      if (catList.length > 0 && !newCategory) {
        setNewCategory(catList[0].id);
      }
    } catch (err) {
      console.warn('Backend API connection fallback, using local state.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();

      // Configure Real-time SignalR Connection to .NET Core Backend
      const connection = new signalR.HubConnectionBuilder()
        .withUrl('http://localhost:4000/hubs/therapy')
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      connection.start()
        .then(() => {
          setSignalrConnected(true);
          connection.invoke('JoinDispatchDesk');
        })
        .catch(err => {
          console.warn('[SignalR] Connection notice:', err);
        });

      connection.onreconnected(() => {
        setSignalrConnected(true);
        connection.invoke('JoinDispatchDesk');
        fetchData();
      });

      connection.onclose(() => {
        setSignalrConnected(false);
      });

      connection.on('ReceiveNewRequest', (newReq: any) => {
        fetchData();
        showToast(`⚡ Real-time alert: New intake request for ${newReq.targetArea || 'Evaluation'}!`, 'info');
      });

      connection.on('ReceiveAppointmentAssigned', (apt: any) => {
        fetchData();
        showToast(`⚡ Real-time dispatch: Clinician assigned to Apt #${apt.id?.slice(-4)}!`, 'success');
      });

      connection.on('ReceiveVisitStatusUpdated', (payload: any) => {
        fetchData();
        showToast(`🚗 Real-time update: Visit #${payload.appointmentId?.slice(-4)} is now ${payload.status}!`, 'info');
      });

      connection.on('ReceivePaymentSettled', (payload: any) => {
        fetchData();
        showToast(`💰 Payment Settled: ₹${payload.totalFee || 850} via ${payload.paymentMode}!`, 'success');
      });

      return () => {
        connection.stop();
      };
    }
  }, [currentUser]);

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
          assignedByUserId: currentUser?.id || 'usr_desk_1',
          paymentMode
        })
      });
      const data = await res.json();
      if (data.success || res.ok) {
        setSelectedRequest(null);
        showToast('Therapist dispatched and appointment scheduled!', 'success');
        fetchData();
        setActiveTab('appointments');
      } else {
        showToast(data.message || 'Dispatch failed', 'error');
      }
    } catch (e) {
      showToast('Therapist assigned in local session.', 'info');
      setSelectedRequest(null);
    }
  };

  // Handle DeskBoy Collecting & Settling Payment
  const handleDeskSettlePayment = async (appointmentId: string, mode: 'CASH' | 'UPI') => {
    try {
      const res = await fetch(`${API_BASE}/appointments/${appointmentId}/settle-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMode: mode })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Payment recorded as SETTLED via ${mode}!`, 'success');
        fetchData();
      } else {
        showToast(data.message || 'Payment settlement failed', 'error');
      }
    } catch (e) {
      showToast('Payment settled locally.', 'info');
    }
  };

  // Handle Creating New User (Admin Only)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) {
      showToast('Name and Email are required.', 'error');
      return;
    }

    setUserActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newUserName,
          email: newUserEmail,
          phoneNumber: newUserPhone,
          role: newUserRole,
          password: newUserPassword || 'password@1234',
          licenseNumber: newUserRole === 'Therapist' ? newUserLicense : undefined,
          experienceYears: newUserRole === 'Therapist' ? newUserExp : undefined
        })
      });
      const data = await res.json();

      if (res.ok) {
        const phoneNotice = newUserPhone ? ` SMS invitation dispatched to ${newUserPhone}.` : '';
        showToast(`User ${newUserName} (${newUserRole}) created!${phoneNotice}`, 'success');
        setShowCreateUserModal(false);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPhone('');
        fetchData();
      } else {
        showToast(data.message || 'Failed to create user', 'error');
      }
    } catch (err) {
      showToast('Error connecting to backend API.', 'error');
    } finally {
      setUserActionLoading(false);
    }
  };

  // Handle Editing User (Admin Only)
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setUserActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: editingUser.fullName,
          email: editingUser.email,
          phoneNumber: editingUser.phoneNumber,
          role: editingUser.role,
          password: editingUser.passwordHash
        })
      });
      const data = await res.json();

      if (res.ok) {
        showToast(`User ${editingUser.fullName} updated successfully!`, 'success');
        setShowEditUserModal(false);
        setEditingUser(null);
        fetchData();
      } else {
        showToast(data.message || 'Failed to update user', 'error');
      }
    } catch (err) {
      showToast('Error connecting to backend API.', 'error');
    } finally {
      setUserActionLoading(false);
    }
  };

  // Handle Deleting User (Admin Only)
  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete user "${name}"?`)) return;

    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        showToast(`User "${name}" deleted.`, 'success');
        fetchData();
      } else {
        showToast(data.message || 'Failed to delete user', 'error');
      }
    } catch (err) {
      showToast('Error deleting user.', 'error');
    }
  };

  // Handle Creating Category (Admin Only)
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName || !newCatPrice) {
      showToast('Category name and base price are required.', 'error');
      return;
    }

    setCatActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatName,
          description: newCatDesc,
          basePrice: parseFloat(newCatPrice),
          estimatedDurationMinutes: parseInt(newCatDuration) || 60,
          iconName: newCatIcon
        })
      });
      const data = await res.json();

      if (res.ok) {
        showToast(`Category "${newCatName}" created successfully!`, 'success');
        setShowCreateCatModal(false);
        setNewCatName('');
        setNewCatDesc('');
        setNewCatPrice('850');
        fetchData();
      } else {
        showToast(data.message || 'Failed to create category', 'error');
      }
    } catch (err) {
      showToast('Error creating category.', 'error');
    } finally {
      setCatActionLoading(false);
    }
  };

  // Handle Editing Category (Admin Only)
  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat) return;

    setCatActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/categories/${editingCat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingCat.name,
          description: editingCat.description,
          basePrice: editingCat.basePrice,
          estimatedDurationMinutes: editingCat.estimatedDurationMinutes,
          iconName: editingCat.iconName
        })
      });
      const data = await res.json();

      if (res.ok) {
        showToast(`Category "${editingCat.name}" updated successfully!`, 'success');
        setShowEditCatModal(false);
        setEditingCat(null);
        fetchData();
      } else {
        showToast(data.message || 'Failed to update category', 'error');
      }
    } catch (err) {
      showToast('Error updating category.', 'error');
    } finally {
      setCatActionLoading(false);
    }
  };

  // Handle New Phone Request Submission (DeskBoy / Admin)
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
          createdByUserId: currentUser?.id || 'usr_desk_1',
          categoryId: newCategory,
          address: {
            addressLine: newAddress,
            city: 'New Delhi',
            pinCode: '110001',
            coordinates: { latitude: 28.6139, longitude: 77.2090 }
          },
          painAreas: [newPainArea],
          conditionDescription: newSymptoms || 'Inquiry taken via front-desk call.',
          preferredTimeWindow: newTimeWindow,
          urgency: isUrgent ? 'URGENT' : 'NORMAL'
        })
      });
      const data = await res.json();
      if (data.success || res.ok) {
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

  // Helper calculation for assigning therapist
  const selectedTherapistObj = therapists.find(t => t.id === selectedTherapistId) || therapists[0];
  const selectedCatObj = categoriesList.find(c => c.id === (selectedRequest?.categoryId || (selectedRequest as any)?.category?.id));
  const estimatedBasePrice = selectedCatObj ? selectedCatObj.basePrice : 850;

  // =========================================================================
  // 1. LOGIN SCREEN (RENDERED WHEN NOT AUTHENTICATED)
  // =========================================================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 font-sans text-slate-100">
        <div className="w-full max-w-md bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-teal-500/20 text-white">
              <Stethoscope className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">TherapyHub</h1>
            <p className="text-xs text-slate-400">Clinical Administration & Front-Desk Operations</p>
          </div>

          {loginError && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs px-4 py-3 rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  placeholder="admin@therapyhub.health"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold py-3 rounded-xl transition text-sm shadow-md shadow-teal-600/30 flex items-center justify-center space-x-2"
            >
              {loginLoading ? <span>Authenticating...</span> : <span>Sign In to Clinical Portal ➔</span>}
            </button>
          </form>

          {/* QUICK CREDENTIAL TEST SELECTORS */}
          <div className="border-t border-slate-700/80 pt-5 space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
              Quick Role Test Credentials:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setLoginEmail('admin@therapyhub.health');
                  setLoginPassword('password@1234');
                }}
                className="bg-slate-700/50 hover:bg-slate-700 border border-slate-600/60 p-2.5 rounded-xl text-left transition text-xs"
              >
                <div className="font-bold text-teal-400 flex items-center space-x-1">
                  <span>👑 Admin User</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">admin@therapyhub.health</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginEmail('desk.alex@therapyhub.health');
                  setLoginPassword('password@1234');
                }}
                className="bg-slate-700/50 hover:bg-slate-700 border border-slate-600/60 p-2.5 rounded-xl text-left transition text-xs"
              >
                <div className="font-bold text-sky-400 flex items-center space-x-1">
                  <span>🚴 DeskBoy User</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">desk.alex@therapyhub...</div>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center">
              Password for all accounts: <code className="text-teal-300">password@1234</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. MAIN LOGGED-IN CLINICAL PORTAL
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased">
      {/* TOAST ALERT */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center space-x-2 text-xs font-bold transition-all ${
          toast.type === 'success' ? 'bg-teal-50 border-teal-300 text-teal-900' :
          toast.type === 'error' ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-sky-50 border-sky-300 text-sky-900'
        }`}>
          <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ️'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* TOP CLINICAL PORTAL HEADER */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 lg:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="bg-teal-700 p-2.5 rounded-2xl shadow-sm text-white flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-black tracking-tight text-slate-900">TherapyHub</h1>
              <span className="bg-teal-50 border border-teal-200/80 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {isAdmin ? 'ADMIN CONTROL' : 'CARE DESK'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">In-Home Physiotherapy Dispatch & Operations (₹ INR)</p>
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

          <div className="flex items-center space-x-3 bg-slate-100/80 px-3.5 py-1.5 rounded-xl border border-slate-200/80">
            <div className="w-8 h-8 rounded-full bg-teal-700 text-white font-bold flex items-center justify-center text-xs shadow-xs">
              {currentUser.fullName.charAt(0)}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-slate-900 leading-tight">{currentUser.fullName}</p>
              <p className="text-[10px] text-teal-700 font-bold uppercase tracking-wider">{currentUser.role}</p>
            </div>
            <button 
              onClick={handleLogout}
              title="Sign Out"
              className="text-slate-400 hover:text-rose-600 transition ml-2 p-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
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
              {requests.filter(r => r.status === 'REQUEST_SUBMITTED' || (r.status as any) === 'PENDING_TRIAGE').length}
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
            <span>Active Dispatches & Payments</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'appointments' ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {appointments.length}
            </span>
          </button>

          {/* ADMIN ONLY TABS: USER MANAGEMENT & CATEGORY PRICING */}
          {isAdmin && (
            <>
              <button 
                onClick={() => setActiveTab('users')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-2 ${
                  activeTab === 'users' 
                    ? 'bg-white text-teal-800 shadow-xs border border-slate-200/60' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>Staff & Users</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'users' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {usersList.length}
                </span>
              </button>

              <button 
                onClick={() => setActiveTab('categories')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-2 ${
                  activeTab === 'categories' 
                    ? 'bg-white text-teal-800 shadow-xs border border-slate-200/60' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                <span>Service Catalog & Pricing (₹)</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'categories' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {categoriesList.length}
                </span>
              </button>
            </>
          )}

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

        <div className="flex items-center space-x-2.5">
          <div className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-bold border transition shadow-2xs ${
            signalrConnected 
              ? 'bg-emerald-50 border-emerald-200/90 text-emerald-800' 
              : 'bg-amber-50 border-amber-200/90 text-amber-800'
          }`}>
            <span className={`w-2 h-2 rounded-full ${signalrConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            <span>{signalrConnected ? '⚡ .NET Core SignalR Live' : 'Connecting Real-Time...'}</span>
          </div>
        </div>
      </nav>

      {/* CONTENT AREA */}
      <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* ========================================================================= */}
        {/* TAB 1: PENDING REQUESTS QUEUE (OPERATIONAL - FOR DESKBOY & ADMIN) */}
        {/* ========================================================================= */}
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

            {requests.filter(r => r.status === 'REQUEST_SUBMITTED' || (r.status as any) === 'PENDING_TRIAGE').length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200/70 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8 text-teal-600" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Dispatch Queue is Clear</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">All incoming patient requests have been scheduled and assigned to clinicians.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requests.filter(r => r.status === 'REQUEST_SUBMITTED' || (r.status as any) === 'PENDING_TRIAGE').map((req) => {
                  const categoryName = req.category?.name || 'Orthopedic & Spine Care';
                  const patientName = req.patient?.fullName || 'Patient';
                  const patientPhone = (req.patient as any)?.phoneNumber || (req.patient as any)?.phone || '+91 98765 43210';
                  const address = (req as any).addressLine || req.address?.addressLine || '742 Evergreen Terrace, New Delhi';
                  const timeSlot = (req as any).preferredTimeSlot || req.preferredTimeWindow || '10:00 AM';
                  const painFocus = Array.isArray(req.painAreas) && req.painAreas.length > 0 
                    ? req.painAreas.join(', ') 
                    : ((req as any).targetArea || 'Evaluation');
                  const condition = (req as any).chiefComplaint || req.conditionDescription || 'Needs clinical evaluation and targeted therapy.';
                  const price = (req.category as any)?.basePrice || 850;

                  return (
                    <div key={req.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-teal-400 transition-all duration-200 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200/80">
                              {categoryName}
                            </span>
                            {req.urgency === 'URGENT' && (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                                🚨 URGENT
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-black text-slate-900 mt-1.5">{patientName}</h3>
                          <p className="text-xs text-slate-500 flex items-center space-x-1.5 mt-0.5 font-medium">
                            <Phone className="w-3.5 h-3.5 text-teal-600" />
                            <span>{patientPhone}</span>
                          </p>
                        </div>
                        <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200/60 font-semibold">
                          {req.id}
                        </span>
                      </div>

                      <div className="bg-slate-50/80 p-3.5 rounded-xl text-xs space-y-2 text-slate-700 border border-slate-100">
                        <p className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                          <span className="font-medium text-slate-800">{address}</span>
                        </p>
                        <p className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="font-medium text-slate-800">{timeSlot}</span>
                        </p>
                        <p className="flex items-center space-x-2">
                          <Activity className="w-4 h-4 text-teal-600 shrink-0" />
                          <span className="font-bold text-teal-900">Focus: {painFocus}</span>
                        </p>
                        <p className="text-slate-500 italic mt-1 border-t border-slate-200/50 pt-1.5">
                          "{condition}"
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Base Session Fee</span>
                          <span className="text-base font-black text-teal-800">₹{price}.00</span>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedRequest(req);
                          }}
                          className="bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
                        >
                          <span>Dispatch Clinician ➔</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ACTIVE DISPATCHES & PAYMENT SETTLEMENT (DESKBOY CAN COLLECT MONEY) */}
        {/* ========================================================================= */}
        {activeTab === 'appointments' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Active Dispatches & Payment Operations</h2>
                <p className="text-xs text-slate-500 mt-0.5">Live home visits, clinician progress, and DeskBoy payment settlement in Rupees (₹).</p>
              </div>
              <button 
                onClick={fetchData} 
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-xl transition shadow-xs"
              >
                <span>🔄 Refresh Dispatches</span>
              </button>
            </div>

            {appointments.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200/70 flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-8 h-8 text-teal-600" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No Dispatches Scheduled Yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Triage requests from the Pending Queue or take phone bookings to dispatch therapists.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((apt: any) => {
                  const patientName = apt.patient?.fullName || 'Patient';
                  const therapistName = apt.therapist?.user?.fullName || 'Dr. Sarah Jenkins, PT';
                  const categoryName = apt.request?.category?.name || 'Orthopedic Rehabilitation';
                  const totalFee = apt.totalFee || apt.totalAmount || 850;
                  const paymentStatus = apt.paymentStatus || 'PENDING';
                  const status = apt.status || 'ASSIGNED';

                  return (
                    <div key={apt.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-teal-300 transition space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200/70">
                            #{apt.id}
                          </span>
                          <span className="text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200/80">
                            {categoryName}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full border ${
                            status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                            status === 'IN_SESSION' ? 'bg-blue-50 text-blue-800 border-blue-300 animate-pulse' :
                            status === 'ARRIVED' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {status.replace('_', ' ')}
                          </span>
                          <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full border ${
                            paymentStatus === 'SETTLED' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}>
                            ₹{totalFee}.00 • {paymentStatus}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="space-y-1">
                          <span className="text-slate-400 font-bold uppercase text-[10px] block">Patient Information</span>
                          <p className="font-bold text-slate-900 text-sm">{patientName}</p>
                          <p className="text-slate-500">{apt.patient?.phoneNumber || apt.patient?.phone || '+91 98765 43210'}</p>
                          <p className="text-slate-500">{apt.request?.addressLine || apt.request?.address?.addressLine || 'Indiranagar, Bengaluru'}</p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-slate-400 font-bold uppercase text-[10px] block">Assigned Clinician</span>
                          <p className="font-bold text-slate-900 text-sm">{therapistName}</p>
                          <p className="text-slate-500">License: {apt.therapist?.licenseNumber || 'PT-IND-9204'}</p>
                          <p className="text-teal-700 font-bold">Fixed Discharge OTP: 8844</p>
                        </div>

                        {/* DESKBOY PAYMENT COLLECTION BOX */}
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                          <span className="text-slate-500 font-bold uppercase text-[10px] block">Front-Desk Payment Settlement</span>
                          {paymentStatus === 'SETTLED' ? (
                            <div className="text-emerald-700 font-bold flex items-center space-x-1 text-xs">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Paid & Settled (₹{totalFee}.00 via {apt.paymentMode || 'CASH'})</span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-[11px] text-amber-800 font-medium">Payment of ₹{totalFee}.00 is pending collection:</p>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleDeskSettlePayment(apt.id, 'CASH')}
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-2 rounded-lg text-xs transition shadow-xs text-center"
                                >
                                  💵 Collect Cash
                                </button>
                                <button
                                  onClick={() => handleDeskSettlePayment(apt.id, 'UPI')}
                                  className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold py-1.5 px-2 rounded-lg text-xs transition shadow-xs text-center"
                                >
                                  📱 Collect UPI
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: USER MANAGEMENT (ADMIN ONLY) */}
        {/* ========================================================================= */}
        {activeTab === 'users' && isAdmin && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Staff & User Management</h2>
                <p className="text-xs text-slate-500 mt-0.5">Admin-only console to create, edit, and assign roles for administrators, deskboys, and clinicians.</p>
              </div>
              <button 
                onClick={() => setShowCreateUserModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs flex items-center space-x-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Create New User</span>
              </button>
            </div>

            {/* USERS ROSTER TABLE */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="p-4">User Details</th>
                    <th className="p-4">Role Permission</th>
                    <th className="p-4">Contact Phone</th>
                    <th className="p-4">Default Password</th>
                    <th className="p-4">Created Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {usersList.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition">
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{u.fullName}</div>
                        <div className="text-slate-400 font-mono text-[11px]">{u.email}</div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {u.id}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          u.role === 'Admin' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                          u.role === 'Dispatcher' ? 'bg-sky-50 text-sky-800 border-sky-200' :
                          u.role === 'Therapist' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {u.role === 'Dispatcher' ? '🚴 DeskBoy (Dispatcher)' : u.role}
                        </span>
                      </td>
                      <td className="p-4 font-medium">{u.phoneNumber || '—'}</td>
                      <td className="p-4 font-mono text-slate-500">password@1234</td>
                      <td className="p-4 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingUser({ ...u });
                            setShowEditUserModal(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-800 font-bold p-1"
                          title="Edit User"
                        >
                          <Edit className="w-4 h-4 inline" />
                        </button>
                        {u.id !== 'usr_admin' && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.fullName)}
                            className="text-rose-500 hover:text-rose-700 font-bold p-1"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SERVICE CATALOG & PRICING IN ₹ (ADMIN ONLY) */}
        {/* ========================================================================= */}
        {activeTab === 'categories' && isAdmin && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Service Catalog & Pricing (₹ INR)</h2>
                <p className="text-xs text-slate-500 mt-0.5">Configure clinical therapy categories, visit duration, and base prices in Rupees.</p>
              </div>
              <button 
                onClick={() => setShowCreateCatModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs flex items-center space-x-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Add Therapy Category</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoriesList.map(cat => (
                <div key={cat.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-emerald-400 transition space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">{cat.id}</span>
                      <h3 className="text-base font-black text-slate-900 mt-0.5">{cat.name}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg">
                      🩺
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2">{cat.description || 'Targeted in-home physiotherapy session.'}</p>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Base Price (INR)</span>
                      <span className="text-base font-black text-emerald-700">₹{cat.basePrice}.00</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Duration</span>
                      <span className="font-bold text-slate-700">⏱ {cat.estimatedDurationMinutes} mins</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setEditingCat({ ...cat });
                        setShowEditCatModal(true);
                      }}
                      className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition"
                    >
                      Edit Price & Duration
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: NEW PHONE BOOKING INTAKE (DESKBOY & ADMIN) */}
        {/* ========================================================================= */}
        {activeTab === 'new-request' && (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Create Front-Desk Phone Booking</h2>
              <p className="text-xs text-slate-500 mt-0.5">Take an appointment request from a caller and immediately place it into the triage queue.</p>
            </div>

            <form onSubmit={handleCreatePhoneRequest} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Patient Full Name</label>
                  <input
                    type="text"
                    value={newPatientName}
                    onChange={e => setNewPatientName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newPatientPhone}
                    onChange={e => setNewPatientPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Home Address</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={e => setNewAddress(e.target.value)}
                  placeholder="Street, Apartment / Flat No, Sector, City"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Therapy Specialty</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {categoriesList.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} (₹{cat.basePrice})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Time Window</label>
                  <input
                    type="text"
                    value={newTimeWindow}
                    onChange={e => setNewTimeWindow(e.target.value)}
                    placeholder="Tomorrow at 10:30 AM"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Chief Complaint / Restricting Symptoms</label>
                <textarea
                  value={newSymptoms}
                  onChange={e => setNewSymptoms(e.target.value)}
                  placeholder="e.g. Severe lower back pain radiating down right leg..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="urgentCheck"
                  checked={isUrgent}
                  onChange={e => setIsUrgent(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="urgentCheck" className="text-xs font-bold text-rose-700">
                  Mark as Urgent Priority (+₹200 express dispatch)
                </label>
              </div>

              <button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl transition text-xs shadow-xs"
              >
                Submit & Queue for Dispatch ➔
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: MOBILE APP SIMULATOR */}
        {/* ========================================================================= */}
        {activeTab === 'mobile-sim' && (
          <div className="max-w-md mx-auto bg-slate-900 rounded-[40px] p-4 shadow-2xl border-4 border-slate-800">
            <div className="bg-white rounded-[32px] overflow-hidden min-h-[600px] flex flex-col font-sans">
              <div className="bg-teal-700 p-4 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm">TherapyHub Mobile</h3>
                  <p className="text-[10px] text-teal-200">Patient & Clinician Mobile Portal</p>
                </div>
                <span className="bg-teal-800/80 px-2 py-0.5 rounded text-[10px] font-mono">Expo Go</span>
              </div>
              <div className="p-6 text-center space-y-4 flex-1 flex flex-col justify-center items-center">
                <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 mx-auto">
                  <Smartphone className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base">Mobile App Running on Metro</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                    Connect your real phone via Expo Go app, or test the responsive interface on port 8081.
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-left text-xs space-y-1 w-full">
                  <p className="font-bold text-slate-700">Features Active:</p>
                  <p className="text-slate-600">✓ Completed visits locked in read-only mode</p>
                  <p className="text-slate-600">✓ All pricing in Rupees (₹ INR)</p>
                  <p className="text-slate-600">✓ Fixed Discharge OTP: 8844</p>
                  <p className="text-slate-600">✓ SignalR live real-time location & status</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: DISPATCH THERAPIST / SCHEDULE APPOINTMENT */}
      {/* ========================================================================= */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Dispatch Verified Clinician</h3>
                <p className="text-xs text-slate-500">Assign a licensed physiotherapist to this in-home request.</p>
              </div>
              <button 
                onClick={() => setSelectedRequest(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs space-y-1">
              <p><strong className="text-slate-700">Patient:</strong> {selectedRequest.patient?.fullName || 'Patient'}</p>
              <p><strong className="text-slate-700">Address:</strong> {(selectedRequest as any).addressLine || selectedRequest.address?.addressLine}</p>
              <p><strong className="text-slate-700">Specialty:</strong> {selectedRequest.category?.name || 'Orthopedic & Spine'}</p>
              <p><strong className="text-slate-700">Base Fee:</strong> ₹{estimatedBasePrice}.00</p>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">Select Clinician from Roster</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {therapists.map(pt => (
                  <label 
                    key={pt.id}
                    onClick={() => setSelectedTherapistId(pt.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition ${
                      selectedTherapistId === pt.id ? 'border-teal-500 bg-teal-50/50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-slate-900">{pt.user?.fullName || 'Dr. Sarah Jenkins'}</p>
                      <p className="text-slate-500 text-[11px]">{pt.licenseNumber || 'PT-IND-8941'} • ★ 4.9 (128 visits)</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Available</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Session Fee</span>
                <span className="text-lg font-black text-teal-800">₹{estimatedBasePrice}.00</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignTherapist}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Confirm Dispatch ➔
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE NEW USER (ADMIN ONLY) */}
      {/* ========================================================================= */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Create New User Account</h3>
              <button onClick={() => setShowCreateUserModal(false)} className="text-slate-400 p-1">✕</button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="e.g. Alex Miller"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  placeholder="alex.desk@therapyhub.health"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role Type</label>
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="Dispatcher">🚴 DeskBoy (Front-Desk / Operations)</option>
                  <option value="Admin">👑 Administrator (Full Control)</option>
                  <option value="Therapist">🩺 Certified Physiotherapist</option>
                  <option value="Patient">👤 Patient Account</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newUserPhone}
                  onChange={e => setNewUserPhone(e.target.value)}
                  placeholder="+91 98765 00000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                <input
                  type="text"
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  placeholder="password@1234"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              {newUserRole === 'Therapist' && (
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/60 space-y-2">
                  <p className="text-[11px] font-bold text-emerald-900">Clinician Credentials:</p>
                  <input
                    type="text"
                    value={newUserLicense}
                    onChange={e => setNewUserLicense(e.target.value)}
                    placeholder="Medical Board License No."
                    className="w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs"
                  />
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={userActionLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs"
                >
                  {userActionLoading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT USER (ADMIN ONLY) */}
      {/* ========================================================================= */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Edit User Profile</h3>
              <button onClick={() => setShowEditUserModal(false)} className="text-slate-400 p-1">✕</button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingUser.fullName}
                  onChange={e => setEditingUser({ ...editingUser, fullName: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role</label>
                <select
                  value={editingUser.role}
                  onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="Dispatcher">🚴 DeskBoy (Dispatcher)</option>
                  <option value="Admin">👑 Admin</option>
                  <option value="Therapist">🩺 Therapist</option>
                  <option value="Patient">👤 Patient</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={editingUser.phoneNumber || ''}
                  onChange={e => setEditingUser({ ...editingUser, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                <input
                  type="text"
                  value={editingUser.passwordHash || 'password@1234'}
                  onChange={e => setEditingUser({ ...editingUser, passwordHash: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditUserModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={userActionLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs"
                >
                  {userActionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CREATE / EDIT CATEGORY (ADMIN ONLY) */}
      {/* ========================================================================= */}
      {showCreateCatModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Add Therapy Discipline (₹)</h3>
              <button onClick={() => setShowCreateCatModal(false)} className="text-slate-400 p-1">✕</button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category Name</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="e.g. Sports Injury Rehabilitation"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  value={newCatDesc}
                  onChange={e => setNewCatDesc(e.target.value)}
                  placeholder="Clinical treatment protocols and target patient conditions..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Base Price in Rupees (₹)</label>
                  <input
                    type="number"
                    value={newCatPrice}
                    onChange={e => setNewCatPrice(e.target.value)}
                    placeholder="850"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    value={newCatDuration}
                    onChange={e => setNewCatDuration(e.target.value)}
                    placeholder="60"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateCatModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={catActionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs"
                >
                  {catActionLoading ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CATEGORY MODAL */}
      {showEditCatModal && editingCat && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Edit Category: {editingCat.name}</h3>
              <button onClick={() => setShowEditCatModal(false)} className="text-slate-400 p-1">✕</button>
            </div>

            <form onSubmit={handleUpdateCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category Name</label>
                <input
                  type="text"
                  value={editingCat.name}
                  onChange={e => setEditingCat({ ...editingCat, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  value={editingCat.description || ''}
                  onChange={e => setEditingCat({ ...editingCat, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Base Price in Rupees (₹)</label>
                  <input
                    type="number"
                    value={editingCat.basePrice}
                    onChange={e => setEditingCat({ ...editingCat, basePrice: parseFloat(e.target.value) || 0 })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    value={editingCat.estimatedDurationMinutes}
                    onChange={e => setEditingCat({ ...editingCat, estimatedDurationMinutes: parseInt(e.target.value) || 60 })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditCatModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={catActionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs"
                >
                  {catActionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
