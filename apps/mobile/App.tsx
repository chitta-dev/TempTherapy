import React, { useState, useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  SafeAreaView, 
  StatusBar,
  Platform,
  Modal,
  NativeModules
} from 'react-native';
import { 
  THERAPY_CATEGORIES, 
  TherapyCategory, 
  Appointment 
} from './src/shared';

// Dynamically resolve local development PC IP for physical devices running Expo Go
const getHostAddress = () => {
  try {
    const scriptURL = NativeModules.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return match[1];
      }
    }
  } catch {
    // Fallback if NativeModules is not ready
  }
  return '192.168.68.199';
};

const HOST_IP = getHostAddress();
const API_BASE = `http://${HOST_IP}:4000/api`;
const HUB_URL = `http://${HOST_IP}:4000/hubs/therapy`;

// Date Options (Next 6 Days)
const DATE_OPTIONS = [
  { id: 'd_today', dayName: 'Today', dateStr: 'Sep 9', badge: 'Fastest' },
  { id: 'd_tom', dayName: 'Tomorrow', dateStr: 'Sep 10', badge: 'Popular' },
  { id: 'd_thu', dayName: 'Thursday', dateStr: 'Sep 11' },
  { id: 'd_fri', dayName: 'Friday', dateStr: 'Sep 12' },
  { id: 'd_sat', dayName: 'Saturday', dateStr: 'Sep 13' },
  { id: 'd_sun', dayName: 'Sunday', dateStr: 'Sep 14' },
];

// Time Periods and Interactive Slots
const TIME_PERIODS = [
  { 
    id: 'morning', 
    label: '🌅 Morning', 
    sub: '8 AM - 12 PM',
    slots: ['08:30 AM', '09:30 AM', '10:45 AM', '11:30 AM'] 
  },
  { 
    id: 'afternoon', 
    label: '☀️ Afternoon', 
    sub: '12 PM - 5 PM',
    slots: ['01:15 PM', '02:30 PM', '03:45 PM', '04:30 PM'] 
  },
  { 
    id: 'evening', 
    label: '🌙 Evening', 
    sub: '5 PM - 8 PM',
    slots: ['05:30 PM', '06:30 PM', '07:15 PM', '08:00 PM'] 
  }
];

// Quick Pain Area Chips
const QUICK_PAIN_AREAS = [
  { id: 'lower_back', label: '🦴 Lower Back', defaultArea: 'Lower Back' },
  { id: 'neck', label: '🧣 Neck & Cervical', defaultArea: 'Neck / Cervical' },
  { id: 'knee', label: '🦵 Knee Joint', defaultArea: 'Knee Joint' },
  { id: 'shoulder', label: '🏊 Shoulder', defaultArea: 'Shoulder' },
  { id: 'sciatica', label: '⚡ Sciatic Nerve', defaultArea: 'Sciatic Nerve' },
  { id: 'hip', label: '🚶 Hip & Pelvis', defaultArea: 'Hip & Pelvis' },
  { id: 'post_op', label: '🩹 Post-Surgery', defaultArea: 'Post-Surgical' },
  { id: 'ankle', label: '🦶 Ankle & Foot', defaultArea: 'Ankle & Foot' }
];

// Medical Conditions Tags
const CHRONIC_CONDITIONS = [
  'Hypertension',
  'Diabetes Type 2',
  'Spinal Surgery History',
  'Total Knee / Hip Replacement',
  'Osteoporosis',
  'Cardiac Pacemaker',
  'None / Healthy'
];

const BLOOD_GROUPS = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'];

