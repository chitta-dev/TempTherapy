import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  SafeAreaView, 
  Alert, 
  StatusBar 
} from 'react-native';
import { 
  THERAPY_CATEGORIES, 
  TherapyCategory, 
  Appointment, 
  ServiceRequest 
} from '../../packages/shared/src/index';

const API_BASE = 'http://localhost:4000/api';

export default function App() {
  const [roleMode, setRoleMode] = useState<'PATIENT' | 'THERAPIST'>('PATIENT');
  const [activeTab, setActiveTab] = useState<'request' | 'status' | 'history'>('request');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [patientName, setPatientName] = useState('Johnathan Doe');
  
  // Patient Request Form State
  const [selectedCategory, setSelectedCategory] = useState<TherapyCategory>(THERAPY_CATEGORIES[0]);
  const [addressLine, setAddressLine] = useState('742 Evergreen Terrace, Apt 4B, New York');
  const [painArea, setPainArea] = useState('Lower Back & Sciatica');
  const [symptoms, setSymptoms] = useState('Sharp pain during forward bending and prolonged sitting.');
  const [preferredWindow, setPreferredWindow] = useState('Tomorrow Morning (9 AM - 12 PM)');
  const [currentRequest, setCurrentRequest] = useState<ServiceRequest | null>(null);

  // Active Appointment Tracking
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);

  // Therapist App State
  const [ptStatus, setPtStatus] = useState<'ASSIGNED' | 'EN_ROUTE' | 'ARRIVED' | 'IN_SESSION' | 'COMPLETED'>('ASSIGNED');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [cashOtpInput, setCashOtpInput] = useState('');

  // Fetch initial active appointment
  const refreshActiveData = async () => {
    try {
      const res = await fetch(`${API_BASE}/appointments`);
      const data = await res.json();
      if (data.success && data.appointments.length > 0) {
        setActiveAppointment(data.appointments[0]);
        setPtStatus(data.appointments[0].status);
      }
    } catch (e) {
      console.log('Using local fallback state');
    }
  };

  useEffect(() => {
    refreshActiveData();
  }, [roleMode]);

  // Handle Patient SSO Login Simulation
  const handleSSOLogin = (provider: 'Google' | 'Apple') => {
    setIsLoggedIn(true);
    Alert.alert('Authenticated Successfully', `Signed in via ${provider} SSO & Biometrics verified.`);
  };

  // Submit Home Visit Request
  const handleSubmitRequest = async () => {
    try {
      const res = await fetch(`${API_BASE}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: selectedCategory.id,
          address: {
            addressLine,
            city: 'New York',
            pinCode: '10024',
            coordinates: { latitude: 40.7850, longitude: -73.9680 }
          },
          painAreas: [painArea],
          conditionDescription: symptoms,
          preferredTimeWindow: preferredWindow,
          urgency: 'NORMAL'
        })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentRequest(data.request);
        Alert.alert('Request Submitted!', 'Your request is in review by our care desk. We will assign your certified physiotherapist shortly.');
        setActiveTab('status');
      }
    } catch (e) {
      Alert.alert('Request Logged', 'Request submitted successfully in offline preview mode.');
      setActiveTab('status');
    }
  };

  // Therapist Status Action Updates
  const handleUpdatePtStatus = async (nextStatus: any) => {
    setPtStatus(nextStatus);
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
      } catch (e) {}
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      
      {/* TOP ROLE SWITCHER HEADER */}
      <View style={styles.roleHeader}>
        <View>
          <Text style={styles.appTitle}>TherapyCare Mobile</Text>
          <Text style={styles.appSubtitle}>On-Demand In-Home Physiotherapy</Text>
        </View>

        {/* ROLE TOGGLE */}
        <View style={styles.roleToggleContainer}>
          <TouchableOpacity 
            style={[styles.roleButton, roleMode === 'PATIENT' && styles.roleButtonActive]}
            onPress={() => setRoleMode('PATIENT')}
          >
            <Text style={[styles.roleText, roleMode === 'PATIENT' && styles.roleTextActive]}>Patient</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.roleButton, roleMode === 'THERAPIST' && styles.roleButtonActive]}
            onPress={() => setRoleMode('THERAPIST')}
          >
            <Text style={[styles.roleText, roleMode === 'THERAPIST' && styles.roleTextActive]}>Therapist</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ========================================================================= */}
      {/* 1. PATIENT MOBILE VIEW */}
      {/* ========================================================================= */}
      {roleMode === 'PATIENT' && (
        <View style={{ flex: 1 }}>
          {!isLoggedIn ? (
            /* AUTHENTICATION SCREEN */
            <View style={styles.authContainer}>
              <View style={styles.authCard}>
                <Text style={styles.authTitle}>Welcome to TherapyCare</Text>
                <Text style={styles.authDesc}>Certified physiotherapy delivered at the comfort of your home.</Text>

                <TouchableOpacity 
                  style={[styles.ssoButton, { backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1 }]}
                  onPress={() => handleSSOLogin('Google')}
                >
                  <Text style={[styles.ssoButtonText, { color: '#0f172a' }]}>Continue with Google</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.ssoButton, { backgroundColor: '#000000', marginTop: 12 }]}
                  onPress={() => handleSSOLogin('Apple')}
                >
                  <Text style={[styles.ssoButtonText, { color: '#ffffff' }]}>Continue with Apple ID</Text>
                </TouchableOpacity>

                <View style={styles.biometricNote}>
                  <Text style={styles.biometricText}>🔒 Face ID & Fingerprint Biometrics Enabled</Text>
                </View>
              </View>
            </View>
          ) : (
            /* PATIENT MAIN INTERFACE */
            <View style={{ flex: 1 }}>
              {/* PATIENT NAV TABS */}
              <View style={styles.navBar}>
                <TouchableOpacity 
                  style={[styles.navItem, activeTab === 'request' && styles.navItemActive]}
                  onPress={() => setActiveTab('request')}
                >
                  <Text style={[styles.navText, activeTab === 'request' && styles.navTextActive]}>Request Visit</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.navItem, activeTab === 'status' && styles.navItemActive]}
                  onPress={() => setActiveTab('status')}
                >
                  <Text style={[styles.navText, activeTab === 'status' && styles.navTextActive]}>Live Visit Status</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.contentScroll} contentContainerStyle={{ paddingBottom: 40 }}>
                {activeTab === 'request' && (
                  <View style={styles.formContainer}>
                    <Text style={styles.sectionHeader}>Request In-Home Session</Text>
                    <Text style={styles.sectionSub}>Select therapy type and address. Our care team assigns your specialist.</Text>

                    {/* ADDRESS SELECTION */}
                    <Text style={styles.label}>Home Location & Address</Text>
                    <TextInput 
                      style={styles.input} 
                      value={addressLine} 
                      onChangeText={setAddressLine} 
                      placeholder="Enter street, apartment, landmark" 
                    />

                    {/* THERAPY CATEGORY PICKER */}
                    <Text style={[styles.label, { marginTop: 16 }]}>Select Therapy Specialty</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                      {THERAPY_CATEGORIES.map((cat) => (
                        <TouchableOpacity 
                          key={cat.id} 
                          style={[
                            styles.categoryCard, 
                            selectedCategory.id === cat.id && styles.categoryCardActive
                          ]}
                          onPress={() => setSelectedCategory(cat)}
                        >
                          <Text style={[styles.categoryName, selectedCategory.id === cat.id && styles.categoryNameActive]}>
                            {cat.name}
                          </Text>
                          <Text style={[styles.categoryDuration, selectedCategory.id === cat.id && styles.categoryDurationActive]}>
                            {cat.standardDurationMinutes} mins • ${cat.basePriceUSD}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* PAIN AREA & SYMPTOMS */}
                    <Text style={[styles.label, { marginTop: 16 }]}>Pain Focus Area</Text>
                    <TextInput 
                      style={styles.input} 
                      value={painArea} 
                      onChangeText={setPainArea} 
                      placeholder="e.g., Lower Back, Neck, Left Knee" 
                    />

                    <Text style={[styles.label, { marginTop: 16 }]}>Symptoms & Condition Notes</Text>
                    <TextInput 
                      style={[styles.input, { height: 70 }]} 
                      value={symptoms} 
                      onChangeText={setSymptoms} 
                      multiline 
                      placeholder="Describe what movements cause pain..." 
                    />

                    {/* PREFERRED TIMING WINDOW */}
                    <Text style={[styles.label, { marginTop: 16 }]}>Preferred Timing Window</Text>
                    <TextInput 
                      style={styles.input} 
                      value={preferredWindow} 
                      onChangeText={setPreferredWindow} 
                      placeholder="e.g. Tomorrow Morning (9 AM - 12 PM)" 
                    />

                    {/* SUBMIT BUTTON */}
                    <TouchableOpacity style={styles.primaryButton} onPress={handleSubmitRequest}>
                      <Text style={styles.primaryButtonText}>Submit Home Visit Request</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {activeTab === 'status' && (
                  <View style={styles.formContainer}>
                    <Text style={styles.sectionHeader}>Live Appointment Tracking</Text>

                    {/* APPOINTMENT CARD */}
                    <View style={styles.statusCard}>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>
                          {activeAppointment ? activeAppointment.status.replace('_', ' ') : 'PENDING DESK REVIEW'}
                        </Text>
                      </View>

                      <Text style={styles.statusTitle}>
                        {activeAppointment?.request?.category?.name || selectedCategory.name}
                      </Text>
                      <Text style={styles.statusAddress}>📍 {addressLine}</Text>

                      {/* THERAPIST PROFILE DOSSIER */}
                      <View style={styles.therapistDossier}>
                        <Text style={styles.dossierHeader}>Assigned Physiotherapist:</Text>
                        <Text style={styles.dossierName}>
                          {activeAppointment?.therapist?.user?.fullName || 'Dr. Sarah Jenkins, PT, DPT'}
                        </Text>
                        <Text style={styles.dossierMeta}>
                          {activeAppointment?.therapist?.seniority || 'SENIOR CLINICIAN'} • 7 yrs exp • ★ 4.9
                        </Text>
                      </View>

                      {/* REAL-TIME PROGRESS STEPPER */}
                      <View style={styles.stepperContainer}>
                        <Text style={styles.stepText}>✅ 1. Request Approved & Scheduled (Tomorrow 10:00 AM)</Text>
                        <Text style={[styles.stepText, (ptStatus === 'EN_ROUTE' || ptStatus === 'ARRIVED' || ptStatus === 'IN_SESSION' || ptStatus === 'COMPLETED') && styles.stepActive]}>
                          🚗 2. Therapist on the way (ETA: 18 mins)
                        </Text>
                        <Text style={[styles.stepText, (ptStatus === 'ARRIVED' || ptStatus === 'IN_SESSION' || ptStatus === 'COMPLETED') && styles.stepActive]}>
                          🏡 3. Therapist arrived at door
                        </Text>
                        <Text style={[styles.stepText, (ptStatus === 'IN_SESSION' || ptStatus === 'COMPLETED') && styles.stepActive]}>
                          🩺 4. Treatment in progress (45 mins)
                        </Text>
                        <Text style={[styles.stepText, ptStatus === 'COMPLETED' && styles.stepActive]}>
                          🟢 5. Session Completed & Summary Logged
                        </Text>
                      </View>

                      {/* CASH OTP CONFIRMATION */}
                      <View style={styles.otpBox}>
                        <Text style={styles.otpLabel}>Cash Collection Security Code (Show to Therapist):</Text>
                        <Text style={styles.otpValue}>{activeAppointment?.cashConfirmationOtp || '7492'}</Text>
                      </View>
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* ========================================================================= */}
      {/* 2. THERAPIST MOBILE VIEW */}
      {/* ========================================================================= */}
      {roleMode === 'THERAPIST' && (
        <ScrollView style={styles.contentScroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={styles.ptHeaderBox}>
            <Text style={styles.ptWelcome}>Dr. Sarah Jenkins, PT, DPT</Text>
            <Text style={styles.ptBadge}>Verified Senior Clinician • License: PT-NY-849204</Text>
          </View>

          <Text style={[styles.sectionHeader, { marginTop: 16 }]}>Today's Assigned Home Visit</Text>

          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Patient: Johnathan Doe</Text>
            <Text style={styles.statusAddress}>📍 742 Evergreen Terrace, Apt 4B</Text>
            <Text style={styles.ptComplaint}>Complaint: Lower Back pain & Sciatic spasm</Text>
            <Text style={styles.ptTime}>Scheduled: 10:00 AM - 10:45 AM (45 mins)</Text>

            {/* STATUS ACTION BUTTONS */}
            <View style={styles.ptActionContainer}>
              <Text style={styles.ptActionLabel}>Update Visit Lifecycle Status:</Text>
              
              <TouchableOpacity 
                style={[styles.ptButton, ptStatus === 'EN_ROUTE' && styles.ptButtonActive]}
                onPress={() => handleUpdatePtStatus('EN_ROUTE')}
              >
                <Text style={styles.ptButtonText}>🚗 1. Start Travel (On the Way)</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.ptButton, ptStatus === 'ARRIVED' && styles.ptButtonActive]}
                onPress={() => handleUpdatePtStatus('ARRIVED')}
              >
                <Text style={styles.ptButtonText}>🏡 2. Arrived at Patient Home</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.ptButton, ptStatus === 'IN_SESSION' && styles.ptButtonActive]}
                onPress={() => handleUpdatePtStatus('IN_SESSION')}
              >
                <Text style={styles.ptButtonText}>🩺 3. Start Therapy Session</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.ptButton, { backgroundColor: '#059669' }]}
                onPress={() => handleUpdatePtStatus('COMPLETED')}
              >
                <Text style={styles.ptButtonText}>✅ 4. Complete Session & Log Notes</Text>
              </TouchableOpacity>
            </View>

            {/* SOAP NOTES INPUT */}
            <Text style={[styles.label, { marginTop: 16 }]}>Clinical Treatment Notes (SOAP Lite)</Text>
            <TextInput 
              style={[styles.input, { height: 60 }]} 
              value={clinicalNotes} 
              onChangeText={setClinicalNotes} 
              placeholder="e.g. Lumbar mobilization grade 2, IFT 15 mins, taught pelvic tilts." 
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  roleHeader: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  appSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
  },
  roleToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 3,
  },
  roleButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  roleButtonActive: {
    backgroundColor: '#10b981',
  },
  roleText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  roleTextActive: {
    color: '#ffffff',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  authCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
  },
  authDesc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
  },
  ssoButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  ssoButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  biometricNote: {
    marginTop: 20,
    alignItems: 'center',
  },
  biometricText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  navItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  navItemActive: {
    borderBottomColor: '#10b981',
  },
  navText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  navTextActive: {
    color: '#10b981',
  },
  contentScroll: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  categoryCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    marginRight: 10,
    width: 170,
  },
  categoryCardActive: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  categoryName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  categoryNameActive: {
    color: '#047857',
  },
  categoryDuration: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  categoryDurationActive: {
    color: '#059669',
  },
  primaryButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#92400e',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  statusAddress: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  therapistDossier: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  dossierHeader: {
    fontSize: 11,
    color: '#64748b',
  },
  dossierName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 2,
  },
  dossierMeta: {
    fontSize: 11,
    color: '#059669',
    marginTop: 1,
  },
  stepperContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  stepText: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 6,
  },
  stepActive: {
    color: '#0f172a',
    fontWeight: '600',
  },
  otpBox: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    alignItems: 'center',
  },
  otpLabel: {
    fontSize: 11,
    color: '#065f46',
  },
  otpValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#047857',
    letterSpacing: 4,
    marginTop: 2,
  },
  ptHeaderBox: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
  },
  ptWelcome: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ptBadge: {
    color: '#34d399',
    fontSize: 11,
    marginTop: 2,
  },
  ptComplaint: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },
  ptTime: {
    fontSize: 12,
    color: '#059669',
    fontWeight: 'bold',
    marginTop: 2,
  },
  ptActionContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  ptActionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 8,
  },
  ptButton: {
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  ptButtonActive: {
    backgroundColor: '#0284c7',
  },
  ptButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
