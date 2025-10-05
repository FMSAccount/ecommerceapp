from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Stripe setup
stripe_api_key = os.environ.get('STRIPE_API_KEY')

# Create the main app
app = FastAPI(title="E-commerce API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Data Models
class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    image_base64: str
    inventory: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    image_base64: str
    inventory: int = Field(default=0)

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    image_base64: Optional[str] = None
    inventory: Optional[int] = None

class CartItem(BaseModel):
    product_id: str
    quantity: int

class CustomerInfo(BaseModel):
    name: str
    email: str
    phone: str

class ShippingAddress(BaseModel):
    street: str
    city: str
    state: str
    zip_code: str
    country: str = Field(default="US")

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    items: List[Dict[str, Any]]  # Product details with quantities
    customer_info: CustomerInfo
    shipping_address: ShippingAddress
    total_amount: float
    payment_status: str = Field(default="pending")
    order_status: str = Field(default="processing")
    stripe_session_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class OrderCreate(BaseModel):
    items: List[CartItem]
    customer_info: CustomerInfo
    shipping_address: ShippingAddress

class PaymentTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    amount: float
    currency: str = Field(default="usd")
    payment_status: str = Field(default="pending")
    order_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AdminAuth(BaseModel):
    password: str

# Simple admin password (you can enhance this later)
ADMIN_PASSWORD = "admin123"

# Product endpoints
@api_router.get("/products", response_model=List[Product])
async def get_products():
    """Get all products"""
    try:
        products = await db.products.find().to_list(1000)
        return [Product(**product) for product in products]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching products: {str(e)}")

@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate):
    """Create a new product (Admin only)"""
    try:
        product_dict = product_data.dict()
        product = Product(**product_dict)
        await db.products.insert_one(product.dict())
        return product
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating product: {str(e)}")

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    """Get a specific product"""
    try:
        product = await db.products.find_one({"id": product_id})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return Product(**product)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching product: {str(e)}")

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_update: ProductUpdate):
    """Update a product (Admin only)"""
    try:
        # Check if product exists
        existing_product = await db.products.find_one({"id": product_id})
        if not existing_product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Update only provided fields
        update_data = {k: v for k, v in product_update.dict().items() if v is not None}
        if update_data:
            await db.products.update_one({"id": product_id}, {"$set": update_data})
        
        # Return updated product
        updated_product = await db.products.find_one({"id": product_id})
        return Product(**updated_product)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating product: {str(e)}")

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    """Delete a product (Admin only)"""
    try:
        result = await db.products.delete_one({"id": product_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
        return {"message": "Product deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting product: {str(e)}")

# Order endpoints
@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate):
    """Create a new order"""
    try:
        # Get product details and calculate total
        total_amount = 0.0
        order_items = []
        
        for item in order_data.items:
            product = await db.products.find_one({"id": item.product_id})
            if not product:
                raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
            
            if product["inventory"] < item.quantity:
                raise HTTPException(status_code=400, detail=f"Insufficient inventory for product {product['name']}")
            
            item_total = product["price"] * item.quantity
            total_amount += item_total
            
            order_items.append({
                "product_id": item.product_id,
                "name": product["name"],
                "price": product["price"],
                "quantity": item.quantity,
                "total": item_total
            })
        
        # Create order
        order_dict = order_data.dict()
        order_dict["items"] = order_items
        order_dict["total_amount"] = total_amount
        order = Order(**order_dict)
        
        await db.orders.insert_one(order.dict())
        return order
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating order: {str(e)}")

@api_router.get("/orders", response_model=List[Order])
async def get_orders():
    """Get all orders (Admin only)"""
    try:
        orders = await db.orders.find().sort("created_at", -1).to_list(1000)
        return [Order(**order) for order in orders]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching orders: {str(e)}")

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    """Get a specific order"""
    try:
        order = await db.orders.find_one({"id": order_id})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        return Order(**order)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching order: {str(e)}")

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status_update: Dict[str, str]):
    """Update order status (Admin only)"""
    try:
        new_status = status_update.get("order_status")
        if not new_status:
            raise HTTPException(status_code=400, detail="order_status is required")
        
        result = await db.orders.update_one(
            {"id": order_id}, 
            {"$set": {"order_status": new_status}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Order not found")
        
        return {"message": "Order status updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating order status: {str(e)}")

# Payment endpoints
@api_router.post("/payments/checkout")
async def create_checkout_session(request: Request):
    """Create Stripe checkout session"""
    try:
        body = await request.json()
        order_id = body.get("order_id")
        origin_url = body.get("origin_url")
        
        if not order_id or not origin_url:
            raise HTTPException(status_code=400, detail="order_id and origin_url are required")
        
        # Get order details
        order = await db.orders.find_one({"id": order_id})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Initialize Stripe checkout
        host_url = origin_url
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
        
        # Create checkout session
        success_url = f"{origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin_url}/payment-cancel"
        
        checkout_request = CheckoutSessionRequest(
            amount=order["total_amount"],
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "order_id": order_id,
                "source": "mobile_checkout"
            }
        )
        
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create payment transaction record
        payment_transaction = PaymentTransaction(
            session_id=session.session_id,
            amount=order["total_amount"],
            currency="usd",
            order_id=order_id,
            metadata=checkout_request.metadata
        )
        await db.payment_transactions.insert_one(payment_transaction.dict())
        
        # Update order with session ID
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {"stripe_session_id": session.session_id}}
        )
        
        return {"checkout_url": session.url, "session_id": session.session_id}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating checkout session: {str(e)}")

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str):
    """Get payment status"""
    try:
        # Initialize Stripe checkout
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
        
        # Get checkout status from Stripe
        checkout_status = await stripe_checkout.get_checkout_status(session_id)
        
        # Update payment transaction
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": checkout_status.payment_status}}
        )
        
        # If payment is successful, update order and inventory
        if checkout_status.payment_status == "paid":
            # Get payment transaction to find order ID
            payment_transaction = await db.payment_transactions.find_one({"session_id": session_id})
            if payment_transaction:
                order_id = payment_transaction.get("order_id")
                if order_id:
                    # Update order payment status
                    await db.orders.update_one(
                        {"id": order_id},
                        {"$set": {"payment_status": "paid", "order_status": "confirmed"}}
                    )
                    
                    # Update inventory
                    order = await db.orders.find_one({"id": order_id})
                    if order:
                        for item in order["items"]:
                            await db.products.update_one(
                                {"id": item["product_id"]},
                                {"$inc": {"inventory": -item["quantity"]}}
                            )
        
        return {
            "status": checkout_status.status,
            "payment_status": checkout_status.payment_status,
            "amount_total": checkout_status.amount_total,
            "currency": checkout_status.currency
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking payment status: {str(e)}")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    try:
        body = await request.body()
        stripe_signature = request.headers.get("Stripe-Signature")
        
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
        webhook_response = await stripe_checkout.handle_webhook(body, stripe_signature)
        
        # Update payment transaction based on webhook
        if webhook_response.event_type in ["checkout.session.completed", "payment_intent.succeeded"]:
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {"$set": {"payment_status": webhook_response.payment_status}}
            )
        
        return {"received": True}
        
    except Exception as e:
        logging.error(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=400, detail="Webhook error")

# Admin endpoints
@api_router.post("/admin/login")
async def admin_login(auth: AdminAuth):
    """Admin login"""
    if auth.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {"message": "Login successful", "token": "admin_authenticated"}

@api_router.get("/admin/dashboard")
async def admin_dashboard():
    """Get admin dashboard data"""
    try:
        # Get counts
        products_count = await db.products.count_documents({})
        orders_count = await db.orders.count_documents({})
        pending_orders = await db.orders.count_documents({"order_status": "processing"})
        
        # Get recent orders
        recent_orders = await db.orders.find().sort("created_at", -1).limit(5).to_list(5)
        
        # Calculate total revenue
        pipeline = [
            {"$match": {"payment_status": "paid"}},
            {"$group": {"_id": None, "total_revenue": {"$sum": "$total_amount"}}}
        ]
        revenue_result = await db.orders.aggregate(pipeline).to_list(1)
        total_revenue = revenue_result[0]["total_revenue"] if revenue_result else 0.0
        
        return {
            "products_count": products_count,
            "orders_count": orders_count,
            "pending_orders": pending_orders,
            "total_revenue": total_revenue,
            "recent_orders": [Order(**order) for order in recent_orders]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dashboard data: {str(e)}")

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