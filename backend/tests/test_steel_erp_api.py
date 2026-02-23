"""
Steel Plant ERP Backend API Tests
Tests: Authentication, Dashboard, Melting, CCM, Rolling Mill, Maintenance, Admin modules
"""

import pytest
import requests
import os
from datetime import datetime

# Use environment variable for base URL
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://steel-erp-preview.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_USER = "new_admin"
TEST_PIN = "1234"
TEST_USER_UNIQUE = f"TEST_user_{datetime.now().strftime('%Y%m%d%H%M%S')}"


class TestHealthAndBasics:
    """Basic connectivity and health check tests"""
    
    def test_dashboard_stats_endpoint(self):
        """Test dashboard stats API returns correct structure"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total_entries" in data
        assert "pending_entries" in data
        assert "total_purchase_orders" in data
        assert "total_sales_orders" in data
        assert "average_yield" in data
        print(f"Dashboard stats: {data}")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test successful login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USER, "pin": TEST_PIN}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert data["message"] == "Login successful"
        assert "user" in data
        assert data["user"]["username"] == TEST_USER
        assert "role" in data["user"]
        assert "id" in data["user"]
        print(f"Login successful for user: {data['user']['username']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid PIN"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USER, "pin": "9999"}
        )
        assert response.status_code == 401
        
        data = response.json()
        assert "detail" in data
        assert data["detail"] == "Invalid credentials"
    
    def test_login_nonexistent_user(self):
        """Test login with non-existent user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "nonexistent_user_xyz", "pin": "1234"}
        )
        assert response.status_code == 401
        
        data = response.json()
        assert "detail" in data
    
    def test_register_user(self):
        """Test user registration"""
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "username": TEST_USER_UNIQUE,
                "pin": "5678",
                "role": "gate_operator"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "user_id" in data
        print(f"Registered user: {TEST_USER_UNIQUE}")
    
    def test_register_duplicate_user(self):
        """Test registration with existing username fails"""
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "username": TEST_USER,  # Already exists
                "pin": "9999",
                "role": "admin"
            }
        )
        assert response.status_code == 400
        
        data = response.json()
        assert "detail" in data
        assert "already exists" in data["detail"]
    
    def test_get_users_list(self):
        """Test fetching users list"""
        response = requests.get(f"{BASE_URL}/api/users")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify user structure
        user = data[0]
        assert "username" in user
        assert "role" in user
        print(f"Found {len(data)} users")


class TestMeltingModule:
    """Melting module API tests"""
    
    def test_get_melting_stats(self):
        """Test melting statistics endpoint"""
        response = requests.get(f"{BASE_URL}/api/melting/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_heats" in data
        assert "today_heats" in data
        assert "active_heats" in data
        assert "average_yield" in data
        print(f"Melting stats: {data}")
    
    def test_get_melting_heats_list(self):
        """Test get all melting heats"""
        response = requests.get(f"{BASE_URL}/api/melting/heat")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} melting heats")
    
    def test_create_melting_heat(self):
        """Test creating a new melting heat"""
        heat_number = f"TEST-H-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        payload = {
            "heat_number": heat_number,
            "furnace_number": 1,
            "shift": "morning",
            "raw_materials": [
                {"material_type": "scrap_heavy", "weight": 500, "rate": 25},
                {"material_type": "scrap_light", "weight": 300, "rate": 20}
            ],
            "operator_id": "test_operator",
            "remarks": "Test heat from pytest"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/melting/heat",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "heat_id" in data
        assert "total_charge_weight" in data
        assert data["total_charge_weight"] == 800  # 500 + 300
        print(f"Created melting heat: {heat_number}, ID: {data['heat_id']}")
        return data["heat_id"]
    
    def test_create_and_get_melting_heat(self):
        """Test creating and retrieving a melting heat"""
        # Create
        heat_number = f"TEST-H2-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        create_response = requests.post(
            f"{BASE_URL}/api/melting/heat",
            json={
                "heat_number": heat_number,
                "furnace_number": 2,
                "shift": "afternoon",
                "raw_materials": [{"material_type": "pig_iron", "weight": 1000}],
                "operator_id": "test_op"
            }
        )
        assert create_response.status_code == 200
        heat_id = create_response.json()["heat_id"]
        
        # Get
        get_response = requests.get(f"{BASE_URL}/api/melting/heat/{heat_id}")
        assert get_response.status_code == 200
        
        heat_data = get_response.json()
        assert heat_data["heat_number"] == heat_number
        assert heat_data["furnace_number"] == 2
        assert heat_data["total_charge_weight"] == 1000