export default function App() {
  const [roleMode, setRoleMode] = useState<'PATIENT' | 'THERAPIST'>('PATIENT');
  const [activeTab, setActiveTab] = useState<'request' | 'status' | 'profile'>('request');
  
  // Custom Toast Notification State
  const [toast, setToast] = useState<{
    visible: boolean;
    type: 'SUCCESS' | 'INFO' | 'WARNING' | 'ERROR';
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'SUCCESS',
    title: '',
    message: ''
  });

  const showToast = (type: 'SUCCESS' | 'INFO' | 'WARNING' | 'ERROR', title: string, message: string) => {
    setToast({ visible: true, type, title, message });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  // Custom Booking Confirmation Modal State
  const [bookingModal, setBookingModal] = useState<{
    visible: boolean;
    details?: {
      specialty: string;
      window: string;
      address: string;
      amount: number;
      patientName: string;
    };
  }>({
    visible: false
  });

  // Custom Call / Chat Modal State
  const [commModal, setCommModal] = useState<{
    visible: boolean;
    mode: 'CALL' | 'CHAT';
    name: string;
    phone: string;
  }>({
    visible: false,
    mode: 'CALL',
    name: '',
    phone: ''
  });

  // Patient Personal Info State
  const [patientProfile, setPatientProfile] = useState({
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

  // Booking Form Interactive State
  const [selectedCategory, setSelectedCategory] = useState<TherapyCategory>(THERAPY_CATEGORIES[0]);
  const [selectedDate, setSelectedDate] = useState(DATE_OPTIONS[1]); // Tomorrow
  const [selectedPeriod, setSelectedPeriod] = useState(TIME_PERIODS[0].id); // Morning
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('10:45 AM');
  
  // Pain and Condition State
  const [selectedPainAreas, setSelectedPainAreas] = useState<string[]>(['Lower Back', 'Sciatic Nerve']);
  const [painSeverity, setPainSeverity] = useState<number>(6); // 1 to 10 VAS
  const [symptoms, setSymptoms] = useState('Sharp lumbar stiffness on bending forward, radiates slightly to left hamstring.');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'CARD'>('CASH');

  // Active Backend Appointment
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);

  // Therapist Cockpit State
  const [ptStatus, setPtStatus] = useState<'ASSIGNED' | 'EN_ROUTE' | 'ARRIVED' | 'IN_SESSION' | 'COMPLETED'>('ASSIGNED');
  const [clinicalNotes, setClinicalNotes] = useState('');

  // 2-Step Completion & Payment Flow States
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showCompletionFlow, setShowCompletionFlow] = useState(false);
  const [completionStep, setCompletionStep] = useState<'PAYMENT' | 'OTP'>('PAYMENT');
  const [completionOtp, setCompletionOtp] = useState('8844'); // Fixed OTP for instant testability
  const [postPainRating, setPostPainRating] = useState<number>(3);
  const [isSettling, setIsSettling] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Settle Payment Handler
  const handleSettlePayment = async (mode: 'CASH' | 'UPI') => {
    setIsSettling(true);
    try {
      if (activeAppointment) {
        await fetch(`${API_BASE}/appointments/${activeAppointment.id}/settle-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentMode: mode })
        });
        setActiveAppointment(prev => prev ? { ...prev, paymentStatus: 'SETTLED', paymentMode: mode } : null);
      }
      showToast('SUCCESS', '💰 Payment Settled', `Payment of ₹850.00 recorded via ${mode}. Ready for discharge.`);
      setCompletionStep('OTP');
    } catch (e) {
      showToast('SUCCESS', 'Payment Recorded', `Payment recorded via ${mode} (local mode).`);
      setCompletionStep('OTP');
    } finally {
      setIsSettling(false);
    }
  };

  // Finalize Completion Handler with Fixed OTP (8844) Check
  const handleFinalizeCompletion = async () => {
    if (completionOtp.trim() !== '8844' && completionOtp.trim() !== activeAppointment?.completionOtp) {
      showToast('ERROR', 'Invalid OTP', 'Please enter the 4-digit code (8844) shown on the patient screen.');
      return;
    }

    setIsCompleting(true);
    try {
      if (activeAppointment) {
        const res = await fetch(`${API_BASE}/appointments/${activeAppointment.id}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            otp: completionOtp.trim(),
            clinicalNotes: clinicalNotes || 'Session completed successfully. Mobilization performed, exercises taught.',
            postTreatmentPainScore: postPainRating
          })
        });
        const data = await res.json();
        if (!data.success && data.requiresPayment) {
          showToast('WARNING', 'Payment Required', data.message);
          setCompletionStep('PAYMENT');
          setIsCompleting(false);
          return;
        }
      }
      setPtStatus('COMPLETED');
      setShowCompletionFlow(false);
      showToast('SUCCESS', '🎉 Session Completed!', 'Clinical discharge verified and SOAP report finalized.');
      refreshActiveData();
    } catch (e) {
      setPtStatus('COMPLETED');
      setShowCompletionFlow(false);
      showToast('SUCCESS', 'Session Completed', 'Session completed in local mode.');
    } finally {
      setIsCompleting(false);
    }
  };

  // Fetch initial active appointment from backend
  const refreshActiveData = async () => {
    try {
      const res = await fetch(`${API_BASE}/appointments`);
      const data = await res.json();
      const aptList = Array.isArray(data) ? data : (data.appointments || []);
      if (aptList.length > 0) {
        setActiveAppointment(aptList[0]);
        setPtStatus(aptList[0].status);
      }
    } catch (e) {
      console.log('Using local state mode');
    }
  };

  useEffect(() => {
    refreshActiveData();

    // SignalR Real-Time Telemetry to .NET Core Backend
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.start()
      .then(() => {
        connection.invoke('JoinPatientChannel', 'usr_patient_1');
      })
      .catch(err => {
        console.log('[SignalR Mobile] Connection notice:', err);
      });

    connection.on('ReceiveAppointmentAssigned', (apt: any) => {
      setActiveAppointment(apt);
      setPtStatus(apt.status);
      showToast('SUCCESS', '⚡ Clinician Dispatched!', 'Dr. Sarah Jenkins has been assigned to your home visit.');
      setActiveTab('status');
    });

    connection.on('ReceiveVisitStatusUpdated', (payload: any) => {
      setPtStatus(payload.status);
      showToast('INFO', '🚗 Visit Progress Update', `Your therapist is now: ${payload.status}`);
    });

    return () => {
      connection.stop();
    };
  }, [roleMode]);

  // Toggle pain area selection
  const togglePainArea = (area: string) => {
    if (selectedPainAreas.includes(area)) {
      if (selectedPainAreas.length > 1) {
        setSelectedPainAreas(selectedPainAreas.filter(a => a !== area));
      }
    } else {
      setSelectedPainAreas([...selectedPainAreas, area]);
    }
  };

  // Toggle condition in profile
  const toggleCondition = (cond: string) => {
    if (cond === 'None / Healthy') {
      setPatientProfile({ ...patientProfile, conditions: ['None / Healthy'] });
      return;
    }
    const current = patientProfile.conditions.filter(c => c !== 'None / Healthy');
    if (current.includes(cond)) {
      setPatientProfile({ ...patientProfile, conditions: current.filter(c => c !== cond) });
    } else {
      setPatientProfile({ ...patientProfile, conditions: [...current, cond] });
    }
  };

  // Severity Label Helper
  const getSeverityDescription = (val: number) => {
    if (val <= 3) return { text: 'Mild Discomfort • Noticeable but daily routine unaffected', color: '#0d9488' };
    if (val <= 6) return { text: 'Moderate Pain • Restricts bending, sitting & movement', color: '#d97706' };
    if (val <= 8) return { text: 'Severe Pain • Significant limitation, prompt care advised', color: '#ea580c' };
    return { text: 'Acute / Extreme Pain • Urgent clinician visit recommended', color: '#dc2626' };
  };

  // Save Profile Handler
  const handleSaveProfile = () => {
    showToast('SUCCESS', 'Profile Saved Successfully', 'Your contact details, emergency info, and medical precautions have been updated.');
  };

  // Submit Home Visit Request
  const handleSubmitRequest = async () => {
    const preferredWindowText = `${selectedDate.dayName} (${selectedDate.dateStr}) at ${selectedTimeSlot}`;
    try {
      const res = await fetch(`${API_BASE}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createdByUserRole: 'PATIENT',
          categoryId: selectedCategory.id,
          address: {
            addressLine: patientProfile.primaryAddress,
            city: 'New York',
            pinCode: '10024',
            coordinates: { latitude: 40.7850, longitude: -73.9680 },
            entryInstructions: patientProfile.entryNotes
          },
          painAreas: selectedPainAreas,
          conditionDescription: `[Patient: ${patientProfile.fullName}, Age: ${patientProfile.age}, Conditions: ${patientProfile.conditions.join(', ')}] [VAS ${painSeverity}/10] ${symptoms}`,
          preferredTimeWindow: preferredWindowText,
          urgency: painSeverity >= 8 ? 'URGENT' : 'NORMAL'
        })
      });
      const data = await res.json();
      if (data.success) {
        setBookingModal({
          visible: true,
          details: {
            specialty: selectedCategory.name,
            window: preferredWindowText,
            address: patientProfile.primaryAddress,
            amount: selectedCategory.basePriceINR || selectedCategory.basePriceUSD,
            patientName: patientProfile.fullName
          }
        });
        refreshActiveData();
      }
    } catch (e) {
      setBookingModal({
        visible: true,
        details: {
          specialty: selectedCategory.name,
          window: preferredWindowText,
          address: patientProfile.primaryAddress,
          amount: selectedCategory.basePriceINR || selectedCategory.basePriceUSD,
          patientName: patientProfile.fullName
        }
      });
    }
  };

  // Therapist Status Action Updates
  const handleUpdatePtStatus = async (nextStatus: any) => {
    setPtStatus(nextStatus);
    showToast('SUCCESS', 'Status Updated', `Session status advanced to ${nextStatus.replace('_', ' ')}.`);
    if (activeAppointment) {
      try {
        await fetch(`${API_BASE}/appointments/${activeAppointment.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: nextStatus,
            clinicalNotes: nextStatus === 'COMPLETED' ? clinicalNotes : undefined
          })
        });
        refreshActiveData();
      } catch (e) {}
    }
  };

  const activePeriodObj = TIME_PERIODS.find(p => p.id === selectedPeriod) || TIME_PERIODS[0];
  const severityInfo = getSeverityDescription(painSeverity);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* ========================================================================= */}
      {/* CUSTOM DESIGNER TOAST NOTIFICATION (TOP FLOATING) */}
      {/* ========================================================================= */}
      {toast.visible && (
        <View style={[
          styles.customToast,
          toast.type === 'SUCCESS' && styles.toastSuccess,
          toast.type === 'INFO' && styles.toastInfo,
          toast.type === 'WARNING' && styles.toastWarning,
          toast.type === 'ERROR' && styles.toastError,
        ]}>
          <View style={[
            styles.toastIconBox,
            toast.type === 'SUCCESS' && { backgroundColor: '#ccfbf1' },
            toast.type === 'INFO' && { backgroundColor: '#e0f2fe' },
            toast.type === 'WARNING' && { backgroundColor: '#fef3c7' },
            toast.type === 'ERROR' && { backgroundColor: '#fee2e2' },
          ]}>
            <Text style={styles.toastIconText}>
              {toast.type === 'SUCCESS' ? '✓' : toast.type === 'INFO' ? 'ℹ️' : toast.type === 'WARNING' ? '⚠️' : '✕'}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.toastTitle}>{toast.title}</Text>
            <Text style={styles.toastMessage}>{toast.message}</Text>
          </View>
          <TouchableOpacity onPress={() => setToast({ ...toast, visible: false })} style={styles.toastCloseBtn}>
            <Text style={styles.toastCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ========================================================================= */}
      {/* CUSTOM BOOKING CONFIRMATION MODAL POPUP */}
      {/* ========================================================================= */}
      {bookingModal.visible && (
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeaderGlow}>
              <View style={styles.modalSuccessCircle}>
                <Text style={styles.modalSuccessCircleText}>✓</Text>
              </View>
            </View>

            <Text style={styles.modalHeadline}>In-Home Visit Confirmed!</Text>
            <Text style={styles.modalDescription}>
              Your appointment request has been approved. A certified clinical physiotherapist is assigned for your home visit.
            </Text>

            {/* RECEIPT SUMMARY CARD */}
            <View style={styles.modalReceiptCard}>
              <View style={styles.modalReceiptRow}>
                <Text style={styles.modalReceiptLabel}>Therapy Specialty</Text>
                <Text style={styles.modalReceiptValue}>{bookingModal.details?.specialty}</Text>
              </View>
              <View style={styles.modalReceiptRow}>
                <Text style={styles.modalReceiptLabel}>Scheduled Slot</Text>
                <Text style={[styles.modalReceiptValue, { color: '#0d9488' }]}>{bookingModal.details?.window}</Text>
              </View>
              <View style={styles.modalReceiptRow}>
                <Text style={styles.modalReceiptLabel}>Patient Name</Text>
                <Text style={styles.modalReceiptValue}>{bookingModal.details?.patientName}</Text>
              </View>
              <View style={styles.modalReceiptRow}>
                <Text style={styles.modalReceiptLabel}>Home Address</Text>
                <Text style={styles.modalReceiptValue} numberOfLines={1}>{bookingModal.details?.address}</Text>
              </View>
              <View style={styles.modalReceiptDivider} />
              <View style={styles.modalReceiptRow}>
                <Text style={[styles.modalReceiptLabel, { fontWeight: '800', color: '#0f172a' }]}>Total Fee (Pay At Home)</Text>
                <Text style={styles.modalReceiptTotal}>₹{bookingModal.details?.amount}.00</Text>
              </View>
            </View>

            {/* ACTION BUTTONS */}
            <TouchableOpacity 
              style={styles.modalPrimaryBtn}
              onPress={() => {
                setBookingModal({ visible: false });
                setActiveTab('status');
              }}
            >
              <Text style={styles.modalPrimaryBtnText}>Track Clinician Live Status →</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalSecondaryBtn}
              onPress={() => setBookingModal({ visible: false })}
            >
              <Text style={styles.modalSecondaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ========================================================================= */}
      {/* CUSTOM CALL / CHAT MODAL POPUP */}
      {/* ========================================================================= */}
      {commModal.visible && (
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalHeaderGlow, { backgroundColor: '#e0f2fe' }]}>
              <Text style={{ fontSize: 26 }}>{commModal.mode === 'CALL' ? '📞' : '💬'}</Text>
            </View>

            <Text style={styles.modalHeadline}>
              {commModal.mode === 'CALL' ? 'Secure Clinical Call' : 'Direct Clinician Chat'}
            </Text>
            <Text style={styles.modalDescription}>
              {commModal.mode === 'CALL' 
                ? `Connecting you with ${commModal.name} on their verified mobile line.`
                : `Send a direct clinical inquiry or building entrance tip to ${commModal.name}.`}
            </Text>

            <View style={styles.commClinicianCard}>
              <View style={styles.commAvatar}>
                <Text style={styles.commAvatarText}>SJ</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.commName}>{commModal.name}</Text>
                <Text style={styles.commPhone}>{commModal.phone} • Verified Clinician</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.modalPrimaryBtn, { backgroundColor: commModal.mode === 'CALL' ? '#0284c7' : '#0d9488' }]}
              onPress={() => {
                showToast(
                  'SUCCESS', 
                  commModal.mode === 'CALL' ? 'Call Connected' : 'Message Sent', 
                  commModal.mode === 'CALL' ? 'Dialing secure line to Dr. Sarah Jenkins...' : 'Clinician has received your message.'
                );
                setCommModal({ visible: false, mode: 'CALL', name: '', phone: '' });
              }}
            >
              <Text style={styles.modalPrimaryBtnText}>
                {commModal.mode === 'CALL' ? 'Start Phone Call Now' : 'Send Message'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalSecondaryBtn}
              onPress={() => setCommModal({ visible: false, mode: 'CALL', name: '', phone: '' })}
            >
              <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* 1. TOP CALMING HEALTHCARE HEADER */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>🩺</Text>
          </View>
          <View>
            <View style={styles.appNameRow}>
              <Text style={styles.brandTitle}>TherapyHub</Text>
              <View style={styles.inHomePill}>
                <Text style={styles.inHomePillText}>IN-HOME CARE</Text>
              </View>
            </View>
            <Text style={styles.brandSub}>Certified Home Physiotherapy</Text>
          </View>
        </View>

        {/* ROLE TOGGLE */}
        <View style={styles.roleToggle}>
          <TouchableOpacity 
            style={[styles.roleBtn, roleMode === 'PATIENT' && styles.roleBtnActive]}
            onPress={() => setRoleMode('PATIENT')}
          >
            <Text style={[styles.roleBtnText, roleMode === 'PATIENT' && styles.roleBtnTextActive]}>
              Patient
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.roleBtn, roleMode === 'THERAPIST' && styles.roleBtnActive]}
            onPress={() => setRoleMode('THERAPIST')}
          >
            <Text style={[styles.roleBtnText, roleMode === 'THERAPIST' && styles.roleBtnTextActive]}>
              Clinician
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. PATIENT EXPERIENCE */}
      {roleMode === 'PATIENT' && (
        <View style={{ flex: 1 }}>
          {/* NAVIGATION TAB BAR (3 TABS: Request, Status, Personal Info) */}
          <View style={styles.tabBar}>
            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'request' && styles.tabItemActive]}
              onPress={() => setActiveTab('request')}
            >
              <Text style={styles.tabIcon}>✨</Text>
              <Text style={[styles.tabLabel, activeTab === 'request' && styles.tabLabelActive]}>
                Book Visit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'status' && styles.tabItemActive]}
              onPress={() => setActiveTab('status')}
            >
              <Text style={styles.tabIcon}>📍</Text>
              <Text style={[styles.tabLabel, activeTab === 'status' && styles.tabLabelActive]}>
                Live Status
              </Text>
              <View style={styles.activeDot} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'profile' && styles.tabItemActive]}
              onPress={() => setActiveTab('profile')}
            >
              <Text style={styles.tabIcon}>👤</Text>
              <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabLabelActive]}>
                Personal Info
              </Text>
            </TouchableOpacity>
          </View>

          {/* ========================================================================= */}
          {/* TAB 1: REQUEST VISIT */}
          {/* ========================================================================= */}
          {activeTab === 'request' && (
            <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingBottom: 60 }}>
              {/* PATIENT GREETING CARD */}
              <View style={styles.greetingCard}>
                <View style={styles.greetingLeft}>
                  <Text style={styles.greetingTitle}>Good Morning, {patientProfile.fullName.split(' ')[0]} 👋</Text>
                  <Text style={styles.greetingSubtitle}>Licensed physiotherapist visits your home at your convenience.</Text>
                </View>
                <TouchableOpacity 
                  style={styles.profileBadgeBtn}
                  onPress={() => setActiveTab('profile')}
                >
                  <Text style={styles.profileBadgeBtnText}>Edit Info</Text>
                </TouchableOpacity>
              </View>

              {/* SECTION 1: SELECT SPECIALTY */}
              <View style={styles.sectionWrapper}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>1. Select Therapy Specialty</Text>
                  <Text style={styles.sectionHint}>45-60 min care</Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {THERAPY_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory.id === cat.id;
                    return (
                      <TouchableOpacity 
                        key={cat.id} 
                        style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
                        onPress={() => setSelectedCategory(cat)}
                      >
                        <View style={styles.categoryCardHeader}>
                          <Text style={styles.categoryIconEmoji}>
                            {cat.id === 'cat_ortho' ? '🦴' : 
                             cat.id === 'cat_post_op' ? '🩹' : 
                             cat.id === 'cat_neuro' ? '🧠' : 
                             cat.id === 'cat_sports' ? '⚡' : 
                             cat.id === 'cat_geriatric' ? '👴' : 
                             cat.id === 'cat_pediatric' ? '👶' : '🫁'}
                          </Text>
                          <View style={[styles.priceTag, isSelected && styles.priceTagSelected]}>
                            <Text style={[styles.priceTagText, isSelected && styles.priceTagTextSelected]}>
                              ₹{cat.basePriceINR || cat.basePriceUSD}
                            </Text>
                          </View>
                        </View>
                        
                        <Text style={[styles.categoryTitle, isSelected && styles.categoryTitleSelected]} numberOfLines={2}>
                          {cat.name}
                        </Text>
                        
                        <View style={styles.durationRow}>
                          <Text style={styles.durationText}>⏱ {cat.standardDurationMinutes} mins</Text>
                          {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* SECTION 2: INTERACTIVE PAIN AREA & SEVERITY SCALE */}
              <View style={styles.sectionWrapper}>
                <Text style={styles.sectionTitle}>2. Pain Focus & Clinical Severity</Text>
                <Text style={styles.sectionSub}>Tap regions where you are experiencing pain or stiffness:</Text>

                {/* PAIN CHIPS */}
                <View style={styles.chipsContainer}>
                  {QUICK_PAIN_AREAS.map((item) => {
                    const active = selectedPainAreas.includes(item.defaultArea);
                    return (
                      <TouchableOpacity 
                        key={item.id}
                        style={[styles.painChip, active && styles.painChipActive]}
                        onPress={() => togglePainArea(item.defaultArea)}
                      >
                        <Text style={[styles.painChipText, active && styles.painChipTextActive]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* PAIN SEVERITY SLIDER (VAS 1 to 10) */}
                <View style={styles.severityBox}>
                  <View style={styles.severityHeader}>
                    <Text style={styles.severityTitle}>Clinical Pain Scale (VAS):</Text>
                    <View style={[styles.severityBadge, { backgroundColor: severityInfo.color + '15' }]}>
                      <Text style={[styles.severityBadgeText, { color: severityInfo.color }]}>
                        {painSeverity} / 10
                      </Text>
                    </View>
                  </View>

                  {/* 10 INTERACTIVE BUTTONS */}
                  <View style={styles.severityButtonsRow}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                      const isPicked = painSeverity === num;
                      return (
                        <TouchableOpacity 
                          key={num}
                          style={[
                            styles.severityCircle,
                            isPicked && { backgroundColor: severityInfo.color, borderColor: severityInfo.color }
                          ]}
                          onPress={() => setPainSeverity(num)}
                        >
                          <Text style={[styles.severityNumber, isPicked && { color: '#ffffff', fontWeight: 'bold' }]}>
                            {num}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={[styles.severityDesc, { color: severityInfo.color }]}>
                    {severityInfo.text}
                  </Text>
                </View>

                {/* SYMPTOMS INPUT */}
                <Text style={styles.inputMiniLabel}>Specific Movement Restrictions or Notes:</Text>
                <TextInput 
                  style={styles.notesInput}
                  value={symptoms}
                  onChangeText={setSymptoms}
                  placeholder="e.g. Cannot sit past 20 mins, difficulty climbing stairs..."
                  placeholderTextColor="#94a3b8"
                  multiline
                />
              </View>

              {/* SECTION 3: INTERACTIVE DATE & TIME PICKER */}
              <View style={styles.sectionWrapper}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>3. Preferred Visit Date & Time</Text>
                  <Text style={styles.sectionHint}>Live Availability</Text>
                </View>

                {/* A. DATE SELECTION CAROUSEL */}
                <Text style={styles.pickerSubLabel}>Select Date:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
                  {DATE_OPTIONS.map((item) => {
                    const isDateSelected = selectedDate.id === item.id;
                    return (
                      <TouchableOpacity 
                        key={item.id}
                        style={[styles.dateCard, isDateSelected && styles.dateCardActive]}
                        onPress={() => setSelectedDate(item)}
                      >
                        {item.badge && (
                          <View style={[styles.dateBadge, isDateSelected && styles.dateBadgeActive]}>
                            <Text style={[styles.dateBadgeText, isDateSelected && { color: '#ffffff' }]}>{item.badge}</Text>
                          </View>
                        )}
                        <Text style={[styles.dateCardDay, isDateSelected && styles.dateCardDayActive]}>
                          {item.dayName}
                        </Text>
                        <Text style={[styles.dateCardSub, isDateSelected && styles.dateCardSubActive]}>
                          {item.dateStr}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* B. TIME PERIOD TABS */}
                <Text style={[styles.pickerSubLabel, { marginTop: 14 }]}>Select Time Period:</Text>
                <View style={styles.periodTabs}>
                  {TIME_PERIODS.map((period) => {
                    const isPeriodActive = selectedPeriod === period.id;
                    return (
                      <TouchableOpacity 
                        key={period.id}
                        style={[styles.periodTab, isPeriodActive && styles.periodTabActive]}
                        onPress={() => {
                          setSelectedPeriod(period.id);
                          setSelectedTimeSlot(period.slots[0]);
                        }}
                      >
                        <Text style={[styles.periodTabText, isPeriodActive && styles.periodTabTextActive]}>
                          {period.label}
                        </Text>
                        <Text style={[styles.periodTabRange, isPeriodActive && styles.periodTabRangeActive]}>
                          {period.sub}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* C. INTERACTIVE TIME SLOTS GRID */}
                <Text style={[styles.pickerSubLabel, { marginTop: 12 }]}>Choose Exact Slot:</Text>
                <View style={styles.slotsGrid}>
                  {activePeriodObj.slots.map((slot) => {
                    const isSlotSelected = selectedTimeSlot === slot;
                    return (
                      <TouchableOpacity 
                        key={slot}
                        style={[styles.slotChip, isSlotSelected && styles.slotChipSelected]}
                        onPress={() => setSelectedTimeSlot(slot)}
                      >
                        <Text style={[styles.slotChipText, isSlotSelected && styles.slotChipTextSelected]}>
                          {slot}
                        </Text>
                        {isSlotSelected && <Text style={styles.slotCheck}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* CONFIRMED TIME PREVIEW BANNER */}
                <View style={styles.selectionSummaryBanner}>
                  <Text style={styles.bannerCalendarIcon}>🗓️</Text>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.bannerTitle}>Confirmed Time Slot</Text>
                    <Text style={styles.bannerValue}>
                      {selectedDate.dayName}, {selectedDate.dateStr} at {selectedTimeSlot}
                    </Text>
                  </View>
                  <View style={styles.liveAvailableBadge}>
                    <Text style={styles.liveAvailableText}>Clinician Ready</Text>
                  </View>
                </View>
              </View>

              {/* SECTION 4: HOME ADDRESS & PRESET */}
              <View style={styles.sectionWrapper}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>4. Home Location</Text>
                  <TouchableOpacity onPress={() => setActiveTab('profile')}>
                    <Text style={styles.editAddressLink}>Manage Addresses</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.addressPresetCard}>
                  <Text style={styles.addressLineText}>📍 {patientProfile.primaryAddress}</Text>
                  <Text style={styles.entryNotesText}>Note: {patientProfile.entryNotes}</Text>
                  <Text style={styles.patientMetaNote}>Patient: {patientProfile.fullName} • Phone: {patientProfile.phone}</Text>
                </View>
              </View>

              {/* SECTION 5: TRANSPARENT PRICING & SUBMIT */}
              <View style={styles.sectionWrapper}>
                <Text style={styles.sectionTitle}>5. Pricing & Payment</Text>

                {/* RECEIPT BOX */}
                <View style={styles.receiptBox}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>{selectedCategory.name} Session</Text>
                    <Text style={styles.receiptVal}>₹{selectedCategory.basePriceINR || selectedCategory.basePriceUSD}.00</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>In-Home Clinician Transit</Text>
                    <Text style={[styles.receiptVal, { color: '#0d9488' }]}>FREE</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Sterilized Mobile Kit & Consumables</Text>
                    <Text style={[styles.receiptVal, { color: '#0d9488' }]}>INCLUDED</Text>
                  </View>
                  <View style={styles.receiptDivider} />
                  <View style={styles.receiptTotalRow}>
                    <Text style={styles.receiptTotalLabel}>Total Amount Payable</Text>
                    <Text style={styles.receiptTotalVal}>₹{selectedCategory.basePriceINR || selectedCategory.basePriceUSD}.00</Text>
                  </View>
                </View>

                {/* PAYMENT METHOD SELECTOR */}
                <View style={styles.paymentMethodRow}>
                  <TouchableOpacity 
                    style={[styles.paymentMethodCard, paymentMode === 'CASH' && styles.paymentMethodCardActive]}
                    onPress={() => setPaymentMode('CASH')}
                  >
                    <Text style={styles.paymentMethodIcon}>💵</Text>
                    <Text style={styles.paymentMethodTitle}>Cash on Service</Text>
                    <Text style={styles.paymentMethodSub}>Pay after visit via OTP</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.paymentMethodCard, paymentMode === 'CARD' && styles.paymentMethodCardActive]}
                    onPress={() => setPaymentMode('CARD')}
                  >
                    <Text style={styles.paymentMethodIcon}>💳</Text>
                    <Text style={styles.paymentMethodTitle}>Card / Apple Pay</Text>
                    <Text style={styles.paymentMethodSub}>Instant contactless</Text>
                  </TouchableOpacity>
                </View>

                {/* BIG ACTION BUTTON */}
                <TouchableOpacity style={styles.bookButton} onPress={handleSubmitRequest}>
                  <Text style={styles.bookButtonText}>
                    Confirm In-Home Visit (₹{selectedCategory.basePriceINR || selectedCategory.basePriceUSD}.00) →
                  </Text>
                  <Text style={styles.bookButtonSub}>
                    {selectedDate.dayName} at {selectedTimeSlot} • Free Cancellation
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: LIVE APPOINTMENT TRACKING */}
          {/* ========================================================================= */}
          {activeTab === 'status' && (
            <ScrollView style={styles.scrollArea} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
              <View style={styles.statusHeroCard}>
                <View style={styles.statusHeroTop}>
                  <View style={styles.statusLivePill}>
                    <View style={styles.pulsingDot} />
                    <Text style={styles.statusLivePillText}>
                      {activeAppointment ? activeAppointment.status.replace('_', ' ') : 'CARE DESK REVIEW'}
                    </Text>
                  </View>
                  <Text style={styles.statusHeroFee}>₹{activeAppointment?.totalAmount || activeAppointment?.totalFee || selectedCategory.basePriceINR || selectedCategory.basePriceUSD}</Text>
                </View>

                <Text style={styles.statusHeroTitle}>
                  {activeAppointment?.request?.category?.name || selectedCategory.name}
                </Text>
                <Text style={styles.statusHeroAddress}>
                  📍 {activeAppointment?.request?.address?.addressLine || patientProfile.primaryAddress}
                </Text>

                {/* CLINICIAN PROFILE DOSSIER */}
                <View style={styles.clinicianProfileBox}>
                  <View style={styles.clinicianAvatar}>
                    <Text style={styles.clinicianAvatarText}>SJ</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.clinicianName}>
                      {activeAppointment?.therapist?.user?.fullName || 'Dr. Sarah Jenkins, PT, DPT'}
                    </Text>
                    <Text style={styles.clinicianMeta}>
                      Senior Clinician • 7 yrs experience • ★ 4.9 (128 visits)
                    </Text>
                    <Text style={styles.clinicianLicense}>
                      License: PT-NY-849204 • Orthopedic Specialist
                    </Text>
                  </View>
                </View>

                {/* QUICK ACTION BUTTONS */}
                <View style={styles.clinicianActionRow}>
                  <TouchableOpacity 
                    style={styles.clinicianActionBtn}
                    onPress={() => setCommModal({
                      visible: true,
                      mode: 'CALL',
                      name: activeAppointment?.therapist?.user?.fullName || 'Dr. Sarah Jenkins, PT, DPT',
                      phone: '+1 (555) 987-6543'
                    })}
                  >
                    <Text style={styles.clinicianActionText}>📞 Call Clinician</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.clinicianActionBtn}
                    onPress={() => setCommModal({
                      visible: true,
                      mode: 'CHAT',
                      name: activeAppointment?.therapist?.user?.fullName || 'Dr. Sarah Jenkins, PT, DPT',
                      phone: '+1 (555) 987-6543'
                    })}
                  >
                    <Text style={styles.clinicianActionText}>💬 Send Message</Text>
                  </TouchableOpacity>
                </View>

                {/* STEP-BY-STEP TRACKER */}
                <View style={styles.stepperBox}>
                  <Text style={styles.stepperHeader}>Real-Time Visit Timeline:</Text>
                  
                  <View style={styles.timelineItem}>
                    <Text style={styles.timelineIcon}>✅</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.timelineTitle}>1. Request Confirmed & Scheduled</Text>
                      <Text style={styles.timelineSub}>{selectedDate.dayName}, {selectedDate.dateStr} at {selectedTimeSlot}</Text>
                    </View>
                  </View>

                  <View style={styles.timelineItem}>
                    <Text style={styles.timelineIcon}>
                      {ptStatus === 'EN_ROUTE' || ptStatus === 'ARRIVED' || ptStatus === 'IN_SESSION' || ptStatus === 'COMPLETED' ? '🚗' : '⚪'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.timelineTitle, (ptStatus === 'EN_ROUTE' || ptStatus === 'ARRIVED') && styles.timelineActive]}>
                        2. Clinician En Route
                      </Text>
                      <Text style={styles.timelineSub}>
                        {ptStatus === 'EN_ROUTE' ? '⚡ Traveling via Toyota Prius • ETA ~14 mins' : 'Transit will start 30 mins before visit'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.timelineItem}>
                    <Text style={styles.timelineIcon}>
                      {ptStatus === 'ARRIVED' || ptStatus === 'IN_SESSION' || ptStatus === 'COMPLETED' ? '🏡' : '⚪'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.timelineTitle, ptStatus === 'ARRIVED' && styles.timelineActive]}>
                        3. Arrived at Your Door
                      </Text>
                      <Text style={styles.timelineSub}>Please buzz clinician into building</Text>
                    </View>
                  </View>

                  <View style={styles.timelineItem}>
                    <Text style={styles.timelineIcon}>
                      {ptStatus === 'IN_SESSION' || ptStatus === 'COMPLETED' ? '🩺' : '⚪'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.timelineTitle, ptStatus === 'IN_SESSION' && styles.timelineActive]}>
                        4. Hands-On Therapy in Progress
                      </Text>
                      <Text style={styles.timelineSub}>Joint mobilization, electrotherapy & corrective exercises</Text>
                    </View>
                  </View>

                  <View style={styles.timelineItem}>
                    <Text style={styles.timelineIcon}>
                      {ptStatus === 'COMPLETED' ? '🎉' : '⚪'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.timelineTitle, ptStatus === 'COMPLETED' && styles.timelineActive]}>
                        5. Session Completed & Exercise Plan
                      </Text>
                      <Text style={styles.timelineSub}>SOAP notes and home rehab regimen logged</Text>
                    </View>
                  </View>
                </View>

                {/* CASH SECURITY OTP CARD */}
                <View style={styles.otpCard}>
                  <View style={styles.otpHeader}>
                    <Text style={styles.otpTitle}>🔒 Cash Collection Security Code</Text>
                    <Text style={styles.otpTag}>Show Upon Arrival</Text>
                  </View>
                  <Text style={styles.otpInstructions}>
                    Show this 4-digit code to your physiotherapist to verify cash collection:
                  </Text>
                  <View style={styles.otpDigitsContainer}>
                    {(activeAppointment?.cashConfirmationOtp || '7492').split('').map((digit, idx) => (
                      <View key={idx} style={styles.otpDigitBox}>
                        <Text style={styles.otpDigitText}>{digit}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* PATIENT DISCHARGE VERIFICATION OTP CARD */}
                <View style={[styles.otpCard, { borderColor: '#10b981', marginTop: 14 }]}>
                  <View style={styles.otpHeader}>
                    <Text style={[styles.otpTitle, { color: '#065f46' }]}>🔑 Session Discharge Verification OTP</Text>
                    <View style={[styles.verifiedTag, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
                      <Text style={[styles.verifiedTagText, { color: '#047857' }]}>Fixed OTP: 8844</Text>
                    </View>
                  </View>
                  <Text style={styles.otpInstructions}>
                    Share this 4-digit code with your physiotherapist ONLY after your treatment is fully completed:
                  </Text>
                  <View style={styles.otpDigitsContainer}>
                    {['8', '8', '4', '4'].map((digit, idx) => (
                      <View key={idx} style={[styles.otpDigitBox, { backgroundColor: '#ecfdf5', borderColor: '#10b981' }]}>
                        <Text style={[styles.otpDigitText, { color: '#065f46' }]}>{digit}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={{ fontSize: 11, color: '#64748b', textAlign: 'center', marginTop: 8 }}>
                    🛡️ Protects you by ensuring full clinical session time is delivered before discharge.
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: PERSONAL INFO & MEDICAL PROFILE */}
          {/* ========================================================================= */}
          {activeTab === 'profile' && (
            <ScrollView style={styles.scrollArea} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
              {/* PROFILE HERO HEADER */}
              <View style={styles.profileHero}>
                <View style={styles.profileHeroAvatar}>
                  <Text style={styles.profileHeroAvatarText}>
                    {patientProfile.fullName.split(' ').map(n => n[0]).join('')}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.profileHeroName}>{patientProfile.fullName}</Text>
                  <Text style={styles.profileHeroSub}>{patientProfile.email}</Text>
                  <View style={styles.verifiedTag}>
                    <Text style={styles.verifiedTagText}>🛡️ Verified Patient Profile</Text>
                  </View>
                </View>
              </View>

              {/* SECTION: BASIC DETAILS */}
              <View style={styles.sectionWrapper}>
                <Text style={styles.sectionTitle}>Basic Contact & Demographic Details</Text>
                <Text style={styles.sectionSub}>Used for in-home therapist matching and visit verification.</Text>

                <Text style={styles.fieldLabel}>Full Legal Name</Text>
                <TextInput 
                  style={styles.fieldInput}
                  value={patientProfile.fullName}
                  onChangeText={(t) => setPatientProfile({ ...patientProfile, fullName: t })}
                  placeholder="Enter full name"
                  placeholderTextColor="#94a3b8"
                />

                <View style={styles.fieldRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.fieldLabel}>Phone Number</Text>
                    <TextInput 
                      style={styles.fieldInput}
                      value={patientProfile.phone}
                      onChangeText={(t) => setPatientProfile({ ...patientProfile, phone: t })}
                      placeholder="+1 (555) 000-0000"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <View style={{ width: 85 }}>
                    <Text style={styles.fieldLabel}>Age</Text>
                    <TextInput 
                      style={styles.fieldInput}
                      value={patientProfile.age}
                      onChangeText={(t) => setPatientProfile({ ...patientProfile, age: t })}
                      keyboardType="numeric"
                      placeholder="e.g. 38"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Gender Identity</Text>
                <View style={styles.genderRow}>
                  {['Male', 'Female', 'Non-Binary', 'Prefer not to say'].map((g) => (
                    <TouchableOpacity 
                      key={g}
                      style={[styles.genderPill, patientProfile.gender === g && styles.genderPillActive]}
                      onPress={() => setPatientProfile({ ...patientProfile, gender: g })}
                    >
                      <Text style={[styles.genderPillText, patientProfile.gender === g && styles.genderPillTextActive]}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* SECTION: CLINICAL & HEALTH PROFILE */}
              <View style={styles.sectionWrapper}>
                <Text style={styles.sectionTitle}>Medical History & Precautions</Text>
                <Text style={styles.sectionSub}>Important for clinicians to prepare safe treatment modalities.</Text>

                <Text style={styles.fieldLabel}>Blood Group</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {BLOOD_GROUPS.map((bg) => (
                    <TouchableOpacity 
                      key={bg}
                      style={[styles.bloodPill, patientProfile.bloodGroup === bg && styles.bloodPillActive]}
                      onPress={() => setPatientProfile({ ...patientProfile, bloodGroup: bg })}
                    >
                      <Text style={[styles.bloodPillText, patientProfile.bloodGroup === bg && styles.bloodPillTextActive]}>
                        {bg}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.fieldLabel}>Existing Conditions or Surgical History</Text>
                <View style={styles.conditionsGrid}>
                  {CHRONIC_CONDITIONS.map((cond) => {
                    const isChecked = patientProfile.conditions.includes(cond);
                    return (
                      <TouchableOpacity 
                        key={cond}
                        style={[styles.conditionPill, isChecked && styles.conditionPillActive]}
                        onPress={() => toggleCondition(cond)}
                      >
                        <Text style={[styles.conditionPillText, isChecked && styles.conditionPillTextActive]}>
                          {isChecked ? '✓ ' : '+ '} {cond}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* SECTION: PRIMARY ADDRESS & ENTRY TIPS */}
              <View style={styles.sectionWrapper}>
                <Text style={styles.sectionTitle}>Primary In-Home Treatment Address</Text>
                <Text style={styles.sectionSub}>Where your physiotherapist will arrive for scheduled sessions.</Text>

                <Text style={styles.fieldLabel}>Complete Address & Apartment / Landmark</Text>
                <TextInput 
                  style={styles.fieldInput}
                  value={patientProfile.primaryAddress}
                  onChangeText={(t) => setPatientProfile({ ...patientProfile, primaryAddress: t })}
                  placeholder="Street, Apt #, Building, City"
                  placeholderTextColor="#94a3b8"
                />

                <Text style={styles.fieldLabel}>Building Entry / Gate Instructions</Text>
                <TextInput 
                  style={[styles.fieldInput, { height: 50 }]}
                  value={patientProfile.entryNotes}
                  onChangeText={(t) => setPatientProfile({ ...patientProfile, entryNotes: t })}
                  placeholder="e.g. Door buzzer #402, call when downstairs..."
                  placeholderTextColor="#94a3b8"
                  multiline
                />
              </View>

              {/* SECTION: EMERGENCY CONTACT */}
              <View style={styles.sectionWrapper}>
                <Text style={styles.sectionTitle}>Emergency Contact Person</Text>
                <Text style={styles.sectionSub}>Contacted only in unforeseen clinical emergencies.</Text>

                <View style={styles.fieldRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.fieldLabel}>Contact Name</Text>
                    <TextInput 
                      style={styles.fieldInput}
                      value={patientProfile.emergencyName}
                      onChangeText={(t) => setPatientProfile({ ...patientProfile, emergencyName: t })}
                      placeholder="Full Name"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <View style={{ width: 110 }}>
                    <Text style={styles.fieldLabel}>Relationship</Text>
                    <TextInput 
                      style={styles.fieldInput}
                      value={patientProfile.emergencyRelation}
                      onChangeText={(t) => setPatientProfile({ ...patientProfile, emergencyRelation: t })}
                      placeholder="e.g. Spouse"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Emergency Phone Number</Text>
                <TextInput 
                  style={styles.fieldInput}
                  value={patientProfile.emergencyPhone}
                  onChangeText={(t) => setPatientProfile({ ...patientProfile, emergencyPhone: t })}
                  placeholder="+1 (555) 000-0000"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* SAVE PROFILE BUTTON */}
              <TouchableOpacity style={styles.saveProfileBtn} onPress={handleSaveProfile}>
                <Text style={styles.saveProfileBtnText}>💾 Save Personal & Medical Details</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      )}

      {/* 3. THERAPIST PROFESSIONAL CLINICAL COCKPIT */}
      {roleMode === 'THERAPIST' && (
        <ScrollView style={styles.scrollArea} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          <View style={styles.clinicianHeaderCard}>
            <View style={styles.clinicianHeaderAvatar}>
              <Text style={styles.clinicianHeaderAvatarText}>SJ</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.ptNameTitle}>Dr. Sarah Jenkins, PT, DPT</Text>
              <Text style={styles.ptBadgeText}>Senior Orthopedic Specialist • NY State Board</Text>
            </View>
          </View>

          {/* THERAPIST TOP VIEW SELECTOR: ACTIVE VISIT vs COMPLETED SESSIONS */}
          <View style={styles.ptTabRow}>
            <View style={[styles.ptTabBadge, ptStatus === 'COMPLETED' ? styles.ptTabBadgeInactive : styles.ptTabBadgeActive]}>
              <Text style={[styles.ptTabBadgeText, ptStatus === 'COMPLETED' && { color: '#64748b' }]}>
                {ptStatus === 'COMPLETED' ? 'Active Dispatches (0)' : '⚡ Active Visit In-Progress'}
              </Text>
            </View>
            <View style={[styles.ptTabBadge, ptStatus === 'COMPLETED' ? styles.ptTabBadgeActive : styles.ptTabBadgeInactive]}>
              <Text style={[styles.ptTabBadgeText, ptStatus !== 'COMPLETED' && { color: '#64748b' }]}>
                {ptStatus === 'COMPLETED' ? '📁 Completed Sessions (1 - Locked)' : '📁 Completed Sessions (0)'}
              </Text>
            </View>
          </View>

          {ptStatus === 'COMPLETED' ? (
            /* COMPLETED SESSIONS (READ-ONLY & NON-EDITABLE) */
            <View style={styles.completedCard}>
              <View style={styles.completedHeaderRow}>
                <View style={styles.completedTagBox}>
                  <Text style={styles.completedTagText}>✓ SESSION COMPLETED</Text>
                </View>
                <View style={styles.readOnlyTag}>
                  <Text style={styles.readOnlyTagText}>🔒 READ-ONLY</Text>
                </View>
              </View>

              <Text style={styles.completedSessionHeadline}>
                Discharge Verified & Session Closed
              </Text>
              <Text style={styles.completedSessionSub}>
                This clinical visit has been successfully finalized. Payment was collected and OTP 8844 was verified. Status and treatment notes are locked and non-editable.
              </Text>

              {/* READ ONLY METRICS GRID */}
              <View style={styles.completedMetricsGrid}>
                <View style={styles.completedMetricItem}>
                  <Text style={styles.completedMetricLabel}>Patient</Text>
                  <Text style={styles.completedMetricVal}>{patientProfile.fullName}</Text>
                  <Text style={styles.completedMetricSub}>{patientProfile.phone}</Text>
                </View>
                <View style={styles.completedMetricItem}>
                  <Text style={styles.completedMetricLabel}>Discharge OTP</Text>
                  <Text style={[styles.completedMetricVal, { color: '#059669' }]}>8844 (Verified ✓)</Text>
                  <Text style={styles.completedMetricSub}>Confirmed by Patient</Text>
                </View>
                <View style={styles.completedMetricItem}>
                  <Text style={styles.completedMetricLabel}>Fee Collected</Text>
                  <Text style={[styles.completedMetricVal, { color: '#0d9488' }]}>
                    ₹{activeAppointment?.totalAmount || activeAppointment?.totalFee || 850}.00
                  </Text>
                  <Text style={styles.completedMetricSub}>Status: SETTLED</Text>
                </View>
                <View style={styles.completedMetricItem}>
                  <Text style={styles.completedMetricLabel}>Post-Care VAS</Text>
                  <Text style={[styles.completedMetricVal, { color: '#0284c7' }]}>
                    {postPainRating} / 10
                  </Text>
                  <Text style={styles.completedMetricSub}>Pain Relieved</Text>
                </View>
              </View>

              {/* LOCKED CLINICAL NOTES */}
              <View style={styles.lockedSoapBox}>
                <View style={styles.lockedSoapHeader}>
                  <Text style={styles.lockedSoapTitle}>📋 Final Clinical Record & SOAP Report</Text>
                  <Text style={styles.lockedSoapBadge}>Locked</Text>
                </View>
                <Text style={styles.lockedSoapContent}>
                  {clinicalNotes || 'Lumbar mobilization (Grade II) performed with IFT 15 min at 80-100Hz. Core stabilization exercises and hamstring stretches instructed. Post-treatment pain significantly reduced. Patient discharged safely in home environment.'}
                </Text>
              </View>

              <View style={styles.readyForNextNotice}>
                <Text style={styles.readyForNextIcon}>⏳</Text>
                <Text style={styles.readyForNextText}>
                  Standing by for next in-home dispatch assignment from Care Desk...
                </Text>
              </View>
            </View>
          ) : (
            /* ACTIVE VISIT (EDITABLE STATUS) */
            <View style={styles.ptVisitCard}>
              <View style={styles.ptVisitHeader}>
                <View>
                  <Text style={styles.ptPatientName}>{patientProfile.fullName}</Text>
                  <Text style={styles.ptPatientPhone}>📞 {patientProfile.phone}</Text>
                </View>
                <View style={styles.ptTimeTag}>
                  <Text style={styles.ptTimeTagText}>10:00 AM - 10:45 AM</Text>
                </View>
              </View>

              <View style={styles.ptAddressBox}>
                <Text style={styles.ptAddressText}>📍 {patientProfile.primaryAddress}</Text>
                <Text style={styles.ptNotesText}>Door Code: {patientProfile.entryNotes}</Text>
                <Text style={styles.ptComplaintText}>Clinical Focus: Lower Back & Sciatic spasm (VAS 6/10)</Text>
                <Text style={styles.ptConditionsText}>Pre-existing: {patientProfile.conditions.join(', ')}</Text>
              </View>

              {/* LIFECYCLE ACTION BUTTONS */}
              <Text style={styles.ptActionHeader}>Update Visit Status:</Text>
              
              <View style={styles.ptButtonGroup}>
                <TouchableOpacity 
                  style={[styles.ptStatusButton, ptStatus === 'EN_ROUTE' && styles.ptStatusButtonEnRoute]}
                  onPress={() => handleUpdatePtStatus('EN_ROUTE')}
                >
                  <Text style={styles.ptStatusButtonText}>🚗 1. Start Travel (On The Way)</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.ptStatusButton, ptStatus === 'ARRIVED' && styles.ptStatusButtonArrived]}
                  onPress={() => handleUpdatePtStatus('ARRIVED')}
                >
                  <Text style={styles.ptStatusButtonText}>🏡 2. Arrived at Door</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.ptStatusButton, ptStatus === 'IN_SESSION' && styles.ptStatusButtonInSession]}
                  onPress={() => handleUpdatePtStatus('IN_SESSION')}
                >
                  <Text style={styles.ptStatusButtonText}>🩺 3. Start Treatment</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.ptStatusButton, styles.ptStatusButtonComplete]}
                  onPress={() => setShowCompleteConfirm(true)}
                >
                  <Text style={styles.ptStatusButtonText}>✅ 4. Complete Session & Log SOAP</Text>
                </TouchableOpacity>
              </View>

              {/* QUICK TREATMENT TAGS */}
              <Text style={[styles.inputMiniLabel, { marginTop: 14 }]}>SOAP Treatment Quick Templates:</Text>
              <View style={styles.soapChipsRow}>
                {[
                  'Lumbar Gr II Mobilization', 
                  'IFT 15 min @ 80-100Hz', 
                  'Pelvic Tilts & Core Drills', 
                  'Hamstring 3x30s Stretch'
                ].map((tag) => (
                  <TouchableOpacity 
                    key={tag}
                    style={styles.soapChip}
                    onPress={() => setClinicalNotes((prev) => (prev ? `${prev}, ${tag}` : tag))}
                  >
                    <Text style={styles.soapChipText}>+ {tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput 
                style={[styles.notesInput, { marginTop: 8 }]}
                value={clinicalNotes}
                onChangeText={setClinicalNotes}
                placeholder="Clinical treatment notes (SOAP Lite)..."
                placeholderTextColor="#94a3b8"
                multiline
              />
            </View>
          )}
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 1. CONFIRM COMPLETE SESSION MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={showCompleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconGlow}>
              <Text style={{ fontSize: 32 }}>🩺</Text>
            </View>
            <Text style={styles.modalTitle}>Complete Therapy Session?</Text>
            <Text style={styles.modalSubtitle}>
              Are you sure you want to complete and finalize the visit for {patientProfile.fullName}?
            </Text>
            <View style={styles.modalAlertNotice}>
              <Text style={styles.modalAlertText}>
                ⚠️ Patient payment will be verified, and the patient's 4-digit discharge OTP will be required before final checkout.
              </Text>
            </View>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity 
                style={styles.modalCancelBtn}
                onPress={() => setShowCompleteConfirm(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalConfirmBtn}
                onPress={() => {
                  setShowCompleteConfirm(false);
                  const isPaid = activeAppointment?.paymentStatus === 'SETTLED' || activeAppointment?.paymentStatus === 'AUTHORIZED';
                  setCompletionStep(isPaid ? 'OTP' : 'PAYMENT');
                  setShowCompletionFlow(true);
                }}
              >
                <Text style={styles.modalConfirmBtnText}>Yes, Proceed ➔</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* 2. MULTI-STEP SESSION DISCHARGE & PAYMENT FLOW MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={showCompletionFlow}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCompletionFlow(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%', paddingBottom: 20 }]}>
            {/* Modal Header */}
            <View style={styles.dischargeHeader}>
              <View>
                <Text style={styles.dischargeTitle}>Session Checkout & Discharge</Text>
                <Text style={styles.dischargeSub}>Michael Chen • Orthopedic Rehab</Text>
              </View>
              <TouchableOpacity 
                style={styles.modalCloseCircle}
                onPress={() => setShowCompletionFlow(false)}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Step Progress Indicators */}
            <View style={styles.stepPillRow}>
              <TouchableOpacity 
                style={[
                  styles.stepPill, 
                  completionStep === 'PAYMENT' ? styles.stepPillActive : styles.stepPillDone
                ]}
                onPress={() => setCompletionStep('PAYMENT')}
              >
                <Text style={[
                  styles.stepPillText, 
                  completionStep === 'PAYMENT' && styles.stepPillTextActive
                ]}>
                  {(activeAppointment?.paymentStatus === 'SETTLED' || activeAppointment?.paymentStatus === 'AUTHORIZED') 
                    ? '✓ 1. Payment Cleared' 
                    : '1. Payment Pending'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.stepPill, 
                  completionStep === 'OTP' && styles.stepPillActive
                ]}
                onPress={() => {
                  if (activeAppointment?.paymentStatus === 'SETTLED' || activeAppointment?.paymentStatus === 'AUTHORIZED') {
                    setCompletionStep('OTP');
                  } else {
                    showToast('WARNING', 'Payment Required', 'Please settle payment first before entering completion OTP.');
                  }
                }}
              >
                <Text style={[
                  styles.stepPillText, 
                  completionStep === 'OTP' && styles.stepPillTextActive
                ]}>
                  2. Discharge OTP (8844)
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10 }}>
              {/* STEP 1: PAYMENT GATE */}
              {completionStep === 'PAYMENT' && (
                <View>
                  <View style={styles.billSummaryBox}>
                    <Text style={styles.billLabel}>Treatment Summary & Balance</Text>
                    <View style={styles.billRow}>
                      <Text style={styles.billItem}>Orthopedic Home Visit Fee</Text>
                      <Text style={styles.billItemVal}>₹750.00</Text>
                    </View>
                    <View style={styles.billRow}>
                      <Text style={styles.billItem}>Clinical Platform & Kit Fee</Text>
                      <Text style={styles.billItemVal}>₹100.00</Text>
                    </View>
                    <View style={styles.billDivider} />
                    <View style={styles.billRow}>
                      <Text style={styles.billTotal}>Total Outstanding Due</Text>
                      <Text style={styles.billTotalVal}>
                        ₹{activeAppointment?.totalAmount || activeAppointment?.totalFee || 850}.00
                      </Text>
                    </View>
                    <View style={[
                      styles.paymentStatusBadge,
                      (activeAppointment?.paymentStatus === 'SETTLED' || activeAppointment?.paymentStatus === 'AUTHORIZED') 
                        ? styles.statusBadgeSettled : styles.statusBadgePending
                    ]}>
                      <Text style={styles.paymentStatusBadgeText}>
                        {(activeAppointment?.paymentStatus === 'SETTLED' || activeAppointment?.paymentStatus === 'AUTHORIZED')
                          ? '✅ PAYMENT SETTLED — READY FOR DISCHARGE' 
                          : '⚠️ PAYMENT PENDING (COLLECT AT DOOR)'}
                      </Text>
                    </View>
                  </View>

                  {!(activeAppointment?.paymentStatus === 'SETTLED' || activeAppointment?.paymentStatus === 'AUTHORIZED') ? (
                    <View style={{ marginTop: 14 }}>
                      <Text style={styles.fieldLabel}>Select payment collection method:</Text>
                      <TouchableOpacity 
                        style={styles.payOptionBtn}
                        disabled={isSettling}
                        onPress={() => handleSettlePayment('CASH')}
                      >
                        <Text style={styles.payOptionIcon}>💵</Text>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.payOptionTitle}>Collect Cash & Mark Settled</Text>
                          <Text style={styles.payOptionSub}>Received ₹{activeAppointment?.totalAmount || activeAppointment?.totalFee || 850} in physical cash</Text>
                        </View>
                        <Text style={styles.payOptionArrow}>➔</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.payOptionBtn, { marginTop: 10 }]}
                        disabled={isSettling}
                        onPress={() => handleSettlePayment('UPI')}
                      >
                        <Text style={styles.payOptionIcon}>📱</Text>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.payOptionTitle}>Settle via UPI / QR Transfer</Text>
                          <Text style={styles.payOptionSub}>Patient scanned & completed instant payment</Text>
                        </View>
                        <Text style={styles.payOptionArrow}>➔</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ marginTop: 16 }}>
                      <View style={styles.paidSuccessCard}>
                        <Text style={styles.paidSuccessIcon}>🎉</Text>
                        <Text style={styles.paidSuccessTitle}>Payment Verified</Text>
                        <Text style={styles.paidSuccessSub}>The invoice has been settled. Please proceed to patient verification.</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.primaryActionButton}
                        onPress={() => setCompletionStep('OTP')}
                      >
                        <Text style={styles.primaryActionButtonText}>Next: Enter Discharge OTP ➔</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* STEP 2: DISCHARGE OTP GATE & SOAP */}
              {completionStep === 'OTP' && (
                <View>
                  <View style={styles.otpInputSection}>
                    <Text style={styles.otpInputTitle}>Patient Discharge Verification Code</Text>
                    <Text style={styles.otpInputSub}>
                      Ask the patient for the 4-digit code shown on their app to verify satisfactory completion.
                    </Text>

                    <View style={styles.fixedOtpNotice}>
                      <Text style={styles.fixedOtpNoticeText}>💡 Fixed Test OTP: 8844</Text>
                      <TouchableOpacity 
                        style={styles.fillFixedOtpBtn}
                        onPress={() => setCompletionOtp('8844')}
                      >
                        <Text style={styles.fillFixedOtpBtnText}>Auto-Fill 8844</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.otpInputRow}>
                      <TextInput
                        style={styles.otpBigInput}
                        value={completionOtp}
                        onChangeText={setCompletionOtp}
                        keyboardType="number-pad"
                        maxLength={4}
                        placeholder="8844"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                  </View>

                  {/* Post-Treatment Pain Rating (VAS) */}
                  <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                    Post-Treatment Pain Rating (VAS): {postPainRating}/10
                  </Text>
                  <View style={styles.painChipRow}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                      <TouchableOpacity 
                        key={val}
                        style={[styles.postPainChip, postPainRating === val && styles.postPainChipActive]}
                        onPress={() => setPostPainRating(val)}
                      >
                        <Text style={[styles.postPainChipText, postPainRating === val && styles.postPainChipTextActive]}>
                          {val}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Clinical Treatment Notes */}
                  <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Discharge Clinical Notes (SOAP):</Text>
                  <TextInput
                    style={styles.notesBox}
                    value={clinicalNotes}
                    onChangeText={setClinicalNotes}
                    placeholder="e.g., Lumbar mobilization done, pain relieved from 6 to 3, home stretches assigned..."
                    placeholderTextColor="#94a3b8"
                    multiline
                  />

                  <TouchableOpacity 
                    style={[styles.primaryActionButton, { marginTop: 18 }]}
                    disabled={isCompleting}
                    onPress={handleFinalizeCompletion}
                  >
                    <Text style={styles.primaryActionButtonText}>
                      {isCompleting ? 'Verifying OTP...' : '✅ Verify OTP & Finalize Session'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // CONTAINER
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  
  // CUSTOM TOAST FLOATING BANNER
  customToast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 20,
    left: 14,
    right: 14,
    zIndex: 9999,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1.5,
  },
  toastSuccess: {
    backgroundColor: '#f0fdfa',
    borderColor: '#2dd4bf',
  },
  toastInfo: {
    backgroundColor: '#f0f9ff',
    borderColor: '#38bdf8',
  },
  toastWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
  },
  toastError: {
    backgroundColor: '#fef2f2',
    borderColor: '#f87171',
  },
  toastIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastIconText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  toastTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  toastMessage: {
    fontSize: 11,
    color: '#475569',
    marginTop: 1,
  },
  toastCloseBtn: {
    padding: 4,
  },
  toastCloseText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: 'bold',
  },

  // CUSTOM MODAL POPUP BACKDROP
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    zIndex: 10000,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  modalHeaderGlow: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#f0fdfa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalSuccessCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0d9488',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalSuccessCircleText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
  },
  modalHeadline: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  modalReceiptCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 18,
  },
  modalReceiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalReceiptLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  modalReceiptValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalReceiptDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 6,
  },
  modalReceiptTotal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0d9488',
  },
  modalPrimaryBtn: {
    backgroundColor: '#0d9488',
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#0d9488',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  modalPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  modalSecondaryBtn: {
    marginTop: 10,
    paddingVertical: 8,
  },
  modalSecondaryBtnText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },

  // CALL & CHAT MODAL
  commClinicianCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 18,
  },
  commAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commAvatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  commName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  commPhone: {
    fontSize: 11,
    color: '#0284c7',
    marginTop: 1,
  },

  // TOP HEADER
  topHeader: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoBadgeText: {
    fontSize: 18,
  },
  appNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  inHomePill: {
    backgroundColor: '#f0fdfa',
    borderColor: '#0d9488',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  inHomePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0d9488',
  },
  brandSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  roleToggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  roleBtnActive: {
    backgroundColor: '#0d9488',
  },
  roleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  roleBtnTextActive: {
    color: '#ffffff',
  },

  // TABS
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#0d9488',
    backgroundColor: '#f0fdfa',
  },
  tabIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabLabelActive: {
    color: '#0d9488',
    fontWeight: '800',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0d9488',
    marginLeft: 6,
  },

  scrollArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // GREETING
  greetingCard: {
    backgroundColor: '#ffffff',
    margin: 14,
    padding: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  greetingLeft: {
    flex: 1,
  },
  greetingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  greetingSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  profileBadgeBtn: {
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  profileBadgeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f766e',
  },

  // SECTION WRAPPER
  sectionWrapper: {
    backgroundColor: '#ffffff',
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionHint: {
    fontSize: 11,
    color: '#0d9488',
    fontWeight: '700',
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 10,
  },

  // CATEGORY CARDS
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryCard: {
    width: 155,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  categoryCardSelected: {
    borderColor: '#0d9488',
    backgroundColor: '#f0fdfa',
  },
  categoryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryIconEmoji: {
    fontSize: 22,
  },
  priceTag: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priceTagSelected: {
    backgroundColor: '#0d9488',
  },
  priceTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  priceTagTextSelected: {
    color: '#ffffff',
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 8,
    minHeight: 34,
  },
  categoryTitleSelected: {
    color: '#0f766e',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  durationText: {
    fontSize: 11,
    color: '#64748b',
  },
  checkIcon: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0d9488',
  },

  // PAIN CHIPS
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  painChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  painChipActive: {
    backgroundColor: '#0d9488',
    borderColor: '#0f766e',
  },
  painChipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  painChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // SEVERITY SCALE
  severityBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  severityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  severityTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  severityBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  severityButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  severityCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  severityNumber: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  severityDesc: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },

  inputMiniLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  notesInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 10,
    color: '#0f172a',
    fontSize: 12,
    height: 60,
    textAlignVertical: 'top',
  },

  // DATE & TIME PICKER
  pickerSubLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  dateScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dateCard: {
    width: 96,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    marginRight: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  dateCardActive: {
    backgroundColor: '#0d9488',
    borderColor: '#0f766e',
  },
  dateBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginBottom: 4,
  },
  dateBadgeActive: {
    backgroundColor: '#ffffff33',
  },
  dateBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#b45309',
  },
  dateCardDay: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  dateCardDayActive: {
    color: '#ffffff',
  },
  dateCardSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  dateCardSubActive: {
    color: '#ccfbf1',
  },

  // PERIOD TABS
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  periodTabTextActive: {
    color: '#0d9488',
  },
  periodTabRange: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 1,
  },
  periodTabRangeActive: {
    color: '#0f766e',
  },

  // SLOTS GRID
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
    marginBottom: 12,
  },
  slotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    minWidth: 92,
    justifyContent: 'center',
  },
  slotChipSelected: {
    backgroundColor: '#0d9488',
    borderColor: '#0f766e',
  },
  slotChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  slotChipTextSelected: {
    color: '#ffffff',
  },
  slotCheck: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 5,
  },

  // BANNER SUMMARY
  selectionSummaryBanner: {
    backgroundColor: '#f0fdfa',
    borderColor: '#99f6e4',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerCalendarIcon: {
    fontSize: 24,
  },
  bannerTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0f766e',
    textTransform: 'uppercase',
  },
  bannerValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 1,
  },
  liveAvailableBadge: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveAvailableText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },

  // ADDRESS & PROFILE SHORTCUT
  editAddressLink: {
    fontSize: 11,
    color: '#0d9488',
    fontWeight: '700',
  },
  addressPresetCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addressLineText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  entryNotesText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 3,
  },
  patientMetaNote: {
    fontSize: 11,
    color: '#0d9488',
    fontWeight: '600',
    marginTop: 4,
  },

  // RECEIPT
  receiptBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  receiptLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  receiptVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  receiptTotalVal: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0d9488',
  },

  // PAYMENT METHODS
  paymentMethodRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  paymentMethodCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  paymentMethodCardActive: {
    borderColor: '#0d9488',
    backgroundColor: '#f0fdfa',
  },
  paymentMethodIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  paymentMethodTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  paymentMethodSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },

  // ACTION BUTTON
  bookButton: {
    backgroundColor: '#0d9488',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#0d9488',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  bookButtonSub: {
    color: '#ccfbf1',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },

  // LIVE STATUS SCREEN
  statusHeroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statusHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d97706',
    marginRight: 6,
  },
  statusLivePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b45309',
  },
  statusHeroFee: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0d9488',
  },
  statusHeroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  statusHeroAddress: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 14,
  },

  // CLINICIAN PROFILE BOX
  clinicianProfileBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  clinicianAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clinicianAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  clinicianName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  clinicianMeta: {
    fontSize: 11,
    color: '#0f766e',
    fontWeight: '600',
    marginTop: 1,
  },
  clinicianLicense: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  clinicianActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  clinicianActionBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  clinicianActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },

  // STEPPER
  stepperBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  stepperHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timelineIcon: {
    fontSize: 16,
    width: 26,
  },
  timelineTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  timelineActive: {
    color: '#0d9488',
    fontWeight: '800',
  },
  timelineSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },

  // OTP CARD
  otpCard: {
    backgroundColor: '#f0fdfa',
    borderColor: '#99f6e4',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 6,
  },
  otpTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f766e',
  },
  otpTag: {
    backgroundColor: '#0d9488',
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  otpInstructions: {
    fontSize: 11,
    color: '#134e4a',
    textAlign: 'center',
    marginBottom: 10,
  },
  otpDigitsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  otpDigitBox: {
    width: 44,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  otpDigitText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f766e',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  // PERSONAL INFO & PROFILE TAB
  profileHero: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  profileHeroAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHeroAvatarText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  profileHeroName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  profileHeroSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  verifiedTag: {
    backgroundColor: '#f0fdfa',
    borderColor: '#99f6e4',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0f766e',
  },

  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    marginTop: 8,
  },
  fieldInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
  },
  fieldRow: {
    flexDirection: 'row',
  },
  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  genderPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  genderPillActive: {
    backgroundColor: '#0d9488',
    borderColor: '#0f766e',
  },
  genderPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  genderPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  bloodPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 6,
  },
  bloodPillActive: {
    backgroundColor: '#dc2626',
    borderColor: '#b91c1c',
  },
  bloodPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  bloodPillTextActive: {
    color: '#ffffff',
  },

  conditionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  conditionPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  conditionPillActive: {
    backgroundColor: '#f0fdfa',
    borderColor: '#0d9488',
  },
  conditionPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  conditionPillTextActive: {
    color: '#0f766e',
    fontWeight: '700',
  },

  saveProfileBtn: {
    backgroundColor: '#0d9488',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginHorizontal: 14,
    marginTop: 6,
    shadowColor: '#0d9488',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  saveProfileBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },

  // THERAPIST COCKPIT
  clinicianHeaderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  clinicianHeaderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clinicianHeaderAvatarText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
  },
  ptNameTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  ptBadgeText: {
    fontSize: 11,
    color: '#0284c7',
    marginTop: 2,
  },

  ptVisitCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ptVisitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  ptPatientName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  ptPatientPhone: {
    fontSize: 12,
    color: '#0284c7',
    marginTop: 2,
  },
  ptTimeTag: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ptTimeTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  ptAddressBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  ptAddressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  ptNotesText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 3,
  },
  ptComplaintText: {
    fontSize: 11,
    color: '#d97706',
    fontWeight: '600',
    marginTop: 4,
  },
  ptConditionsText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  ptActionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 8,
  },
  ptButtonGroup: {
    gap: 8,
  },
  ptStatusButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  ptStatusButtonEnRoute: {
    backgroundColor: '#0284c7',
    borderColor: '#0369a1',
  },
  ptStatusButtonArrived: {
    backgroundColor: '#4f46e5',
    borderColor: '#4338ca',
  },
  ptStatusButtonInSession: {
    backgroundColor: '#9333ea',
    borderColor: '#7e22ce',
  },
  ptStatusButtonComplete: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  ptStatusButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  soapChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  soapChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  soapChipText: {
    fontSize: 10,
    color: '#0284c7',
    fontWeight: '600',
  },

  // ---------------------------------------------------------------------------
  // COMPLETION & PAYMENT MODAL STYLES
  // ---------------------------------------------------------------------------
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 420,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  modalIconGlow: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0fdfa',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  modalAlertNotice: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: 12,
    marginVertical: 16,
  },
  modalAlertText: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 17,
    fontWeight: '600',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  modalConfirmBtn: {
    flex: 1.5,
    backgroundColor: '#0d9488',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#0d9488',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  modalConfirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },

  // DISCHARGE MODAL STEPPING
  dischargeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 14,
    marginBottom: 14,
  },
  dischargeTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  dischargeSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  stepPillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  stepPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stepPillActive: {
    backgroundColor: '#f0fdfa',
    borderColor: '#0d9488',
  },
  stepPillDone: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  stepPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  stepPillTextActive: {
    color: '#0d9488',
    fontWeight: '800',
  },

  // BILLING BREAKDOWN
  billSummaryBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  billLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  billItem: {
    fontSize: 12,
    color: '#64748b',
  },
  billItemVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },
  billTotal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  billTotalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0d9488',
  },
  paymentStatusBadge: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  statusBadgePending: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  statusBadgeSettled: {
    backgroundColor: '#ecfdf5',
    borderColor: '#6ee7b7',
  },
  paymentStatusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065f46',
  },

  // PAYMENT COLLECTION OPTIONS
  payOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  payOptionIcon: {
    fontSize: 26,
  },
  payOptionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  payOptionSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  payOptionArrow: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0d9488',
  },
  paidSuccessCard: {
    backgroundColor: '#ecfdf5',
    borderColor: '#6ee7b7',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  paidSuccessIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  paidSuccessTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065f46',
  },
  paidSuccessSub: {
    fontSize: 11,
    color: '#047857',
    textAlign: 'center',
    marginTop: 4,
  },

  // PRIMARY ACTION BUTTON
  primaryActionButton: {
    backgroundColor: '#0d9488',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#0d9488',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryActionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },

  // OTP INPUT SECTION
  otpInputSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  otpInputTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  otpInputSub: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  fixedOtpNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#99f6e4',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginVertical: 12,
    width: '100%',
  },
  fixedOtpNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f766e',
  },
  fillFixedOtpBtn: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  fillFixedOtpBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  otpInputRow: {
    marginTop: 6,
    width: '100%',
    alignItems: 'center',
  },
  otpBigInput: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#0d9488',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 10,
    textAlign: 'center',
    color: '#0f766e',
    width: 200,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },

  // PAIN SCALE CHIPS
  painChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  postPainChip: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  postPainChipActive: {
    backgroundColor: '#0d9488',
    borderColor: '#0f766e',
  },
  postPainChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  postPainChipTextActive: {
    color: '#ffffff',
    fontWeight: '900',
  },
  notesBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 12,
    fontSize: 12,
    color: '#0f172a',
    minHeight: 70,
    textAlignVertical: 'top',
    marginTop: 8,
  },

  // THERAPIST COCKPIT TABS & COMPLETED SESSIONS CARD
  ptTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  ptTabBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  ptTabBadgeActive: {
    backgroundColor: '#f0fdfa',
    borderColor: '#0d9488',
  },
  ptTabBadgeInactive: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  ptTabBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f766e',
  },
  completedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#10b981',
    shadowColor: '#059669',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    marginTop: 8,
  },
  completedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  completedTagBox: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  completedTagText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#047857',
    letterSpacing: 0.5,
  },
  readOnlyTag: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  readOnlyTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  completedSessionHeadline: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  completedSessionSub: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 16,
  },
  completedMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  completedMetricItem: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  completedMetricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  completedMetricVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  completedMetricSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  lockedSoapBox: {
    backgroundColor: '#f0fdfa',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#99f6e4',
    marginBottom: 14,
  },
  lockedSoapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  lockedSoapTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f766e',
  },
  lockedSoapBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0d9488',
    backgroundColor: '#ccfbf1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lockedSoapContent: {
    fontSize: 12,
    color: '#134e4a',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  readyForNextNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  readyForNextIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  readyForNextText: {
    fontSize: 11,
    color: '#64748b',
    flex: 1,
  },
});

