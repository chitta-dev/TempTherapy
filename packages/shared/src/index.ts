export type UserRole = 'PATIENT' | 'THERAPIST' | 'DESK_BOY' | 'ADMIN';

export type ServiceMode = 'HOME_VISIT' | 'CLINIC_VISIT';

export type RequestStatus = 
  | 'REQUEST_SUBMITTED' 
  | 'APPROVED_AND_ASSIGNED' 
  | 'REJECTED' 
  | 'CANCELLED';

export type AppointmentStatus = 
  | 'ASSIGNED' 
  | 'EN_ROUTE' 
  | 'ARRIVED' 
  | 'IN_SESSION' 
  | 'COMPLETED' 
  | 'CANCELLED';

export type PaymentMode = 
  | 'ONLINE_CARD' 
  | 'UPI' 
  | 'APPLE_PAY' 
  | 'GOOGLE_PAY' 
  | 'CASH_ON_SERVICE';

export type PaymentStatus = 
  | 'PENDING' 
  | 'PAID_ONLINE' 
  | 'CASH_COLLECTED' 
  | 'REFUNDED';

export type TherapistSeniority = 'JUNIOR' | 'SENIOR' | 'MASTER_CONSULTANT';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  ssoProvider?: 'GOOGLE' | 'APPLE' | null;
  isActive: boolean;
  createdAt: string;
}

export interface TherapyCategory {
  id: string;
  name: string;
  description: string;
  standardDurationMinutes: number;
  basePriceUSD: number;
  basePriceINR: number;
  iconName: string;
  modalities: string[];
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Address {
  id: string;
  userId: string;
  addressLine: string;
  landmark?: string;
  city: string;
  pinCode: string;
  coordinates: Coordinates;
  entryInstructions?: string;
}

export interface TherapistProfile {
  id: string;
  userId: string;
  user: User;
  licenseNumber: string;
  specializations: string[];
  seniority: TherapistSeniority;
  yearsOfExperience: number;
  serviceRadiusKm: number;
  baseCoordinates: Coordinates;
  isVerified: boolean;
  rating: number;
  totalReviews: number;
  completedVisitsCount: number;
}

export interface ServiceRequest {
  id: string;
  patientId: string;
  patient: User;
  categoryId: string;
  category: TherapyCategory;
  serviceMode: ServiceMode;
  createdByUserRole: 'PATIENT' | 'DESK_BOY';
  createdByUserId: string;
  address: Address;
  painAreas: string[];
  conditionDescription: string;
  preferredTimeWindow: string;
  prescriptionImageUrl?: string;
  status: RequestStatus;
  urgency: 'NORMAL' | 'URGENT';
  sessionIndex?: number;
  totalSessions?: number;
  packageName?: string;
  offlineConsultationNotes?: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  requestId: string;
  request: ServiceRequest;
  patientId: string;
  patient: User;
  therapistId: string;
  therapist: TherapistProfile;
  assignedByUserId: string;
  serviceMode: ServiceMode;
  scheduledStart: string;
  scheduledEnd: string;
  status: AppointmentStatus;
  
  // Financial breakdown
  baseAmount: number;
  travelDistanceKm: number;
  travelAmount: number;
  senioritySurcharge: number;
  discountAmount: number;
  totalAmount: number;
  paymentMode: PaymentMode;
  paymentStatus: PaymentStatus;
  
  // Execution details
  therapistDepartedAt?: string;
  therapistArrivedAt?: string;
  sessionStartedAt?: string;
  sessionCompletedAt?: string;
  cashConfirmationOtp?: string;
  completionOtp?: string;
  clinicalNotes?: string;
  prescribedExercises?: string[];
  patientRating?: number;
  patientFeedback?: string;
  
