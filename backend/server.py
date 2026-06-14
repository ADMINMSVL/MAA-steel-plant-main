from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
import base64
import httpx
from io import BytesIO
from PIL import Image
from crypto_utils import (
    hash_password, 
    verify_password, 
    encrypt_document, 
    decrypt_document
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Emergent LLM Key for OCR
EMERGENT_LLM_KEY = os.getenv('EMERGENT_LLM_KEY', 'sk-emergent-e17792e35CaD765F06')

# Helper to convert ObjectId to string
def serialize_doc(doc):
    if doc and '_id' in doc:
        doc['_id'] = str(doc['_id'])
    return doc

# ===== SEQUENCE GENERATOR HELPERS =====

async def generate_po_number():
    """Generate PO number in format POYYMMDD00 with increment"""
    today = datetime.utcnow()
    prefix = f"PO{today.strftime('%y%m%d')}"
    
    # Find the latest PO for today
    latest_po = await db.purchase_orders.find_one(
        {"po_number": {"$regex": f"^{prefix}"}},
        sort=[("po_number", -1)]
    )
    
    if latest_po:
        # Extract the sequence number and increment
        last_seq = int(latest_po['po_number'][-2:])
        new_seq = last_seq + 1
    else:
        new_seq = 1
    
    return f"{prefix}{new_seq:02d}"

async def generate_gate_entry_number():
    """Generate Gate Entry number in format INYYMMDD00 with increment"""
    today = datetime.utcnow()
    prefix = f"IN{today.strftime('%y%m%d')}"
    
    # Find the latest gate entry for today
    latest_entry = await db.gate_entries.find_one(
        {"entry_number": {"$regex": f"^{prefix}"}},
        sort=[("entry_number", -1)]
    )
    
    if latest_entry:
        # Extract the sequence number and increment
        last_seq = int(latest_entry['entry_number'][-2:])
        new_seq = last_seq + 1
    else:
        new_seq = 1
    
    return f"{prefix}{new_seq:02d}"

async def generate_quality_inspection_number():
    """Generate Quality Inspection number in format ICYYMMDD00 with increment"""
    today = datetime.utcnow()
    prefix = f"IC{today.strftime('%y%m%d')}"
    
    # Find the latest quality inspection for today
    latest_inspection = await db.quality_inspections.find_one(
        {"inspection_number": {"$regex": f"^{prefix}"}},
        sort=[("inspection_number", -1)]
    )
    
    if latest_inspection:
        # Extract the sequence number and increment
        last_seq = int(latest_inspection['inspection_number'][-2:])
        new_seq = last_seq + 1
    else:
        new_seq = 1
    
    return f"{prefix}{new_seq:02d}"

# ===== MODELS =====

class User(BaseModel):
    username: str
    pin: str
    role: str  # gate_operator, quality_inspector, manager, admin
    biometric_enabled: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    username: str
    pin: str
    role: str

class UserLogin(BaseModel):
    username: str
    pin: str

class GateEntry(BaseModel):
    entry_number: Optional[str] = None  # INYYMMDD00 format
    vehicle_number: str
    driver_name: str
    driver_phone: str
    material_type: Optional[str] = None
    supplier: Optional[str] = None
    party_weight: Optional[float] = None
    purchase_order_id: Optional[str] = None
    rate: Optional[float] = None  # Rate from purchase order
    entry_date: datetime = Field(default_factory=datetime.utcnow)
    operator_id: str
    status: str = "entered"  # entered, weighed, inspected, completed

class GateEntryCreate(BaseModel):
    vehicle_number: str
    driver_name: str
    driver_phone: str
    material_type: Optional[str] = None  # Will be populated from PO
    supplier: Optional[str] = None  # Will be populated from PO
    party_weight: Optional[float] = None
    purchase_order_id: Optional[str] = None
    operator_id: str

class GateEntryUpdate(BaseModel):
    vehicle_number: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    material_type: Optional[str] = None
    supplier: Optional[str] = None
    party_weight: Optional[float] = None
    purchase_order_id: Optional[str] = None
    status: Optional[str] = None

class Weighbridge(BaseModel):
    gate_entry_id: str
    weight_image: Optional[str] = None  # base64
    extracted_weight: Optional[float] = None
    weight_1: Optional[float] = None
    weight_2: Optional[float] = None
    weight_3: Optional[float] = None
    weight_4: Optional[float] = None
    gross_weight: Optional[float] = None
    tare_weight: Optional[float] = None
    net_weight: Optional[float] = None
    rate: Optional[float] = None  # Inherited from gate entry
    weight_date: datetime = Field(default_factory=datetime.utcnow)
    operator_id: str

class WeighbridgeCreate(BaseModel):
    gate_entry_id: str
    weight_image: Optional[str] = None
    weight_1: Optional[float] = None
    weight_2: Optional[float] = None
    weight_3: Optional[float] = None
    weight_4: Optional[float] = None
    gross_weight: Optional[float] = None
    tare_weight: Optional[float] = None
    operator_id: str

class QualityCategory(BaseModel):
    weight: Optional[float] = None
    rate: Optional[float] = None
    dust: Optional[float] = None  # Dust weight in kg
    product_name: Optional[str] = None  # For "Others" category to specify custom product

class QualityInspection(BaseModel):
    inspection_number: Optional[str] = None  # ICYYMMDD00 format
    gate_entry_id: str
    colour_tin: Optional[QualityCategory] = None
    tin: Optional[QualityCategory] = None
    light: Optional[QualityCategory] = None
    kabadi: Optional[QualityCategory] = None
    selected: Optional[QualityCategory] = None
    p2p: Optional[QualityCategory] = None
    mill_heavy: Optional[QualityCategory] = None
    cast_iron: Optional[QualityCategory] = None
    tourning: Optional[QualityCategory] = None
    others: Optional[QualityCategory] = None
    total_weight: Optional[float] = None
    total_amount: Optional[float] = None
    remarks: Optional[str] = None
    status: str  # approved, rejected, conditional
    inspector_id: str
    inspection_date: datetime = Field(default_factory=datetime.utcnow)
    unloading_bay: Optional[str] = None
    base_price: Optional[float] = None  # P2P base price from PO or manual

class QualityInspectionCreate(BaseModel):
    gate_entry_id: str
    colour_tin: Optional[QualityCategory] = None
    tin: Optional[QualityCategory] = None
    light: Optional[QualityCategory] = None
    kabadi: Optional[QualityCategory] = None
    selected: Optional[QualityCategory] = None
    p2p: Optional[QualityCategory] = None
    mill_heavy: Optional[QualityCategory] = None
    cast_iron: Optional[QualityCategory] = None
    tourning: Optional[QualityCategory] = None
    others: Optional[QualityCategory] = None
    remarks: Optional[str] = None
    status: str
    inspector_id: str
    unloading_bay: Optional[str] = None
    base_price: Optional[float] = None  # P2P base price

class MaterialConsumption(BaseModel):
    material_type: str
    quantity: float
    unit: str
    purpose: str
    consumption_date: datetime = Field(default_factory=datetime.utcnow)
    recorded_by: str

class MaterialConsumptionCreate(BaseModel):
    material_type: str
    quantity: float
    unit: str
    purpose: str
    recorded_by: str

class MaterialYield(BaseModel):
    input_material: str
    input_quantity: float
    output_material: str
    output_quantity: float
    yield_percentage: float
    process_date: datetime = Field(default_factory=datetime.utcnow)
    recorded_by: str

class MaterialYieldCreate(BaseModel):
    input_material: str
    input_quantity: float
    output_material: str
    output_quantity: float
    recorded_by: str

class PurchaseOrder(BaseModel):
    po_number: str
    vendor: str
    material_type: str
    quantity: float
    unit: str
    rate: float
    total_amount: float
    order_date: datetime = Field(default_factory=datetime.utcnow)
    delivery_date: Optional[datetime] = None
    status: str = "pending"  # pending, received, cancelled
    created_by: str

class PurchaseOrderCreate(BaseModel):
    po_number: str
    vendor: str
    material_type: str
    quantity: float
    unit: str
    rate: float
    delivery_date: Optional[datetime] = None
    created_by: str

class SalesOrder(BaseModel):
    so_number: str
    customer: str
    material_type: str
    quantity: float
    unit: str
    rate: float
    total_amount: float
    order_date: datetime = Field(default_factory=datetime.utcnow)
    delivery_date: Optional[datetime] = None
    status: str = "pending"  # pending, dispatched, completed
    created_by: str

class SalesOrderCreate(BaseModel):
    so_number: str
    customer: str
    material_type: str
    quantity: float
    unit: str
    rate: float
    delivery_date: Optional[datetime] = None
    created_by: str

class Voucher(BaseModel):
    voucher_number: str
    voucher_type: str  # purchase, sales
    order_id: str
    amount: float
    payment_method: str
    voucher_date: datetime = Field(default_factory=datetime.utcnow)
    created_by: str

class VoucherCreate(BaseModel):
    voucher_number: str
    voucher_type: str
    order_id: str
    amount: float
    payment_method: str
    created_by: str

# ===== PHASE 2: MELTING MODULE MODELS =====

class RawMaterialCharge(BaseModel):
    material_type: str  # scrap_heavy, scrap_light, pig_iron, ms_scrap, etc.
    weight: float  # kg
    rate: Optional[float] = None  # ₹/kg

class MeltingHeat(BaseModel):
    heat_number: str  # Unique heat identifier e.g. H-2024-001
    furnace_number: int  # 1, 2, 3 etc.
    shift: str  # morning, afternoon, night
    start_time: datetime = Field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    raw_materials: List[RawMaterialCharge] = []
    total_charge_weight: float = 0  # Total input weight
    molten_metal_weight: Optional[float] = None  # Output weight
    yield_percentage: Optional[float] = None
    power_consumption: Optional[float] = None  # kWh
    temperature: Optional[float] = None  # °C
    tap_time: Optional[datetime] = None
    operator_id: str
    status: str = "charging"  # charging, melting, tapped, completed
    remarks: Optional[str] = None

class MeltingHeatCreate(BaseModel):
    heat_number: str
    furnace_number: int
    shift: str
    raw_materials: List[RawMaterialCharge] = []
    operator_id: str
    remarks: Optional[str] = None

class MeltingHeatUpdate(BaseModel):
    molten_metal_weight: Optional[float] = None
    power_consumption: Optional[float] = None
    temperature: Optional[float] = None
    status: Optional[str] = None
    tap_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    remarks: Optional[str] = None

# ===== PHASE 2: CCM (BILLET CASTING) MODULE MODELS =====

class BilletProduction(BaseModel):
    billet_batch: str  # Batch identifier
    heat_id: str  # Link to melting heat
    ccm_number: int  # CCM machine number
    shift: str
    billet_size: str  # e.g., "100x100", "130x130"
    billet_count: int  # Number of billets
    total_weight: float  # kg
    length_per_billet: Optional[float] = None  # meters
    casting_speed: Optional[float] = None  # m/min
    casting_temperature: Optional[float] = None  # °C
    start_time: datetime = Field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    operator_id: str
    status: str = "casting"  # casting, cooling, completed
    quality_grade: Optional[str] = None  # A, B, C
    defects: Optional[str] = None
    remarks: Optional[str] = None

class BilletProductionCreate(BaseModel):
    billet_batch: str
    heat_id: str
    ccm_number: int
    shift: str
    billet_size: str
    billet_count: int
    total_weight: float
    length_per_billet: Optional[float] = None
    casting_speed: Optional[float] = None
    casting_temperature: Optional[float] = None
    operator_id: str
    quality_grade: Optional[str] = None
    defects: Optional[str] = None
    remarks: Optional[str] = None

# ===== PHASE 2: ROLLING MILL (TMT) MODULE MODELS =====

class RollingProduction(BaseModel):
    production_batch: str  # Production batch identifier
    billet_batch_id: str  # Link to billet production
    mill_number: int  # Mill number
    shift: str
    product_size: str  # e.g., "8mm", "10mm", "12mm", "16mm", "20mm", "25mm"
    bundle_count: int
    total_weight: float  # kg
    production_rate: Optional[float] = None  # tons/hour
    start_time: datetime = Field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    operator_id: str
    status: str = "rolling"  # rolling, cooling, bundling, completed
    quality_check: Optional[str] = None  # passed, failed
    remarks: Optional[str] = None

class RollingProductionCreate(BaseModel):
    production_batch: str
    billet_batch_id: str
    mill_number: int
    shift: str
    product_size: str
    bundle_count: int
    total_weight: float
    production_rate: Optional[float] = None
    operator_id: str
    quality_check: Optional[str] = None
    remarks: Optional[str] = None

# ===== PHASE 2: BREAKDOWN & MAINTENANCE MODULE MODELS =====

class BreakdownReport(BaseModel):
    breakdown_id: str  # Auto-generated
    equipment_name: str  # Furnace-1, CCM-1, Rolling Mill-1
    equipment_type: str  # furnace, ccm, rolling_mill, utility
    reported_by: str
    reported_time: datetime = Field(default_factory=datetime.utcnow)
    description: str
    severity: str  # critical, major, minor
    location: str  # Melting shop, CCM, Rolling mill
    status: str = "reported"  # reported, assigned, in_progress, resolved, closed
    assigned_to: Optional[str] = None
    start_repair_time: Optional[datetime] = None
    end_repair_time: Optional[datetime] = None
    downtime_minutes: Optional[int] = None
    root_cause: Optional[str] = None
    action_taken: Optional[str] = None
    spare_parts_used: Optional[str] = None
    remarks: Optional[str] = None

class BreakdownReportCreate(BaseModel):
    equipment_name: str
    equipment_type: str
    reported_by: str
    description: str
    severity: str
    location: str
    remarks: Optional[str] = None

class MaintenanceSchedule(BaseModel):
    schedule_id: str
    equipment_name: str
    equipment_type: str
    maintenance_type: str  # preventive, predictive, corrective
    scheduled_date: datetime
    frequency: str  # daily, weekly, monthly, quarterly, yearly
    last_maintenance: Optional[datetime] = None
    next_due: Optional[datetime] = None
    assigned_to: Optional[str] = None
    status: str = "scheduled"  # scheduled, in_progress, completed, overdue
    checklist: Optional[str] = None
    remarks: Optional[str] = None
    created_by: str

class MaintenanceScheduleCreate(BaseModel):
    equipment_name: str
    equipment_type: str
    maintenance_type: str
    scheduled_date: datetime
    frequency: str
    assigned_to: Optional[str] = None
    checklist: Optional[str] = None
    remarks: Optional[str] = None
    created_by: str

# ===== AUTHENTICATION ROUTES =====

@api_router.post("/auth/register")
async def register_user(user: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user_dict = user.dict()
    # Hash the PIN before storing
    user_dict['pin'] = hash_password(user_dict['pin'])
    user_obj = User(**user_dict)
    result = await db.users.insert_one(user_obj.dict())
    
    return {"message": "User registered successfully", "user_id": str(result.inserted_id)}

@api_router.post("/auth/login")
async def login_user(login: UserLogin):
    user = await db.users.find_one({"username": login.username})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify PIN using bcrypt
    if not verify_password(login.pin, user['pin']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {
        "message": "Login successful",
        "user": {
            "id": str(user['_id']),
            "username": user['username'],
            "role": user['role'],
            "biometric_enabled": user.get('biometric_enabled', False)
        }
    }

@api_router.get("/users")
async def get_users():
    users = await db.users.find().to_list(1000)
    return [serialize_doc(user) for user in users]

# ===== GATE ENTRY ROUTES =====

@api_router.post("/gate-entry")
async def create_gate_entry(entry: GateEntryCreate):
    entry_dict = entry.dict()
    
    # Generate entry number
    entry_dict['entry_number'] = await generate_gate_entry_number()
    
    # If purchase order is linked, pull rate, material_type, supplier from it
    if entry_dict.get('purchase_order_id'):
        try:
            po = await db.purchase_orders.find_one({"_id": ObjectId(entry_dict['purchase_order_id'])})
            if po:
                entry_dict['rate'] = po.get('rate')
                entry_dict['material_type'] = po.get('material_type')
                entry_dict['supplier'] = po.get('vendor')
        except Exception as e:
            logging.warning(f"Could not fetch PO: {e}")
    
    # Encrypt sensitive fields before storing
    entry_dict = encrypt_document('gate_entries', entry_dict)
    
    entry_obj = GateEntry(**entry_dict)
    result = await db.gate_entries.insert_one(entry_obj.dict())
    
    return {
        "message": "Gate entry created successfully",
        "entry_id": str(result.inserted_id),
        "entry_number": entry_dict.get('entry_number'),
        "rate": entry_dict.get('rate')
    }

@api_router.get("/gate-entry")
async def get_gate_entries():
    entries = await db.gate_entries.find().sort("entry_date", -1).to_list(1000)
    # Decrypt sensitive fields before sending
    decrypted_entries = [decrypt_document('gate_entries', serialize_doc(entry)) for entry in entries]
    return decrypted_entries

@api_router.get("/gate-entry/{entry_id}")
async def get_gate_entry(entry_id: str):
    entry = await db.gate_entries.find_one({"_id": ObjectId(entry_id)})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return serialize_doc(entry)

@api_router.put("/gate-entry/{entry_id}")
async def update_gate_entry(entry_id: str, entry: GateEntryUpdate):
    """Update entire gate entry (admin only)"""
    update_dict = {k: v for k, v in entry.dict().items() if v is not None}
    
    # If purchase order is linked, pull rate, material_type, supplier from it
    if update_dict.get('purchase_order_id'):
        try:
            po = await db.purchase_orders.find_one({"_id": ObjectId(update_dict['purchase_order_id'])})
            if po:
                update_dict['rate'] = po.get('rate')
                if not update_dict.get('material_type'):
                    update_dict['material_type'] = po.get('material_type')
                if not update_dict.get('supplier'):
                    update_dict['supplier'] = po.get('vendor')
        except Exception as e:
            logging.warning(f"Could not fetch PO: {e}")
    
    # Encrypt sensitive fields
    update_dict = encrypt_document('gate_entries', update_dict)
    
    result = await db.gate_entries.update_one(
        {"_id": ObjectId(entry_id)},
        {"$set": update_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"message": "Gate entry updated successfully"}

@api_router.put("/gate-entry/{entry_id}/status")
async def update_gate_entry_status(entry_id: str, status: str):
    result = await db.gate_entries.update_one(
        {"_id": ObjectId(entry_id)},
        {"$set": {"status": status}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"message": "Status updated successfully"}

@api_router.delete("/gate-entry/{entry_id}")
async def delete_gate_entry(entry_id: str):
    result = await db.gate_entries.delete_one({"_id": ObjectId(entry_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"message": "Gate entry deleted successfully"}

@api_router.delete("/gate-entry/vehicle/{vehicle_number}/duplicates")
async def delete_duplicate_entries(vehicle_number: str):
    """Delete duplicate gate entries for a vehicle, keeping only the latest one"""
    entries = await db.gate_entries.find({"vehicle_number": vehicle_number}).sort("entry_date", -1).to_list(1000)
    
    if len(entries) <= 1:
        return {"message": "No duplicates found", "deleted_count": 0}
    
    # Keep the first (latest) entry, delete the rest
    entries_to_delete = entries[1:]
    delete_ids = [entry['_id'] for entry in entries_to_delete]
    
    result = await db.gate_entries.delete_many({"_id": {"$in": delete_ids}})
    
    return {
        "message": f"Deleted {result.deleted_count} duplicate entries",
        "deleted_count": result.deleted_count,
        "kept_entry_id": str(entries[0]['_id'])
    }

@api_router.delete("/purchase-order/{order_id}")
async def delete_purchase_order(order_id: str):
    result = await db.purchase_orders.delete_one({"_id": ObjectId(order_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Purchase order deleted successfully"}

@api_router.delete("/sales-order/{order_id}")
async def delete_sales_order(order_id: str):
    result = await db.sales_orders.delete_one({"_id": ObjectId(order_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Sales order deleted successfully"}

# ===== WEIGHBRIDGE ROUTES =====

# OCR function removed - Manual weight entry only

@api_router.delete("/weighbridge/{weighbridge_id}")
async def delete_weighbridge(weighbridge_id: str):
    result = await db.weighbridge.delete_one({"_id": ObjectId(weighbridge_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Weighbridge record not found")
    return {"message": "Weighbridge record deleted successfully"}

@api_router.post("/weighbridge")
async def create_weighbridge_entry(weighbridge: WeighbridgeCreate):
    weighbridge_dict = weighbridge.dict()
    
    # Calculate net weight if gross and tare are provided
    if weighbridge_dict.get('gross_weight') and weighbridge_dict.get('tare_weight'):
        weighbridge_dict['net_weight'] = weighbridge_dict['gross_weight'] - weighbridge_dict['tare_weight']
    
    # Inherit rate from gate entry
    try:
        from bson.errors import InvalidId
        try:
            gate_entry = await db.gate_entries.find_one({"_id": ObjectId(weighbridge.gate_entry_id)})
            if gate_entry and gate_entry.get('rate'):
                weighbridge_dict['rate'] = gate_entry.get('rate')
        except InvalidId:
            logging.warning(f"Invalid gate entry ID format: {weighbridge.gate_entry_id}")
    except Exception as e:
        logging.warning(f"Could not fetch gate entry: {e}")
    
    weighbridge_obj = Weighbridge(**weighbridge_dict)
    
    result = await db.weighbridge.insert_one(weighbridge_obj.dict())
    
    # Update gate entry status
    try:
        await db.gate_entries.update_one(
            {"_id": ObjectId(weighbridge.gate_entry_id)},
            {"$set": {"status": "weighed"}}
        )
    except Exception as e:
        logging.warning(f"Could not update gate entry status: {e}")
    
    return {
        "message": "Weighbridge entry created successfully",
        "weighbridge_id": str(result.inserted_id),
        "net_weight": weighbridge_dict.get('net_weight'),
        "rate": weighbridge_dict.get('rate')
    }

@api_router.get("/weighbridge")
async def get_weighbridge_entries():
    entries = await db.weighbridge.find().sort("weight_date", -1).to_list(1000)
    return [serialize_doc(entry) for entry in entries]

@api_router.get("/weighbridge/entry/{gate_entry_id}")
async def get_weighbridge_by_entry(gate_entry_id: str):
    entry = await db.weighbridge.find_one({"gate_entry_id": gate_entry_id})
    if not entry:
        return None
    return serialize_doc(entry)

@api_router.put("/weighbridge/{weighbridge_id}")
async def update_weighbridge(weighbridge_id: str, weighbridge: WeighbridgeCreate):
    """Update entire weighbridge entry (admin only)"""
    weighbridge_dict = weighbridge.dict()
    
    # Calculate net weight if gross and tare are provided
    if weighbridge_dict.get('gross_weight') and weighbridge_dict.get('tare_weight'):
        weighbridge_dict['net_weight'] = weighbridge_dict['gross_weight'] - weighbridge_dict['tare_weight']
    
    result = await db.weighbridge.update_one(
        {"_id": ObjectId(weighbridge_id)},
        {"$set": weighbridge_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"message": "Weighbridge entry updated successfully", "net_weight": weighbridge_dict.get('net_weight')}

# ===== QUALITY INSPECTION ROUTES =====

@api_router.delete("/quality-inspection/{inspection_id}")
async def delete_quality_inspection(inspection_id: str):
    result = await db.quality_inspections.delete_one({"_id": ObjectId(inspection_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quality inspection not found")
    return {"message": "Quality inspection deleted successfully"}

@api_router.post("/quality-inspection")
async def create_quality_inspection(inspection: QualityInspectionCreate):
    inspection_dict = inspection.dict()
    
    # Generate inspection number
    inspection_dict['inspection_number'] = await generate_quality_inspection_number()
    
    # Try to get base price from linked PO if not provided
    if not inspection_dict.get('base_price'):
        try:
            gate_entry = await db.gate_entries.find_one({"_id": ObjectId(inspection.gate_entry_id)})
            if gate_entry and gate_entry.get('purchase_order_id'):
                po = await db.purchase_orders.find_one({"_id": ObjectId(gate_entry['purchase_order_id'])})
                if po:
                    inspection_dict['base_price'] = po.get('rate')
            elif gate_entry and gate_entry.get('rate'):
                inspection_dict['base_price'] = gate_entry.get('rate')
        except Exception as e:
            logging.warning(f"Could not fetch base price: {e}")
    
    # Calculate total weight and amount
    total_weight = 0
    total_amount = 0
    
    categories = ['colour_tin', 'tin', 'light', 'kabadi', 'selected', 'p2p', 'mill_heavy', 'cast_iron', 'tourning', 'others']
    for cat in categories:
        if inspection_dict.get(cat):
            weight = inspection_dict[cat].get('weight', 0) or 0
            rate = inspection_dict[cat].get('rate', 0) or 0
            total_weight += weight
            total_amount += (weight * rate)
    
    inspection_dict['total_weight'] = total_weight
    inspection_dict['total_amount'] = total_amount
    
    inspection_obj = QualityInspection(**inspection_dict)
    result = await db.quality_inspections.insert_one(inspection_obj.dict())
    
    # Update gate entry status (with validation)
    try:
        if inspection.gate_entry_id:
            await db.gate_entries.update_one(
                {"_id": ObjectId(inspection.gate_entry_id)},
                {"$set": {"status": "inspected"}}
            )
    except Exception as e:
        # Log error but don't fail the inspection creation
        print(f"Warning: Could not update gate entry status: {e}")
    
    return {
        "message": "Quality inspection created successfully",
        "inspection_id": str(result.inserted_id),
        "inspection_number": inspection_dict.get('inspection_number'),
        "total_weight": total_weight,
        "total_amount": total_amount,
        "base_price": inspection_dict.get('base_price')
    }

@api_router.get("/quality-inspection")
async def get_quality_inspections():
    inspections = await db.quality_inspections.find().sort("inspection_date", -1).to_list(1000)
    return [serialize_doc(inspection) for inspection in inspections]

@api_router.get("/quality-inspection/base-price/{gate_entry_id}")
async def get_base_price_for_inspection(gate_entry_id: str):
    """Get base price from linked PO for quality inspection"""
    try:
        gate_entry = await db.gate_entries.find_one({"_id": ObjectId(gate_entry_id)})
        if not gate_entry:
            return {"base_price": None, "source": "not_found"}
        
        # Try to get rate from linked PO
        if gate_entry.get('purchase_order_id'):
            po = await db.purchase_orders.find_one({"_id": ObjectId(gate_entry['purchase_order_id'])})
            if po and po.get('rate'):
                return {
                    "base_price": po.get('rate'),
                    "source": "purchase_order",
                    "po_number": po.get('po_number'),
                    "vendor": po.get('vendor')
                }
        
        # Fallback to rate stored in gate entry
        if gate_entry.get('rate'):
            return {
                "base_price": gate_entry.get('rate'),
                "source": "gate_entry"
            }
        
        return {"base_price": None, "source": "no_rate"}
    except Exception as e:
        logging.error(f"Error fetching base price: {e}")
        return {"base_price": None, "source": "error"}

@api_router.get("/quality-inspection/entry/{gate_entry_id}")
async def get_quality_inspection_by_entry(gate_entry_id: str):
    inspection = await db.quality_inspections.find_one({"gate_entry_id": gate_entry_id})
    if not inspection:
        return None
    return serialize_doc(inspection)

@api_router.put("/quality-inspection/{inspection_id}")
async def update_quality_inspection(inspection_id: str, inspection: QualityInspectionCreate):
    """Update entire quality inspection (admin only)"""
    inspection_dict = inspection.dict()
    
    # Calculate total weight and amount
    total_weight = 0
    total_amount = 0
    
    categories = ['colour_tin', 'tin', 'light', 'kabadi', 'selected', 'p2p', 'mill_heavy', 'cast_iron', 'tourning', 'others']
    for cat in categories:
        if inspection_dict.get(cat):
            weight = inspection_dict[cat].get('weight', 0) or 0
            rate = inspection_dict[cat].get('rate', 0) or 0
            total_weight += weight
            total_amount += (weight * rate)
    
    inspection_dict['total_weight'] = total_weight
    inspection_dict['total_amount'] = total_amount
    
    result = await db.quality_inspections.update_one(
        {"_id": ObjectId(inspection_id)},
        {"$set": inspection_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return {
        "message": "Quality inspection updated successfully",
        "total_weight": total_weight,
        "total_amount": total_amount
    }

# ===== MATERIAL CONSUMPTION ROUTES =====

@api_router.post("/material-consumption")
async def create_material_consumption(consumption: MaterialConsumptionCreate):
    consumption_dict = consumption.dict()
    consumption_obj = MaterialConsumption(**consumption_dict)
    result = await db.material_consumption.insert_one(consumption_obj.dict())
    
    return {
        "message": "Material consumption recorded successfully",
        "consumption_id": str(result.inserted_id)
    }

@api_router.get("/material-consumption")
async def get_material_consumption():
    consumptions = await db.material_consumption.find().sort("consumption_date", -1).to_list(1000)
    return [serialize_doc(consumption) for consumption in consumptions]

# ===== MATERIAL YIELD ROUTES =====

@api_router.post("/material-yield")
async def create_material_yield(yield_data: MaterialYieldCreate):
    yield_dict = yield_data.dict()
    # Calculate yield percentage
    yield_percentage = (yield_dict['output_quantity'] / yield_dict['input_quantity']) * 100
    yield_dict['yield_percentage'] = round(yield_percentage, 2)
    
    yield_obj = MaterialYield(**yield_dict)
    result = await db.material_yield.insert_one(yield_obj.dict())
    
    return {
        "message": "Material yield recorded successfully",
        "yield_id": str(result.inserted_id),
        "yield_percentage": yield_percentage
    }

@api_router.get("/material-yield")
async def get_material_yield():
    yields = await db.material_yield.find().sort("process_date", -1).to_list(1000)
    return [serialize_doc(yield_data) for yield_data in yields]

# ===== PURCHASE ORDER ROUTES =====

@api_router.post("/purchase-order")
async def create_purchase_order(order: PurchaseOrderCreate):
    order_dict = order.dict()
    
    # Auto-generate PO number if not provided or if it's empty
    if not order_dict.get('po_number') or order_dict.get('po_number') == '':
        order_dict['po_number'] = await generate_po_number()
    
    total_amount = order_dict['quantity'] * order_dict['rate']
    order_dict['total_amount'] = total_amount
    
    order_obj = PurchaseOrder(**order_dict)
    result = await db.purchase_orders.insert_one(order_obj.dict())
    
    return {
        "message": "Purchase order created successfully",
        "order_id": str(result.inserted_id),
        "po_number": order_dict['po_number'],
        "total_amount": total_amount
    }

@api_router.get("/purchase-order")
async def get_purchase_orders():
    orders = await db.purchase_orders.find().sort("order_date", -1).to_list(1000)
    return [serialize_doc(order) for order in orders]

@api_router.get("/purchase-order/active")
async def get_active_purchase_orders():
    """Get only pending/active purchase orders for linking to gate entries"""
    orders = await db.purchase_orders.find({"status": {"$in": ["pending", "partial"]}}).sort("order_date", -1).to_list(1000)
    return [serialize_doc(order) for order in orders]

@api_router.get("/purchase-order/{order_id}")
async def get_purchase_order(order_id: str):
    order = await db.purchase_orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return serialize_doc(order)

@api_router.put("/purchase-order/{order_id}")
async def update_purchase_order(order_id: str, order: PurchaseOrderCreate):
    """Update entire purchase order (admin only)"""
    order_dict = order.dict()
    total_amount = order_dict['quantity'] * order_dict['rate']
    order_dict['total_amount'] = total_amount
    
    result = await db.purchase_orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": order_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Purchase order updated successfully", "total_amount": total_amount}

@api_router.put("/purchase-order/{order_id}/status")
async def update_purchase_order_status(order_id: str, status: str):
    result = await db.purchase_orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": status}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Status updated successfully"}

# ===== SALES ORDER ROUTES =====

@api_router.post("/sales-order")
async def create_sales_order(order: SalesOrderCreate):
    order_dict = order.dict()
    total_amount = order_dict['quantity'] * order_dict['rate']
    order_dict['total_amount'] = total_amount
    
    order_obj = SalesOrder(**order_dict)
    result = await db.sales_orders.insert_one(order_obj.dict())
    
    return {
        "message": "Sales order created successfully",
        "order_id": str(result.inserted_id),
        "total_amount": total_amount
    }

@api_router.get("/sales-order")
async def get_sales_orders():
    orders = await db.sales_orders.find().sort("order_date", -1).to_list(1000)
    return [serialize_doc(order) for order in orders]

@api_router.get("/sales-order/{order_id}")
async def get_sales_order(order_id: str):
    order = await db.sales_orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return serialize_doc(order)

@api_router.put("/sales-order/{order_id}/status")
async def update_sales_order_status(order_id: str, status: str):
    result = await db.sales_orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": status}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Status updated successfully"}

# ===== VOUCHER ROUTES =====

@api_router.post("/voucher")
async def create_voucher(voucher: VoucherCreate):
    voucher_dict = voucher.dict()
    voucher_obj = Voucher(**voucher_dict)
    result = await db.vouchers.insert_one(voucher_obj.dict())
    
    return {
        "message": "Voucher created successfully",
        "voucher_id": str(result.inserted_id)
    }

@api_router.get("/voucher")
async def get_vouchers():
    vouchers = await db.vouchers.find().sort("voucher_date", -1).to_list(1000)
    return [serialize_doc(voucher) for voucher in vouchers]

@api_router.get("/voucher/type/{voucher_type}")
async def get_vouchers_by_type(voucher_type: str):
    vouchers = await db.vouchers.find({"voucher_type": voucher_type}).sort("voucher_date", -1).to_list(1000)
    return [serialize_doc(voucher) for voucher in vouchers]

# ===== PHASE 2: MELTING ROUTES =====

@api_router.post("/melting/heat")
async def create_melting_heat(heat: MeltingHeatCreate):
    heat_dict = heat.dict()
    
    # Calculate total charge weight from raw materials
    total_charge = sum([rm.get('weight', 0) for rm in heat_dict.get('raw_materials', [])])
    heat_dict['total_charge_weight'] = total_charge
    
    heat_obj = MeltingHeat(**heat_dict)
    result = await db.melting_heats.insert_one(heat_obj.dict())
    
    return {
        "message": "Melting heat created successfully",
        "heat_id": str(result.inserted_id),
        "total_charge_weight": total_charge
    }

@api_router.get("/melting/heat")
async def get_melting_heats():
    heats = await db.melting_heats.find().sort("start_time", -1).to_list(1000)
    return [serialize_doc(heat) for heat in heats]

@api_router.get("/melting/heat/{heat_id}")
async def get_melting_heat(heat_id: str):
    heat = await db.melting_heats.find_one({"_id": ObjectId(heat_id)})
    if not heat:
        raise HTTPException(status_code=404, detail="Heat not found")
    return serialize_doc(heat)

@api_router.put("/melting/heat/{heat_id}")
async def update_melting_heat(heat_id: str, update: MeltingHeatUpdate):
    update_dict = {k: v for k, v in update.dict().items() if v is not None}
    
    # Calculate yield if molten metal weight is provided
    heat = await db.melting_heats.find_one({"_id": ObjectId(heat_id)})
    if heat and update_dict.get('molten_metal_weight'):
        charge_weight = heat.get('total_charge_weight', 1)
        if charge_weight > 0:
            update_dict['yield_percentage'] = round(
                (update_dict['molten_metal_weight'] / charge_weight) * 100, 2
            )
    
    result = await db.melting_heats.update_one(
        {"_id": ObjectId(heat_id)},
        {"$set": update_dict}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Heat not found")
    
    return {"message": "Heat updated successfully", "yield_percentage": update_dict.get('yield_percentage')}

@api_router.delete("/melting/heat/{heat_id}")
async def delete_melting_heat(heat_id: str):
    result = await db.melting_heats.delete_one({"_id": ObjectId(heat_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Heat not found")
    return {"message": "Melting heat deleted successfully"}

@api_router.get("/melting/stats")
async def get_melting_stats():
    """Get melting statistics for dashboard"""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    total_heats = await db.melting_heats.count_documents({})
    today_heats = await db.melting_heats.count_documents({"start_time": {"$gte": today}})
    active_heats = await db.melting_heats.count_documents({"status": {"$in": ["charging", "melting"]}})
    
    # Get average yield
    heats_with_yield = await db.melting_heats.find(
        {"yield_percentage": {"$exists": True, "$ne": None}}
    ).to_list(100)
    avg_yield = sum([h.get('yield_percentage', 0) for h in heats_with_yield]) / len(heats_with_yield) if heats_with_yield else 0
    
    return {
        "total_heats": total_heats,
        "today_heats": today_heats,
        "active_heats": active_heats,
        "average_yield": round(avg_yield, 2)
    }

# ===== PHASE 2: CCM (BILLET CASTING) ROUTES =====

@api_router.post("/ccm/billet")
async def create_billet_production(billet: BilletProductionCreate):
    billet_dict = billet.dict()
    billet_obj = BilletProduction(**billet_dict)
    result = await db.billet_production.insert_one(billet_obj.dict())
    
    return {
        "message": "Billet production recorded successfully",
        "billet_id": str(result.inserted_id)
    }

@api_router.get("/ccm/billet")
async def get_billet_productions():
    billets = await db.billet_production.find().sort("start_time", -1).to_list(1000)
    return [serialize_doc(billet) for billet in billets]

@api_router.get("/ccm/billet/{billet_id}")
async def get_billet_production(billet_id: str):
    billet = await db.billet_production.find_one({"_id": ObjectId(billet_id)})
    if not billet:
        raise HTTPException(status_code=404, detail="Billet batch not found")
    return serialize_doc(billet)

@api_router.put("/ccm/billet/{billet_id}/status")
async def update_billet_status(billet_id: str, status: str, end_time: Optional[datetime] = None):
    update_data = {"status": status}
    if end_time:
        update_data["end_time"] = end_time
    
    result = await db.billet_production.update_one(
        {"_id": ObjectId(billet_id)},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Billet batch not found")
    return {"message": "Status updated successfully"}

@api_router.delete("/ccm/billet/{billet_id}")
async def delete_billet_production(billet_id: str):
    result = await db.billet_production.delete_one({"_id": ObjectId(billet_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Billet batch not found")
    return {"message": "Billet production record deleted successfully"}

# ===== PHASE 2: ROLLING MILL ROUTES =====

@api_router.post("/rolling/production")
async def create_rolling_production(production: RollingProductionCreate):
    production_dict = production.dict()
    production_obj = RollingProduction(**production_dict)
    result = await db.rolling_production.insert_one(production_obj.dict())
    
    return {
        "message": "Rolling production recorded successfully",
        "production_id": str(result.inserted_id)
    }

@api_router.get("/rolling/production")
async def get_rolling_productions():
    productions = await db.rolling_production.find().sort("start_time", -1).to_list(1000)
    return [serialize_doc(production) for production in productions]

@api_router.get("/rolling/production/{production_id}")
async def get_rolling_production(production_id: str):
    production = await db.rolling_production.find_one({"_id": ObjectId(production_id)})
    if not production:
        raise HTTPException(status_code=404, detail="Production record not found")
    return serialize_doc(production)

@api_router.put("/rolling/production/{production_id}/status")
async def update_rolling_status(production_id: str, status: str, end_time: Optional[datetime] = None):
    update_data = {"status": status}
    if end_time:
        update_data["end_time"] = end_time
    
    result = await db.rolling_production.update_one(
        {"_id": ObjectId(production_id)},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Production record not found")
    return {"message": "Status updated successfully"}

@api_router.delete("/rolling/production/{production_id}")
async def delete_rolling_production(production_id: str):
    result = await db.rolling_production.delete_one({"_id": ObjectId(production_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Production record not found")
    return {"message": "Rolling production record deleted successfully"}

# ===== PHASE 2: BREAKDOWN & MAINTENANCE ROUTES =====

@api_router.post("/maintenance/breakdown")
async def create_breakdown_report(breakdown: BreakdownReportCreate):
    breakdown_dict = breakdown.dict()
    
    # Generate breakdown ID
    count = await db.breakdown_reports.count_documents({})
    breakdown_dict['breakdown_id'] = f"BD-{datetime.utcnow().strftime('%Y%m%d')}-{count + 1:03d}"
    
    breakdown_obj = BreakdownReport(**breakdown_dict)
    result = await db.breakdown_reports.insert_one(breakdown_obj.dict())
    
    return {
        "message": "Breakdown reported successfully",
        "breakdown_id": breakdown_dict['breakdown_id'],
        "id": str(result.inserted_id)
    }

@api_router.get("/maintenance/breakdown")
async def get_breakdown_reports():
    breakdowns = await db.breakdown_reports.find().sort("reported_time", -1).to_list(1000)
    return [serialize_doc(breakdown) for breakdown in breakdowns]

@api_router.get("/maintenance/breakdown/{breakdown_id}")
async def get_breakdown_report(breakdown_id: str):
    breakdown = await db.breakdown_reports.find_one({"_id": ObjectId(breakdown_id)})
    if not breakdown:
        raise HTTPException(status_code=404, detail="Breakdown report not found")
    return serialize_doc(breakdown)

@api_router.put("/maintenance/breakdown/{breakdown_id}")
async def update_breakdown_report(breakdown_id: str, update_data: dict):
    # Calculate downtime if repair is completed
    if update_data.get('status') == 'resolved' and update_data.get('end_repair_time'):
        breakdown = await db.breakdown_reports.find_one({"_id": ObjectId(breakdown_id)})
        if breakdown and breakdown.get('start_repair_time'):
            start = breakdown['start_repair_time']
            end = update_data['end_repair_time']
            if isinstance(end, str):
                end = datetime.fromisoformat(end.replace('Z', '+00:00'))
            downtime = int((end - start).total_seconds() / 60)
            update_data['downtime_minutes'] = downtime
    
    result = await db.breakdown_reports.update_one(
        {"_id": ObjectId(breakdown_id)},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Breakdown report not found")
    return {"message": "Breakdown report updated successfully"}

@api_router.delete("/maintenance/breakdown/{breakdown_id}")
async def delete_breakdown_report(breakdown_id: str):
    result = await db.breakdown_reports.delete_one({"_id": ObjectId(breakdown_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Breakdown report not found")
    return {"message": "Breakdown report deleted successfully"}

@api_router.post("/maintenance/schedule")
async def create_maintenance_schedule(schedule: MaintenanceScheduleCreate):
    schedule_dict = schedule.dict()
    
    # Generate schedule ID
    count = await db.maintenance_schedules.count_documents({})
    schedule_dict['schedule_id'] = f"PM-{datetime.utcnow().strftime('%Y%m%d')}-{count + 1:03d}"
    
    schedule_obj = MaintenanceSchedule(**schedule_dict)
    result = await db.maintenance_schedules.insert_one(schedule_obj.dict())
    
    return {
        "message": "Maintenance schedule created successfully",
        "schedule_id": schedule_dict['schedule_id'],
        "id": str(result.inserted_id)
    }

@api_router.get("/maintenance/schedule")
async def get_maintenance_schedules():
    schedules = await db.maintenance_schedules.find().sort("scheduled_date", 1).to_list(1000)
    return [serialize_doc(schedule) for schedule in schedules]

@api_router.put("/maintenance/schedule/{schedule_id}/status")
async def update_maintenance_status(schedule_id: str, status: str):
    update_data = {"status": status}
    if status == "completed":
        update_data["last_maintenance"] = datetime.utcnow()
    
    result = await db.maintenance_schedules.update_one(
        {"_id": ObjectId(schedule_id)},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"message": "Schedule updated successfully"}

@api_router.delete("/maintenance/schedule/{schedule_id}")
async def delete_maintenance_schedule(schedule_id: str):
    result = await db.maintenance_schedules.delete_one({"_id": ObjectId(schedule_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"message": "Maintenance schedule deleted successfully"}

@api_router.get("/maintenance/stats")
async def get_maintenance_stats():
    """Get maintenance statistics"""
    total_breakdowns = await db.breakdown_reports.count_documents({})
    open_breakdowns = await db.breakdown_reports.count_documents({"status": {"$in": ["reported", "assigned", "in_progress"]}})
    critical_breakdowns = await db.breakdown_reports.count_documents({"severity": "critical", "status": {"$ne": "closed"}})
    
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    overdue_maintenance = await db.maintenance_schedules.count_documents({
        "scheduled_date": {"$lt": today},
        "status": {"$ne": "completed"}
    })
    
    return {
        "total_breakdowns": total_breakdowns,
        "open_breakdowns": open_breakdowns,
        "critical_breakdowns": critical_breakdowns,
        "overdue_maintenance": overdue_maintenance
    }

# ===== DASHBOARD / REPORTS =====

@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    # Get counts and statistics
    total_entries = await db.gate_entries.count_documents({})
    pending_entries = await db.gate_entries.count_documents({"status": "entered"})
    total_purchase_orders = await db.purchase_orders.count_documents({})
    total_sales_orders = await db.sales_orders.count_documents({})
    
    # Get recent yields
    recent_yields = await db.material_yield.find().sort("process_date", -1).limit(10).to_list(10)
    avg_yield = sum([y['yield_percentage'] for y in recent_yields]) / len(recent_yields) if recent_yields else 0
    
    return {
        "total_entries": total_entries,
        "pending_entries": pending_entries,
        "total_purchase_orders": total_purchase_orders,
        "total_sales_orders": total_sales_orders,
        "average_yield": round(avg_yield, 2)
    }

# ===== ADMIN ROUTES =====

@api_router.delete("/admin/clear-all")
async def clear_all_data():
    """
    Clear all data from all collections (DANGEROUS!)
    This will delete all gate entries, orders, weighbridge, and quality records
    """
    try:
        # Count before deletion
        gate_count = await db.gate_entries.count_documents({})
        po_count = await db.purchase_orders.count_documents({})
        so_count = await db.sales_orders.count_documents({})
        wb_count = await db.weighbridge.count_documents({})
        qi_count = await db.quality_inspections.count_documents({})
        
        # Delete all entries from all collections (except users)
        await db.gate_entries.delete_many({})
        await db.purchase_orders.delete_many({})
        await db.sales_orders.delete_many({})
        await db.weighbridge.delete_many({})
        await db.quality_inspections.delete_many({})
        
        total_deleted = gate_count + po_count + so_count + wb_count + qi_count
        
        return {
            "message": "All data cleared successfully",
            "deleted": {
                "gate_entries": gate_count,
                "purchase_orders": po_count,
                "sales_orders": so_count,
                "weighbridge": wb_count,
                "quality_inspections": qi_count,
                "total": total_deleted
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear data: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
