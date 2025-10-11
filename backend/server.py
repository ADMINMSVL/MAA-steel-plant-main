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
    vehicle_number: str
    driver_name: str
    driver_phone: str
    material_type: str
    supplier: str
    party_weight: Optional[float] = None
    entry_date: datetime = Field(default_factory=datetime.utcnow)
    operator_id: str
    status: str = "entered"  # entered, weighed, inspected, completed

class GateEntryCreate(BaseModel):
    vehicle_number: str
    driver_name: str
    driver_phone: str
    material_type: str
    supplier: str
    party_weight: Optional[float] = None
    operator_id: str

class Weighbridge(BaseModel):
    gate_entry_id: str
    weight_image: str  # base64
    extracted_weight: Optional[float] = None
    weight_1: Optional[float] = None
    weight_2: Optional[float] = None
    weight_3: Optional[float] = None
    weight_4: Optional[float] = None
    gross_weight: Optional[float] = None
    tare_weight: Optional[float] = None
    net_weight: Optional[float] = None
    weight_date: datetime = Field(default_factory=datetime.utcnow)
    operator_id: str

class WeighbridgeCreate(BaseModel):
    gate_entry_id: str
    weight_image: str
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
    gate_entry_id: str
    colour_tin: Optional[QualityCategory] = None
    tin: Optional[QualityCategory] = None
    light: Optional[QualityCategory] = None
    kabadi: Optional[QualityCategory] = None
    selected: Optional[QualityCategory] = None
    p2p: Optional[QualityCategory] = None
    mill_heavy: Optional[QualityCategory] = None
    others: Optional[QualityCategory] = None
    total_weight: Optional[float] = None
    total_amount: Optional[float] = None
    remarks: Optional[str] = None
    status: str  # approved, rejected, conditional
    inspector_id: str
    inspection_date: datetime = Field(default_factory=datetime.utcnow)
    unloading_bay: Optional[str] = None

class QualityInspectionCreate(BaseModel):
    gate_entry_id: str
    colour_tin: Optional[Dict[str, float]] = None
    tin: Optional[Dict[str, float]] = None
    light: Optional[Dict[str, float]] = None
    kabadi: Optional[Dict[str, float]] = None
    selected: Optional[Dict[str, float]] = None
    p2p: Optional[Dict[str, float]] = None
    mill_heavy: Optional[Dict[str, float]] = None
    others: Optional[Dict[str, float]] = None
    remarks: Optional[str] = None
    status: str
    inspector_id: str
    unloading_bay: Optional[str] = None

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

# ===== AUTHENTICATION ROUTES =====

