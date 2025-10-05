import { create } from 'zustand';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_base64: string;
  inventory: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartStore {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, newQuantity: number) => void;
  getCartTotal: () => number;
  getCartItemCount: () => number;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>((set, get) => ({
  cart: [],

  addToCart: (product: Product) => {
    set((state) => {
      const existingItem = state.cart.find(item => item.product.id === product.id);
      
      if (existingItem) {
        if (existingItem.quantity >= product.inventory) {
          return state; // Don't add if exceeds inventory
        }
        return {
          cart: state.cart.map(item =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        };
      } else {
        if (product.inventory === 0) {
          return state; // Don't add if out of stock
        }
        return {
          cart: [...state.cart, { product, quantity: 1 }]
        };
      }
    });
  },

  removeFromCart: (productId: string) => {
    set((state) => ({
      cart: state.cart.filter(item => item.product.id !== productId)
    }));
  },

  updateCartQuantity: (productId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      get().removeFromCart(productId);
      return;
    }

    set((state) => {
      const product = state.cart.find(item => item.product.id === productId)?.product;
      if (product && newQuantity > product.inventory) {
        return state; // Don't update if exceeds inventory
      }

      return {
        cart: state.cart.map(item =>
          item.product.id === productId
            ? { ...item, quantity: newQuantity }
            : item
        )
      };
    });
  },

  getCartTotal: () => {
    const { cart } = get();
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  },

  getCartItemCount: () => {
    const { cart } = get();
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  },

  clearCart: () => {
    set({ cart: [] });
  },
}));