  // Multi-session care plan tracking
  sessionIndex?: number;
  totalSessions?: number;
  packageName?: string;
  offlineConsultationNotes?: string;
  createdAt: string;
}

// 7 Standard Therapy Categories
export const THERAPY_CATEGORIES: TherapyCategory[] = [
  {
    id: 'cat_ortho',
    name: 'Orthopedic & Spine Care',
    description: 'Relief for lower back pain, neck stiffness, sciatica, frozen shoulder, and joint arthritis.',
    standardDurationMinutes: 45,
    basePriceUSD: 45,
    basePriceINR: 800,
    iconName: 'bone',
    modalities: ['Manual Joint Mobilization', 'TENS/IFT Electrotherapy', 'Deep Tissue Release', 'Strengthening Drills']
  },
  {
    id: 'cat_post_op',
    name: 'Post-Surgical & Joint Replacement',
    description: 'Targeted rehabilitation following Knee/Hip Replacement, ACL Reconstruction, or spinal surgery.',
    standardDurationMinutes: 60,
    basePriceUSD: 60,
    basePriceINR: 1200,
    iconName: 'bandage',
    modalities: ['Gait & Walk Training', 'Scar Tissue Mobilization', 'Continuous Passive Motion (CPM)', 'Progressive Load Rehab']
  },
  {
    id: 'cat_neuro',
    name: 'Neurological Rehabilitation',
    description: 'Specialized therapy for Stroke Recovery (Hemiplegia), Parkinson’s, SCI, and Bell’s Palsy.',
    standardDurationMinutes: 60,
    basePriceUSD: 75,
    basePriceINR: 1500,
    iconName: 'brain',
    modalities: ['Neuro-Developmental Technique (NDT)', 'Balance & Proprioception Training', 'Functional Transfer Drills', 'Spasticity Management']
  },
  {
    id: 'cat_sports',
    name: 'Sports Injury & Performance Rehab',
    description: 'Rapid recovery from ligament sprains, rotator cuff tears, tennis elbow, and runner’s knee.',
    standardDurationMinutes: 60,
    basePriceUSD: 65,
    basePriceINR: 1300,
    iconName: 'activity',
    modalities: ['Kinesiology Taping', 'Dry Needling Therapy', 'Eccentric Muscle Loading', 'Sports Functional Testing']
  },
  {
    id: 'cat_geriatric',
    name: 'Geriatric & Fall Prevention Care',
    description: 'Gentle mobility, balance re-education, and fall prevention for senior citizens in home safety.',
    standardDurationMinutes: 45,
    basePriceUSD: 50,
    basePriceINR: 900,
    iconName: 'user-check',
    modalities: ['Static & Dynamic Balance Drills', 'Safe Transfer Training', 'Gentle Range of Motion', 'Fall Hazard Screening']
  },
  {
    id: 'cat_cardio',
    name: 'Cardiopulmonary & Chest PT',
    description: 'Breathing optimization and clearance for Post-COVID lungs, COPD, and cardiac recovery.',
    standardDurationMinutes: 45,
    basePriceUSD: 55,
    basePriceINR: 1100,
    iconName: 'heart',
    modalities: ['Postural Drainage & Percussion', 'Deep Diaphragmatic Breathing', 'Incentive Spirometry Coaching', 'Endurance Pacing']
  },
  {
    id: 'cat_pediatric',
    name: 'Pediatric Physiotherapy',
    description: 'Developmental milestones, torticollis, and sensory-motor facilitation for young children.',
    standardDurationMinutes: 45,
    basePriceUSD: 65,
    basePriceINR: 1300,
    iconName: 'smile',
    modalities: ['Play-Based Neuromotor Drills', 'Postural Alignment', 'Sensory Integration Support']
  }
];

// Price Calculation Helper
export function calculateSessionFee(params: {
  categoryId: string;
  travelDistanceKm: number;
  seniority: TherapistSeniority;
  currency: 'USD' | 'INR';
  isUrgent?: boolean;
}): {
  baseAmount: number;
  travelAmount: number;
  senioritySurcharge: number;
  urgentSurcharge: number;
  totalAmount: number;
} {
  const category = THERAPY_CATEGORIES.find(c => c.id === params.categoryId) || THERAPY_CATEGORIES[0];
  const baseAmount = params.currency === 'USD' ? category.basePriceUSD : category.basePriceINR;
  
  // Travel calculation: 0-5 km included free, beyond 5km = $1.50 or ₹30 per km
  const extraKm = Math.max(0, params.travelDistanceKm - 5);
  const perKmRate = params.currency === 'USD' ? 1.50 : 30;
  const travelAmount = Math.round(extraKm * perKmRate);

  // Seniority multiplier
  let seniorityMultiplier = 0;
  if (params.seniority === 'SENIOR') seniorityMultiplier = 0.15;
  if (params.seniority === 'MASTER_CONSULTANT') seniorityMultiplier = 0.30;
  const senioritySurcharge = Math.round(baseAmount * seniorityMultiplier);

  // Urgent fee
  const urgentRate = params.currency === 'USD' ? 10 : 200;
  const urgentSurcharge = params.isUrgent ? urgentRate : 0;

  const totalAmount = baseAmount + travelAmount + senioritySurcharge + urgentSurcharge;

  return {
    baseAmount,
    travelAmount,
    senioritySurcharge,
    urgentSurcharge,
    totalAmount
  };
}
