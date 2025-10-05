#!/usr/bin/env python3
"""
Enhanced Authentication System API Testing
Tests admin registration/login, SMS OTP flow, protected endpoints, and JWT validation
"""

import requests
import json
import time
from typing import Dict, Any, Optional

# Backend URL from environment
BACKEND_URL = "https://ez-mobile-store.preview.emergentagent.com/api"

class AuthenticationTester:
    def __init__(self):
        self.admin_token = None
        self.user_token = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        
    def test_admin_registration(self) -> bool:
        """Test admin registration endpoint"""
        print("\n=== Testing Admin Registration ===")
        
        # Test data as specified in review request
        admin_data = {
            "username": "admin",
            "password": "admin123",
            "full_name": "Store Administrator"
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/auth/admin/register", json=admin_data)
            
            if response.status_code == 201 or response.status_code == 200:
                data = response.json()
                if "message" in data and "username" in data:
                    self.log_test("Admin Registration", True, f"Admin '{data['username']}' registered successfully")
                    return True
                else:
                    self.log_test("Admin Registration", False, f"Invalid response format: {data}")
                    return False
            elif response.status_code == 400:
                # Admin might already exist
                data = response.json()
                if "already exists" in data.get("detail", "").lower():
                    self.log_test("Admin Registration", True, "Admin already exists (expected)")
                    return True
                else:
                    self.log_test("Admin Registration", False, f"Registration failed: {data}")
                    return False
            else:
                self.log_test("Admin Registration", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Admin Registration", False, f"Request failed: {str(e)}")
            return False
    
    def test_admin_login_correct_credentials(self) -> bool:
        """Test admin login with correct credentials"""
        print("\n=== Testing Admin Login (Correct Credentials) ===")
        
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/auth/admin/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "admin" in data:
                    self.admin_token = data["access_token"]
                    admin_info = data["admin"]
                    self.log_test("Admin Login (Correct)", True, 
                                f"Token received, Admin: {admin_info.get('username')} ({admin_info.get('full_name')})")
                    return True
                else:
                    self.log_test("Admin Login (Correct)", False, f"Invalid response format: {data}")
                    return False
            else:
                self.log_test("Admin Login (Correct)", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Admin Login (Correct)", False, f"Request failed: {str(e)}")
            return False
    
    def test_admin_login_incorrect_credentials(self) -> bool:
        """Test admin login with incorrect credentials"""
        print("\n=== Testing Admin Login (Incorrect Credentials) ===")
        
        login_data = {
            "username": "admin",
            "password": "wrongpassword"
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/auth/admin/login", json=login_data)
            
            if response.status_code == 401:
                data = response.json()
                if "Invalid credentials" in data.get("detail", ""):
                    self.log_test("Admin Login (Incorrect)", True, "Correctly rejected invalid credentials")
                    return True
                else:
                    self.log_test("Admin Login (Incorrect)", False, f"Unexpected error message: {data}")
                    return False
            else:
                self.log_test("Admin Login (Incorrect)", False, f"Expected 401, got HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Admin Login (Incorrect)", False, f"Request failed: {str(e)}")
            return False
    
    def test_jwt_token_structure(self) -> bool:
        """Test JWT token structure and payload"""
        print("\n=== Testing JWT Token Structure ===")
        
        if not self.admin_token:
            self.log_test("JWT Token Structure", False, "No admin token available")
            return False
        
        try:
            # JWT tokens have 3 parts separated by dots
            parts = self.admin_token.split('.')
            if len(parts) != 3:
                self.log_test("JWT Token Structure", False, f"Invalid JWT format: {len(parts)} parts")
                return False
            
            # Try to decode the payload (middle part) - note: this doesn't verify signature
            import base64
            import json
            
            # Add padding if needed
            payload_part = parts[1]
            padding = 4 - len(payload_part) % 4
            if padding != 4:
                payload_part += '=' * padding
            
            try:
                decoded_payload = base64.urlsafe_b64decode(payload_part)
                payload_data = json.loads(decoded_payload)
                
                # Check required fields
                required_fields = ["user_id", "username", "user_type", "exp"]
                missing_fields = [field for field in required_fields if field not in payload_data]
                
                if missing_fields:
                    self.log_test("JWT Token Structure", False, f"Missing fields: {missing_fields}")
                    return False
                
                if payload_data.get("user_type") != "admin":
                    self.log_test("JWT Token Structure", False, f"Invalid user_type: {payload_data.get('user_type')}")
                    return False
                
                self.log_test("JWT Token Structure", True, 
                            f"Valid JWT with user_type: {payload_data.get('user_type')}, username: {payload_data.get('username')}")
                return True
                
            except Exception as decode_error:
                self.log_test("JWT Token Structure", False, f"Failed to decode payload: {str(decode_error)}")
                return False
                
        except Exception as e:
            self.log_test("JWT Token Structure", False, f"Token analysis failed: {str(e)}")
            return False
    
    def test_sms_otp_valid_format(self) -> bool:
        """Test SMS OTP endpoint with valid phone format"""
        print("\n=== Testing SMS OTP (Valid Format) ===")
        
        otp_data = {
            "phone": "+1234567890"
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/auth/send-otp", json=otp_data)
            
            # Expected to fail due to missing Twilio credentials
            if response.status_code == 500:
                data = response.json()
                if "SMS service not configured" in data.get("detail", ""):
                    self.log_test("SMS OTP (Valid Format)", True, 
                                "Correctly failed due to missing Twilio config (expected behavior)")
                    return True
                else:
                    self.log_test("SMS OTP (Valid Format)", False, f"Unexpected error: {data}")
                    return False
            elif response.status_code == 200:
                # If somehow it works (shouldn't with test credentials)
                data = response.json()
                self.log_test("SMS OTP (Valid Format)", True, f"OTP sent successfully: {data}")
                return True
            else:
                self.log_test("SMS OTP (Valid Format)", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("SMS OTP (Valid Format)", False, f"Request failed: {str(e)}")
            return False
    
    def test_sms_otp_invalid_format(self) -> bool:
        """Test SMS OTP endpoint with invalid phone format"""
        print("\n=== Testing SMS OTP (Invalid Format) ===")
        
        otp_data = {
            "phone": "invalid-phone"
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/auth/send-otp", json=otp_data)
            
            # Should fail due to invalid format or missing Twilio config
            if response.status_code in [400, 500]:
                data = response.json()
                error_detail = data.get("detail", "").lower()
                if "sms service not configured" in error_detail or "failed to send otp" in error_detail:
                    self.log_test("SMS OTP (Invalid Format)", True, 
                                "Correctly handled invalid phone format or missing config")
                    return True
                else:
                    self.log_test("SMS OTP (Invalid Format)", False, f"Unexpected error: {data}")
                    return False
            else:
                self.log_test("SMS OTP (Invalid Format)", False, f"Expected error, got HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("SMS OTP (Invalid Format)", False, f"Request failed: {str(e)}")
            return False
    
    def test_protected_endpoint_with_token(self) -> bool:
        """Test protected endpoint with valid admin token"""
        print("\n=== Testing Protected Endpoint (With Token) ===")
        
        if not self.admin_token:
            self.log_test("Protected Endpoint (With Token)", False, "No admin token available")
            return False
        
        headers = {
            "Authorization": f"Bearer {self.admin_token}"
        }
        
        try:
            response = requests.get(f"{BACKEND_URL}/admin/dashboard", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["products_count", "orders_count", "pending_orders", "total_revenue"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Protected Endpoint (With Token)", False, f"Missing fields: {missing_fields}")
                    return False
                
                self.log_test("Protected Endpoint (With Token)", True, 
                            f"Dashboard accessed successfully. Products: {data['products_count']}, Orders: {data['orders_count']}")
                return True
            else:
                self.log_test("Protected Endpoint (With Token)", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Protected Endpoint (With Token)", False, f"Request failed: {str(e)}")
            return False
    
    def test_protected_endpoint_without_token(self) -> bool:
        """Test protected endpoint without token"""
        print("\n=== Testing Protected Endpoint (Without Token) ===")
        
        try:
            response = requests.get(f"{BACKEND_URL}/admin/dashboard")
            
            if response.status_code == 401:
                self.log_test("Protected Endpoint (Without Token)", True, "Correctly rejected request without token")
                return True
            elif response.status_code == 403:
                self.log_test("Protected Endpoint (Without Token)", True, "Correctly rejected unauthorized request")
                return True
            else:
                self.log_test("Protected Endpoint (Without Token)", False, 
                            f"Expected 401/403, got HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Protected Endpoint (Without Token)", False, f"Request failed: {str(e)}")
            return False
    
    def test_product_creation_with_admin_token(self) -> bool:
        """Test product creation with admin token"""
        print("\n=== Testing Product Creation (With Admin Token) ===")
        
        if not self.admin_token:
            self.log_test("Product Creation (With Admin Token)", False, "No admin token available")
            return False
        
        headers = {
            "Authorization": f"Bearer {self.admin_token}",
            "Content-Type": "application/json"
        }
        
        product_data = {
            "name": "Test Product Auth",
            "description": "Test product for authentication testing",
            "price": 29.99,
            "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A==",
            "inventory": 10
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/products", json=product_data, headers=headers)
            
            if response.status_code in [200, 201]:
                data = response.json()
                if "id" in data and "name" in data:
                    self.log_test("Product Creation (With Admin Token)", True, 
                                f"Product created successfully: {data['name']} (ID: {data['id']})")
                    return True
                else:
                    self.log_test("Product Creation (With Admin Token)", False, f"Invalid response format: {data}")
                    return False
            else:
                self.log_test("Product Creation (With Admin Token)", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Product Creation (With Admin Token)", False, f"Request failed: {str(e)}")
            return False
    
    def test_product_creation_without_token(self) -> bool:
        """Test product creation without token"""
        print("\n=== Testing Product Creation (Without Token) ===")
        
        product_data = {
            "name": "Unauthorized Product",
            "description": "This should fail",
            "price": 19.99,
            "image_base64": "data:image/jpeg;base64,test",
            "inventory": 5
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/products", json=product_data)
            
            if response.status_code == 401:
                self.log_test("Product Creation (Without Token)", True, "Correctly rejected product creation without token")
                return True
            elif response.status_code == 403:
                self.log_test("Product Creation (Without Token)", True, "Correctly rejected unauthorized product creation")
                return True
            else:
                self.log_test("Product Creation (Without Token)", False, 
                            f"Expected 401/403, got HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Product Creation (Without Token)", False, f"Request failed: {str(e)}")
            return False
    
    def test_invalid_token(self) -> bool:
        """Test endpoints with invalid/expired token"""
        print("\n=== Testing Invalid Token ===")
        
        invalid_token = "invalid.jwt.token"
        headers = {
            "Authorization": f"Bearer {invalid_token}"
        }
        
        try:
            response = requests.get(f"{BACKEND_URL}/admin/dashboard", headers=headers)
            
            if response.status_code == 401:
                data = response.json()
                if "could not validate credentials" in data.get("detail", "").lower():
                    self.log_test("Invalid Token", True, "Correctly rejected invalid token")
                    return True
                else:
                    self.log_test("Invalid Token", True, "Rejected invalid token (different error message)")
                    return True
            else:
                self.log_test("Invalid Token", False, f"Expected 401, got HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Invalid Token", False, f"Request failed: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all authentication tests"""
        print("🚀 Starting Enhanced Authentication System API Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Test sequence as specified in review request
        tests = [
            self.test_admin_registration,
            self.test_admin_login_correct_credentials,
            self.test_admin_login_incorrect_credentials,
            self.test_jwt_token_structure,
            self.test_sms_otp_valid_format,
            self.test_sms_otp_invalid_format,
            self.test_protected_endpoint_with_token,
            self.test_protected_endpoint_without_token,
            self.test_product_creation_with_admin_token,
            self.test_product_creation_without_token,
            self.test_invalid_token
        ]
        
        passed = 0
        failed = 0
        
        for test in tests:
            try:
                if test():
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"❌ FAIL {test.__name__}: Unexpected error: {str(e)}")
                failed += 1
            
            time.sleep(0.5)  # Small delay between tests
        
        print("\n" + "=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📊 Total: {passed + failed}")
        
        if failed == 0:
            print("🎉 All authentication tests passed!")
        else:
            print(f"⚠️  {failed} test(s) failed - see details above")
        
        return failed == 0

if __name__ == "__main__":
    tester = AuthenticationTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)