@api_router.post("/auth/register")
async def register_user(user: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user_dict = user.dict()
    user_obj = User(**user_dict)
    result = await db.users.insert_one(user_obj.dict())
    
    return {"message": "User registered successfully", "user_id": str(result.inserted_id)}

@api_router.post("/auth/login")
async def login_user(login: UserLogin):
    user = await db.users.find_one({"username": login.username, "pin": login.pin})
    if not user:
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
    entry_obj = GateEntry(**entry_dict)
    result = await db.gate_entries.insert_one(entry_obj.dict())
    
    return {
        "message": "Gate entry created successfully",
        "entry_id": str(result.inserted_id)
    }

@api_router.get("/gate-entry")
async def get_gate_entries():
    entries = await db.gate_entries.find().sort("entry_date", -1).to_list(1000)
    return [serialize_doc(entry) for entry in entries]

@api_router.get("/gate-entry/{entry_id}")
async def get_gate_entry(entry_id: str):
    entry = await db.gate_entries.find_one({"_id": ObjectId(entry_id)})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return serialize_doc(entry)

@api_router.put("/gate-entry/{entry_id}")
async def update_gate_entry_status(entry_id: str, status: str):
    result = await db.gate_entries.update_one(
        {"_id": ObjectId(entry_id)},
        {"$set": {"status": status}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"message": "Status updated successfully"}

# ===== WEIGHBRIDGE ROUTES =====

async def extract_weight_from_image(base64_image: str) -> Optional[float]:
    """Use GPT-4 Vision to extract weight from image"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {EMERGENT_LLM_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o",
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": "Extract the weight value from this weighbridge display. Return ONLY the numeric weight value in kilograms. If you see multiple values, return the main weight reading. Return just the number, nothing else."
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{base64_image}"
                                    }
                                }
                            ]
                        }
                    ],
                    "max_tokens": 50
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                weight_str = data['choices'][0]['message']['content'].strip()
                # Extract numeric value
                import re
                numbers = re.findall(r'\d+\.?\d*', weight_str)
                if numbers:
                    return float(numbers[0])
            return None
    except Exception as e:
        logging.error(f"OCR Error: {e}")
        return None

@api_router.post("/weighbridge")
async def create_weighbridge_entry(weighbridge: WeighbridgeCreate):
    # Extract weight from image using OCR
    extracted_weight = await extract_weight_from_image(weighbridge.weight_image)
    
    weighbridge_dict = weighbridge.dict()
    weighbridge_dict['extracted_weight'] = extracted_weight
    
    # Calculate net weight if gross and tare are provided
    if weighbridge_dict.get('gross_weight') and weighbridge_dict.get('tare_weight'):
        weighbridge_dict['net_weight'] = weighbridge_dict['gross_weight'] - weighbridge_dict['tare_weight']
    
    weighbridge_obj = Weighbridge(**weighbridge_dict)
    
    result = await db.weighbridge.insert_one(weighbridge_obj.dict())
    
    # Update gate entry status
    await db.gate_entries.update_one(
        {"_id": ObjectId(weighbridge.gate_entry_id)},
        {"$set": {"status": "weighed"}}
    )
    
    return {
        "message": "Weighbridge entry created successfully",
        "weighbridge_id": str(result.inserted_id),
        "extracted_weight": extracted_weight,
        "net_weight": weighbridge_dict.get('net_weight')
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
async def update_manual_weight(weighbridge_id: str, manual_weight: float):
    result = await db.weighbridge.update_one(
        {"_id": ObjectId(weighbridge_id)},
        {"$set": {"manual_weight": manual_weight}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"message": "Manual weight updated successfully"}

# ===== QUALITY INSPECTION ROUTES =====

@api_router.post("/quality-inspection")
async def create_quality_inspection(inspection: QualityInspectionCreate):
    inspection_dict = inspection.dict()
    
    # Calculate total weight and amount
    total_weight = 0
    total_amount = 0
    
    categories = ['colour_tin', 'tin', 'light', 'kabadi', 'selected', 'p2p', 'mill_heavy', 'others']
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
    
    # Update gate entry status
    await db.gate_entries.update_one(
        {"_id": ObjectId(inspection.gate_entry_id)},
        {"$set": {"status": "inspected"}}
    )
    
    return {
        "message": "Quality inspection created successfully",
        "inspection_id": str(result.inserted_id),
        "total_weight": total_weight,
        "total_amount": total_amount
    }

@api_router.get("/quality-inspection")
async def get_quality_inspections():
    inspections = await db.quality_inspections.find().sort("inspection_date", -1).to_list(1000)
    return [serialize_doc(inspection) for inspection in inspections]

@api_router.get("/quality-inspection/entry/{gate_entry_id}")
async def get_quality_inspection_by_entry(gate_entry_id: str):
    inspection = await db.quality_inspections.find_one({"gate_entry_id": gate_entry_id})
    if not inspection:
        return None
    return serialize_doc(inspection)

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
    total_amount = order_dict['quantity'] * order_dict['rate']
    order_dict['total_amount'] = total_amount
    
    order_obj = PurchaseOrder(**order_dict)
    result = await db.purchase_orders.insert_one(order_obj.dict())
    
    return {
        "message": "Purchase order created successfully",
        "order_id": str(result.inserted_id),
        "total_amount": total_amount
    }

@api_router.get("/purchase-order")
async def get_purchase_orders():
    orders = await db.purchase_orders.find().sort("order_date", -1).to_list(1000)
    return [serialize_doc(order) for order in orders]

@api_router.get("/purchase-order/{order_id}")
async def get_purchase_order(order_id: str):
    order = await db.purchase_orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return serialize_doc(order)

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
