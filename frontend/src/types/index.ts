export type UserRole = 'talent' | 'production' | 'admin';

export type Gender = 'male' | 'female' | 'other';

export type JobStatus = 'draft' | 'availability_check' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export type PaymentStatus = 'pending' | 'approved' | 'paid' | 'disputed' | 'resolved';

export type RateAgreement = 'faa_pact' | 'bbc_equity' | 'itv_equity' | 'pact_equity_outside' | 'commercial' | 'corporate' | 'photographic' | 'pop_promo';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  created_at: string;
  is_active: boolean;
  company_name?: string;
}

export interface PhysicalStats {
  height_cm?: number;
  weight_kg?: number;
  chest_cm?: number;
  waist_cm?: number;
  hips_cm?: number;
  inside_leg_cm?: number;
  collar_cm?: number;
  shoe_size_uk?: number;
  dress_size?: string;
}

export interface Appearance {
  hair_color?: string;
  eye_color?: string;
  ethnicity?: string;
  gender?: Gender;
  age_range_min?: number;
  age_range_max?: number;
}

export interface TalentProfile {
  id: string;
  user_id: string;
  user_email?: string;
  user_first_name?: string;
  user_last_name?: string;
  user_phone?: string;
  date_of_birth?: string;
  address?: string;
  city?: string;
  postcode?: string;
  physical_stats: PhysicalStats;
  appearance: Appearance;
  headshot_base64?: string;
  full_body_base64?: string;
  profile_photo_base64?: string;
  additional_photos: string[];
  skills: string[];
  experience?: string;
  notes?: string;
  bank_details?: Record<string, string>;
  emergency_contact?: Record<string, string>;
  // Star rating (1-5, default 3 for new talents)
  star_rating?: number;
  // Referral tracking
  referrer_1_id?: string;
  referrer_1_name?: string;
  referrer_2_id?: string;
  referrer_2_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ReferralCode {
  id: string;
  code: string;
  generated_by_id: string;
  generated_by_name: string;
  used_by_id?: string;
  is_used: boolean;
  created_at: string;
  used_at?: string;
}

export interface UnavailableDate {
  id: string;
  talent_id: string;
  date: string;
  reason?: string;
  created_at: string;
}

export interface TalentSelection {
  talent_id: string;
  talent_name: string;
  status: string;
  response_date?: string;
  notes?: string;
}

export interface Job {
  id: string;
  production_user_id: string;
  production_name: string;
  project_title: string;
  description?: string;
  location?: string;
  rate_agreement: RateAgreement;
  dates_required: string[];
  call_time?: string;
  wrap_time?: string;
  requirements?: Record<string, any>;
  notes?: string;
  status: JobStatus;
  selected_talents: TalentSelection[];
  created_at: string;
  updated_at: string;
}

export interface PaymentLineItem {
  description: string;
  rate_type: string;
  quantity: number;
  unit_rate: number;
  total: number;
}

export interface Payment {
  id: string;
  job_id: string;
  talent_id: string;
  work_dates: string[];
  line_items: PaymentLineItem[];
  gross_total: number;
  company_fee_percent: number;
  company_fee_amount: number;
  net_to_talent: number;
  notes?: string;
  status: PaymentStatus;
  created_by: string;
  created_at: string;
  paid_at?: string;
  receipt_number?: string;
  dispute_reason?: string;
  dispute_response?: string;
  job_title?: string;
  production_name?: string;
  talent_name?: string;
}

export interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  recipient_id: string;
  recipient_name: string;
  job_id?: string;
  subject: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface RateItem {
  name: string;
  amount: number;
  description?: string;
}

export interface RateStructure {
  id: string;
  agreement_type: RateAgreement;
  name: string;
  category: string;
  rates: RateItem[];
  effective_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}
