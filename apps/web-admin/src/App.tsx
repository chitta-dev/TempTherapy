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
  DollarSign,
  Copy,
  ExternalLink,
  Key,
  Eye,
  EyeOff,
  MessageSquare,
  CreditCard
} from 'lucide-react';
import { UsersGrid } from './components/UsersGrid';
import { ServiceCatalogGrid } from './components/ServiceCatalogGrid';
import { PendingTriageGrid } from './components/PendingTriageGrid';
import { ActiveDispatchesGrid } from './components/ActiveDispatchesGrid';
import { PaymentsGrid } from './components/PaymentsGrid';
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
  email?: string;
  phoneNumber?: string;
  role: string;
  isActivated?: boolean;
  passwordHash?: string;
  createdAt: string;
}

interface PasswordPolicyState {
  hasMinLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasDigit: boolean;
  hasSpecial: boolean;
  isNotDefault: boolean;
  score: number;
  label: string;
  barColor: string;
  textColor: string;
  isValid: boolean;
}

const evaluatePasswordPolicy = (pass: string): PasswordPolicyState => {
  if (!pass) {
    return {
      hasMinLength: false,
      hasUpper: false,
      hasLower: false,
      hasDigit: false,
      hasSpecial: false,
      isNotDefault: false,
      score: 0,
      label: 'Too Weak',
      barColor: 'bg-slate-200',
      textColor: 'text-slate-400',
      isValid: false
    };
  }

  const hasMinLength = pass.length >= 8;
  const hasUpper = /[A-Z]/.test(pass);
  const hasLower = /[a-z]/.test(pass);
  const hasDigit = /[0-9]/.test(pass);
  const hasSpecial = /[^A-Za-z0-9]/.test(pass);
  const isNotDefault = pass.trim().toLowerCase() !== 'password@1234';

  let score = 0;
  if (hasMinLength) score++;
  if (pass.length >= 12) score++;
  if (hasUpper && hasLower) score++;
  if (hasDigit) score++;
  if (hasSpecial) score++;

  const isValid = hasMinLength && hasUpper && hasLower && hasDigit && hasSpecial && isNotDefault;

  let label = 'Very Weak';
  let barColor = 'bg-rose-500';
  let textColor = 'text-rose-600';

  if (score === 2) {
    label = 'Weak';
    barColor = 'bg-orange-500';
    textColor = 'text-orange-600';
  } else if (score === 3) {
    label = 'Fair';
    barColor = 'bg-amber-500';
    textColor = 'text-amber-600';
  } else if (score === 4) {
    label = 'Strong';
    barColor = 'bg-lime-600';
    textColor = 'text-lime-600';
  } else if (score >= 5) {
    label = 'Very Strong';
    barColor = 'bg-emerald-600';
    textColor = 'text-emerald-600';
  }

  return {
    hasMinLength,
    hasUpper,
    hasLower,
    hasDigit,
    hasSpecial,
    isNotDefault,
    score: Math.min(5, Math.max(1, score)),
    label,
    barColor,
    textColor,
    isValid
  };
};

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
  const [activeTab, setActiveTab] = useState<'queue' | 'appointments' | 'payments' | 'users' | 'categories' | 'new-request'>('queue');

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

  // New Patient Request Form State
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientEmail, setNewPatientEmail] = useState('');
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

  // User Activation & Reset Password Flow State
  const [createdActivationInfo, setCreatedActivationInfo] = useState<{ 
    name: string; 
    role: string; 
    email?: string; 
    phone?: string; 
    link?: string; 
    welcomeEmail?: string; 
    welcomeSms?: string; 
    initialPassword?: string 
  } | null>(null);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');
  const [resetErrorMessage, setResetErrorMessage] = useState('');
  const [showRequestResetModal, setShowRequestResetModal] = useState(false);
  const [requestResetEmail, setRequestResetEmail] = useState('');
  const [requestResetLoading, setRequestResetLoading] = useState(false);

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
    try {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      const token = params.get('token');
      const email = params.get('email');
      if ((action === 'reset-password' || action === 'activate') && token) {
        setResetToken(token);
        setResetEmail(email ? decodeURIComponent(email) : '');
        setShowResetPasswordModal(true);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

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

  // Handle Resetting Payment to PENDING
  const handleResetPayment = async (appointmentId: string) => {
    try {
      const res = await fetch(`${API_BASE}/appointments/${appointmentId}/reset-payment`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Payment status marked as PENDING.', 'info');
        fetchData();
      } else {
        showToast(data.message || 'Failed to reset payment', 'error');
      }
    } catch {
      showToast('Error resetting payment.', 'error');
    }
  };

  // Handle Creating New User (Admin Only)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) {
      showToast('Full Name is required.', 'error');
      return;
    }

    if (newUserRole === 'Patient') {
      if (!newUserPhone.trim()) {
        showToast('Mobile phone number is required for Patient accounts.', 'error');
        return;
      }
    } else if (newUserRole === 'Therapist') {
      if (!newUserEmail.trim() || !newUserPhone.trim()) {
        showToast('Email and Mobile Phone Number are required for Therapist accounts.', 'error');
        return;
      }
    } else {
      if (!newUserEmail.trim()) {
        showToast('Email is required for staff accounts.', 'error');
        return;
      }
    }

    const isMobileRole = newUserRole === 'Patient' || newUserRole === 'Therapist';
    let passwordToSubmit = 'password@1234';

    if (!isMobileRole && newUserPassword) {
      passwordToSubmit = newUserPassword.trim();
      if (passwordToSubmit !== 'password@1234') {
        const policyCheck = evaluatePasswordPolicy(passwordToSubmit);
        if (!policyCheck.isValid) {
          showToast('Staff password does not meet password policy requirements (8+ chars, uppercase, lowercase, digit, special symbol).', 'error');
          return;
        }
      }
    }

    setUserActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newUserName.trim(),
          email: newUserEmail.trim() ? newUserEmail.trim() : undefined,
          phoneNumber: newUserPhone.trim() ? newUserPhone.trim() : undefined,
          role: newUserRole,
          password: isMobileRole ? undefined : passwordToSubmit,
          licenseNumber: newUserRole === 'Therapist' ? newUserLicense : undefined,
          experienceYears: newUserRole === 'Therapist' ? newUserExp : undefined
        })
      });
      const data = await res.json();

      if (res.ok) {
        const successMsg = newUserRole === 'Patient'
          ? `Patient ${newUserName} registered! Welcome SMS dispatched to ${newUserPhone}.`
          : newUserRole === 'Therapist'
          ? `Therapist ${newUserName} created! Welcome email dispatched to ${newUserEmail}.`
          : `User ${newUserName} (${newUserRole}) created! Activation link ready.`;
        showToast(successMsg, 'success');
        setShowCreateUserModal(false);
        setCreatedActivationInfo({
          name: newUserName,
          role: newUserRole,
          email: newUserEmail.trim() || undefined,
          phone: newUserPhone.trim() || undefined,
          link: data.activationLink || (newUserEmail.trim() ? `http://localhost:3000/?action=reset-password&token=${data.activationToken}&email=${encodeURIComponent(newUserEmail.trim())}` : undefined),
          welcomeEmail: data.welcomeEmail,
          welcomeSms: data.welcomeSms,
          initialPassword: isMobileRole ? 'password@1234' : passwordToSubmit
        });
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPhone('');
        setNewUserPassword('password@1234');
        fetchData();
      } else {
        const errorText = data.message || (data.errors && data.errors[0]) || 'Failed to create user';
        showToast(errorText, 'error');
      }
    } catch (err) {
      showToast('Error connecting to backend API.', 'error');
    } finally {
      setUserActionLoading(false);
    }
  };

  // Handle Editing User (Admin Only) - Password is non-editable in web application
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
          role: editingUser.role
          // NOTE: Password is intentionally NOT editable in the web application
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

  // Handle Resending Activation / Welcome Email / SMS
  const handleResendActivation = async (userId: string, email: string, name: string, role?: string, phone?: string) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/resend-activation`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Notification dispatched!`, 'success');
        setCreatedActivationInfo({
          name,
          role: data.role || role || 'Staff/User',
          email: email || undefined,
          phone: phone || data.phoneNumber || undefined,
          link: data.activationLink,
          welcomeEmail: data.welcomeEmail,
          welcomeSms: data.welcomeSms
        });
      } else {
        showToast(data.message || 'Failed to dispatch notification.', 'error');
      }
    } catch {
      showToast('Error contacting backend.', 'error');
    }
  };

  // Handle Reset Password / Activation Link Submission
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErrorMessage('');

    const policy = evaluatePasswordPolicy(newResetPassword);
    if (!policy.isValid) {
      const errorMsg = !policy.hasMinLength ? 'Password must be at least 8 characters long.' :
                       !policy.hasUpper ? 'Password must contain at least one uppercase letter (A-Z).' :
                       !policy.hasLower ? 'Password must contain at least one lowercase letter (a-z).' :
                       !policy.hasDigit ? 'Password must contain at least one numeric digit (0-9).' :
                       !policy.hasSpecial ? 'Password must contain at least one special character (!@#$%^&*).' :
                       'Password cannot be the default initial password ("password@1234").';
      setResetErrorMessage(errorMsg);
      showToast(errorMsg, 'error');
      return;
    }

    if (newResetPassword !== confirmResetPassword) {
      setResetErrorMessage('Passwords do not match.');
      showToast('Passwords do not match.', 'error');
      return;
    }

    if (!resetToken) {
      setResetErrorMessage('Missing or invalid activation token.');
      showToast('Missing activation token.', 'error');
      return;
    }

    setResetPasswordLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail,
          token: resetToken,
          newPassword: newResetPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setResetSuccessMessage('Your password has been securely updated and encrypted with salt and hash! You can now log in.');
        showToast('Password updated successfully! Please log in.', 'success');
        setLoginEmail(resetEmail);
        setLoginPassword('');
        setResetErrorMessage('');
        // Clean URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        const errorText = data.message || (data.errors && data.errors[0]) || 'Failed to update password.';
        setResetErrorMessage(errorText);
        showToast(errorText, 'error');
      }
    } catch {
      setResetErrorMessage('Error connecting to backend API.');
      showToast('Error connecting to backend API.', 'error');
    } finally {
      setResetPasswordLoading(false);
    }
  };

  // Handle Requesting Password Reset Link (from Login Screen)
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestResetEmail) {
      showToast('Please enter your account email.', 'error');
      return;
    }

    setRequestResetLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/request-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: requestResetEmail })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Password reset link dispatched!', 'success');
        setShowRequestResetModal(false);
        setCreatedActivationInfo({
          name: 'Staff Account',
          role: 'User',
          email: requestResetEmail,
          link: data.activationLink
        });
        setRequestResetEmail('');
      } else {
        showToast(data.message || 'Account not found.', 'error');
      }
    } catch {
      showToast('Error connecting to backend API.', 'error');
    } finally {
      setRequestResetLoading(false);
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

  // Handle New Patient Request Submission (DeskBoy & Admin)
  // Registers a new patient user and creates a pending triage request in the queue
  const handleCreatePatientRequest = async (e: React.FormEvent) => {
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
          patientName: newPatientName.trim(),
          patientPhone: newPatientPhone.trim(),
          patientEmail: newPatientEmail.trim() || undefined,
          categoryId: newCategory,
          addressLine: newAddress.trim(),
          targetArea: newPainArea || 'Lower Back',
          chiefComplaint: newSymptoms || 'New patient clinical request taken via front desk.',
          preferredTimeSlot: newTimeWindow || 'Morning (9 AM - 12 PM)',
          urgency: isUrgent ? 'URGENT' : 'ROUTINE'
        })
      });
      const data = await res.json();
      if (res.ok || data.success) {
        setNewPatientName('');
        setNewPatientPhone('');
        setNewPatientEmail('');
        setNewAddress('');
        setNewSymptoms('');
        setIsUrgent(false);
        showToast(data.message || `New patient registered and pending triage request created!`, 'success');
        fetchData();
        setActiveTab('queue');
      } else {
        showToast(data.message || 'Failed to create patient request.', 'error');
      }
    } catch (e) {
      showToast('Error connecting to backend API.', 'error');
    }
  };

  // Helper calculation for assigning therapist
  const selectedTherapistObj = therapists.find(t => t.id === selectedTherapistId) || therapists[0];
  const selectedCatObj = categoriesList.find(c => c.id === (selectedRequest?.categoryId || (selectedRequest as any)?.category?.id));
  const estimatedBasePrice = selectedCatObj ? selectedCatObj.basePrice : 850;

  // =========================================================================
  // RESET PASSWORD & ACCOUNT ACTIVATION MODAL
  // =========================================================================
  const renderResetPasswordModal = () => {
    if (!showResetPasswordModal) return null;

    const policy = evaluatePasswordPolicy(newResetPassword);
    const passwordsMatch = newResetPassword && confirmResetPassword && newResetPassword === confirmResetPassword;
    const canSubmit = policy.isValid && passwordsMatch && !resetPasswordLoading;

    return (
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-3xl max-w-lg w-full p-7 shadow-2xl space-y-5 border border-slate-200 my-8">
          <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Key className="w-7 h-7" />
          </div>

          <div className="text-center space-y-1">
            <h3 className="text-lg font-black text-slate-900">Set Your Secure Password</h3>
            <p className="text-xs text-slate-500">
              Welcome to TherapyHub! Update your password below. It will be encrypted and stored using cryptographic salt & hash with password reuse prevention.
            </p>
          </div>

          {resetErrorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Password Policy Check</p>
                <p className="text-rose-700 text-[11px]">{resetErrorMessage}</p>
              </div>
            </div>
          )}

          {resetSuccessMessage ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs space-y-1 text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                <p className="font-bold text-sm">Account Activated Successfully!</p>
                <p className="text-slate-600">{resetSuccessMessage}</p>
              </div>
              <button
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setResetSuccessMessage('');
                  setResetErrorMessage('');
                  setResetToken(null);
                  setNewResetPassword('');
                  setConfirmResetPassword('');
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl transition shadow-xs"
              >
                Proceed to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Account Email</label>
                <input
                  type="email"
                  value={resetEmail}
                  readOnly
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 cursor-not-allowed"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">New Password</label>
                  {newResetPassword && (
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      policy.score <= 2 ? 'bg-rose-100 text-rose-700' :
                      policy.score === 3 ? 'bg-amber-100 text-amber-700' :
                      policy.score === 4 ? 'bg-lime-100 text-lime-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {policy.label}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPasswordText ? "text" : "password"}
                    value={newResetPassword}
                    onChange={e => {
                      setNewResetPassword(e.target.value);
                      if (resetErrorMessage) setResetErrorMessage('');
                    }}
                    required
                    placeholder="Enter strong password (e.g. Strong#2026)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-indigo-500 pr-10 text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* REAL-TIME STRENGTH METER BAR */}
                {newResetPassword && (
                  <div className="mt-2 space-y-2">
                    <div className="grid grid-cols-5 gap-1.5 h-1.5">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <div
                          key={lvl}
                          className={`rounded-full transition-all duration-300 ${
                            lvl <= policy.score ? policy.barColor : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>

                    {/* INTERACTIVE POLICY CHECKLIST */}
                    <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1 text-[11px]">
                      <div className="flex items-center space-x-2">
                        {policy.hasMinLength ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0 flex items-center justify-center text-[9px] text-slate-400">✕</div>
                        )}
                        <span className={policy.hasMinLength ? 'text-emerald-800 font-medium' : 'text-slate-500'}>
                          At least 8 characters
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {policy.hasUpper ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0 flex items-center justify-center text-[9px] text-slate-400">✕</div>
                        )}
                        <span className={policy.hasUpper ? 'text-emerald-800 font-medium' : 'text-slate-500'}>
                          At least 1 uppercase letter (A-Z)
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {policy.hasLower ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0 flex items-center justify-center text-[9px] text-slate-400">✕</div>
                        )}
                        <span className={policy.hasLower ? 'text-emerald-800 font-medium' : 'text-slate-500'}>
                          At least 1 lowercase letter (a-z)
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {policy.hasDigit ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0 flex items-center justify-center text-[9px] text-slate-400">✕</div>
                        )}
                        <span className={policy.hasDigit ? 'text-emerald-800 font-medium' : 'text-slate-500'}>
                          At least 1 number (0-9)
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {policy.hasSpecial ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0 flex items-center justify-center text-[9px] text-slate-400">✕</div>
                        )}
                        <span className={policy.hasSpecial ? 'text-emerald-800 font-medium' : 'text-slate-500'}>
                          At least 1 special character (!@#$%^&*...)
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {policy.isNotDefault ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-rose-300 shrink-0 flex items-center justify-center text-[9px] text-rose-500">✕</div>
                        )}
                        <span className={policy.isNotDefault ? 'text-emerald-800 font-medium' : 'text-rose-600 font-medium'}>
                          Cannot be default password ('password@1234') or old password
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type={showPasswordText ? "text" : "password"}
                  value={confirmResetPassword}
                  onChange={e => {
                    setConfirmResetPassword(e.target.value);
                    if (resetErrorMessage) setResetErrorMessage('');
                  }}
                  required
                  placeholder="Re-enter password"
                  className={`w-full px-3 py-2 border rounded-xl text-xs focus:bg-white text-slate-900 ${
                    confirmResetPassword
                      ? (newResetPassword === confirmResetPassword ? 'border-emerald-400 bg-emerald-50/20' : 'border-rose-400 bg-rose-50/20')
                      : 'border-slate-200 bg-slate-50'
                  }`}
                />
                {confirmResetPassword && (
                  <div className="flex items-center space-x-1.5 text-[11px] mt-1">
                    {newResetPassword === confirmResetPassword ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">Passwords match</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                        <span className="text-rose-600 font-semibold">Passwords do not match</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-[11px] text-indigo-950 space-y-1">
                <div className="flex items-center space-x-1 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Enterprise Cryptographic Security</span>
                </div>
                <p className="text-slate-600 text-[10px] leading-relaxed">
                  Your password is encrypted with <strong>PBKDF2-HMAC-SHA256 (100,000 rounds)</strong> using a unique 128-bit cryptographic salt. History tracking prevents reusing current or previous passwords.
                </p>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPasswordModal(false);
                    setResetErrorMessage('');
                    window.history.replaceState({}, document.title, window.location.pathname);
                  }}
                  className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`flex-1 font-bold text-xs py-2.5 rounded-xl transition shadow-xs flex items-center justify-center space-x-1 ${
                    canSubmit
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {resetPasswordLoading ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  };

  // =========================================================================
  // REQUEST PASSWORD RESET / ACTIVATION LINK MODAL
  // =========================================================================
  const renderRequestResetModal = () => {
    if (!showRequestResetModal) return null;

    return (
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-lg font-black text-slate-900">Request Password Setup / Reset</h3>
            <p className="text-xs text-slate-500">
              Enter your staff or account email address. We will generate and dispatch your secure activation link.
            </p>
          </div>
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Account Email</label>
              <input
                type="email"
                value={requestResetEmail}
                onChange={e => setRequestResetEmail(e.target.value)}
                required
                placeholder="e.g. admin@therapyhub.health"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRequestResetModal(false)}
                className="flex-1 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={requestResetLoading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 rounded-xl transition shadow-xs"
              >
                {requestResetLoading ? 'Sending...' : 'Send Link'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // =========================================================================
  // ACTIVATION NOTIFICATION DISPATCHED CONFIRMATION DIALOG
  // =========================================================================
  const renderActivationDispatchedModal = () => {
    if (!createdActivationInfo) return null;

    const isTherapist = createdActivationInfo.role === 'Therapist';
    const isPatient = createdActivationInfo.role === 'Patient';

    const defaultTherapistEmailText = `Welcome to TherapyHub! Your therapist account has been created by the administrator. You can now login with your mobile number: ${createdActivationInfo.phone || '[Phone Number]'} using OTP 1234. Once logged in, biometric authentication will be enabled for 30 days.`;

    const defaultPatientSmsText = `Welcome to TherapyHub! Your patient profile has been registered by the Care Desk. You can now login with your mobile number: ${createdActivationInfo.phone || '[Phone Number]'} using OTP 1234. On your first login, please provide your basic details to activate your account.`;

    const therapistEmailBody = createdActivationInfo.welcomeEmail || defaultTherapistEmailText;
    const patientSmsBody = createdActivationInfo.welcomeSms || defaultPatientSmsText;

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
            isTherapist ? 'bg-emerald-100 text-emerald-600' :
            isPatient ? 'bg-teal-100 text-teal-600' : 'bg-indigo-100 text-indigo-600'
          }`}>
            {isPatient ? <MessageSquare className="w-6 h-6" /> : <Mail className="w-6 h-6" />}
          </div>

          <div className="text-center space-y-1">
            <h3 className="text-lg font-black text-slate-900">
              {isTherapist ? 'Welcome Email Dispatched!' :
               isPatient ? 'Welcome SMS Dispatched!' : 'Activation Email Dispatched!'}
            </h3>
            <p className="text-xs text-slate-500">
              {isTherapist ? (
                <>Clinician account created for <span className="font-bold text-slate-800">Dr. {createdActivationInfo.name}</span></>
              ) : isPatient ? (
                <>Patient profile registered for <span className="font-bold text-slate-800">{createdActivationInfo.name}</span></>
              ) : (
                <>Staff account created for <span className="font-bold text-slate-800">{createdActivationInfo.name}</span> ({createdActivationInfo.role})</>
              )}
            </p>
          </div>

          {/* ROLE-SPECIFIC CONTENT BOX */}
          {isTherapist ? (
            <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span className="font-bold">Clinician Email:</span>
                <span className="font-mono text-emerald-800 font-semibold">{createdActivationInfo.email || '—'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="font-bold">Mobile Phone:</span>
                <span className="font-mono text-emerald-800 font-semibold">{createdActivationInfo.phone || '—'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="font-bold">Auth Method:</span>
                <span className="text-emerald-700 font-semibold">Mobile OTP (1234) + 30-Day Biometrics</span>
              </div>
              <div className="space-y-1 pt-2 border-t border-emerald-200/60">
                <span className="font-bold text-emerald-900 block text-[11px]">Test Welcome Email Message:</span>
                <div className="p-2.5 bg-white border border-emerald-200 rounded-lg text-[11px] text-slate-700 leading-relaxed select-all whitespace-pre-wrap">
                  {therapistEmailBody}
                </div>
              </div>
            </div>
          ) : isPatient ? (
            <div className="p-3.5 bg-teal-50/70 rounded-xl border border-teal-200/80 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span className="font-bold">Mobile Phone:</span>
                <span className="font-mono text-teal-800 font-semibold">{createdActivationInfo.phone || '—'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="font-bold">Email Address:</span>
                <span className="text-slate-500 italic">{createdActivationInfo.email || 'Not Provided (Email is optional for patients)'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="font-bold">First Login:</span>
                <span className="text-teal-700 font-semibold">OTP (1234) → Mandatory Basic Details</span>
              </div>
              <div className="space-y-1 pt-2 border-t border-teal-200/60">
                <span className="font-bold text-teal-900 block text-[11px]">Test Welcome SMS Message:</span>
                <div className="p-2.5 bg-white border border-teal-200 rounded-lg text-[11px] text-slate-700 leading-relaxed select-all whitespace-pre-wrap">
                  {patientSmsBody}
                </div>
              </div>
              <p className="text-[10px] text-slate-500 italic pt-1">
                ℹ️ Email is not mandatory for patients. Account unlocks for doctor search & scheduling once the patient submits mandatory basic details.
              </p>
            </div>
          ) : (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span className="font-bold">Recipient:</span>
                <span className="font-mono text-indigo-600">{createdActivationInfo.email}</span>
              </div>
              {createdActivationInfo.initialPassword && (
                <div className="flex justify-between text-slate-600">
                  <span className="font-bold">Initial Password:</span>
                  <span className="font-mono text-slate-500">password@1234 (Salt-Hashed)</span>
                </div>
              )}
              <div className="space-y-1 pt-1 border-t border-slate-200/60">
                <span className="font-bold text-slate-700 block text-[11px]">Activation & Password Setup Link:</span>
                <div className="p-2 bg-white border border-slate-200 rounded-lg font-mono text-[11px] break-all text-indigo-600 select-all">
                  {createdActivationInfo.link}
                </div>
              </div>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="flex space-x-2 pt-1">
            {isTherapist ? (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(therapistEmailBody);
                  showToast('Welcome email text copied to clipboard!', 'success');
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center space-x-1 shadow-xs"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Email Text</span>
              </button>
            ) : isPatient ? (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(patientSmsBody);
                  showToast('Welcome SMS text copied to clipboard!', 'success');
                }}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center space-x-1 shadow-xs"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy SMS Text</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    if (createdActivationInfo.link) {
                      navigator.clipboard.writeText(createdActivationInfo.link);
                      showToast('Activation link copied to clipboard!', 'success');
                    }
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center space-x-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </button>
                <button
                  onClick={() => {
                    if (createdActivationInfo.link) {
                      window.location.href = createdActivationInfo.link;
                    }
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center space-x-1 shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Test Reset Flow</span>
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => setCreatedActivationInfo(null)}
            className="w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-600 pt-1"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  };

  // =========================================================================
  // 1. LOGIN SCREEN (RENDERED WHEN NOT AUTHENTICATED)
  // =========================================================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 font-sans text-slate-100 relative">
        {renderResetPasswordModal()}
        {renderRequestResetModal()}
        {renderActivationDispatchedModal()}
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

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setShowRequestResetModal(true)}
                className="text-xs text-teal-400 hover:text-teal-300 font-medium transition underline"
              >
                Received an activation email or forgot password?
              </button>
            </div>
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
            <p className="text-xs text-slate-500 font-medium">In-Home Physiotherapy Dispatch & Operations</p>
          </div>
        </div>

        {/* ROLE INDICATOR & ACTIONS */}
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setActiveTab('new-request')}
            className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ New Patient Request</span>
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
            <span>Active Dispatches</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'appointments' ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {appointments.length}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('payments')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-2 ${
              activeTab === 'payments' 
                ? 'bg-white text-teal-800 shadow-xs border border-slate-200/60' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            <span>Payments & Ledger (₹)</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'payments' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {appointments.filter((a: any) => a.paymentStatus === 'PENDING').length > 0 
                ? `${appointments.filter((a: any) => a.paymentStatus === 'PENDING').length} Pending`
                : `${appointments.filter((a: any) => a.paymentStatus === 'SETTLED').length} Settled`}
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
        </div>
      </nav>

      {/* CONTENT AREA */}
      <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* ========================================================================= */}
        {/* TAB 1: PENDING REQUESTS QUEUE (OPERATIONAL - FOR DESKBOY & ADMIN) */}
        {activeTab === 'queue' && (
          <PendingTriageGrid
            requests={requests}
            categories={categoriesList}
            onRefresh={fetchData}
            onDispatchClinician={(req) => setSelectedRequest(req)}
          />
        )}

        {/* TAB 2: ACTIVE DISPATCHES & HOME VISITS */}
        {activeTab === 'appointments' && (
          <ActiveDispatchesGrid
            appointments={appointments}
            therapists={therapists}
            onRefresh={fetchData}
            onSettlePayment={handleDeskSettlePayment}
            onResetPayment={handleResetPayment}
          />
        )}

        {/* TAB 3: PAYMENTS & FINANCIAL SETTLEMENT */}
        {activeTab === 'payments' && (
          <PaymentsGrid
            appointments={appointments}
            onRefresh={fetchData}
            onSettlePayment={handleDeskSettlePayment}
            onResetPayment={handleResetPayment}
          />
        )}

        {/* TAB 4: USER MANAGEMENT (ADMIN ONLY) */}
        {activeTab === 'users' && isAdmin && (
          <UsersGrid
            users={usersList}
            isAdmin={!!isAdmin}
            onOpenCreateUser={() => setShowCreateUserModal(true)}
            onOpenEditUser={(u) => {
              setEditingUser({ ...u });
              setShowEditUserModal(true);
            }}
            onDeleteUser={handleDeleteUser}
            onResendActivation={handleResendActivation}
          />
        )}

        {/* TAB 5: SERVICE CATALOG & PRICING IN ₹ (ADMIN ONLY) */}
        {activeTab === 'categories' && isAdmin && (
          <ServiceCatalogGrid
            categories={categoriesList}
            isAdmin={!!isAdmin}
            onOpenCreateCategory={() => setShowCreateCatModal(true)}
            onOpenEditCategory={(cat) => {
              setEditingCat({ ...cat });
              setShowEditCatModal(true);
            }}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 5: NEW PATIENT REQUEST (DESKBOY & ADMIN) */}
        {/* ========================================================================= */}
        {activeTab === 'new-request' && (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">New Patient Request</h2>
              <p className="text-xs text-slate-500 mt-0.5">Register a new patient and instantly create a pending triage request for clinical dispatch.</p>
            </div>

            <form onSubmit={handleCreatePatientRequest} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Patient Full Name *</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={newPatientEmail}
                    onChange={e => setNewPatientEmail(e.target.value)}
                    placeholder="rajesh.sharma@example.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Home Address *</label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={e => setNewAddress(e.target.value)}
                    placeholder="Indiranagar 100ft Road, Bengaluru"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
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
                Register Patient & Create Triage Request ➔
              </button>
            </form>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {newUserRole === 'Patient' ? 'Email Address (Optional - Not Required for Patients)' : 'Email Address *'}
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  placeholder={newUserRole === 'Patient' ? 'Optional (patients authenticate via Phone OTP)' : 'alex.desk@therapyhub.health'}
                  required={newUserRole !== 'Patient'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role Type</label>
                <select
                  value={newUserRole}
                  onChange={e => {
                    const role = e.target.value as any;
                    setNewUserRole(role);
                    if (role === 'Patient' || role === 'Therapist') {
                      setNewUserPassword('password@1234');
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="Dispatcher">🚴 DeskBoy (Front-Desk / Operations)</option>
                  <option value="Admin">👑 Administrator (Full Control)</option>
                  <option value="Therapist">🩺 Certified Physiotherapist</option>
                  <option value="Patient">👤 Patient Account</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {newUserRole === 'Patient' || newUserRole === 'Therapist' ? 'Mobile Phone Number * (Required for OTP Sign-In)' : 'Phone Number (Optional)'}
                </label>
                <input
                  type="text"
                  value={newUserPhone}
                  onChange={e => setNewUserPhone(e.target.value)}
                  placeholder="+91 98765 00000"
                  required={newUserRole === 'Patient' || newUserRole === 'Therapist'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Initial Password</label>
                  {(newUserRole === 'Patient' || newUserRole === 'Therapist') ? (
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold border border-amber-200">
                      🔒 Disabled for Mobile Roles (OTP Login)
                    </span>
                  ) : (
                    <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-semibold border border-indigo-200">
                      🔓 Enabled for Staff Roles
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={(newUserRole === 'Patient' || newUserRole === 'Therapist') ? 'password@1234' : newUserPassword}
                  disabled={newUserRole === 'Patient' || newUserRole === 'Therapist'}
                  onChange={e => setNewUserPassword(e.target.value)}
                  placeholder="password@1234"
                  className={`w-full px-3 py-2 border rounded-xl text-xs font-mono transition ${
                    (newUserRole === 'Patient' || newUserRole === 'Therapist')
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed select-none'
                      : 'bg-slate-50 text-slate-900 border-slate-200 focus:bg-white focus:border-indigo-500'
                  }`}
                />

                {/* COMPACT PASSWORD STRENGTH CHECK FOR CUSTOM PASSWORD IN CREATE USER */}
                {(newUserRole === 'Admin' || newUserRole === 'Dispatcher') && newUserPassword && newUserPassword !== 'password@1234' && (() => {
                  const createPolicy = evaluatePasswordPolicy(newUserPassword);
                  return (
                    <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-[10px]">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-600">Password Policy Check:</span>
                        <span className={createPolicy.textColor}>{createPolicy.label} ({createPolicy.score}/5)</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1 h-1">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <div
                            key={lvl}
                            className={`rounded-full ${
                              lvl <= createPolicy.score ? createPolicy.barColor : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[10px] pt-1">
                        <span className={createPolicy.hasMinLength ? 'text-emerald-700' : 'text-slate-400'}>
                          {createPolicy.hasMinLength ? '✓' : '•'} 8+ Characters
                        </span>
                        <span className={createPolicy.hasUpper ? 'text-emerald-700' : 'text-slate-400'}>
                          {createPolicy.hasUpper ? '✓' : '•'} Uppercase (A-Z)
                        </span>
                        <span className={createPolicy.hasLower ? 'text-emerald-700' : 'text-slate-400'}>
                          {createPolicy.hasLower ? '✓' : '•'} Lowercase (a-z)
                        </span>
                        <span className={createPolicy.hasDigit ? 'text-emerald-700' : 'text-slate-400'}>
                          {createPolicy.hasDigit ? '✓' : '•'} Number (0-9)
                        </span>
                        <span className={createPolicy.hasSpecial ? 'text-emerald-700' : 'text-slate-400'}>
                          {createPolicy.hasSpecial ? '✓' : '•'} Special Symbol
                        </span>
                        <span className={createPolicy.isNotDefault ? 'text-emerald-700' : 'text-rose-600 font-bold'}>
                          {createPolicy.isNotDefault ? '✓ Unique' : '✕ Default Password'}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <p className="text-[10px] text-slate-500 mt-1">
                  {(newUserRole === 'Patient' || newUserRole === 'Therapist')
                    ? '🔒 Password field is disabled for Patients & Therapists. Mobile users authenticate via OTP. Password is saved as salt & hash of password@1234.'
                    : '🔑 Password field is enabled for Admin & DeskBoy. Leave blank for default password@1234 or set custom compliant password. User will receive an activation email link to set/reset password.'}
                </p>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Password</label>
                  <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium border border-slate-200">
                    🔒 Non-Editable
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    readOnly
                    value="•••••••• (Encrypted with Salt & Hash)"
                    className="w-full px-3 py-2 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl text-xs font-mono cursor-not-allowed select-none pr-28"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (editingUser) {
                        handleResendActivation(editingUser.id, editingUser.email, editingUser.fullName);
                      }
                    }}
                    className="absolute right-1.5 top-1.5 px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-indigo-600 transition flex items-center space-x-1 shadow-xs"
                    title="Send reset password email to this user"
                  >
                    <Mail className="w-3 h-3" />
                    <span>Send Reset</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Password cannot be edited directly in the web application for security. To update password, dispatch a password reset activation link.
                </p>
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

      {/* RENDER MODALS: ACTIVATION DISPATCH, RESET PASSWORD, AND REQUEST RESET */}
      {renderActivationDispatchedModal()}
      {renderResetPasswordModal()}
      {renderRequestResetModal()}
    </div>
  );
}