class TestCCMModule:
    """CCM (Continuous Casting Machine) module tests"""
    
    def test_get_billet_productions(self):
        """Test getting billet production list"""
        response = requests.get(f"{BASE_URL}/api/ccm/billet")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} billet productions")
    
    def test_create_billet_production(self):
        """Test creating a new billet production record"""
        batch_id = f"TEST-BLT-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        payload = {
            "billet_batch": batch_id,
            "heat_id": "test_heat_123",
            "ccm_number": 1,
            "shift": "morning",
            "billet_size": "100x100",
            "billet_count": 50,
            "total_weight": 5000,
            "length_per_billet": 12,
            "casting_speed": 2.5,
            "casting_temperature": 1550,
            "operator_id": "test_operator",
            "quality_grade": "A",
            "remarks": "Test billet batch from pytest"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ccm/billet",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "billet_id" in data
        print(f"Created billet production: {batch_id}, ID: {data['billet_id']}")
        return data["billet_id"]
    
    def test_create_and_verify_billet(self):
        """Test create and verify billet persisted correctly"""
        batch_id = f"TEST-BLT2-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Create
        create_response = requests.post(
            f"{BASE_URL}/api/ccm/billet",
            json={
                "billet_batch": batch_id,
                "heat_id": "heat_verify_test",
                "ccm_number": 2,
                "shift": "night",
                "billet_size": "130x130",
                "billet_count": 30,
                "total_weight": 4500,
                "operator_id": "verify_op"
            }
        )
        assert create_response.status_code == 200
        billet_id = create_response.json()["billet_id"]
        
        # Verify GET
        get_response = requests.get(f"{BASE_URL}/api/ccm/billet/{billet_id}")
        assert get_response.status_code == 200
        
        billet_data = get_response.json()
        assert billet_data["billet_batch"] == batch_id
        assert billet_data["billet_count"] == 30
        assert billet_data["billet_size"] == "130x130"


class TestRollingMillModule:
    """Rolling Mill (TMT) module tests"""
    
    def test_get_rolling_productions(self):
        """Test getting rolling production list"""
        response = requests.get(f"{BASE_URL}/api/rolling/production")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} rolling productions")
    
    def test_create_rolling_production(self):
        """Test creating a new rolling production record"""
        batch_id = f"TEST-RLL-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        payload = {
            "production_batch": batch_id,
            "billet_batch_id": "test_billet_batch_123",
            "mill_number": 1,
            "shift": "morning",
            "product_size": "12mm",
            "bundle_count": 100,
            "total_weight": 10000,
            "production_rate": 25.5,
            "operator_id": "test_operator",
            "quality_check": "passed",
            "remarks": "Test rolling production from pytest"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/rolling/production",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "production_id" in data
        print(f"Created rolling production: {batch_id}, ID: {data['production_id']}")
        return data["production_id"]
    
    def test_create_and_verify_rolling_production(self):
        """Test create and verify rolling production persisted"""
        batch_id = f"TEST-RLL2-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Create
        create_response = requests.post(
            f"{BASE_URL}/api/rolling/production",
            json={
                "production_batch": batch_id,
                "billet_batch_id": "billet_verify",
                "mill_number": 2,
                "shift": "afternoon",
                "product_size": "16mm",
                "bundle_count": 75,
                "total_weight": 8500,
                "operator_id": "verify_op"
            }
        )
        assert create_response.status_code == 200
        production_id = create_response.json()["production_id"]
        
        # Verify GET
        get_response = requests.get(f"{BASE_URL}/api/rolling/production/{production_id}")
        assert get_response.status_code == 200
        
        prod_data = get_response.json()
        assert prod_data["production_batch"] == batch_id
        assert prod_data["bundle_count"] == 75
        assert prod_data["product_size"] == "16mm"


