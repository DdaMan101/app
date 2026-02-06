from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, date, timedelta
import jwt
import bcrypt
from enum import Enum
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'afewgoodmen_db')]

# Helper to clean MongoDB documents (remove ObjectId, convert datetime)
def clean_doc(doc):
    """Remove MongoDB _id and convert ObjectId/datetime to strings"""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [clean_doc(d) for d in doc]
    if isinstance(doc, dict):
        cleaned = {}
        for k, v in doc.items():
            if k == '_id':
                continue  # Skip MongoDB _id
            elif hasattr(v, '__str__') and type(v).__name__ == 'ObjectId':
                cleaned[k] = str(v)
            elif isinstance(v, datetime):
                cleaned[k] = v.isoformat()
            elif isinstance(v, dict):
                cleaned[k] = clean_doc(v)
            elif isinstance(v, list):
                cleaned[k] = [clean_doc(item) if isinstance(item, dict) else item for item in v]
            else:
                cleaned[k] = v
        return cleaned
    return doc

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'afewgoodmen_secret_key_2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 1 week

# Create the main app
app = FastAPI(title="A Few Good Men Casting API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ===================== ENUMS =====================
class UserRole(str, Enum):
    TALENT = "talent"
    PRODUCTION = "production"
    ADMIN = "admin"

class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"

class JobStatus(str, Enum):
    DRAFT = "draft"
    AVAILABILITY_CHECK = "availability_check"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    PAID = "paid"
    DISPUTED = "disputed"
    RESOLVED = "resolved"

class RateAgreement(str, Enum):
    FAA_PACT = "faa_pact"
    BBC_EQUITY = "bbc_equity"
    ITV_EQUITY = "itv_equity"
    PACT_EQUITY_OUTSIDE = "pact_equity_outside"
    COMMERCIAL = "commercial"
    CORPORATE = "corporate"
    PHOTOGRAPHIC = "photographic"
    POP_PROMO = "pop_promo"

# ===================== MODELS =====================

# User & Auth Models
class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: UserRole

class UserCreate(UserBase):
    password: str
    company_name: Optional[str] = None  # For production companies

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: str
    created_at: datetime
    is_active: bool = True
    company_name: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Talent Profile Models
class PhysicalStats(BaseModel):
    height_cm: Optional[int] = None
    weight_kg: Optional[float] = None
    chest_cm: Optional[int] = None
    waist_cm: Optional[int] = None
    hips_cm: Optional[int] = None
    inside_leg_cm: Optional[int] = None
    collar_cm: Optional[float] = None
    shoe_size_uk: Optional[float] = None
    dress_size: Optional[str] = None

class Appearance(BaseModel):
    hair_color: Optional[str] = None
    eye_color: Optional[str] = None
    ethnicity: Optional[str] = None
    gender: Optional[Gender] = None
    age_range_min: Optional[int] = None
    age_range_max: Optional[int] = None

class TalentProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postcode: Optional[str] = None
    physical_stats: PhysicalStats = PhysicalStats()
    appearance: Appearance = Appearance()
    headshot_base64: Optional[str] = None
    full_body_base64: Optional[str] = None
    profile_photo_base64: Optional[str] = None
    additional_photos: List[str] = []
    skills: List[str] = []
    experience: Optional[str] = None
    notes: Optional[str] = None
    bank_details: Optional[Dict[str, str]] = None
    emergency_contact: Optional[Dict[str, str]] = None
    # Star rating (1-5, default 3)
    star_rating: int = 3
    # Captain status (admin-controlled only)
    is_captain: bool = False
    # Referral tracking
    referrer_1_id: Optional[str] = None
    referrer_1_name: Optional[str] = None
    referrer_2_id: Optional[str] = None
    referrer_2_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Referral Code Model
class ReferralCode(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str  # 4-digit code
    generated_by_id: str  # Talent who created this code
    generated_by_name: str
    used_by_id: Optional[str] = None  # Talent who used this code
    is_used: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    used_at: Optional[datetime] = None

class TalentProfileUpdate(BaseModel):
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postcode: Optional[str] = None
    physical_stats: Optional[PhysicalStats] = None
    appearance: Optional[Appearance] = None
    headshot_base64: Optional[str] = None
    full_body_base64: Optional[str] = None
    profile_photo_base64: Optional[str] = None
    additional_photos: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    experience: Optional[str] = None
    notes: Optional[str] = None
    bank_details: Optional[Dict[str, str]] = None
    emergency_contact: Optional[Dict[str, str]] = None

# Availability Models
class UnavailableDate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    talent_id: str
    date: str  # YYYY-MM-DD format
    reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UnavailableDateCreate(BaseModel):
    date: str
    reason: Optional[str] = None

# Job Models
class Super7AvailabilityCheck(BaseModel):
    """The Super 7 - 7 pieces of info for availability checks"""
    dates: List[str] = []  # Multiple dates
    production_name: str  # Production name or working title
    location: str  # e.g., Pinewood Studios
    location_what3words: Optional[str] = None  # What3Words location
    parking: bool = False  # Yes/No for parking available
    parking_info: Optional[str] = None  # Nearest car park info if no parking
    rate_of_pay: str  # e.g., "FAA/PACT 2023 Rates, Continuous"
    captain: Optional[str] = None  # Contact person name
    captain_phone: Optional[str] = None  # Captain contact
    costume_character: Optional[str] = None  # Brief costume/character description
    additional_info: Optional[str] = None  # OSS, continuous working day, etc.

class TalentSelection(BaseModel):
    talent_id: str
    talent_name: str
    status: str = "pending"  # pending, av_sent, yes, no, maybe, confirmed, declined
    response_date: Optional[datetime] = None
    response_notes: Optional[str] = None

class JobCreate(BaseModel):
    production_name: str
    project_title: str
    description: Optional[str] = None
    location: Optional[str] = None
    location_what3words: Optional[str] = None
    rate_agreement: RateAgreement = RateAgreement.FAA_PACT
    dates_required: List[str] = []  # List of YYYY-MM-DD dates
    call_time: Optional[str] = None
    wrap_time: Optional[str] = None
    parking_available: bool = False
    parking_info: Optional[str] = None
    captain_name: Optional[str] = None
    captain_phone: Optional[str] = None
    costume_notes: Optional[str] = None
    requirements: Optional[Dict[str, Any]] = None  # Filters like height, gender, etc.
    notes: Optional[str] = None

class Job(JobCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    production_user_id: str
    status: JobStatus = JobStatus.DRAFT
    selected_talents: List[TalentSelection] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Payment Models
class PaymentLineItem(BaseModel):
    description: str
    rate_type: str  # e.g., "Basic Daily Rate", "Overtime", "Travel", etc.
    quantity: float = 1
    unit_rate: float
    total: float

class PaymentCreate(BaseModel):
    job_id: str
    talent_id: str
    work_dates: List[str]
    line_items: List[PaymentLineItem]
    gross_total: float
    company_fee_percent: float = 15.0
    company_fee_amount: float
    net_to_talent: float
    notes: Optional[str] = None

class Payment(PaymentCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: PaymentStatus = PaymentStatus.PENDING
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    paid_at: Optional[datetime] = None
    receipt_number: Optional[str] = None
    dispute_reason: Optional[str] = None
    dispute_response: Optional[str] = None

# Message Models
class MessageCreate(BaseModel):
    recipient_id: str
    job_id: Optional[str] = None
    subject: str
    content: str

class Message(MessageCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str
    sender_name: str
    recipient_name: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Rate Models
class RateItem(BaseModel):
    name: str
    amount: float
    description: Optional[str] = None

class RateStructure(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agreement_type: RateAgreement
    name: str
    category: str  # e.g., "day_rates", "night_rates", "supplements", etc.
    rates: List[RateItem]
    effective_date: str
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# ===================== AUTH HELPERS =====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_role(roles: List[UserRole], user: dict = Depends(get_current_user)):
    if user["role"] not in [r.value for r in roles]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return user

# ===================== AUTH ROUTES =====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = user_data.dict()
    user_dict["id"] = str(uuid.uuid4())
    user_dict["password"] = hash_password(user_data.password)
    user_dict["created_at"] = datetime.utcnow()
    user_dict["is_active"] = True
    
    await db.users.insert_one(user_dict)
    
    # Create talent profile if role is talent
    if user_data.role == UserRole.TALENT:
        profile = TalentProfile(user_id=user_dict["id"])
        await db.talent_profiles.insert_one(profile.dict())
    
    token = create_token(user_dict["id"], user_dict["role"])
    
    user_response = UserResponse(
        id=user_dict["id"],
        email=user_dict["email"],
        first_name=user_dict["first_name"],
        last_name=user_dict["last_name"],
        phone=user_dict.get("phone"),
        role=user_dict["role"],
        created_at=user_dict["created_at"],
        is_active=user_dict["is_active"],
        company_name=user_dict.get("company_name")
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is deactivated")
    
    token = create_token(user["id"], user["role"])
    
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        first_name=user["first_name"],
        last_name=user["last_name"],
        phone=user.get("phone"),
        role=user["role"],
        created_at=user["created_at"],
        is_active=user.get("is_active", True),
        company_name=user.get("company_name")
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        first_name=user["first_name"],
        last_name=user["last_name"],
        phone=user.get("phone"),
        role=user["role"],
        created_at=user["created_at"],
        is_active=user.get("is_active", True),
        company_name=user.get("company_name")
    )

# ===================== TALENT PROFILE ROUTES =====================

@api_router.get("/talent/profile")
async def get_my_talent_profile(user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.TALENT.value:
        raise HTTPException(status_code=403, detail="Only talents can access this")
    
    profile = await db.talent_profiles.find_one({"user_id": user["id"]})
    if not profile:
        # Create profile if doesn't exist
        profile = TalentProfile(user_id=user["id"]).dict()
        await db.talent_profiles.insert_one(profile)
    
    # Add user info
    profile["user_email"] = user["email"]
    profile["user_first_name"] = user["first_name"]
    profile["user_last_name"] = user["last_name"]
    profile["user_phone"] = user.get("phone")
    
    return profile

@api_router.put("/talent/profile")
async def update_my_talent_profile(update_data: TalentProfileUpdate, user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.TALENT.value:
        raise HTTPException(status_code=403, detail="Only talents can access this")
    
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    update_dict["updated_at"] = datetime.utcnow()
    
    # Handle nested objects
    if update_data.physical_stats:
        update_dict["physical_stats"] = update_data.physical_stats.dict()
    if update_data.appearance:
        update_dict["appearance"] = update_data.appearance.dict()
    
    result = await db.talent_profiles.update_one(
        {"user_id": user["id"]},
        {"$set": update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return {"message": "Profile updated successfully"}

@api_router.get("/talents")
async def get_all_talents(
    gender: Optional[str] = None,
    min_height: Optional[int] = None,
    max_height: Optional[int] = None,
    min_age: Optional[int] = None,
    max_age: Optional[int] = None,
    hair_color: Optional[str] = None,
    eye_color: Optional[str] = None,
    skills: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get all talents with optional filters - accessible by production and admin"""
    if user["role"] not in [UserRole.PRODUCTION.value, UserRole.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Build filter query
    filter_query = {}
    
    if gender:
        filter_query["appearance.gender"] = gender
    if min_height:
        filter_query["physical_stats.height_cm"] = {"$gte": min_height}
    if max_height:
        if "physical_stats.height_cm" in filter_query:
            filter_query["physical_stats.height_cm"]["$lte"] = max_height
        else:
            filter_query["physical_stats.height_cm"] = {"$lte": max_height}
    if hair_color:
        filter_query["appearance.hair_color"] = {"$regex": hair_color, "$options": "i"}
    if eye_color:
        filter_query["appearance.eye_color"] = {"$regex": eye_color, "$options": "i"}
    
    profiles = await db.talent_profiles.find(filter_query).to_list(1000)
    
    # Add user info to each profile
    result = []
    for profile in profiles:
        user_info = await db.users.find_one({"id": profile["user_id"]})
        if user_info and user_info.get("is_active", True):
            profile["user_email"] = user_info["email"]
            profile["user_first_name"] = user_info["first_name"]
            profile["user_last_name"] = user_info["last_name"]
            profile["user_phone"] = user_info.get("phone")
            result.append(clean_doc(profile))
    
    return result

@api_router.get("/talents/{talent_id}")
async def get_talent_by_id(talent_id: str, user: dict = Depends(get_current_user)):
    """Get specific talent profile"""
    profile = await db.talent_profiles.find_one({"user_id": talent_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Talent not found")
    
    user_info = await db.users.find_one({"id": talent_id})
    if user_info:
        profile["user_email"] = user_info["email"]
        profile["user_first_name"] = user_info["first_name"]
        profile["user_last_name"] = user_info["last_name"]
        profile["user_phone"] = user_info.get("phone")
    
    return clean_doc(profile)

# ===================== AVAILABILITY ROUTES =====================

@api_router.get("/talent/availability")
async def get_my_availability(user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.TALENT.value:
        raise HTTPException(status_code=403, detail="Only talents can access this")
    
    unavailable = await db.unavailable_dates.find({"talent_id": user["id"]}).to_list(1000)
    return clean_doc(unavailable)

@api_router.post("/talent/availability")
async def add_unavailable_date(date_data: UnavailableDateCreate, user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.TALENT.value:
        raise HTTPException(status_code=403, detail="Only talents can access this")
    
    unavailable = UnavailableDate(
        talent_id=user["id"],
        date=date_data.date,
        reason=date_data.reason
    )
    
    await db.unavailable_dates.insert_one(unavailable.dict())
    return unavailable

@api_router.delete("/talent/availability/{date_id}")
async def remove_unavailable_date(date_id: str, user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.TALENT.value:
        raise HTTPException(status_code=403, detail="Only talents can access this")
    
    result = await db.unavailable_dates.delete_one({"id": date_id, "talent_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Date not found")
    
    return {"message": "Unavailable date removed"}

@api_router.get("/talents/{talent_id}/availability")
async def get_talent_availability(talent_id: str, user: dict = Depends(get_current_user)):
    """Get a talent's unavailable dates - for production/admin"""
    unavailable = await db.unavailable_dates.find({"talent_id": talent_id}).to_list(1000)
    return unavailable

# ===================== JOB ROUTES =====================

@api_router.post("/jobs")
async def create_job(job_data: JobCreate, user: dict = Depends(get_current_user)):
    if user["role"] not in [UserRole.PRODUCTION.value, UserRole.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Only production/admin can create jobs")
    
    job = Job(
        **job_data.dict(),
        production_user_id=user["id"]
    )
    
    await db.jobs.insert_one(job.dict())
    return job

@api_router.get("/jobs")
async def get_jobs(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    filter_query = {}
    
    if user["role"] == UserRole.PRODUCTION.value:
        filter_query["production_user_id"] = user["id"]
    elif user["role"] == UserRole.TALENT.value:
        filter_query["selected_talents.talent_id"] = user["id"]
    
    if status:
        filter_query["status"] = status
    
    jobs = await db.jobs.find(filter_query).sort("created_at", -1).to_list(1000)
    return clean_doc(jobs)

@api_router.get("/jobs/{job_id}")
async def get_job(job_id: str, user: dict = Depends(get_current_user)):
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return clean_doc(job)

@api_router.put("/jobs/{job_id}")
async def update_job(job_id: str, update_data: dict, user: dict = Depends(get_current_user)):
    if user["role"] not in [UserRole.PRODUCTION.value, UserRole.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.jobs.update_one({"id": job_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {"message": "Job updated"}

@api_router.post("/jobs/{job_id}/select-talent")
async def select_talent_for_job(job_id: str, talent_id: str, user: dict = Depends(get_current_user)):
    if user["role"] not in [UserRole.PRODUCTION.value, UserRole.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get talent info
    talent_user = await db.users.find_one({"id": talent_id})
    if not talent_user:
        raise HTTPException(status_code=404, detail="Talent not found")
    
    selection = TalentSelection(
        talent_id=talent_id,
        talent_name=f"{talent_user['first_name']} {talent_user['last_name']}"
    )
    
    result = await db.jobs.update_one(
        {"id": job_id},
        {
            "$push": {"selected_talents": selection.dict()},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {"message": "Talent selected", "selection": selection}

@api_router.delete("/jobs/{job_id}/select-talent/{talent_id}")
async def remove_talent_from_job(job_id: str, talent_id: str, user: dict = Depends(get_current_user)):
    if user["role"] not in [UserRole.PRODUCTION.value, UserRole.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = await db.jobs.update_one(
        {"id": job_id},
        {
            "$pull": {"selected_talents": {"talent_id": talent_id}},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {"message": "Talent removed from job"}

@api_router.put("/jobs/{job_id}/talent-status/{talent_id}")
async def update_talent_job_status(job_id: str, talent_id: str, status: str, notes: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Update talent's status in a job (for availability responses, confirmations, etc.)"""
    
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Update the specific talent's status
    for selection in job.get("selected_talents", []):
        if selection["talent_id"] == talent_id:
            selection["status"] = status
            selection["response_date"] = datetime.utcnow().isoformat()
            if notes:
                selection["response_notes"] = notes
            break
    
    await db.jobs.update_one(
        {"id": job_id},
        {"$set": {"selected_talents": job["selected_talents"], "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Status updated"}

@api_router.post("/jobs/{job_id}/respond")
async def talent_respond_to_job(job_id: str, response: str, notes: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Talent responds to availability check with Yes/No/Maybe"""
    if user["role"] != UserRole.TALENT.value:
        raise HTTPException(status_code=403, detail="Only talents can respond to jobs")
    
    if response not in ["yes", "no", "maybe"]:
        raise HTTPException(status_code=400, detail="Response must be 'yes', 'no', or 'maybe'")
    
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Find and update talent's status
    updated = False
    for selection in job.get("selected_talents", []):
        if selection["talent_id"] == user["id"]:
            selection["status"] = response
            selection["response_date"] = datetime.utcnow().isoformat()
            if notes:
                selection["response_notes"] = notes
            updated = True
            break
    
    if not updated:
        raise HTTPException(status_code=404, detail="You are not selected for this job")
    
    await db.jobs.update_one(
        {"id": job_id},
        {"$set": {"selected_talents": job["selected_talents"], "updated_at": datetime.utcnow()}}
    )
    
    return {"message": f"Response '{response}' recorded"}

# ===================== BROADCAST MESSAGE =====================

class BroadcastMessage(BaseModel):
    subject: str
    content: str
    skill_filter: Optional[str] = None  # Filter talents by skill
    gender_filter: Optional[str] = None
    job_id: Optional[str] = None

@api_router.post("/messages/broadcast")
async def send_broadcast_message(broadcast: BroadcastMessage, user: dict = Depends(get_current_user)):
    """Send message to all talents or filtered by skills - Admin only"""
    if user["role"] != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Only admin can broadcast messages")
    
    # Build filter for talents
    filter_query = {"role": UserRole.TALENT.value, "is_active": True}
    
    # Get all talent users
    talent_users = await db.users.find(filter_query).to_list(10000)
    
    # If skill filter, filter by talent profiles
    if broadcast.skill_filter:
        skill_lower = broadcast.skill_filter.lower()
        talent_ids = [t["id"] for t in talent_users]
        profiles = await db.talent_profiles.find({
            "user_id": {"$in": talent_ids},
            "skills": {"$regex": skill_lower, "$options": "i"}
        }).to_list(10000)
        valid_user_ids = {p["user_id"] for p in profiles}
        talent_users = [t for t in talent_users if t["id"] in valid_user_ids]
    
    # Send message to each talent
    messages_sent = 0
    for talent in talent_users:
        message = Message(
            recipient_id=talent["id"],
            sender_id=user["id"],
            sender_name=f"{user['first_name']} {user['last_name']}",
            recipient_name=f"{talent['first_name']} {talent['last_name']}",
            job_id=broadcast.job_id,
            subject=broadcast.subject,
            content=broadcast.content,
        )
        await db.messages.insert_one(message.dict())
        messages_sent += 1
    
    return {"message": f"Broadcast sent to {messages_sent} talents"}

# ===================== PAYMENT ROUTES =====================

@api_router.post("/payments")
async def create_payment(payment_data: PaymentCreate, user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Only admin can create payments")
    
    # Generate receipt number
    count = await db.payments.count_documents({})
    receipt_number = f"AFGM-{datetime.now().year}-{str(count + 1).zfill(5)}"
    
    payment = Payment(
        **payment_data.dict(),
        created_by=user["id"],
        receipt_number=receipt_number
    )
    
    await db.payments.insert_one(payment.dict())
    return payment

@api_router.get("/payments")
async def get_payments(
    status: Optional[str] = None,
    talent_id: Optional[str] = None,
    job_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    filter_query = {}
    
    if user["role"] == UserRole.TALENT.value:
        filter_query["talent_id"] = user["id"]
    elif talent_id:
        filter_query["talent_id"] = talent_id
    
    if status:
        filter_query["status"] = status
    if job_id:
        filter_query["job_id"] = job_id
    
    payments = await db.payments.find(filter_query).sort("created_at", -1).to_list(1000)
    
    # Add job and talent info
    for payment in payments:
        job = await db.jobs.find_one({"id": payment["job_id"]})
        if job:
            payment["job_title"] = job["project_title"]
            payment["production_name"] = job["production_name"]
        
        talent_user = await db.users.find_one({"id": payment["talent_id"]})
        if talent_user:
            payment["talent_name"] = f"{talent_user['first_name']} {talent_user['last_name']}"
    
    return clean_doc(payments)

@api_router.get("/payments/{payment_id}")
async def get_payment(payment_id: str, user: dict = Depends(get_current_user)):
    payment = await db.payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Check access
    if user["role"] == UserRole.TALENT.value and payment["talent_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Add additional info
    job = await db.jobs.find_one({"id": payment["job_id"]})
    if job:
        payment["job_title"] = job["project_title"]
        payment["production_name"] = job["production_name"]
    
    talent_user = await db.users.find_one({"id": payment["talent_id"]})
    if talent_user:
        payment["talent_name"] = f"{talent_user['first_name']} {talent_user['last_name']}"
    
    return clean_doc(payment)

@api_router.put("/payments/{payment_id}/status")
async def update_payment_status(payment_id: str, status: PaymentStatus, user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Only admin can update payment status")
    
    update_data = {"status": status.value}
    if status == PaymentStatus.PAID:
        update_data["paid_at"] = datetime.utcnow()
    
    result = await db.payments.update_one({"id": payment_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return {"message": "Payment status updated"}

@api_router.post("/payments/{payment_id}/dispute")
async def dispute_payment(payment_id: str, reason: str, user: dict = Depends(get_current_user)):
    """Talent can dispute a payment"""
    payment = await db.payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if user["role"] == UserRole.TALENT.value and payment["talent_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.payments.update_one(
        {"id": payment_id},
        {"$set": {"status": PaymentStatus.DISPUTED.value, "dispute_reason": reason}}
    )
    
    return {"message": "Payment disputed"}

@api_router.put("/payments/{payment_id}/resolve-dispute")
async def resolve_dispute(payment_id: str, response: str, new_amount: Optional[float] = None, user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Only admin can resolve disputes")
    
    update_data = {
        "status": PaymentStatus.RESOLVED.value,
        "dispute_response": response
    }
    
    if new_amount is not None:
        update_data["net_to_talent"] = new_amount
    
    await db.payments.update_one({"id": payment_id}, {"$set": update_data})
    return {"message": "Dispute resolved"}

# ===================== MESSAGE ROUTES =====================

@api_router.post("/messages")
async def send_message(message_data: MessageCreate, user: dict = Depends(get_current_user)):
    # Get recipient info
    recipient = await db.users.find_one({"id": message_data.recipient_id})
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    message = Message(
        **message_data.dict(),
        sender_id=user["id"],
        sender_name=f"{user['first_name']} {user['last_name']}",
        recipient_name=f"{recipient['first_name']} {recipient['last_name']}"
    )
    
    await db.messages.insert_one(message.dict())
    return message

@api_router.get("/messages")
async def get_messages(unread_only: bool = False, user: dict = Depends(get_current_user)):
    filter_query = {
        "$or": [
            {"sender_id": user["id"]},
            {"recipient_id": user["id"]}
        ]
    }
    
    if unread_only:
        filter_query["recipient_id"] = user["id"]
        filter_query["is_read"] = False
    
    messages = await db.messages.find(filter_query).sort("created_at", -1).to_list(1000)
    return clean_doc(messages)

@api_router.get("/messages/{message_id}")
async def get_message(message_id: str, user: dict = Depends(get_current_user)):
    message = await db.messages.find_one({"id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if message["sender_id"] != user["id"] and message["recipient_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Mark as read if recipient is viewing
    if message["recipient_id"] == user["id"] and not message["is_read"]:
        await db.messages.update_one({"id": message_id}, {"$set": {"is_read": True}})
        message["is_read"] = True
    
    return clean_doc(message)

@api_router.get("/messages/unread/count")
async def get_unread_count(user: dict = Depends(get_current_user)):
    count = await db.messages.count_documents({"recipient_id": user["id"], "is_read": False})
    return {"unread_count": count}

# ===================== RATE ROUTES =====================

@api_router.get("/rates")
async def get_rates(agreement_type: Optional[str] = None, user: dict = Depends(get_current_user)):
    filter_query = {}
    if agreement_type:
        filter_query["agreement_type"] = agreement_type
    
    rates = await db.rates.find(filter_query).to_list(1000)
    return clean_doc(rates)

@api_router.post("/rates")
async def create_rate(rate_data: RateStructure, user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Only admin can manage rates")
    
    await db.rates.insert_one(rate_data.dict())
    return rate_data

@api_router.put("/rates/{rate_id}")
async def update_rate(rate_id: str, rate_data: dict, user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Only admin can manage rates")
    
    rate_data["updated_at"] = datetime.utcnow()
    result = await db.rates.update_one({"id": rate_id}, {"$set": rate_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rate not found")
    
    return {"message": "Rate updated"}

@api_router.delete("/rates/{rate_id}")
async def delete_rate(rate_id: str, user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Only admin can manage rates")
    
    result = await db.rates.delete_one({"id": rate_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rate not found")
    
    return {"message": "Rate deleted"}

# ===================== ADMIN ROUTES =====================

@api_router.get("/admin/users")
async def get_all_users(role: Optional[str] = None, user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    filter_query = {}
    if role:
        filter_query["role"] = role
    
    users = await db.users.find(filter_query).to_list(1000)
    # Remove passwords
    for u in users:
        u.pop("password", None)
    return clean_doc(users)

@api_router.put("/admin/users/{user_id}/status")
async def update_user_status(user_id: str, is_active: bool, user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.users.update_one({"id": user_id}, {"$set": {"is_active": is_active}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User status updated"}

@api_router.get("/admin/dashboard")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total_talents = await db.users.count_documents({"role": UserRole.TALENT.value})
    total_productions = await db.users.count_documents({"role": UserRole.PRODUCTION.value})
    active_jobs = await db.jobs.count_documents({"status": {"$in": [JobStatus.CONFIRMED.value, JobStatus.IN_PROGRESS.value]}})
    pending_payments = await db.payments.count_documents({"status": PaymentStatus.PENDING.value})
    disputed_payments = await db.payments.count_documents({"status": PaymentStatus.DISPUTED.value})
    unread_messages = await db.messages.count_documents({"is_read": False})
    
    # Recent jobs
    recent_jobs = await db.jobs.find().sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "total_talents": total_talents,
        "total_productions": total_productions,
        "active_jobs": active_jobs,
        "pending_payments": pending_payments,
        "disputed_payments": disputed_payments,
        "unread_messages": unread_messages,
        "recent_jobs": clean_doc(recent_jobs)
    }

# ===================== SEED DATA =====================

@api_router.post("/seed/rates")
async def seed_default_rates(user: dict = Depends(get_current_user)):
    """Seed the database with FAA/PACT, BBC, ITV rates"""
    if user["role"] != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Clear existing rates
    await db.rates.delete_many({})
    
    rates_data = [
        # FAA/PACT Day Rates
        RateStructure(
            agreement_type=RateAgreement.FAA_PACT,
            name="FAA/PACT Standard Day Rates",
            category="day_rates",
            effective_date="2026-01-14",
            rates=[
                RateItem(name="Basic Daily Rate (BDR)", amount=111.21),
                RateItem(name="Overtime (Per half hour, inc holiday pay)", amount=11.69),
                RateItem(name="Holiday Pay (Added to BDR)", amount=13.42),
                RateItem(name="Public Holiday Basic Daily Rate", amount=166.82),
                RateItem(name="Public Holiday Overtime (Per half hour)", amount=17.54),
                RateItem(name="Non-performing Attendance (up to 4 hrs)", amount=55.61),
            ]
        ),
        # FAA/PACT Night Rates
        RateStructure(
            agreement_type=RateAgreement.FAA_PACT,
            name="FAA/PACT Night Rates",
            category="night_rates",
            effective_date="2026-01-14",
            rates=[
                RateItem(name="Basic Nightly Rate (BNR)", amount=166.82),
                RateItem(name="Overtime (Per half hour inc holiday pay)", amount=17.54),
                RateItem(name="Holiday pay (added to BNR)", amount=20.14),
                RateItem(name="Public Holiday Night Rate", amount=250.22),
            ]
        ),
        # FAA/PACT Supplementary Fees
        RateStructure(
            agreement_type=RateAgreement.FAA_PACT,
            name="FAA/PACT Supplementary Fees",
            category="supplements",
            effective_date="2026-01-14",
            rates=[
                RateItem(name="A(i) Clothing Change, Haircut", amount=23.00),
                RateItem(name="A(ii) Unused Set of Clothes (per set)", amount=11.50),
                RateItem(name="B - Doubling, Special Clothing, Wetting", amount=23.00),
                RateItem(name="C - Firearms, Swimming, Driving, Stills", amount=30.51),
                RateItem(name="D - Creative Reaction, Uniforms", amount=37.22),
                RateItem(name="E - Lookalike Doubling, Stand in, Dialogue", amount=61.63),
            ]
        ),
        # FAA/PACT Travel
        RateStructure(
            agreement_type=RateAgreement.FAA_PACT,
            name="FAA/PACT Travel Allowances",
            category="travel",
            effective_date="2026-01-14",
            rates=[
                RateItem(name="A - TFL Zones 1-3", amount=16.12),
                RateItem(name="B - Pinewood, Shepperton, etc", amount=22.54),
                RateItem(name="C - Early call (before 0600)", amount=19.73),
            ]
        ),
        # BBC Rates
        RateStructure(
            agreement_type=RateAgreement.BBC_EQUITY,
            name="BBC Supporting Artiste Rates",
            category="day_rates",
            effective_date="2025-04-01",
            rates=[
                RateItem(name="Basic Day Rate", amount=97.68),
                RateItem(name="Basic Overtime (per hour)", amount=14.10),
                RateItem(name="Basic Night Rate", amount=101.80),
                RateItem(name="Night Overtime (per hour)", amount=17.50),
                RateItem(name="Holiday pay", amount=11.79),
                RateItem(name="Special Skills", amount=44.20),
                RateItem(name="Haircut very short", amount=27.20),
                RateItem(name="Costume Fitting (4 hours)", amount=59.73),
            ]
        ),
        # ITV Walk-on 1 Rates
        RateStructure(
            agreement_type=RateAgreement.ITV_EQUITY,
            name="ITV Walk-on 1 Rates",
            category="day_rates",
            effective_date="2025-04-01",
            rates=[
                RateItem(name="Basic Day Rate", amount=109.46),
                RateItem(name="Basic Overtime (per hour)", amount=17.33),
                RateItem(name="Night Overtime (per hour)", amount=26.00),
                RateItem(name="Two episode", amount=129.65),
                RateItem(name="Three episodes or more", amount=155.74),
                RateItem(name="Special skills", amount=45.25),
                RateItem(name="Short Haircut", amount=14.08),
            ]
        ),
        # Commercial Rates
        RateStructure(
            agreement_type=RateAgreement.COMMERCIAL,
            name="Commercial Rates",
            category="day_rates",
            effective_date="2025-01-01",
            rates=[
                RateItem(name="Basic Day Rate Background", amount=125.00),
                RateItem(name="Basic Overtime (per hour)", amount=25.00),
                RateItem(name="Walk On Day Rate", amount=250.00),
                RateItem(name="Walk On Overtime (per hour)", amount=50.00),
                RateItem(name="Featured Day Rate", amount=350.00),
                RateItem(name="Featured Overtime (per hour)", amount=70.00),
            ]
        ),
    ]
    
    for rate in rates_data:
        await db.rates.insert_one(rate.dict())
    
    return {"message": f"Seeded {len(rates_data)} rate structures"}

# ===================== REFERRAL CODE SYSTEM =====================

import random

@api_router.post("/talent/generate-code")
async def generate_referral_code(user: dict = Depends(get_current_user)):
    """Talent generates a 4-digit referral code to share - limited to 1 per week"""
    if user["role"] != UserRole.TALENT.value:
        raise HTTPException(status_code=403, detail="Only talents can generate referral codes")
    
    # Check if user has generated a code in the last 7 days
    one_week_ago = datetime.utcnow() - timedelta(days=7)
    recent_code = await db.referral_codes.find_one({
        "generated_by_id": user["id"],
        "created_at": {"$gte": one_week_ago}
    })
    
    if recent_code:
        # Calculate when they can generate next
        code_created = recent_code["created_at"]
        if isinstance(code_created, str):
            code_created = datetime.fromisoformat(code_created.replace('Z', '+00:00'))
        next_available = code_created + timedelta(days=7)
        days_left = (next_available - datetime.utcnow()).days
        hours_left = int((next_available - datetime.utcnow()).seconds / 3600)
        
        if days_left > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"You can only generate 1 code per week. Try again in {days_left} day(s)."
            )
        elif hours_left > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"You can only generate 1 code per week. Try again in {hours_left} hour(s)."
            )
    
    # Generate unique 4-digit code
    while True:
        code = str(random.randint(1000, 9999))
        existing = await db.referral_codes.find_one({"code": code, "is_used": False})
        if not existing:
            break
    
    referral = ReferralCode(
        code=code,
        generated_by_id=user["id"],
        generated_by_name=f"{user['first_name']} {user['last_name']}"
    )
    
    await db.referral_codes.insert_one(referral.dict())
    
    talent_name = f"{user['first_name']} {user['last_name']}"
    
    return {
        "code": code,
        "generated_by_name": talent_name,
        "message": f"{talent_name} thinks you are good enough to join us. Use this code with one other on the login page.",
        "email_subject": "You've been invited to A Few Good Men Casting!",
        "email_body": f"{talent_name} thinks you are good enough to join us.\n\nUse this code: {code}\n\nYou'll need this code along with one other from a different talent to complete your registration.\n\nVisit our app to get started!"
    }

@api_router.get("/talent/my-codes")
async def get_my_referral_codes(user: dict = Depends(get_current_user)):
    """Get all referral codes generated by this talent"""
    if user["role"] != UserRole.TALENT.value:
        raise HTTPException(status_code=403, detail="Only talents can view their codes")
    
    codes = await db.referral_codes.find({"generated_by_id": user["id"]}).to_list(100)
    return clean_doc(codes)

class ValidateCodesRequest(BaseModel):
    code1: str
    code2: str

@api_router.post("/auth/validate-codes")
async def validate_referral_codes(request: ValidateCodesRequest):
    """Validate two referral codes before allowing talent registration"""
    code1 = request.code1.strip()
    code2 = request.code2.strip()
    
    if code1 == code2:
        raise HTTPException(status_code=400, detail="You must use codes from two different people")
    
    # Find both codes
    ref1 = await db.referral_codes.find_one({"code": code1, "is_used": False})
    ref2 = await db.referral_codes.find_one({"code": code2, "is_used": False})
    
    if not ref1:
        raise HTTPException(status_code=400, detail=f"Code {code1} is invalid or already used")
    if not ref2:
        raise HTTPException(status_code=400, detail=f"Code {code2} is invalid or already used")
    
    # Check they're from different people
    if ref1["generated_by_id"] == ref2["generated_by_id"]:
        raise HTTPException(status_code=400, detail="Both codes are from the same person. You need codes from two different talents.")
    
    return {
        "valid": True,
        "referrer_1": {
            "id": ref1["generated_by_id"],
            "name": ref1["generated_by_name"],
            "code": code1
        },
        "referrer_2": {
            "id": ref2["generated_by_id"],
            "name": ref2["generated_by_name"],
            "code": code2
        }
    }

class TalentRegisterWithCodes(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    code1: str
    code2: str

@api_router.post("/auth/register-talent")
async def register_talent_with_codes(data: TalentRegisterWithCodes):
    """Register a new talent using two referral codes"""
    # Validate codes first
    code1 = data.code1.strip()
    code2 = data.code2.strip()
    
    if code1 == code2:
        raise HTTPException(status_code=400, detail="You must use codes from two different people")
    
    ref1 = await db.referral_codes.find_one({"code": code1, "is_used": False})
    ref2 = await db.referral_codes.find_one({"code": code2, "is_used": False})
    
    if not ref1:
        raise HTTPException(status_code=400, detail=f"Code {code1} is invalid or already used")
    if not ref2:
        raise HTTPException(status_code=400, detail=f"Code {code2} is invalid or already used")
    
    if ref1["generated_by_id"] == ref2["generated_by_id"]:
        raise HTTPException(status_code=400, detail="Both codes are from the same person")
    
    # Check if email exists
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    user_dict = {
        "id": user_id,
        "email": data.email,
        "password": hash_password(data.password),
        "first_name": data.first_name,
        "last_name": data.last_name,
        "phone": data.phone,
        "role": UserRole.TALENT.value,
        "created_at": datetime.utcnow(),
        "is_active": True
    }
    
    await db.users.insert_one(user_dict)
    
    # Create talent profile with referrer info and 3 stars
    profile = TalentProfile(
        user_id=user_id,
        star_rating=3,
        referrer_1_id=ref1["generated_by_id"],
        referrer_1_name=ref1["generated_by_name"],
        referrer_2_id=ref2["generated_by_id"],
        referrer_2_name=ref2["generated_by_name"]
    )
    await db.talent_profiles.insert_one(profile.dict())
    
    # Mark codes as used
    now = datetime.utcnow()
    await db.referral_codes.update_one(
        {"code": code1},
        {"$set": {"is_used": True, "used_by_id": user_id, "used_at": now}}
    )
    await db.referral_codes.update_one(
        {"code": code2},
        {"$set": {"is_used": True, "used_by_id": user_id, "used_at": now}}
    )
    
    # Generate token
    token = create_token(user_id, UserRole.TALENT.value)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": data.email,
            "first_name": data.first_name,
            "last_name": data.last_name,
            "phone": data.phone,
            "role": UserRole.TALENT.value,
            "created_at": user_dict["created_at"].isoformat(),
            "is_active": True
        }
    }

@api_router.put("/admin/talent/{talent_id}/rating")
async def update_talent_rating(talent_id: str, rating: int, user: dict = Depends(get_current_user)):
    """Admin updates a talent's star rating (1-5)"""
    if user["role"] != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Only admin can update ratings")
    
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    result = await db.talent_profiles.update_one(
        {"user_id": talent_id},
        {"$set": {"star_rating": rating, "updated_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Talent profile not found")
    
    return {"message": f"Rating updated to {rating} stars"}

@api_router.put("/admin/talent/{talent_id}/captain")
async def update_talent_captain_status(talent_id: str, is_captain: bool, user: dict = Depends(get_current_user)):
    """Admin updates a talent's captain status (Yes/No)"""
    if user["role"] != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Only admin can update captain status")
    
    result = await db.talent_profiles.update_one(
        {"user_id": talent_id},
        {"$set": {"is_captain": is_captain, "updated_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Talent profile not found")
    
    return {"message": f"Captain status updated to {'Yes' if is_captain else 'No'}"}

@api_router.get("/talent/{talent_id}/referrers")
async def get_talent_referrers(talent_id: str, user: dict = Depends(get_current_user)):
    """Get who referred this talent - Admin only"""
    if user["role"] != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    profile = await db.talent_profiles.find_one({"user_id": talent_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Talent not found")
    
    return {
        "referrer_1": {
            "id": profile.get("referrer_1_id"),
            "name": profile.get("referrer_1_name")
        },
        "referrer_2": {
            "id": profile.get("referrer_2_id"),
            "name": profile.get("referrer_2_name")
        }
    }

# ===================== HEALTH CHECK =====================

@api_router.get("/")
async def root():
    return {"message": "A Few Good Men Casting API", "version": "1.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
