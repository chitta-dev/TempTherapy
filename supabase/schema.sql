-- ==============================================================================
-- TherapyCare On-Demand Physiotherapy Platform: Supabase PostgreSQL Schema
-- Project Reference: mapkzyqbedennmzasass
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('Patient', 'Therapist', 'Dispatcher', 'Admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE request_status AS ENUM ('PENDING_TRIAGE', 'ASSIGNED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE urgency_level AS ENUM ('ROUTINE', 'URGENT', 'SAME_DAY');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM ('REQUESTED', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_SESSION', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_mode AS ENUM ('CARD', 'UPI', 'INSURANCE_COPAY', 'CASH');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('PENDING', 'AUTHORIZED', 'SETTLED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. THERAPY CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_price NUMERIC(10, 2) NOT NULL DEFAULT 85.00,
    estimated_duration_minutes INT NOT NULL DEFAULT 60,
    icon_name VARCHAR(50) NOT NULL DEFAULT 'Activity',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. USERS (Patients, Clinicians, Dispatchers)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    role VARCHAR(50) NOT NULL DEFAULT 'Patient',
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    phone_number VARCHAR(30),
    emergency_contact_name VARCHAR(150),
    emergency_contact_phone VARCHAR(30),
    medical_conditions TEXT,
    allergies TEXT,
    blood_group VARCHAR(10) DEFAULT 'O+',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. THERAPIST PROFILES
CREATE TABLE IF NOT EXISTS therapist_profiles (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    license_number VARCHAR(50) NOT NULL,
    specializations JSONB NOT NULL DEFAULT '[]'::jsonb,
    experience_years INT NOT NULL DEFAULT 5,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 4.90,
    review_count INT NOT NULL DEFAULT 25,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    current_latitude DOUBLE PRECISION NOT NULL DEFAULT 40.7128,
    current_longitude DOUBLE PRECISION NOT NULL DEFAULT -74.0060,
    service_radius_km DOUBLE PRECISION NOT NULL DEFAULT 15.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. SERVICE REQUESTS (Triage Queue)
CREATE TABLE IF NOT EXISTS service_requests (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id VARCHAR(50) NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    target_area VARCHAR(100) NOT NULL DEFAULT 'Lower Back',
    pain_severity INT NOT NULL CHECK (pain_severity BETWEEN 1 AND 10),
    chief_complaint TEXT,
    preferred_date VARCHAR(30) NOT NULL DEFAULT 'Today',
    preferred_time_slot VARCHAR(30) NOT NULL DEFAULT '10:00 AM',
    address_line VARCHAR(250) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL DEFAULT 40.7128,
    longitude DOUBLE PRECISION NOT NULL DEFAULT -74.0060,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_TRIAGE',
    urgency VARCHAR(50) NOT NULL DEFAULT 'ROUTINE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. APPOINTMENTS (Confirmed Dispatches & Clinical Sessions)
CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(50) PRIMARY KEY,
    request_id VARCHAR(50) NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    patient_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    therapist_id VARCHAR(50) NOT NULL REFERENCES therapist_profiles(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'ASSIGNED',
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    arrival_otp VARCHAR(10) NOT NULL,
    completion_otp VARCHAR(10) NOT NULL DEFAULT '8844',
    
    -- Financial Breakdown
    base_fee NUMERIC(10, 2) NOT NULL DEFAULT 85.00,
    distance_tier_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    urgent_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    platform_fee NUMERIC(10, 2) NOT NULL DEFAULT 10.00,
    tax NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_fee NUMERIC(10, 2) NOT NULL DEFAULT 95.00,
    
    payment_mode VARCHAR(50) NOT NULL DEFAULT 'CARD',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    clinical_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. LIVE TELEMETRY / GPS TRACKING TABLE
CREATE TABLE IF NOT EXISTS telemetry_locations (
    id BIGSERIAL PRIMARY KEY,
    appointment_id VARCHAR(50) NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    therapist_id VARCHAR(50) NOT NULL REFERENCES therapist_profiles(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. ENABLE SUPABASE REALTIME REPLICATION
-- Adds tables to the realtime publication so Supabase broadcast/websocket stream works out of the box!
ALTER PUBLICATION supabase_realtime ADD TABLE service_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE telemetry_locations;

-- 10. HELPER FUNCTION: HAVERSINE DISTANCE CALCULATION (in kilometers)
CREATE OR REPLACE FUNCTION calculate_distance_km(
    lat1 DOUBLE PRECISION,
    lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION,
    lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
    r CONSTANT DOUBLE PRECISION := 6371.0; -- Earth radius in km
    dlat DOUBLE PRECISION;
    dlon DOUBLE PRECISION;
    a DOUBLE PRECISION;
    c DOUBLE PRECISION;
BEGIN
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    a := sin(dlat / 2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2)^2;
    c := 2 * atan2(sqrt(a), sqrt(1 - a));
    RETURN round((r * c)::numeric, 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 11. HELPER FUNCTION: VERIFY ARRIVAL OTP
CREATE OR REPLACE FUNCTION verify_arrival_otp(
    p_appointment_id VARCHAR,
    p_otp VARCHAR
) RETURNS JSONB AS $$
DECLARE
    v_apt appointments%ROWTYPE;
BEGIN
    SELECT * INTO v_apt FROM appointments WHERE id = p_appointment_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Appointment not found');
    END IF;

    IF v_apt.arrival_otp = trim(p_otp) THEN
        UPDATE appointments 
        SET status = 'IN_SESSION' 
        WHERE id = p_appointment_id;
        
        RETURN jsonb_build_object(
            'success', true, 
            'message', 'Arrival OTP verified. Session now in progress.', 
            'status', 'IN_SESSION'
        );
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Invalid OTP code.');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 12. HELPER FUNCTION: VERIFY COMPLETION OTP & PAYMENT GATE
CREATE OR REPLACE FUNCTION verify_completion_otp(
    p_appointment_id VARCHAR,
    p_otp VARCHAR,
    p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_apt appointments%ROWTYPE;
BEGIN
    SELECT * INTO v_apt FROM appointments WHERE id = p_appointment_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Appointment not found');
    END IF;

    -- Gate 1: Check Payment Status
    IF v_apt.payment_status != 'SETTLED' AND v_apt.payment_status != 'AUTHORIZED' THEN
        RETURN jsonb_build_object(
            'success', false, 
            'requires_payment', true,
            'message', 'Payment is pending. Please collect payment before completing session.'
        );
    END IF;

    -- Gate 2: Check Completion OTP (Fixed OTP 8844 or stored completion_otp)
    IF trim(p_otp) = v_apt.completion_otp OR trim(p_otp) = '8844' THEN
        UPDATE appointments 
        SET status = 'COMPLETED',
            clinical_notes = COALESCE(p_notes, clinical_notes)
        WHERE id = p_appointment_id;
        
        RETURN jsonb_build_object(
            'success', true, 
            'message', 'Completion OTP verified. Session marked as COMPLETED.', 
            'status', 'COMPLETED'
        );
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Invalid Completion OTP. Please check code with patient.');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 12. SEED INITIAL CLINICAL DATA
INSERT INTO categories (id, name, description, base_price, estimated_duration_minutes, icon_name)
VALUES
    ('cat_ortho', 'Orthopedic & Musculoskeletal', 'Targeted care for joints, spine, ligaments, and acute muscle injuries.', 85.00, 60, 'Bone'),
    ('cat_neuro', 'Neurological Rehabilitation', 'Specialized rehabilitation for stroke, Parkinson''s, MS, and spinal cord injuries.', 105.00, 75, 'Brain'),
    ('cat_geriatric', 'Geriatric & Mobility Care', 'Fall prevention, safe transfers, arthritis support, and functional independence.', 80.00, 60, 'Activity'),
    ('cat_sports', 'Sports Injury & Return-to-Play', 'ACL, rotator cuff, sprains, kinetic chain balance, and performance return.', 95.00, 60, 'Zap'),
    ('cat_post_op', 'Post-Surgical Rehabilitation', 'Care protocols for knee/hip replacements, spinal fusions, and tendon repairs.', 100.00, 60, 'Scissors'),
    ('cat_pediatric', 'Pediatric Physical Therapy', 'Milestone achievement, torticollis, cerebral palsy, and juvenile gait training.', 110.00, 60, 'Baby'),
    ('cat_cardiopulmonary', 'Cardiopulmonary Conditioning', 'Breathing re-education, endurance rebuild, and post-cardiac recovery.', 90.00, 60, 'HeartPulse')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, role, full_name, email, phone_number, emergency_contact_name, emergency_contact_phone, medical_conditions, allergies, blood_group)
VALUES
    ('usr_patient_1', 'Patient', 'Michael Chen', 'michael.chen@example.com', '+1 (555) 234-5678', 'Emily Chen (Spouse)', '+1 (555) 987-6543', 'Hypertension (Controlled)', 'Penicillin, NSAIDs', 'O+'),
    ('usr_pt_jenkins', 'Therapist', 'Dr. Sarah Jenkins, PT, DPT', 's.jenkins@therapycare.health', '+1 (555) 345-6789', 'Clinic Operations', '+1 (555) 800-0199', NULL, NULL, 'A+'),
    ('usr_pt_vance', 'Therapist', 'Dr. Marcus Vance, PT, MS', 'm.vance@therapycare.health', '+1 (555) 456-7890', 'Clinic Operations', '+1 (555) 800-0199', NULL, NULL, 'B+'),
    ('usr_pt_rostova', 'Therapist', 'Dr. Elena Rostova, DPT, OCS', 'e.rostova@therapycare.health', '+1 (555) 567-8901', 'Clinic Operations', '+1 (555) 800-0199', NULL, NULL, 'O-')
ON CONFLICT (id) DO NOTHING;

INSERT INTO therapist_profiles (id, user_id, license_number, specializations, experience_years, rating, review_count, is_available, current_latitude, current_longitude, service_radius_km)
VALUES
    ('pt_1', 'usr_pt_jenkins', 'NY-PT-048291', '["Orthopedic & Musculoskeletal", "Sports Injury & Return-to-Play", "Post-Surgical Rehabilitation"]'::jsonb, 8, 4.90, 128, true, 40.7135, -74.0040, 15.0),
    ('pt_2', 'usr_pt_vance', 'NY-PT-051184', '["Neurological Rehabilitation", "Geriatric & Mobility Care", "Cardiopulmonary Conditioning"]'::jsonb, 11, 4.80, 94, true, 40.7250, -73.9960, 20.0),
    ('pt_3', 'usr_pt_rostova', 'NY-PT-039920', '["Post-Surgical Rehabilitation", "Pediatric Physical Therapy", "Orthopedic & Musculoskeletal"]'::jsonb, 6, 5.00, 67, true, 40.7380, -73.9850, 12.0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO service_requests (id, patient_id, category_id, target_area, pain_severity, chief_complaint, preferred_date, preferred_time_slot, address_line, latitude, longitude, status, urgency)
VALUES
    ('req_101', 'usr_patient_1', 'cat_ortho', 'Lower Back', 7, 'Acute lumbar spasm after lifting heavy box. Radiating ache into left glute. Difficulty sitting longer than 15 mins.', 'Today', '10:00 AM', '742 Evergreen Terrace, Apt 4B, New York, NY 10001', 40.7128, -74.0060, 'PENDING_TRIAGE', 'SAME_DAY'),
    ('req_102', 'usr_patient_1', 'cat_post_op', 'Right Knee', 5, 'Day 14 post-operative right total knee arthroplasty (TKA). Needs gentle passive ROM, patellar mobilization, and gait refinement.', 'Tomorrow', '02:30 PM', '350 5th Avenue, Suite 1200, New York, NY 10118', 40.7484, -73.9857, 'PENDING_TRIAGE', 'ROUTINE')
ON CONFLICT (id) DO NOTHING;
