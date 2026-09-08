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
  StatusBar,
  Dimensions,
  Platform
} from 'react-native';
import { 
  THERAPY_CATEGORIES, 
  TherapyCategory, 
  Appointment, 
  ServiceRequest 
} from './src/shared';

const API_BASE = 'http://localhost:4000/api';

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

// Address Quick Presets
const ADDRESS_PRESETS = [
  { id: 'home', label: '🏠 Home', address: '742 Evergreen Terrace, Apt 4B, New York' },
  { id: 'parents', label: '👵 Parents', address: '128 Central Park South, Suite 9A, New York' },
  { id: 'work', label: '🏢 Office', address: '450 Lexington Ave, Fl 18, New York' }
];

export default function App() {
  const [roleMode, setRoleMode] = useState<'PATIENT' | 'THERAPIST'>('PATIENT');
  const [activeTab, setActiveTab] = useState<'request' | 'status'>('request');
  const [patientName] = useState('Johnathan Doe');
  
  // Patient Form Interactive State
  const [selectedCategory, setSelectedCategory] = useState<TherapyCategory>(THERAPY_CATEGORIES[0]);
  const [selectedDate, setSelectedDate] = useState(DATE_OPTIONS[1]); // Tomorrow
  const [selectedPeriod, setSelectedPeriod] = useState(TIME_PERIODS[0].id); // Morning
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('10:45 AM');
  
  // Pain and Condition State
  const [selectedPainAreas, setSelectedPainAreas] = useState<string[]>(['Lower Back', 'Sciatic Nerve']);
  const [painSeverity, setPainSeverity] = useState<number>(6); // 1 to 10 VAS
  const [symptoms, setSymptoms] = useState('Sharp lumbar stiffness on bending forward, radiates slightly to left hamstring.');
  
  // Location State
  const [addressLine, setAddressLine] = useState('742 Evergreen Terrace, Apt 4B, New York');
  const [accessNotes, setAccessNotes] = useState('Door buzzer #402. Elevator on left.');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'CARD'>('CASH');

  // Active Backend Appointment
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);

  // Therapist Cockpit State
  const [ptStatus, setPtStatus] = useState<'ASSIGNED' | 'EN_ROUTE' | 'ARRIVED' | 'IN_SESSION' | 'COMPLETED'>('ASSIGNED');
  const [clinicalNotes, setClinicalNotes] = useState('');

  // Fetch initial active appointment from backend
  const refreshActiveData = async () => {
    try {
      const res = await fetch(`${API_BASE}/appointments`);
      const data = await res.json();
      if (data.success && data.appointments.length > 0) {
        setActiveAppointment(data.appointments[0]);
        setPtStatus(data.appointments[0].status);
      }
    } catch (e) {
      console.log('Using local state mode');
    }
  };

  useEffect(() => {
    refreshActiveData();
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

  // Severity Label Helper
  const getSeverityDescription = (val: number) => {
    if (val <= 3) return { text: 'Mild Discomfort • Noticeable but daily routine unaffected', color: '#10b981' };
    if (val <= 6) return { text: 'Moderate Pain • Restricts bending, sitting & movement', color: '#f59e0b' };
    if (val <= 8) return { text: 'Severe Pain • Significant limitation, prompt care advised', color: '#f97316' };
    return { text: 'Acute / Extreme Pain • Urgent clinician visit recommended', color: '#ef4444' };
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
            addressLine,
            city: 'New York',
            pinCode: '10024',
            coordinates: { latitude: 40.7850, longitude: -73.9680 },
            entryInstructions: accessNotes
          },
          painAreas: selectedPainAreas,
          conditionDescription: `[Pain Level ${painSeverity}/10] ${symptoms}`,
          preferredTimeWindow: preferredWindowText,
          urgency: painSeverity >= 8 ? 'URGENT' : 'NORMAL'
        })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert(
          '🎉 In-Home Visit Requested!',
          `Session scheduled for ${preferredWindowText}. Our care coordinator is assigning your specialized clinician.`
        );
        refreshActiveData();
        setActiveTab('status');
      }
    } catch (e) {
      Alert.alert(
        'Visit Logged (Offline Mode)',
        `Requested for ${preferredWindowText}. Tracking screen active.`
      );
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
        refreshActiveData();
      } catch (e) {}
    }
  };

  const activePeriodObj = TIME_PERIODS.find(p => p.id === selectedPeriod) || TIME_PERIODS[0];
  const severityInfo = getSeverityDescription(painSeverity);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090d16" />
      
      {/* 1. TOP PREMIUM HEADER BAR */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>🩺</Text>
          </View>
          <View>
            <View style={styles.appNameRow}>
              <Text style={styles.brandTitle}>TherapyCare</Text>
              <View style={styles.inHomePill}>
                <Text style={styles.inHomePillText}>IN-HOME</Text>
              </View>
            </View>
            <Text style={styles.brandSub}>Certified Home Physiotherapy</Text>
          </View>
        </View>

        {/* ROLE TOGGLE PILL */}
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
          {/* NAVIGATION TAB BAR */}
          <View style={styles.tabBar}>
            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'request' && styles.tabItemActive]}
              onPress={() => setActiveTab('request')}
            >
              <Text style={styles.tabIcon}>✨</Text>
              <Text style={[styles.tabLabel, activeTab === 'request' && styles.tabLabelActive]}>
                Request Visit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'status' && styles.tabItemActive]}
              onPress={() => setActiveTab('status')}
            >
              <Text style={styles.tabIcon}>📍</Text>
              <Text style={[styles.tabLabel, activeTab === 'status' && styles.tabLabelActive]}>
                Live Visit Status
              </Text>
              <View style={styles.activeDot} />
            </TouchableOpacity>
          </View>

          {/* TAB CONTENT */}
          {activeTab === 'request' ? (
            <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingBottom: 50 }}>
              {/* PATIENT GREETING CARD */}
              <View style={styles.greetingCard}>
                <View style={styles.greetingLeft}>
                  <Text style={styles.greetingTitle}>Hello, {patientName} 👋</Text>
                  <Text style={styles.greetingSubtitle}>Book a licensed physiotherapist to visit your home.</Text>
                </View>
                <View style={styles.verifiedShield}>
                  <Text style={styles.shieldText}>🛡️ Verified</Text>
                </View>
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
                              ${cat.basePriceUSD}
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
                <Text style={styles.sectionSub}>Select regions where you are experiencing pain or stiffness:</Text>

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
                    <Text style={styles.severityTitle}>Pain Severity Scale (VAS):</Text>
                    <View style={[styles.severityBadge, { backgroundColor: severityInfo.color + '22' }]}>
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
                  multiline
                />
              </View>

              {/* SECTION 3: INTERACTIVE DATE & TIME PICKER (NO PLAIN TEXT) */}
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
                            <Text style={styles.dateBadgeText}>{item.badge}</Text>
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

                {/* SELECTED TIME PREVIEW BANNER */}
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

              {/* SECTION 4: HOME ADDRESS & ENTRY NOTES */}
              <View style={styles.sectionWrapper}>
                <Text style={styles.sectionTitle}>4. Home Location & Instructions</Text>

                {/* PRESET CHIPS */}
                <View style={styles.addressPresetsRow}>
                  {ADDRESS_PRESETS.map((preset) => (
                    <TouchableOpacity 
                      key={preset.id}
                      style={[styles.presetChip, addressLine === preset.address && styles.presetChipActive]}
                      onPress={() => setAddressLine(preset.address)}
                    >
                      <Text style={[styles.presetChipText, addressLine === preset.address && styles.presetChipTextActive]}>
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput 
                  style={styles.addressInput}
                  value={addressLine}
                  onChangeText={setAddressLine}
                  placeholder="Enter complete address, building, floor..."
                />

                <TextInput 
                  style={[styles.addressInput, { marginTop: 8, height: 44 }]}
                  value={accessNotes}
                  onChangeText={setAccessNotes}
                  placeholder="Entry buzzer code, parking or gate tips..."
                />
              </View>

              {/* SECTION 5: TRANSPARENT PRICING & SUBMIT */}
              <View style={styles.sectionWrapper}>
                <Text style={styles.sectionTitle}>5. Pricing & Transparent Payment</Text>

                {/* RECEIPT BOX */}
                <View style={styles.receiptBox}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>{selectedCategory.name} Session</Text>
                    <Text style={styles.receiptVal}>${selectedCategory.basePriceUSD}.00</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>In-Home Clinician Transit</Text>
                    <Text style={[styles.receiptVal, { color: '#059669' }]}>FREE</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Sterilized Mobile Kit & Consumables</Text>
                    <Text style={[styles.receiptVal, { color: '#059669' }]}>INCLUDED</Text>
                  </View>
                  <View style={styles.receiptDivider} />
                  <View style={styles.receiptTotalRow}>
                    <Text style={styles.receiptTotalLabel}>Total Amount Payable</Text>
                    <Text style={styles.receiptTotalVal}>${selectedCategory.basePriceUSD}.00</Text>
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
                    Confirm In-Home Visit (${selectedCategory.basePriceUSD}.00)
                  </Text>
                  <Text style={styles.bookButtonSub}>
                    {selectedDate.dayName} at {selectedTimeSlot} • Free Cancellation
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            /* TAB 2: LIVE APPOINTMENT TRACKING & CLINICIAN PROFILE */
            <ScrollView style={styles.scrollArea} contentContainerStyle={{ padding: 16, paddingBottom: 50 }}>
              <View style={styles.statusHeroCard}>
                <View style={styles.statusHeroTop}>
                  <View style={styles.statusLivePill}>
                    <View style={styles.pulsingDot} />
                    <Text style={styles.statusLivePillText}>
                      {activeAppointment ? activeAppointment.status.replace('_', ' ') : 'CARE DESK REVIEW'}
                    </Text>
                  </View>
                  <Text style={styles.statusHeroFee}>${activeAppointment?.totalAmount || selectedCategory.basePriceUSD}</Text>
                </View>

                <Text style={styles.statusHeroTitle}>
                  {activeAppointment?.request?.category?.name || selectedCategory.name}
                </Text>
                <Text style={styles.statusHeroAddress}>
                  📍 {activeAppointment?.request?.address?.addressLine || addressLine}
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
                    onPress={() => Alert.alert('Calling Clinician', 'Connecting secure line to Dr. Sarah Jenkins...')}
                  >
                    <Text style={styles.clinicianActionText}>📞 Call Clinician</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.clinicianActionBtn}
                    onPress={() => Alert.alert('Chat Active', 'Message sent to your assigned clinician.')}
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
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {/* 3. THERAPIST PROFESSIONAL CLINICAL COCKPIT */}
      {roleMode === 'THERAPIST' && (
        <ScrollView style={styles.scrollArea} contentContainerStyle={{ padding: 16, paddingBottom: 50 }}>
          <View style={styles.clinicianHeaderCard}>
            <View style={styles.clinicianHeaderAvatar}>
              <Text style={styles.clinicianHeaderAvatarText}>SJ</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.ptNameTitle}>Dr. Sarah Jenkins, PT, DPT</Text>
              <Text style={styles.ptBadgeText}>Senior Orthopedic Specialist • NY State Board Certified</Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 18, marginBottom: 8 }]}>
            Assigned In-Home Session Today
          </Text>

          <View style={styles.ptVisitCard}>
            <View style={styles.ptVisitHeader}>
              <View>
                <Text style={styles.ptPatientName}>Johnathan Doe</Text>
                <Text style={styles.ptPatientPhone}>📞 +1 (555) 349-2810</Text>
              </View>
              <View style={styles.ptTimeTag}>
                <Text style={styles.ptTimeTagText}>10:00 AM - 10:45 AM</Text>
              </View>
            </View>

            <View style={styles.ptAddressBox}>
              <Text style={styles.ptAddressText}>📍 742 Evergreen Terrace, Apt 4B, New York</Text>
              <Text style={styles.ptNotesText}>Door Code: #402 • 3rd floor walk-up or elevator</Text>
              <Text style={styles.ptComplaintText}>Clinical Focus: Lower Back & Sciatic spasm (VAS 6/10)</Text>
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
                onPress={() => handleUpdatePtStatus('COMPLETED')}
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
              multiline
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
    backgroundColor: '#0c121e',
  },
  
  // TOP PREMIUM HEADER
  topHeader: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#059669',
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
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  inHomePill: {
    backgroundColor: '#10b98122',
    borderColor: '#10b981',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  inHomePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#34d399',
  },
  brandSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  roleToggle: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: '#334155',
  },
  roleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  roleBtnActive: {
    backgroundColor: '#059669',
  },
  roleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  roleBtnTextActive: {
    color: '#ffffff',
  },

  // TABS
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
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
    borderBottomColor: '#10b981',
    backgroundColor: '#10b9810a',
  },
  tabIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
  },
  tabLabelActive: {
    color: '#34d399',
    fontWeight: '700',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginLeft: 6,
  },

  scrollArea: {
    flex: 1,
    backgroundColor: '#0a0f1d',
  },

  // GREETING
  greetingCard: {
    backgroundColor: '#1e293b',
    margin: 14,
    padding: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#334155',
  },
  greetingLeft: {
    flex: 1,
  },
  greetingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  greetingSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  verifiedShield: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#059669',
  },
  shieldText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6ee7b7',
  },

  // SECTION WRAPPER
  sectionWrapper: {
    backgroundColor: '#131c2e',
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e2d4a',
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
    color: '#f1f5f9',
  },
  sectionHint: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
  },
  sectionSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 10,
  },

  // CATEGORY CARDS
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryCard: {
    width: 155,
    backgroundColor: '#182338',
    borderRadius: 14,
    padding: 12,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#243452',
  },
  categoryCardSelected: {
    borderColor: '#10b981',
    backgroundColor: '#064e3b33',
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
    backgroundColor: '#243452',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priceTagSelected: {
    backgroundColor: '#10b981',
  },
  priceTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#cbd5e1',
  },
  priceTagTextSelected: {
    color: '#ffffff',
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e2e8f0',
    marginTop: 8,
    minHeight: 34,
  },
  categoryTitleSelected: {
    color: '#34d399',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  durationText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  checkIcon: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10b981',
  },

  // PAIN CHIPS
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  painChip: {
    backgroundColor: '#1c2840',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2d3f63',
  },
  painChipActive: {
    backgroundColor: '#047857',
    borderColor: '#10b981',
  },
  painChipText: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  painChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // SEVERITY SCALE
  severityBox: {
    backgroundColor: '#18243c',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#243452',
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
    color: '#e2e8f0',
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
    backgroundColor: '#1f2e4a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#33476f',
  },
  severityNumber: {
    fontSize: 11,
    color: '#94a3b8',
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
    color: '#94a3b8',
    marginBottom: 6,
  },
  notesInput: {
    backgroundColor: '#18243c',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a3b5c',
    padding: 10,
    color: '#f8fafc',
    fontSize: 12,
    height: 60,
    textAlignVertical: 'top',
  },

  // DATE & TIME PICKER (INTERACTIVE)
  pickerSubLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  dateScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dateCard: {
    width: 96,
    backgroundColor: '#1a263d',
    borderRadius: 12,
    padding: 10,
    marginRight: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#2d4066',
  },
  dateCardActive: {
    backgroundColor: '#047857',
    borderColor: '#10b981',
  },
  dateBadge: {
    backgroundColor: '#f59e0b22',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginBottom: 4,
  },
  dateBadgeActive: {
    backgroundColor: '#ffffff22',
  },
  dateBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fbbf24',
  },
  dateCardDay: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f1f5f9',
  },
  dateCardDayActive: {
    color: '#ffffff',
  },
  dateCardSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  dateCardSubActive: {
    color: '#d1fae5',
  },

  // PERIOD TABS
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: '#18243c',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#293a5a',
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodTabActive: {
    backgroundColor: '#0f766e',
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  periodTabTextActive: {
    color: '#ffffff',
  },
  periodTabRange: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 1,
  },
  periodTabRangeActive: {
    color: '#ccfbf1',
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
    backgroundColor: '#1a263d',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#2e4168',
    minWidth: 92,
    justifyContent: 'center',
  },
  slotChipSelected: {
    backgroundColor: '#047857',
    borderColor: '#34d399',
  },
  slotChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
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
    backgroundColor: '#064e3b33',
    borderColor: '#059669',
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
    color: '#34d399',
    textTransform: 'uppercase',
  },
  bannerValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 1,
  },
  liveAvailableBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveAvailableText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#064e3b',
  },

  // ADDRESS
  addressPresetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  presetChip: {
    backgroundColor: '#1a263d',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2e4168',
  },
  presetChipActive: {
    backgroundColor: '#047857',
    borderColor: '#10b981',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  presetChipTextActive: {
    color: '#ffffff',
  },
  addressInput: {
    backgroundColor: '#18243c',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a3b5c',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 13,
  },

  // RECEIPT
  receiptBox: {
    backgroundColor: '#18243c',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a3b5c',
    marginBottom: 12,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  receiptLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  receiptVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#2a3b5c',
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
    color: '#f8fafc',
  },
  receiptTotalVal: {
    fontSize: 17,
    fontWeight: '900',
    color: '#34d399',
  },

  // PAYMENT METHODS
  paymentMethodRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  paymentMethodCard: {
    flex: 1,
    backgroundColor: '#18243c',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#2a3b5c',
  },
  paymentMethodCardActive: {
    borderColor: '#10b981',
    backgroundColor: '#064e3b33',
  },
  paymentMethodIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  paymentMethodTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f8fafc',
  },
  paymentMethodSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },

  // ACTION BUTTON
  bookButton: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  bookButtonSub: {
    color: '#a7f3d0',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },

  // LIVE STATUS SCREEN
  statusHeroCard: {
    backgroundColor: '#131c2e',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e2d4a',
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
    backgroundColor: '#f59e0b22',
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
    backgroundColor: '#f59e0b',
    marginRight: 6,
  },
  statusLivePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fbbf24',
  },
  statusHeroFee: {
    fontSize: 18,
    fontWeight: '900',
    color: '#34d399',
  },
  statusHeroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  statusHeroAddress: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 14,
  },

  // CLINICIAN PROFILE BOX
  clinicianProfileBox: {
    backgroundColor: '#1a263d',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2b3d60',
    marginBottom: 12,
  },
  clinicianAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#34d399',
  },
  clinicianAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  clinicianName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  clinicianMeta: {
    fontSize: 11,
    color: '#34d399',
    fontWeight: '600',
    marginTop: 1,
  },
  clinicianLicense: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  clinicianActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  clinicianActionBtn: {
    flex: 1,
    backgroundColor: '#1f2e4a',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334870',
  },
  clinicianActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },

  // STEPPER
  stepperBox: {
    backgroundColor: '#18243c',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#293a5a',
    marginBottom: 14,
  },
  stepperHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#e2e8f0',
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
    color: '#94a3b8',
  },
  timelineActive: {
    color: '#34d399',
    fontWeight: '800',
  },
  timelineSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },

  // OTP CARD
  otpCard: {
    backgroundColor: '#064e3b44',
    borderColor: '#059669',
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
    color: '#6ee7b7',
  },
  otpTag: {
    backgroundColor: '#059669',
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  otpInstructions: {
    fontSize: 11,
    color: '#a7f3d0',
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
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#34d399',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigitText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#34d399',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  // THERAPIST COCKPIT
  clinicianHeaderCard: {
    backgroundColor: '#131c2e',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e2d4a',
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
    color: '#ffffff',
  },
  ptBadgeText: {
    fontSize: 11,
    color: '#38bdf8',
    marginTop: 2,
  },

  ptVisitCard: {
    backgroundColor: '#131c2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e2d4a',
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
    color: '#ffffff',
  },
  ptPatientPhone: {
    fontSize: 12,
    color: '#38bdf8',
    marginTop: 2,
  },
  ptTimeTag: {
    backgroundColor: '#047857',
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
    backgroundColor: '#18243c',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#283958',
    marginBottom: 12,
  },
  ptAddressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f8fafc',
  },
  ptNotesText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 3,
  },
  ptComplaintText: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '600',
    marginTop: 4,
  },
  ptActionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  ptButtonGroup: {
    gap: 8,
  },
  ptStatusButton: {
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  ptStatusButtonEnRoute: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  ptStatusButtonArrived: {
    backgroundColor: '#4f46e5',
    borderColor: '#818cf8',
  },
  ptStatusButtonInSession: {
    backgroundColor: '#9333ea',
    borderColor: '#c084fc',
  },
  ptStatusButtonComplete: {
    backgroundColor: '#059669',
    borderColor: '#34d399',
  },
  ptStatusButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  soapChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  soapChip: {
    backgroundColor: '#1c2942',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2b3f66',
  },
  soapChipText: {
    fontSize: 10,
    color: '#38bdf8',
    fontWeight: '600',
  },
});
