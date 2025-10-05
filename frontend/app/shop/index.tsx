import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useCartStore, type Product } from '../../stores/cartStore';

export default function Shop() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Use cart store
  const { addToCart, getCartTotal, getCartItemCount } = useCartStore();
  const cartTotal = getCartTotal();
  const cartItemCount = getCartItemCount();

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/products`);
      if (response.ok) {
        const productsData = await response.json();
        setProducts(productsData);
      } else {
        Alert.alert('Error', 'Failed to load products');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error while loading products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    try {
      addToCart(product);
      // Show success feedback (optional)
    } catch (error) {
      if (product.inventory === 0) {
        Alert.alert('Out of Stock', 'This item is currently out of stock.');
      } else {
        Alert.alert('Stock Limit', 'Cannot add more items. Stock limit reached.');
      }
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <Image 
        source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }}
        style={styles.productImage}
        resizeMode="cover"
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productDescription} numberOfLines={3}>{item.description}</Text>
        <View style={styles.productFooter}>
          <View>
            <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
            <Text style={styles.productStock}>Stock: {item.inventory}</Text>
          </View>
          <TouchableOpacity 
            style={[
              styles.addButton, 
              item.inventory === 0 && styles.addButtonDisabled
            ]}
            onPress={() => addToCart(item)}
            disabled={item.inventory === 0}
          >
            <Ionicons 
              name="add" 
              size={20} 
              color={item.inventory === 0 ? '#94a3b8' : 'white'} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>Shop</Text>
        <TouchableOpacity 
          style={styles.cartButton}
          onPress={() => router.push('/shop/cart')}
        >
          <Ionicons name="bag" size={24} color="#1e293b" />
          {cartItemCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="storefront-outline" size={64} color="#94a3b8" />
          <Text style={styles.emptyTitle}>No Products Available</Text>
          <Text style={styles.emptySubtitle}>
            The store owner hasn't added any products yet.
          </Text>
        </View>
      ) : (
        <View style={styles.productsContainer}>
          <FlashList
            data={products}
            renderItem={renderProduct}
            numColumns={2}
            estimatedItemSize={280}
            contentContainerStyle={styles.productsList}
          />
        </View>
      )}

      {cart.length > 0 && (
        <TouchableOpacity 
          style={styles.checkoutButton}
          onPress={() => router.push('/shop/cart')}
        >
          <View style={styles.checkoutButtonContent}>
            <Text style={styles.checkoutButtonText}>
              View Cart ({getCartItemCount()})
            </Text>
            <Text style={styles.checkoutButtonPrice}>
              ${cartTotal.toFixed(2)}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
  },
  cartButton: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  productsContainer: {
    flex: 1,
  },
  productsList: {
    padding: 16,
  },
  productCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 120,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 12,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  productStock: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#2563eb',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#e2e8f0',
  },
  checkoutButton: {
    backgroundColor: '#2563eb',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  checkoutButtonPrice: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
});