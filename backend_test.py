#!/usr/bin/env python3
"""
Steel Plant App - Complete Phase 1 Workflow Test
Tests the end-to-end workflow: PO -> Gate Entry -> Weighbridge -> Quality Inspection -> Reports
"""

import requests
import json
from datetime import datetime
import sys

# Backend URL from frontend/.env
BASE_URL = "https://plantproc-mobile.preview.emergentagent.com/api"

class SteelPlantWorkflowTest:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_data = {}
        
    def log(self, message, level="INFO"):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def test_api_endpoint(self, method, endpoint, data=None, expected_status=None):
        """Generic API test method"""
        url = f"{self.base_url}{endpoint}"
        self.log(f"Testing {method} {endpoint}")
        
        try:
            if method == "POST":
                response = self.session.post(url, json=data)
            elif method == "GET":
                response = self.session.get(url)
            elif method == "PUT":
                response = self.session.put(url, json=data)
            elif method == "DELETE":
                response = self.session.delete(url)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            self.log(f"Response Status: {response.status_code}")
            
            if expected_status and response.status_code != expected_status:
                self.log(f"❌ Expected status {expected_status}, got {response.status_code}", "ERROR")
                self.log(f"Response: {response.text}", "ERROR")
                return None
                
            if response.status_code >= 400:
                self.log(f"❌ API Error: {response.text}", "ERROR")
                return None
                
            try:
                response_data = response.json()
                if isinstance(response_data, dict):
                    self.log(f"✅ Success: {response_data.get('message', 'OK')}")
                elif isinstance(response_data, list):
                    self.log(f"✅ Success: Retrieved {len(response_data)} items")
                else:
                    self.log(f"✅ Success: {response_data}")
                return response_data
            except json.JSONDecodeError:
                self.log(f"✅ Success (no JSON response)")
                return {"status": "success"}
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ Network Error: {str(e)}", "ERROR")
            return None
            
    def step_1_create_purchase_order(self):
        """Step 1: Create Purchase Order"""
        self.log("=" * 60)
        self.log("STEP 1: Creating Purchase Order")
        self.log("=" * 60)
        
        po_data = {
            "po_number": "PO-TEST-001",
            "vendor": "Steel Supplier Ltd",
            "material_type": "Scrap Steel",
            "quantity": 1000,
            "unit": "kg",
            "rate": 50,
            "delivery_date": "2025-10-15T00:00:00Z",
            "created_by": "testadmin"
        }
        
        response = self.test_api_endpoint("POST", "/purchase-order", po_data, 200)
        if response and "order_id" in response:
            self.test_data["po_id"] = response["order_id"]
            self.test_data["po_total_amount"] = response.get("total_amount")
            self.log(f"✅ Purchase Order Created - ID: {self.test_data['po_id']}")
            return True
        else:
            self.log("❌ Failed to create Purchase Order", "ERROR")
            return False
            
    def step_2_create_gate_entry(self):
        """Step 2: Create Gate Entry linked to Purchase Order"""
        self.log("=" * 60)
        self.log("STEP 2: Creating Gate Entry")
        self.log("=" * 60)
        
        if "po_id" not in self.test_data:
            self.log("❌ Cannot create Gate Entry - No Purchase Order ID", "ERROR")
            return False
            
        gate_data = {
            "vehicle_number": "MH12AB1234",
            "driver_name": "Test Driver",
            "driver_phone": "9876543210",
            "material_type": "Scrap Steel",
            "supplier": "Steel Supplier Ltd",
            "party_weight": 1000,
            "purchase_order_id": self.test_data["po_id"],
            "operator_id": "testadmin"
        }
        
        response = self.test_api_endpoint("POST", "/gate-entry", gate_data, 200)
        if response and "entry_id" in response:
            self.test_data["gate_entry_id"] = response["entry_id"]
            self.test_data["gate_rate"] = response.get("rate")
            self.log(f"✅ Gate Entry Created - ID: {self.test_data['gate_entry_id']}")
            self.log(f"✅ Rate inherited from PO: {self.test_data['gate_rate']}")
            return True
        else:
            self.log("❌ Failed to create Gate Entry", "ERROR")
            return False
            
    def step_3_create_weighbridge_entry(self):
        """Step 3: Create Weighbridge Entry linked to Gate Entry"""
        self.log("=" * 60)
        self.log("STEP 3: Creating Weighbridge Entry")
        self.log("=" * 60)
        
        if "gate_entry_id" not in self.test_data:
            self.log("❌ Cannot create Weighbridge Entry - No Gate Entry ID", "ERROR")
            return False
            
        # Create a simple base64 test image
        test_image_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        
        weighbridge_data = {
            "gate_entry_id": self.test_data["gate_entry_id"],
            "weight_image": test_image_b64,
            "gross_weight": 1500,
            "tare_weight": 500,
            "operator_id": "testadmin"
        }
        
        response = self.test_api_endpoint("POST", "/weighbridge", weighbridge_data, 200)
        if response and "weighbridge_id" in response:
            self.test_data["weighbridge_id"] = response["weighbridge_id"]
            self.test_data["net_weight"] = response.get("net_weight")
            self.test_data["weighbridge_rate"] = response.get("rate")
            self.log(f"✅ Weighbridge Entry Created - ID: {self.test_data['weighbridge_id']}")
            self.log(f"✅ Net Weight Calculated: {self.test_data['net_weight']} kg")
            self.log(f"✅ Rate inherited: {self.test_data['weighbridge_rate']}")
            return True
        else:
            self.log("❌ Failed to create Weighbridge Entry", "ERROR")
            return False
            
    def step_4_create_quality_inspection(self):
        """Step 4: Create Quality Inspection linked to Gate Entry"""
        self.log("=" * 60)
        self.log("STEP 4: Creating Quality Inspection")
        self.log("=" * 60)
        
        if "gate_entry_id" not in self.test_data:
            self.log("❌ Cannot create Quality Inspection - No Gate Entry ID", "ERROR")
            return False
            
        quality_data = {
            "gate_entry_id": self.test_data["gate_entry_id"],
            "p2p": {"weight": 600, "rate": 50, "dust": 10},
            "tin": {"weight": 400, "rate": 43, "dust": 5},
            "status": "approved",
            "remarks": "Good quality scrap",
            "inspector_id": "testadmin"
        }
        
        response = self.test_api_endpoint("POST", "/quality-inspection", quality_data, 200)
        if response and "inspection_id" in response:
            self.test_data["inspection_id"] = response["inspection_id"]
            self.test_data["total_weight"] = response.get("total_weight")
            self.test_data["total_amount"] = response.get("total_amount")
            self.log(f"✅ Quality Inspection Created - ID: {self.test_data['inspection_id']}")
            self.log(f"✅ Total Weight: {self.test_data['total_weight']} kg")
            self.log(f"✅ Total Amount: ₹{self.test_data['total_amount']}")
            return True
        else:
            self.log("❌ Failed to create Quality Inspection", "ERROR")
            return False
            
    def step_5_verify_reports(self):
        """Step 5: Verify all reports and data integrity"""
        self.log("=" * 60)
        self.log("STEP 5: Verifying Reports and Data Integrity")
        self.log("=" * 60)
        
        success_count = 0
        total_tests = 4
        
        # Test 1: Verify Gate Entry
        self.log("Testing GET /api/gate-entry")
        gate_entries = self.test_api_endpoint("GET", "/gate-entry", expected_status=200)
        if gate_entries and isinstance(gate_entries, list) and len(gate_entries) > 0:
            found_entry = any(entry.get("_id") == self.test_data["gate_entry_id"] for entry in gate_entries)
            if found_entry:
                self.log("✅ Gate Entry found in reports")
                success_count += 1
            else:
                self.log("❌ Gate Entry not found in reports", "ERROR")
        else:
            self.log("❌ Failed to retrieve Gate Entries", "ERROR")
            
        # Test 2: Verify Weighbridge
        self.log("Testing GET /api/weighbridge")
        weighbridge_entries = self.test_api_endpoint("GET", "/weighbridge", expected_status=200)
        if weighbridge_entries and isinstance(weighbridge_entries, list) and len(weighbridge_entries) > 0:
            found_entry = any(entry.get("_id") == self.test_data["weighbridge_id"] for entry in weighbridge_entries)
            if found_entry:
                self.log("✅ Weighbridge Entry found in reports")
                success_count += 1
            else:
                self.log("❌ Weighbridge Entry not found in reports", "ERROR")
        else:
            self.log("❌ Failed to retrieve Weighbridge Entries", "ERROR")
            
        # Test 3: Verify Quality Inspection
        self.log("Testing GET /api/quality-inspection")
        quality_inspections = self.test_api_endpoint("GET", "/quality-inspection", expected_status=200)
        if quality_inspections and isinstance(quality_inspections, list) and len(quality_inspections) > 0:
            found_entry = any(entry.get("_id") == self.test_data["inspection_id"] for entry in quality_inspections)
            if found_entry:
                self.log("✅ Quality Inspection found in reports")
                success_count += 1
            else:
                self.log("❌ Quality Inspection not found in reports", "ERROR")
        else:
            self.log("❌ Failed to retrieve Quality Inspections", "ERROR")
            
        # Test 4: Verify Purchase Order
        self.log("Testing GET /api/purchase-order")
        purchase_orders = self.test_api_endpoint("GET", "/purchase-order", expected_status=200)
        if purchase_orders and isinstance(purchase_orders, list) and len(purchase_orders) > 0:
            found_entry = any(entry.get("_id") == self.test_data["po_id"] for entry in purchase_orders)
            if found_entry:
                self.log("✅ Purchase Order found in reports")
                success_count += 1
            else:
                self.log("❌ Purchase Order not found in reports", "ERROR")
        else:
            self.log("❌ Failed to retrieve Purchase Orders", "ERROR")
            
        self.log(f"Report Verification: {success_count}/{total_tests} tests passed")
        return success_count == total_tests
        
    def test_data_linking(self):
        """Verify data linking between entities"""
        self.log("=" * 60)
        self.log("TESTING DATA LINKING")
        self.log("=" * 60)
        
        success_count = 0
        total_tests = 2
        
        # Test 1: Verify Gate Entry status updated to "weighed"
        if "gate_entry_id" in self.test_data:
            gate_entry = self.test_api_endpoint("GET", f"/gate-entry/{self.test_data['gate_entry_id']}")
            if gate_entry and gate_entry.get("status") == "weighed":
                self.log("✅ Gate Entry status updated to 'weighed' after weighbridge")
                success_count += 1
            else:
                self.log(f"❌ Gate Entry status not updated. Current: {gate_entry.get('status') if gate_entry else 'N/A'}", "ERROR")
        
        # Test 2: Verify Weighbridge linked to correct Gate Entry
        if "weighbridge_id" in self.test_data:
            weighbridge_entry = self.test_api_endpoint("GET", f"/weighbridge/entry/{self.test_data['gate_entry_id']}")
            if weighbridge_entry and weighbridge_entry.get("_id") == self.test_data["weighbridge_id"]:
                self.log("✅ Weighbridge correctly linked to Gate Entry")
                success_count += 1
            else:
                self.log("❌ Weighbridge not properly linked to Gate Entry", "ERROR")
        
        self.log(f"Data Linking: {success_count}/{total_tests} tests passed")
        return success_count == total_tests
        
    def run_complete_workflow_test(self):
        """Run the complete Phase 1 workflow test"""
        self.log("🚀 Starting Steel Plant App - Complete Phase 1 Workflow Test")
        self.log(f"Backend URL: {self.base_url}")
        self.log("=" * 80)
        
        # Track overall success
        workflow_steps = []
        
        # Step 1: Create Purchase Order
        step1_success = self.step_1_create_purchase_order()
        workflow_steps.append(("Create Purchase Order", step1_success))
        
        if not step1_success:
            self.log("❌ Workflow FAILED at Step 1", "ERROR")
            return False
            
        # Step 2: Create Gate Entry
        step2_success = self.step_2_create_gate_entry()
        workflow_steps.append(("Create Gate Entry", step2_success))
        
        if not step2_success:
            self.log("❌ Workflow FAILED at Step 2", "ERROR")
            return False
            
        # Step 3: Create Weighbridge Entry
        step3_success = self.step_3_create_weighbridge_entry()
        workflow_steps.append(("Create Weighbridge Entry", step3_success))
        
        if not step3_success:
            self.log("❌ Workflow FAILED at Step 3", "ERROR")
            return False
            
        # Step 4: Create Quality Inspection
        step4_success = self.step_4_create_quality_inspection()
        workflow_steps.append(("Create Quality Inspection", step4_success))
        
        if not step4_success:
            self.log("❌ Workflow FAILED at Step 4", "ERROR")
            return False
            
        # Step 5: Verify Reports
        step5_success = self.step_5_verify_reports()
        workflow_steps.append(("Verify Reports", step5_success))
        
        # Additional: Test Data Linking
        linking_success = self.test_data_linking()
        workflow_steps.append(("Data Linking", linking_success))
        
        # Final Results
        self.log("=" * 80)
        self.log("WORKFLOW TEST RESULTS")
        self.log("=" * 80)
        
        for step_name, success in workflow_steps:
            status = "✅ PASS" if success else "❌ FAIL"
            self.log(f"{step_name}: {status}")
            
        all_success = all(success for _, success in workflow_steps)
        
        if all_success:
            self.log("🎉 COMPLETE WORKFLOW TEST: ✅ SUCCESS")
            self.log("All steps completed successfully!")
            self.log(f"Test Data Summary:")
            for key, value in self.test_data.items():
                self.log(f"  {key}: {value}")
        else:
            self.log("💥 COMPLETE WORKFLOW TEST: ❌ FAILED")
            self.log("One or more steps failed!")
            
        return all_success

def main():
    """Main test execution"""
    tester = SteelPlantWorkflowTest()
    success = tester.run_complete_workflow_test()
    
    if success:
        print("\n🎉 All tests passed! Steel Plant Phase 1 workflow is working correctly.")
        sys.exit(0)
    else:
        print("\n💥 Some tests failed! Check the logs above for details.")
        sys.exit(1)

if __name__ == "__main__":
    main()