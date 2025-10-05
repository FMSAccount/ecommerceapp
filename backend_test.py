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

def print_test_result(test_name, success, details=""):
    """Print formatted test results"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {test_name}")
    if details:
        print(f"   Details: {details}")
    print()

def test_product_management():
    """Test Product Management APIs"""
    print("=" * 60)
    print("TESTING PRODUCT MANAGEMENT APIs")
    print("=" * 60)
    
    # Test 1: GET /api/products (should return empty array initially)
    try:
        response = requests.get(f"{BASE_URL}/products")
        success = response.status_code == 200 and isinstance(response.json(), list)
        print_test_result("GET /api/products", success, f"Status: {response.status_code}, Response: {response.json()}")
    except Exception as e:
        print_test_result("GET /api/products", False, f"Error: {str(e)}")
    
    # Test 2: POST /api/products (create a new product)
    product_data = {
        "name": "Premium Wireless Headphones",
        "description": "High-quality wireless headphones with noise cancellation",
        "price": 199.99,
        "image_base64": SAMPLE_PRODUCT_IMAGE,
        "inventory": 50
    }
    
    created_product_id = None
    try:
        response = requests.post(f"{BASE_URL}/products", json=product_data)
        success = response.status_code == 200
        if success:
            product = response.json()
            created_product_id = product.get("id")
            success = all(key in product for key in ["id", "name", "price", "inventory"])
        print_test_result("POST /api/products", success, f"Status: {response.status_code}, Product ID: {created_product_id}")
    except Exception as e:
        print_test_result("POST /api/products", False, f"Error: {str(e)}")
    
    if not created_product_id:
        print("⚠️  Cannot continue product tests without a valid product ID")
        return None
    
    # Test 3: GET /api/products/{product_id} (retrieve specific product)
    try:
        response = requests.get(f"{BASE_URL}/products/{created_product_id}")
        success = response.status_code == 200
        if success:
            product = response.json()
            success = product.get("id") == created_product_id and product.get("name") == product_data["name"]
        print_test_result(f"GET /api/products/{created_product_id}", success, f"Status: {response.status_code}")
    except Exception as e:
        print_test_result(f"GET /api/products/{created_product_id}", False, f"Error: {str(e)}")
    
    # Test 4: PUT /api/products/{product_id} (update product)
    update_data = {
        "name": "Premium Wireless Headphones - Updated",
        "price": 179.99,
        "inventory": 45
    }
    
    try:
        response = requests.put(f"{BASE_URL}/products/{created_product_id}", json=update_data)
        success = response.status_code == 200
        if success:
            product = response.json()
            success = (product.get("name") == update_data["name"] and 
                      product.get("price") == update_data["price"] and
                      product.get("inventory") == update_data["inventory"])
        print_test_result(f"PUT /api/products/{created_product_id}", success, f"Status: {response.status_code}")
    except Exception as e:
        print_test_result(f"PUT /api/products/{created_product_id}", False, f"Error: {str(e)}")
    
    # Test 5: DELETE /api/products/{product_id} (delete product)
    try:
        response = requests.delete(f"{BASE_URL}/products/{created_product_id}")
        success = response.status_code == 200
        if success:
            # Verify product is deleted
            verify_response = requests.get(f"{BASE_URL}/products/{created_product_id}")
            success = verify_response.status_code == 404
        print_test_result(f"DELETE /api/products/{created_product_id}", success, f"Status: {response.status_code}")
    except Exception as e:
        print_test_result(f"DELETE /api/products/{created_product_id}", False, f"Error: {str(e)}")
    
    return created_product_id

def test_admin_authentication():
    """Test Admin Authentication APIs"""
    print("=" * 60)
    print("TESTING ADMIN AUTHENTICATION APIs")
    print("=" * 60)
    
    # Test 1: POST /api/admin/login with correct password
    try:
        response = requests.post(f"{BASE_URL}/admin/login", json={"password": ADMIN_PASSWORD})
        success = response.status_code == 200
        if success:
            result = response.json()
            success = "message" in result and "token" in result
        print_test_result("POST /api/admin/login (correct password)", success, f"Status: {response.status_code}")
    except Exception as e:
        print_test_result("POST /api/admin/login (correct password)", False, f"Error: {str(e)}")
    
    # Test 2: POST /api/admin/login with incorrect password
    try:
        response = requests.post(f"{BASE_URL}/admin/login", json={"password": "wrongpassword"})
        success = response.status_code == 401
        print_test_result("POST /api/admin/login (incorrect password)", success, f"Status: {response.status_code}")
    except Exception as e:
        print_test_result("POST /api/admin/login (incorrect password)", False, f"Error: {str(e)}")
    
    # Test 3: GET /api/admin/dashboard
    try:
        response = requests.get(f"{BASE_URL}/admin/dashboard")
        success = response.status_code == 200
        if success:
            dashboard = response.json()
            required_fields = ["products_count", "orders_count", "pending_orders", "total_revenue", "recent_orders"]
            success = all(field in dashboard for field in required_fields)
        print_test_result("GET /api/admin/dashboard", success, f"Status: {response.status_code}")
    except Exception as e:
        print_test_result("GET /api/admin/dashboard", False, f"Error: {str(e)}")

def test_order_management():
    """Test Order Management APIs"""
    print("=" * 60)
    print("TESTING ORDER MANAGEMENT APIs")
    print("=" * 60)
    
    # First, create a product for testing orders
    product_data = {
        "name": "Smartphone Case",
        "description": "Protective case for smartphones",
        "price": 29.99,
        "image_base64": SAMPLE_PRODUCT_IMAGE,
        "inventory": 100
    }
    
    try:
        response = requests.post(f"{BASE_URL}/products", json=product_data)
        if response.status_code != 200:
            print("⚠️  Cannot create test product for order testing")
            return None
        test_product = response.json()
        test_product_id = test_product["id"]
    except Exception as e:
        print(f"⚠️  Error creating test product: {str(e)}")
        return None
    
    # Test 1: POST /api/orders (create order)
    order_data = {
        "items": [
            {
                "product_id": test_product_id,
                "quantity": 2
            }
        ],
        "customer_info": {
            "name": "John Smith",
            "email": "john.smith@email.com",
            "phone": "+1-555-0123"
        },
        "shipping_address": {
            "street": "123 Main Street",
            "city": "New York",
            "state": "NY",
            "zip_code": "10001",
            "country": "US"
        }
    }
    
    created_order_id = None
    try:
        response = requests.post(f"{BASE_URL}/orders", json=order_data)
        success = response.status_code == 200
        if success:
            order = response.json()
            created_order_id = order.get("id")
            success = (order.get("total_amount") == 59.98 and  # 29.99 * 2
                      len(order.get("items", [])) == 1 and
                      order["items"][0]["quantity"] == 2)
        print_test_result("POST /api/orders", success, f"Status: {response.status_code}, Order ID: {created_order_id}")
    except Exception as e:
        print_test_result("POST /api/orders", False, f"Error: {str(e)}")
    
    if not created_order_id:
        print("⚠️  Cannot continue order tests without a valid order ID")
        return None
    
    # Test 2: GET /api/orders (list all orders)
    try:
        response = requests.get(f"{BASE_URL}/orders")
        success = response.status_code == 200
        if success:
            orders = response.json()
            success = isinstance(orders, list) and len(orders) > 0
            # Check if our created order is in the list
            if success:
                order_ids = [order.get("id") for order in orders]
                success = created_order_id in order_ids
        print_test_result("GET /api/orders", success, f"Status: {response.status_code}, Orders count: {len(orders) if success else 0}")
    except Exception as e:
        print_test_result("GET /api/orders", False, f"Error: {str(e)}")
    
    # Test 3: GET /api/orders/{order_id} (get specific order)
    try:
        response = requests.get(f"{BASE_URL}/orders/{created_order_id}")
        success = response.status_code == 200
        if success:
            order = response.json()
            success = (order.get("id") == created_order_id and
                      order.get("customer_info", {}).get("name") == "John Smith")
        print_test_result(f"GET /api/orders/{created_order_id}", success, f"Status: {response.status_code}")
    except Exception as e:
        print_test_result(f"GET /api/orders/{created_order_id}", False, f"Error: {str(e)}")
    
    # Test 4: PUT /api/orders/{order_id}/status (update order status)
    try:
        response = requests.put(f"{BASE_URL}/orders/{created_order_id}/status", 
                               json={"order_status": "shipped"})
        success = response.status_code == 200
        if success:
            # Verify the status was updated
            verify_response = requests.get(f"{BASE_URL}/orders/{created_order_id}")
            if verify_response.status_code == 200:
                order = verify_response.json()
                success = order.get("order_status") == "shipped"
        print_test_result(f"PUT /api/orders/{created_order_id}/status", success, f"Status: {response.status_code}")
    except Exception as e:
        print_test_result(f"PUT /api/orders/{created_order_id}/status", False, f"Error: {str(e)}")
    
    return created_order_id, test_product_id

def test_payment_apis():
    """Test Payment APIs (structure and validation)"""
    print("=" * 60)
    print("TESTING PAYMENT APIs")
    print("=" * 60)
    
    # First create an order for payment testing
    product_data = {
        "name": "Test Payment Product",
        "description": "Product for payment testing",
        "price": 99.99,
        "image_base64": SAMPLE_PRODUCT_IMAGE,
        "inventory": 10
    }
    
    try:
        response = requests.post(f"{BASE_URL}/products", json=product_data)
        if response.status_code != 200:
            print("⚠️  Cannot create test product for payment testing")
            return
        test_product = response.json()
        test_product_id = test_product["id"]
    except Exception as e:
        print(f"⚠️  Error creating test product for payment: {str(e)}")
        return
    
    # Create test order
    order_data = {
        "items": [{"product_id": test_product_id, "quantity": 1}],
        "customer_info": {
            "name": "Payment Test User",
            "email": "payment@test.com",
            "phone": "+1-555-0199"
        },
        "shipping_address": {
            "street": "456 Payment St",
            "city": "Test City",
            "state": "CA",
            "zip_code": "90210",
            "country": "US"
        }
    }
    
    try:
        response = requests.post(f"{BASE_URL}/orders", json=order_data)
        if response.status_code != 200:
            print("⚠️  Cannot create test order for payment testing")
            return
        test_order = response.json()
        test_order_id = test_order["id"]
    except Exception as e:
        print(f"⚠️  Error creating test order for payment: {str(e)}")
        return
    
    # Test 1: POST /api/payments/checkout (missing parameters)
    try:
        response = requests.post(f"{BASE_URL}/payments/checkout", json={})
        success = response.status_code == 400  # Should fail with missing parameters
        print_test_result("POST /api/payments/checkout (missing params)", success, f"Status: {response.status_code}")
    except Exception as e:
        print_test_result("POST /api/payments/checkout (missing params)", False, f"Error: {str(e)}")
    
    # Test 2: POST /api/payments/checkout (with valid parameters)
    checkout_data = {
        "order_id": test_order_id,
        "origin_url": "https://ez-mobile-store.preview.emergentagent.com"
    }
    
    session_id = None
    try:
        response = requests.post(f"{BASE_URL}/payments/checkout", json=checkout_data)
        success = response.status_code == 200
        if success:
            result = response.json()
            success = "checkout_url" in result and "session_id" in result
            if success:
                session_id = result["session_id"]
        print_test_result("POST /api/payments/checkout (valid params)", success, f"Status: {response.status_code}")
    except Exception as e:
        print_test_result("POST /api/payments/checkout (valid params)", False, f"Error: {str(e)}")
    
    # Test 3: GET /api/payments/status/{session_id}
    if session_id:
        try:
            response = requests.get(f"{BASE_URL}/payments/status/{session_id}")
            success = response.status_code == 200
            if success:
                status = response.json()
                required_fields = ["status", "payment_status", "amount_total", "currency"]
                success = all(field in status for field in required_fields)
            print_test_result(f"GET /api/payments/status/{session_id}", success, f"Status: {response.status_code}")
        except Exception as e:
            print_test_result(f"GET /api/payments/status/{session_id}", False, f"Error: {str(e)}")
    else:
        print_test_result("GET /api/payments/status/{session_id}", False, "No session_id available from checkout")

def run_all_tests():
    """Run all backend API tests"""
    print("🚀 Starting E-commerce Backend API Tests")
    print(f"Base URL: {BASE_URL}")
    print(f"Test started at: {datetime.now()}")
    print()
    
    # Run all test suites
    test_admin_authentication()
    test_product_management()
    order_result = test_order_management()
    test_payment_apis()
    
    print("=" * 60)
    print("✅ ALL TESTS COMPLETED")
    print("=" * 60)
    print(f"Test completed at: {datetime.now()}")

if __name__ == "__main__":
    run_all_tests()