class TestMaintenanceModule:
    """Maintenance and Breakdown module tests"""
    
    def test_get_maintenance_stats(self):
        """Test maintenance statistics endpoint"""
        response = requests.get(f"{BASE_URL}/api/maintenance/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_breakdowns" in data
        assert "open_breakdowns" in data
        assert "critical_breakdowns" in data
        assert "overdue_maintenance" in data
        print(f"Maintenance stats: {data}")
    
    def test_get_breakdown_reports(self):
        """Test getting breakdown reports list"""
        response = requests.get(f"{BASE_URL}/api/maintenance/breakdown")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} breakdown reports")
    
    def test_create_breakdown_report(self):
        """Test creating a new breakdown report"""
        payload = {
            "equipment_name": "TEST-Furnace-1",
            "equipment_type": "furnace",
            "reported_by": "test_operator",
            "description": "Test breakdown from pytest - cooling system malfunction",
            "severity": "minor",
            "location": "Melting shop",
            "remarks": "Test breakdown for verification"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/maintenance/breakdown",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "breakdown_id" in data
        assert "id" in data
        print(f"Created breakdown report: {data['breakdown_id']}, ID: {data['id']}")
        return data["id"]
    
    def test_create_and_verify_breakdown(self):
        """Test create and verify breakdown report persisted"""
        # Create
        create_response = requests.post(
            f"{BASE_URL}/api/maintenance/breakdown",
            json={
                "equipment_name": "TEST-CCM-2",
                "equipment_type": "ccm",
                "reported_by": "verify_operator",
                "description": "Test breakdown verify - water leak detected",
                "severity": "major",
                "location": "CCM Area"
            }
        )
        assert create_response.status_code == 200
        breakdown_id = create_response.json()["id"]
        
        # Verify GET
        get_response = requests.get(f"{BASE_URL}/api/maintenance/breakdown/{breakdown_id}")
        assert get_response.status_code == 200
        
        breakdown_data = get_response.json()
        assert breakdown_data["equipment_name"] == "TEST-CCM-2"
        assert breakdown_data["severity"] == "major"
        assert breakdown_data["status"] == "reported"
    
    def test_get_maintenance_schedules(self):
        """Test getting maintenance schedules"""
        response = requests.get(f"{BASE_URL}/api/maintenance/schedule")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} maintenance schedules")


class TestAdminModule:
    """Admin module tests"""
    
    def test_clear_all_data(self):
        """Test clear all data endpoint (Admin function)"""
        response = requests.delete(f"{BASE_URL}/api/admin/clear-all")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "deleted" in data
        assert "gate_entries" in data["deleted"]
        assert "purchase_orders" in data["deleted"]
        assert "sales_orders" in data["deleted"]
        assert "weighbridge" in data["deleted"]
        assert "quality_inspections" in data["deleted"]
        assert "total" in data["deleted"]
        print(f"Clear all result: {data}")


class TestGateEntry:
    """Gate Entry module tests"""
    
    def test_get_gate_entries(self):
        """Test getting gate entries list"""
        response = requests.get(f"{BASE_URL}/api/gate-entry")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} gate entries")
    
    def test_create_gate_entry(self):
        """Test creating a new gate entry"""
        vehicle_num = f"TEST-MH12AB-{datetime.now().strftime('%H%M%S')}"
        payload = {
            "vehicle_number": vehicle_num,
            "driver_name": "Test Driver",
            "driver_phone": "9876543210",
            "material_type": "Scrap",
            "supplier": "Test Supplier",
            "party_weight": 5000,
            "operator_id": "test_operator"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/gate-entry",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "entry_id" in data
        print(f"Created gate entry for: {vehicle_num}")


class TestOrdersModule:
    """Purchase and Sales Orders tests"""
    
    def test_get_purchase_orders(self):
        """Test getting purchase orders list"""
        response = requests.get(f"{BASE_URL}/api/purchase-order")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} purchase orders")
    
    def test_get_sales_orders(self):
        """Test getting sales orders list"""
        response = requests.get(f"{BASE_URL}/api/sales-order")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} sales orders")
    
    def test_create_purchase_order(self):
        """Test creating a purchase order"""
        po_num = f"TEST-PO-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        payload = {
            "po_number": po_num,
            "vendor": "Test Vendor",
            "material_type": "Iron Scrap",
            "quantity": 1000,
            "unit": "kg",
            "rate": 25,
            "created_by": "test_admin"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/purchase-order",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "order_id" in data
        assert "total_amount" in data
        assert data["total_amount"] == 25000  # 1000 * 25
        print(f"Created purchase order: {po_num}")


# Cleanup fixtures
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data():
    """Run tests and then cleanup TEST_ prefixed data"""
    yield
    # Note: In production, implement cleanup to delete TEST_ prefixed records


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
