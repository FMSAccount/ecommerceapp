import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useForm, Controller } from 'react-hook-form';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_base64: string;
  inventory: number;
  created_at: string;
}

interface ProductForm {
  name: string;
  description: string;
  price: string;
  inventory: string;
}

export default function AdminProducts() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<ProductForm>({
    defaultValues: {
      name: '',
      description: '',
      price: '',
      inventory: '',
    },
  });

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/products`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else {
        Alert.alert('Error', 'Failed to load products');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error while loading products');
    } finally {
      setLoading(false);
    }
  };

  const openAddProductModal = () => {
    setEditingProduct(null);
    setSelectedImage(null);
    reset({
      name: '',
      description: '',
      price: '',
      inventory: '',
    });
    setModalVisible(true);
  };

  const openEditProductModal = (product: Product) => {
    setEditingProduct(product);
    setSelectedImage(product.image_base64);
    reset({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      inventory: product.inventory.toString(),
    });
    setModalVisible(true);
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to select images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setSelectedImage(result.assets[0].base64);
    }
  };

  const onSubmit = async (data: ProductForm) => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image for the product');
      return;
    }

    const price = parseFloat(data.price);
    const inventory = parseInt(data.inventory);

    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    if (isNaN(inventory) || inventory < 0) {
      Alert.alert('Error', 'Please enter a valid inventory count');
      return;
    }

    setSubmitting(true);
    try {
      const productData = {
        name: data.name.trim(),
        description: data.description.trim(),
        price: price,
        inventory: inventory,
        image_base64: selectedImage,
      };

      const url = editingProduct 
        ? `${BACKEND_URL}/api/products/${editingProduct.id}`
        : `${BACKEND_URL}/api/products`;
      
      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      if (response.ok) {
        Alert.alert(
          'Success', 
          `Product ${editingProduct ? 'updated' : 'created'} successfully!`,
          [{ text: 'OK', onPress: () => {
            setModalVisible(false);
            fetchProducts();
          }}]
        );
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save product');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteProduct = async (productId: string) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const response = await fetch(`${BACKEND_URL}/api/products/${productId}`, {
              method: 'DELETE',
            });

            if (response.ok) {
              Alert.alert('Success', 'Product deleted successfully!');
              fetchProducts();
            } else {
              throw new Error('Failed to delete product');
            }
          } catch (error) {
            Alert.alert('Error', 'Failed to delete product');
          }
        }}
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
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
        <Text style={styles.title}>Manage Products</Text>
        <TouchableOpacity onPress={openAddProductModal}>
          <Ionicons name="add" size={24} color="#7c3aed" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {products.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No Products Yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first product to start selling
            </Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={openAddProductModal}
            >
              <Text style={styles.addButtonText}>Add Product</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.productsList}>
            {products.map((product) => (
              <View key={product.id} style={styles.productCard}>
                <Image 
                  source={{ uri: `data:image/jpeg;base64,${product.image_base64}` }}
                  style={styles.productImage}
                />
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productDescription} numberOfLines={2}>
                    {product.description}
                  </Text>
                  <View style={styles.productDetails}>
                    <Text style={styles.productPrice}>${product.price.toFixed(2)}</Text>
                    <Text style={styles.productStock}>Stock: {product.inventory}</Text>
                  </View>
                </View>
                <View style={styles.productActions}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => openEditProductModal(product)}
                  >
                    <Ionicons name="pencil" size={16} color="#2563eb" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => deleteProduct(product.id)}
                  >
                    <Ionicons name="trash" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Product Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                {/* Image Picker */}
                <View style={styles.imageSection}>
                  <Text style={styles.label}>Product Image *</Text>
                  <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                    {selectedImage ? (
                      <Image 
                        source={{ uri: `data:image/jpeg;base64,${selectedImage}` }}
                        style={styles.selectedImage}
                      />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Ionicons name="camera" size={32} color="#94a3b8" />
                        <Text style={styles.imagePickerText}>Tap to select image</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Form Fields */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Product Name *</Text>
                  <Controller
                    control={control}
                    name="name"
                    rules={{ required: 'Product name is required' }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[styles.input, errors.name && styles.inputError]}
                        placeholder="Enter product name"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                      />
                    )}
                  />
                  {errors.name && (
                    <Text style={styles.errorText}>{errors.name.message}</Text>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Description *</Text>
                  <Controller
                    control={control}
                    name="description"
                    rules={{ required: 'Description is required' }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[styles.textArea, errors.description && styles.inputError]}
                        placeholder="Enter product description"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        multiline
                        numberOfLines={3}
                      />
                    )}
                  />
                  {errors.description && (
                    <Text style={styles.errorText}>{errors.description.message}</Text>
                  )}
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputContainer, styles.halfWidth]}>
                    <Text style={styles.label}>Price ($) *</Text>
                    <Controller
                      control={control}
                      name="price"
                      rules={{ required: 'Price is required' }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={[styles.input, errors.price && styles.inputError]}
                          placeholder="0.00"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          keyboardType="decimal-pad"
                        />
                      )}
                    />
                    {errors.price && (
                      <Text style={styles.errorText}>{errors.price.message}</Text>
                    )}
                  </View>

                  <View style={[styles.inputContainer, styles.halfWidth]}>
                    <Text style={styles.label}>Inventory *</Text>
                    <Controller
                      control={control}
                      name="inventory"
                      rules={{ required: 'Inventory is required' }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={[styles.input, errors.inventory && styles.inputError]}
                          placeholder="0"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          keyboardType="number-pad"
                        />
                      )}
                    />
                    {errors.inventory && (
                      <Text style={styles.errorText}>{errors.inventory.message}</Text>
                    )}
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                  disabled={submitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleSubmit(onSubmit)}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {editingProduct ? 'Update' : 'Add Product'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 100,
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
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  productsList: {
    padding: 16,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    marginLeft: 16,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 8,
  },
  productDetails: {
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
    fontSize: 12,
    color: '#6b7280',
  },
  productActions: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
  },
  modalForm: {
    flex: 1,
    paddingHorizontal: 20,
  },
  imageSection: {
    marginTop: 20,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  imagePicker: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  imagePickerText: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#7c3aed',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});