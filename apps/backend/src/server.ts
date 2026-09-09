import express, { Request, Response } from 'express';
import cors from 'cors';
import { 
  THERAPY_CATEGORIES, 
  calculateSessionFee, 
  User, 
  TherapistProfile, 
  ServiceRequest, 
  Appointment, 
  AppointmentStatus,
  PaymentMode,
  PaymentStatus 
} from '../../../packages/shared/src/index';

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

// Friendly Root Landing Page
app.get('/', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>TherapyCare API Server</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; }
          .card { background: #1e293b; border-radius: 12px; padding: 24px; max-width: 600px; border: 1px solid #334155; }
          h1 { color: #10b981; margin-top: 0; }
          a { color: #38bdf8; text-decoration: none; font-weight: 500; }
          a:hover { text-decoration: underline; }
          ul { line-height: 1.8; }
          .badge { background: #065f46; color: #6ee7b7; padding: 4px 8px; border-radius: 6px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🚀 TherapyCare Backend API is Live</h1>
          <p><span class="badge">STATUS: ACTIVE</span> &bull; Port: <strong>4000</strong></p>
          <p>Web Admin & Desk Dispatch Dashboard: <a href="http://localhost:3000" target="_blank">http://localhost:3000</a></p>
          <hr style="border-color: #334155; margin: 20px 0;" />
          <h3>Available API Endpoints:</h3>
          <ul>
            <li><a href="/api/categories" target="_blank">GET /api/categories</a> - 7 Standard Therapy Categories</li>
            <li><a href="/api/requests" target="_blank">GET /api/requests</a> - Service Requests Triage Queue</li>
            <li><a href="/api/therapists" target="_blank">GET /api/therapists</a> - Certified Physiotherapists Roster</li>
            <li><a href="/api/appointments" target="_blank">GET /api/appointments</a> - Active Confirmed Appointments</li>
          </ul>
        </div>
      </body>
    </html>
  `);
});

// Seed Data & In-Memory Storage
const USERS: User[] = [
  {
    id: 'usr_patient_1',
    email: 'john.doe@gmail.com',
    fullName: 'Johnathan Doe',
    phone: '+1 (555) 234-5678',
    role: 'PATIENT',
    ssoProvider: 'GOOGLE',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr_pt_1',
    email: 'dr.sarah@therapycare.com',
    fullName: 'Dr. Sarah Jenkins, PT, DPT',
    phone: '+1 (555) 987-6543',
    role: 'THERAPIST',
    avatarUrl: 'https://images.unsplash.com/photo-1594824813586-2a543f338d8a?w=150',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr_pt_2',
    email: 'dr.marcus@therapycare.com',
    fullName: 'Dr. Marcus Vance, MPT (Neuro)',
    phone: '+1 (555) 456-7890',
    role: 'THERAPIST',
    avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr_desk_1',
    email: 'desk.alex@therapycare.com',
    fullName: 'Alex Miller (Care Coordinator)',
    phone: '+1 (555) 111-2222',
    role: 'DESK_BOY',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr_admin_1',
    email: 'admin@therapycare.com',
    fullName: 'Elena Rostova (Operations Director)',
    phone: '+1 (555) 000-9999',
    role: 'ADMIN',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

const THERAPISTS: TherapistProfile[] = [
  {
    id: 'tp_1',
    userId: 'usr_pt_1',
    user: USERS[1],
    licenseNumber: 'PT-NY-849204',
    specializations: ['Orthopedic & Spine Care', 'Post-Surgical & Joint Replacement', 'Sports Injury & Performance Rehab'],
    seniority: 'SENIOR',
    yearsOfExperience: 7,
    serviceRadiusKm: 12,
    baseCoordinates: { latitude: 40.7128, longitude: -74.0060 },
    isVerified: true,
    rating: 4.9,
    totalReviews: 128,
    completedVisitsCount: 340
  },
  {
    id: 'tp_2',
    userId: 'usr_pt_2',
    user: USERS[2],
    licenseNumber: 'PT-NY-991032',
    specializations: ['Neurological Rehabilitation', 'Geriatric & Fall Prevention Care', 'Orthopedic & Spine Care'],
    seniority: 'MASTER_CONSULTANT',
    yearsOfExperience: 12,
    serviceRadiusKm: 15,
    baseCoordinates: { latitude: 40.7831, longitude: -73.9712 },
    isVerified: true,
    rating: 5.0,
    totalReviews: 215,
    completedVisitsCount: 520
  }
];

const SERVICE_REQUESTS: ServiceRequest[] = [
  {
    id: 'req_101',
    patientId: 'usr_patient_1',
    patient: USERS[0],
    categoryId: 'cat_ortho',
    category: THERAPY_CATEGORIES[0],
    serviceMode: 'HOME_VISIT',
    createdByUserRole: 'PATIENT',
    createdByUserId: 'usr_patient_1',
    address: {
      id: 'addr_1',
      userId: 'usr_patient_1',
      addressLine: '742 Evergreen Terrace, Apt 4B',
      landmark: 'Near Central Park West',
      city: 'New York',
      pinCode: '10024',
      coordinates: { latitude: 40.7850, longitude: -73.9680 },
      entryInstructions: 'Ring doorbell 4B, elevator code 1290'
    },
    painAreas: ['Lower Back', 'Left Sciatic Nerve'],
    conditionDescription: 'Acute lower back spasm after lifting heavy weights. Radiating pain down left leg.',
    preferredTimeWindow: 'Tomorrow Morning (9:00 AM - 12:00 PM)',
    status: 'REQUEST_SUBMITTED',
    urgency: 'NORMAL',
    createdAt: new Date(Date.now() - 3600000).toISOString()
  }
];

const APPOINTMENTS: Appointment[] = [
  {
    id: 'apt_501',
    requestId: 'req_101_prev',
    request: SERVICE_REQUESTS[0],
    patientId: 'usr_patient_1',
    patient: USERS[0],
    therapistId: 'tp_1',
    therapist: THERAPISTS[0],
    assignedByUserId: 'usr_desk_1',
    serviceMode: 'HOME_VISIT',
    scheduledStart: new Date(Date.now() + 86400000).toISOString(),
    scheduledEnd: new Date(Date.now() + 86400000 + 2700000).toISOString(),
    status: 'ASSIGNED',
    baseAmount: 45,
    travelDistanceKm: 6.2,
    travelAmount: 2,
    senioritySurcharge: 7,
    discountAmount: 0,
    totalAmount: 54,
    paymentMode: 'CASH_ON_SERVICE',
    paymentStatus: 'PENDING',
    cashConfirmationOtp: '7492',
    createdAt: new Date().toISOString()
  }
];

// ==================== AUTH ENDPOINTS ====================

app.post('/api/auth/sso-login', (req: Request, res: Response) => {
  const { email, fullName, ssoProvider, phone } = req.body;
  let user = USERS.find(u => u.email === email);
  if (!user) {
    user = {
      id: `usr_${Date.now()}`,
      email: email || `guest_${Date.now()}@mobile.local`,
      fullName: fullName || 'Patient User',
      phone: phone || '+1 (555) 000-0000',
      role: 'PATIENT',
      ssoProvider: ssoProvider || 'GOOGLE',
      isActive: true,
      createdAt: new Date().toISOString()
    };
    USERS.push(user);
  }
  res.json({ success: true, user, token: `jwt_token_sso_${user.id}_${Date.now()}` });
});

app.post('/api/auth/staff-login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = USERS.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
  if (!user || user.role === 'PATIENT') {
    return res.status(401).json({ success: false, message: 'Invalid staff credentials or unauthorized account.' });
  }
  res.json({ success: true, user, token: `jwt_token_staff_${user.id}_${Date.now()}` });
});

// ==================== CATALOG & PRICING ====================

app.get('/api/categories', (req: Request, res: Response) => {
  res.json({ success: true, categories: THERAPY_CATEGORIES });
});

app.post('/api/pricing/calculate', (req: Request, res: Response) => {
  const { categoryId, travelDistanceKm, seniority, currency, isUrgent } = req.body;
  const pricing = calculateSessionFee({
    categoryId: categoryId || 'cat_ortho',
    travelDistanceKm: travelDistanceKm || 3,
    seniority: seniority || 'SENIOR',
    currency: currency || 'USD',
    isUrgent: !!isUrgent
  });
  res.json({ success: true, pricing });
});

// ==================== SERVICE REQUESTS ====================

app.post('/api/requests', (req: Request, res: Response) => {
  const { 
    patientId, 
    categoryId, 
    address, 
    painAreas, 
    conditionDescription, 
    preferredTimeWindow,
    createdByUserRole,
    createdByUserId,
    urgency 
  } = req.body;

  let patient = USERS.find(u => u.id === patientId) || USERS[0];
  const category = THERAPY_CATEGORIES.find(c => c.id === categoryId) || THERAPY_CATEGORIES[0];

  const newRequest: ServiceRequest = {
    id: `req_${Date.now()}`,
    patientId: patient.id,
    patient,
    categoryId: category.id,
    category,
    serviceMode: 'HOME_VISIT',
    createdByUserRole: createdByUserRole || 'PATIENT',
    createdByUserId: createdByUserId || patient.id,
    address: address || {
      id: `addr_${Date.now()}`,
      userId: patient.id,
      addressLine: 'Default Home Address, Apt 1',
      city: 'New York',
      pinCode: '10001',
      coordinates: { latitude: 40.7128, longitude: -74.0060 }
    },
    painAreas: painAreas || ['General Discomfort'],
    conditionDescription: conditionDescription || 'Physiotherapy consultation requested.',
    preferredTimeWindow: preferredTimeWindow || 'Earliest Available',
    status: 'REQUEST_SUBMITTED',
    urgency: urgency || 'NORMAL',
    createdAt: new Date().toISOString()
  };

  SERVICE_REQUESTS.unshift(newRequest);
  res.status(201).json({ success: true, request: newRequest });
});

app.get('/api/requests', (req: Request, res: Response) => {
  const status = req.query.status as string;
  const filtered = status ? SERVICE_REQUESTS.filter(r => r.status === status) : SERVICE_REQUESTS;
  res.json({ success: true, count: filtered.length, requests: filtered });
});

// ==================== THERAPISTS DISCOVERY ====================

app.get('/api/therapists', (req: Request, res: Response) => {
  const category = req.query.category as string;
  let matches = THERAPISTS;
  if (category) {
    const catObj = THERAPY_CATEGORIES.find(c => c.id === category);
    if (catObj) {
      matches = THERAPISTS.filter(t => t.specializations.includes(catObj.name));
    }
  }
  res.json({ success: true, count: matches.length, therapists: matches });
});

// ==================== DISPATCH & SCHEDULING ====================

app.post('/api/dispatch/assign', (req: Request, res: Response) => {
  const { 
    requestId, 
    therapistId, 
    assignedByUserId, 
    scheduledStart, 
    scheduledEnd, 
    paymentMode 
  } = req.body;

  const request = SERVICE_REQUESTS.find(r => r.id === requestId);
  if (!request) {
    return res.status(404).json({ success: false, message: 'Service request not found.' });
  }

  const therapist = THERAPISTS.find(t => t.id === therapistId) || THERAPISTS[0];
  const distanceKm = 4.8;
  const feeCalc = calculateSessionFee({
    categoryId: request.categoryId,
    travelDistanceKm: distanceKm,
    seniority: therapist.seniority,
    currency: 'USD',
    isUrgent: request.urgency === 'URGENT'
  });

  const newAppointment: Appointment = {
    id: `apt_${Date.now()}`,
    requestId: request.id,
    request,
    patientId: request.patientId,
    patient: request.patient,
    therapistId: therapist.id,
    therapist,
    assignedByUserId: assignedByUserId || 'usr_desk_1',
    serviceMode: 'HOME_VISIT',
    scheduledStart: scheduledStart || new Date(Date.now() + 7200000).toISOString(),
    scheduledEnd: scheduledEnd || new Date(Date.now() + 7200000 + request.category.standardDurationMinutes * 60000).toISOString(),
    status: 'ASSIGNED',
    baseAmount: feeCalc.baseAmount,
    travelDistanceKm: distanceKm,
    travelAmount: feeCalc.travelAmount,
    senioritySurcharge: feeCalc.senioritySurcharge,
    discountAmount: 0,
    totalAmount: feeCalc.totalAmount,
    paymentMode: (paymentMode as PaymentMode) || 'CASH_ON_SERVICE',
    paymentStatus: 'PENDING',
    cashConfirmationOtp: Math.floor(1000 + Math.random() * 9000).toString(),
    createdAt: new Date().toISOString()
  };

  request.status = 'APPROVED_AND_ASSIGNED';
  APPOINTMENTS.unshift(newAppointment);

  res.status(201).json({ success: true, appointment: newAppointment });
});

// ==================== APPOINTMENTS & STATUS UPDATES ====================

app.get('/api/appointments', (req: Request, res: Response) => {
  const patientId = req.query.patientId as string;
  const therapistId = req.query.therapistId as string;

  let results = APPOINTMENTS;
  if (patientId) results = results.filter(a => a.patientId === patientId);
  if (therapistId) results = results.filter(a => a.therapistId === therapistId);

  res.json({ success: true, count: results.length, appointments: results });
});

app.patch('/api/appointments/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, clinicalNotes, prescribedExercises } = req.body;

  const apt = APPOINTMENTS.find(a => a.id === id);
  if (!apt) return res.status(404).json({ success: false, message: 'Appointment not found.' });

  apt.status = status as AppointmentStatus;

  if (status === 'EN_ROUTE') apt.therapistDepartedAt = new Date().toISOString();
  if (status === 'ARRIVED') apt.therapistArrivedAt = new Date().toISOString();
  if (status === 'IN_SESSION') apt.sessionStartedAt = new Date().toISOString();
  if (status === 'COMPLETED') {
    apt.sessionCompletedAt = new Date().toISOString();
    if (clinicalNotes) apt.clinicalNotes = clinicalNotes;
    if (prescribedExercises) apt.prescribedExercises = prescribedExercises;
  }

  res.json({ success: true, appointment: apt });
});

app.post('/api/appointments/:id/pay', (req: Request, res: Response) => {
  const { id } = req.params;
  const { paymentMode, cashOtp } = req.body;

  const apt = APPOINTMENTS.find(a => a.id === id);
  if (!apt) return res.status(404).json({ success: false, message: 'Appointment not found.' });

  if (paymentMode === 'CASH_ON_SERVICE') {
    if (cashOtp && cashOtp !== apt.cashConfirmationOtp) {
      return res.status(400).json({ success: false, message: 'Invalid 4-digit Cash Confirmation OTP.' });
    }
    apt.paymentStatus = 'CASH_COLLECTED';
  } else {
    apt.paymentStatus = 'PAID_ONLINE';
  }

  res.json({ success: true, message: 'Payment successfully settled.', appointment: apt });
});

app.listen(PORT, () => {
  console.log(`🚀 Therapy Platform Backend Server running on http://localhost:${PORT}`);
});
