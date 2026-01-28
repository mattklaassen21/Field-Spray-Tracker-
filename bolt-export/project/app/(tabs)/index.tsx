import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut } from 'lucide-react-native';
import { sendOrderNotification } from '@/lib/notifications';
import { useResponsive } from '@/hooks/useResponsive';

type OrderItemInput = {
  variety: string;
  seed_treatment: string;
};

export default function CreateOrderScreen() {
  const { user, signOut } = useAuth();
  const { isDesktop, contentMaxWidth } = useResponsive();
  const [operation, setOperation] = useState('');
  const [accountDescription, setAccountDescription] = useState('');
  const [seedType, setSeedType] = useState('');
  const [items, setItems] = useState<OrderItemInput[]>([
    { variety: '', seed_treatment: '' }
  ]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const addItem = () => {
    setItems([...items, { variety: '', seed_treatment: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof OrderItemInput, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const isSoybeans = seedType.toLowerCase().includes('soybean');

  const handleCreateOrder = async () => {
    if (!operation || !accountDescription || !seedType) {
      Alert.alert('Error', 'Please fill in operation, account description, and seed type');
      return;
    }

    const hasEmptyVarieties = items.some(item => !item.variety);
    if (hasEmptyVarieties) {
      Alert.alert('Error', 'Please fill in all variety fields');
      return;
    }

    if (isSoybeans) {
      const hasEmptyTreatments = items.some(item => !item.seed_treatment);
      if (hasEmptyTreatments) {
        Alert.alert('Error', 'Please fill in all seed treatment fields for soybeans');
        return;
      }
    }

    setLoading(true);

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        operation,
        account_description: accountDescription,
        seed_type: seedType,
        variety: items[0].variety,
        seed_treatment: isSoybeans ? items[0].seed_treatment : null,
        notes: notes || '',
        status: 'pending',
        created_by: user?.id,
      })
      .select()
      .single();

    if (orderError) {
      setLoading(false);
      Alert.alert('Error', orderError.message);
      return;
    }

    const { error: itemsError } = await supabase.from('order_items').insert(
      items.map(item => ({
        order_id: orderData.id,
        variety: item.variety,
        seed_treatment: isSoybeans ? item.seed_treatment : null,
      }))
    );

    if (itemsError) {
      setLoading(false);
      Alert.alert('Error', itemsError.message);
      return;
    }

    await sendOrderNotification({
      operation,
      account_description: accountDescription,
      seed_type: seedType,
      variety: items[0].variety,
    });

    setLoading(false);
    Alert.alert('Success', 'Order created successfully!');
    setOperation('');
    setAccountDescription('');
    setSeedType('');
    setItems([{ variety: '', seed_treatment: '' }]);
    setNotes('');
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <SafeAreaView style={[styles.container, isDesktop && styles.containerDesktop]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <View style={[styles.header, isDesktop && styles.headerDesktop]}>
          <View style={[styles.headerContent, isDesktop && { maxWidth: contentMaxWidth }]}>
            <Text style={styles.title}>Create Order</Text>
            <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
              <LogOut size={24} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={isDesktop && styles.scrollContentDesktop}>
          <View style={[styles.form, isDesktop && { maxWidth: contentMaxWidth, width: '100%' }]}>
            <Text style={styles.label}>
              Operation <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={operation}
              onChangeText={setOperation}
              placeholder="Enter operation"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>
              Account Description <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={accountDescription}
              onChangeText={setAccountDescription}
              placeholder="Enter account description"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>
              Seed Type <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.seedTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.seedTypeButton,
                  seedType === 'Corn' && styles.seedTypeButtonActive,
                ]}
                onPress={() => setSeedType('Corn')}>
                <Text
                  style={[
                    styles.seedTypeText,
                    seedType === 'Corn' && styles.seedTypeTextActive,
                  ]}>
                  Corn
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.seedTypeButton,
                  seedType === 'Soybeans' && styles.seedTypeButtonActive,
                ]}
                onPress={() => setSeedType('Soybeans')}>
                <Text
                  style={[
                    styles.seedTypeText,
                    seedType === 'Soybeans' && styles.seedTypeTextActive,
                  ]}>
                  Soybeans
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.itemsHeader}>
              <Text style={styles.label}>
                {isSoybeans ? 'Varieties & Treatments' : 'Varieties'} <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity onPress={addItem} style={styles.addButton}>
                <Text style={styles.addButtonText}>+ Add Another</Text>
              </TouchableOpacity>
            </View>

            {items.map((item, index) => (
              <View key={index} style={styles.itemContainer}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemNumber}>Item {index + 1}</Text>
                  {items.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeItem(index)}
                      style={styles.removeButton}>
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.subLabel}>Variety</Text>
                <TextInput
                  style={styles.input}
                  value={item.variety}
                  onChangeText={(value) => updateItem(index, 'variety', value)}
                  placeholder="Enter variety"
                  placeholderTextColor="#999"
                />

                {isSoybeans && (
                  <>
                    <Text style={styles.subLabel}>Seed Treatment</Text>
                    <TextInput
                      style={styles.input}
                      value={item.seed_treatment}
                      onChangeText={(value) => updateItem(index, 'seed_treatment', value)}
                      placeholder="Enter seed treatment"
                      placeholderTextColor="#999"
                    />
                  </>
                )}
              </View>
            ))}

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Enter any additional notes"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleCreateOrder}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Create Order</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDesktop: {
    ...(Platform.OS === 'web' && {
      marginLeft: 240,
    }),
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerDesktop: {
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  signOutButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContentDesktop: {
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  form: {
    padding: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 4,
  },
  required: {
    color: '#dc2626',
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  addButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  itemContainer: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  removeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeButtonText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 16,
  },
  seedTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  seedTypeButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  seedTypeButtonActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  seedTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  seedTypeTextActive: {
    color: '#2563eb',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
