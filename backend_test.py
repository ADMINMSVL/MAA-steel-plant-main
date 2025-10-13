#!/usr/bin/env python3
"""
Backend API Testing for Steel Plant Processing App
Tests authentication, dashboard, gate entry, and weighbridge APIs
"""

import requests
import json
import base64
from datetime import datetime
import sys

# Base URL from frontend environment
BASE_URL = "https://plantproc-mobile.preview.emergentagent.com/api"

# Test data
TEST_USER = {
    "username": "test_operator",
    "pin": "1234", 
    "role": "gate_operator"
}

# Small test image in base64 (1x1 pixel PNG)
TEST_IMAGE_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

def print_test_result(test_name, success, message="", response_data=None):
    """Print formatted test results"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {test_name}")
    if message:
        print(f"   {message}")
    if response_data and not success:
        print(f"   Response: {response_data}")
    print()

def test_auth_register():
    """Test user registration"""
    print("=== Testing Authentication - Register ===")
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=TEST_USER, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print_test_result("User Registration", True, f"User ID: {data.get('user_id')}")
            return True, data.get('user_id')
        elif response.status_code == 400 and "already exists" in response.text:
            print_test_result("User Registration", True, "User already exists (expected)")
            return True, None
        else:
            print_test_result("User Registration", False, f"Status: {response.status_code}", response.text)
            return False, None
            
    except Exception as e:
        print_test_result("User Registration", False, f"Error: {str(e)}")
        return False, None

def test_auth_login():
    """Test user login"""
    print("=== Testing Authentication - Login ===")
    
    try:
        login_data = {
            "username": TEST_USER["username"],
            "pin": TEST_USER["pin"]
        }
        
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            user_info = data.get('user', {})
            print_test_result("User Login", True, f"Logged in as: {user_info.get('username')} ({user_info.get('role')})")
            return True, user_info.get('id')
        else:
            print_test_result("User Login", False, f"Status: {response.status_code}", response.text)
            return False, None
            
    except Exception as e:
        print_test_result("User Login", False, f"Error: {str(e)}")
        return False, None

def test_get_users():
    """Test getting all users"""
    print("=== Testing Authentication - Get Users ===")
    
    try:
        response = requests.get(f"{BASE_URL}/users", timeout=10)
        
        if response.status_code == 200:
            users = response.json()
            print_test_result("Get Users", True, f"Retrieved {len(users)} users")
            return True
        else:
            print_test_result("Get Users", False, f"Status: {response.status_code}", response.text)
            return False
            
    except Exception as e:
        print_test_result("Get Users", False, f"Error: {str(e)}")
        return False

def test_dashboard_stats():
    """Test dashboard statistics"""
    print("=== Testing Dashboard - Stats ===")
    
    try:
        response = requests.get(f"{BASE_URL}/dashboard/stats", timeout=10)
        
        if response.status_code == 200:
            stats = response.json()
            print_test_result("Dashboard Stats", True, f"Stats: {json.dumps(stats, indent=2)}")
            return True
        else:
            print_test_result("Dashboard Stats", False, f"Status: {response.status_code}", response.text)
            return False
            
    except Exception as e:
        print_test_result("Dashboard Stats", False, f"Error: {str(e)}")
        return False

def test_create_gate_entry(operator_id):
    """Test creating gate entry"""
    print("=== Testing Gate Entry - Create ===")
    
    try:
        gate_entry_data = {
            "vehicle_number": "MH12AB1234",
            "driver_name": "Rajesh Kumar",
            "driver_phone": "9876543210",
            "material_type": "Iron Ore",
            "supplier": "ABC Mining Ltd",
            "operator_id": operator_id or "test_operator_id"
        }
        
        response = requests.post(f"{BASE_URL}/gate-entry", json=gate_entry_data, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            entry_id = data.get('entry_id')
            print_test_result("Create Gate Entry", True, f"Entry ID: {entry_id}")
            return True, entry_id
        else:
            print_test_result("Create Gate Entry", False, f"Status: {response.status_code}", response.text)
            return False, None
            
    except Exception as e:
        print_test_result("Create Gate Entry", False, f"Error: {str(e)}")
        return False, None

def test_get_gate_entries():
    """Test getting all gate entries"""
    print("=== Testing Gate Entry - Get All ===")
    
    try:
        response = requests.get(f"{BASE_URL}/gate-entry", timeout=10)
        
        if response.status_code == 200:
            entries = response.json()
            print_test_result("Get Gate Entries", True, f"Retrieved {len(entries)} entries")
            return True
        else:
            print_test_result("Get Gate Entries", False, f"Status: {response.status_code}", response.text)
            return False
            
    except Exception as e:
        print_test_result("Get Gate Entries", False, f"Error: {str(e)}")
        return False

def test_create_weighbridge_entry(gate_entry_id, operator_id):
    """Test creating weighbridge entry"""
    print("=== Testing Weighbridge - Create ===")
    
    if not gate_entry_id:
        print_test_result("Create Weighbridge Entry", False, "No gate entry ID available")
        return False, None
    
    try:
        weighbridge_data = {
            "gate_entry_id": gate_entry_id,
            "weight_image": TEST_IMAGE_BASE64,
            "operator_id": operator_id or "test_operator_id"
        }
        
        response = requests.post(f"{BASE_URL}/weighbridge", json=weighbridge_data, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            weighbridge_id = data.get('weighbridge_id')
            extracted_weight = data.get('extracted_weight')
            print_test_result("Create Weighbridge Entry", True, 
                            f"Entry ID: {weighbridge_id}, Extracted Weight: {extracted_weight}")
            return True, weighbridge_id
        else:
            print_test_result("Create Weighbridge Entry", False, f"Status: {response.status_code}", response.text)
            return False, None
            
    except Exception as e:
        print_test_result("Create Weighbridge Entry", False, f"Error: {str(e)}")
        return False, None

def test_get_weighbridge_entries():
    """Test getting all weighbridge entries"""
    print("=== Testing Weighbridge - Get All ===")
    
    try:
        response = requests.get(f"{BASE_URL}/weighbridge", timeout=10)
        
        if response.status_code == 200:
            entries = response.json()
            print_test_result("Get Weighbridge Entries", True, f"Retrieved {len(entries)} entries")
            return True
        else:
            print_test_result("Get Weighbridge Entries", False, f"Status: {response.status_code}", response.text)
            return False
            
    except Exception as e:
        print_test_result("Get Weighbridge Entries", False, f"Error: {str(e)}")
        return False

def main():
    """Run all backend tests"""
    print("🚀 Starting Steel Plant Backend API Tests")
    print(f"Base URL: {BASE_URL}")
    print("=" * 60)
    
    # Track test results
    results = {
        "auth_register": False,
        "auth_login": False,
        "get_users": False,
        "dashboard_stats": False,
        "create_gate_entry": False,
        "get_gate_entries": False,
        "create_weighbridge": False,
        "get_weighbridge": False
    }
    
    # Test Authentication APIs
    success, user_id = test_auth_register()
    results["auth_register"] = success
    
    success, operator_id = test_auth_login()
    results["auth_login"] = success
    
    success = test_get_users()
    results["get_users"] = success
    
    # Test Dashboard API
    success = test_dashboard_stats()
    results["dashboard_stats"] = success
    
    # Test Gate Entry APIs
    success, gate_entry_id = test_create_gate_entry(operator_id)
    results["create_gate_entry"] = success
    
    success = test_get_gate_entries()
    results["get_gate_entries"] = success
    
    # Test Weighbridge APIs
    success, weighbridge_id = test_create_weighbridge_entry(gate_entry_id, operator_id)
    results["create_weighbridge"] = success
    
    success = test_get_weighbridge_entries()
    results["get_weighbridge"] = success
    
    # Summary
    print("=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed - check logs above")
        return 1

if __name__ == "__main__":
    sys.exit(main())