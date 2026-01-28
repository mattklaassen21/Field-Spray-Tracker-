import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, Order } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Clock, CheckCircle, AlertCircle, ChevronDown, ChevronRight, Trash2, Square, CheckSquare, Printer, Bell } from 'lucide-react-native';
import { registerForPushNotificationsAsync } from '@/lib/notifications';
import { useResponsive } from '@/hooks/useResponsive';

export default function WarehouseScreen() {
  const { user, signOut } = useAuth();
  const { isDesktop, contentMaxWidth } = useResponsive();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showNotification, setShowNotification] = useState(false);
  const notificationOpacity = useRef(new Animated.Value(0)).current;

  const stats = {
    pending: orders.filter((o) => o.status === 'pending').length,
    in_progress: orders.filter((o) => o.status === 'in_progress').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    total: orders.length,
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          variety,
          seed_treatment,
          quantity
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const playNotificationSound = async () => {
    // Audio playback removed for web compatibility
  };

  const triggerNotification = () => {
    setShowNotification(true);
    notificationOpacity.setValue(0);

    playNotificationSound();

    Animated.loop(
      Animated.sequence([
        Animated.timing(notificationOpacity, {
          toValue: 0.85,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(notificationOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]),
      { iterations: 10 }
    ).start(() => {
      setShowNotification(false);
    });
  };

  useEffect(() => {
    fetchOrders();
    registerForPushNotificationsAsync();

    const channel = supabase
      .channel('orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const { data: newOrder } = await supabase
              .from('orders')
              .select(`
                *,
                order_items (
                  id,
                  variety,
                  seed_treatment,
                  quantity
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (newOrder) {
              setOrders((current) => [newOrder, ...current]);
              triggerNotification();
            }
          } else if (payload.eventType === 'UPDATE') {
            const { data: updatedOrder } = await supabase
              .from('orders')
              .select(`
                *,
                order_items (
                  id,
                  variety,
                  seed_treatment,
                  quantity
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (updatedOrder) {
              setOrders((current) =>
                current.map((order) =>
                  order.id === updatedOrder.id ? updatedOrder : order
                )
              );
            }
          } else if (payload.eventType === 'DELETE') {
            setOrders((current) =>
              current.filter((order) => order.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOrderView = async (order: Order) => {
    if (!order.view_notified && order.created_by && order.created_by !== user?.id) {
      await supabase
        .from('orders')
        .update({
          viewed_by: user?.id,
          view_notified: true,
        })
        .eq('id', order.id);

      const { data: creatorTokens } = await supabase
        .from('push_tokens')
        .select('push_token')
        .eq('user_id', order.created_by);

      if (creatorTokens && creatorTokens.length > 0) {
        const tokens = creatorTokens.map((t) => t.push_token);
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

        await fetch(
          `${supabaseUrl}/functions/v1/send-order-notification`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              tokens,
              title: 'Order Viewed',
              body: `Your order for ${order.operation} has been opened by warehouse staff`,
              data: { orderId: order.id, type: 'order_viewed' },
            }),
          }
        );
      }
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
  };

  const handlePrintOrder = (order: Order) => {
    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const isSoybeans = order.seed_type.toLowerCase().includes('soybean');

      const itemsHTML = order.order_items && order.order_items.length > 0
        ? order.order_items.map((item, idx) => `
            <div style="background: #f9fafb; padding: 12px; border-radius: 8px; margin-bottom: 8px;">
              <div style="font-weight: 600; color: #2563eb; margin-bottom: 8px;">Item ${idx + 1}</div>
              <div style="margin-bottom: 4px;"><strong>Variety:</strong> ${item.variety}</div>
              ${item.seed_treatment ? `<div><strong>Treatment:</strong> ${item.seed_treatment}</div>` : ''}
            </div>
          `).join('')
        : `
            <div style="margin-bottom: 8px;"><strong>Variety:</strong> ${order.variety}</div>
            ${order.seed_treatment ? `<div style="margin-bottom: 8px;"><strong>Treatment:</strong> ${order.seed_treatment}</div>` : ''}
          `;

      const content = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Order - ${order.operation}</title>
            <style>
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                padding: 40px;
                max-width: 800px;
                margin: 0 auto;
              }
              .header {
                border-bottom: 3px solid #2563eb;
                padding-bottom: 20px;
                margin-bottom: 30px;
              }
              .title {
                font-size: 28px;
                font-weight: bold;
                color: #1e293b;
                margin-bottom: 8px;
              }
              .subtitle {
                font-size: 18px;
                color: #64748b;
              }
              .status-badge {
                display: inline-block;
                padding: 6px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                margin-top: 12px;
              }
              .status-completed {
                background: #dcfce7;
                color: #166534;
              }
              .section {
                margin-bottom: 24px;
              }
              .section-title {
                font-size: 16px;
                font-weight: 600;
                color: #475569;
                margin-bottom: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .info-row {
                margin-bottom: 12px;
                display: flex;
              }
              .info-label {
                font-weight: 600;
                color: #475569;
                min-width: 150px;
              }
              .info-value {
                color: #1e293b;
              }
              .print-button {
                background: #2563eb;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                margin-bottom: 20px;
              }
              .print-button:hover {
                background: #1d4ed8;
              }
            </style>
          </head>
          <body>
            <button class="print-button no-print" onclick="window.print()">Print Order</button>

            <div class="header">
              <div class="title">${order.operation}</div>
              <div class="subtitle">${order.account_description}</div>
              <div class="status-badge status-${order.status}">${order.status.replace('_', ' ').toUpperCase()}</div>
            </div>

            <div class="section">
              <div class="section-title">Order Details</div>
              <div class="info-row">
                <div class="info-label">Seed Type:</div>
                <div class="info-value">${order.seed_type}</div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Varieties ${isSoybeans ? '& Treatments' : ''}</div>
              ${itemsHTML}
            </div>

            ${order.notes ? `
              <div class="section">
                <div class="section-title">Notes</div>
                <div class="info-value">${order.notes}</div>
              </div>
            ` : ''}

            <div class="section">
              <div class="section-title">Timestamps</div>
              <div class="info-row">
                <div class="info-label">Created:</div>
                <div class="info-value">${new Date(order.created_at).toLocaleString()}</div>
              </div>
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(content);
      printWindow.document.close();
    } else {
      Alert.alert('Print', 'Printing is only available on web');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    Alert.alert(
      'Delete Order',
      'Are you sure you want to delete this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('orders').delete().eq('id', orderId);
            setExpandedOrderId(null);
          },
        },
      ]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedOrders.size === 0) return;

    Alert.alert(
      'Delete Orders',
      `Are you sure you want to delete ${selectedOrders.size} order(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const orderIds = Array.from(selectedOrders);
            await supabase.from('orders').delete().in('id', orderIds);
            setSelectedOrders(new Set());
            setSelectionMode(false);
          },
        },
      ]
    );
  };

  const toggleSelectOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedOrders(new Set());
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={20} color="#dc2626" />;
      case 'in_progress':
        return <AlertCircle size={20} color="#f59e0b" />;
      case 'completed':
        return <CheckCircle size={20} color="#10b981" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#fecaca';
      case 'in_progress':
        return '#fef3c7';
      case 'completed':
        return '#d1fae5';
      default:
        return '#f3f4f6';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, isDesktop && styles.containerDesktop]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDesktop && styles.containerDesktop]}>
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <View style={[styles.headerContent, isDesktop && { maxWidth: contentMaxWidth }]}>
          <Text style={styles.title}>Warehouse Orders</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={triggerNotification}
              style={styles.testButton}>
              <Bell size={18} color="#fff" />
              <Text style={styles.testButtonText}>Test Alert</Text>
            </TouchableOpacity>
            {orders.length > 0 && (
              <TouchableOpacity
                onPress={toggleSelectionMode}
                style={styles.iconButton}>
                <CheckSquare size={24} color={selectionMode ? '#2563eb' : '#666'} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleSignOut} style={styles.iconButton}>
              <LogOut size={24} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={[styles.statsContainer, isDesktop && styles.statsContainerDesktop]}>
        <View style={[styles.statsRow, isDesktop && { maxWidth: contentMaxWidth, width: '100%' }]}>
          <View style={styles.statCard}>
            <Clock size={24} color="#dc2626" />
            <Text style={styles.statNumber}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <AlertCircle size={24} color="#f59e0b" />
            <Text style={styles.statNumber}>{stats.in_progress}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
          <View style={styles.statCard}>
            <CheckCircle size={24} color="#10b981" />
            <Text style={styles.statNumber}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={isDesktop && styles.scrollContentDesktop}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No orders yet</Text>
            <Text style={styles.emptySubtext}>
              Orders created on mobile will appear here in real-time
            </Text>
          </View>
        ) : (
          <View style={[styles.ordersContainer, isDesktop && { maxWidth: contentMaxWidth, width: '100%' }]}>
            {orders.map((order) => {
              const isExpanded = expandedOrderId === order.id;
              const isSelected = selectedOrders.has(order.id);
              return (
                <View key={order.id} style={styles.orderItem}>
                  <TouchableOpacity
                    style={styles.orderHeader}
                    onPress={() => {
                      if (selectionMode) {
                        toggleSelectOrder(order.id);
                      } else {
                        if (!isExpanded) {
                          handleOrderView(order);
                        }
                        setExpandedOrderId(isExpanded ? null : order.id);
                      }
                    }}>
                    <View style={styles.orderHeaderLeft}>
                      {selectionMode ? (
                        isSelected ? (
                          <CheckSquare size={20} color="#2563eb" />
                        ) : (
                          <Square size={20} color="#666" />
                        )
                      ) : isExpanded ? (
                        <ChevronDown size={20} color="#666" />
                      ) : (
                        <ChevronRight size={20} color="#666" />
                      )}
                      <View style={styles.orderHeaderInfo}>
                        <Text style={styles.orderOperation}>
                          {order.operation}
                        </Text>
                        <Text style={styles.orderAccount}>
                          {order.account_description}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.statusBadgeSmall,
                        { backgroundColor: getStatusColor(order.status) },
                      ]}>
                      {getStatusIcon(order.status)}
                    </View>
                  </TouchableOpacity>

                  {isExpanded && !selectionMode && (
                    <View style={styles.orderDetails}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Seed Type:</Text>
                        <Text style={styles.detailValue}>{order.seed_type}</Text>
                      </View>

                      {order.order_items && order.order_items.length > 0 ? (
                        <>
                          <Text style={[styles.detailLabel, { marginTop: 12, marginBottom: 8 }]}>
                            Varieties {order.seed_type.toLowerCase().includes('soybean') ? '& Treatments' : ''}:
                          </Text>
                          {order.order_items.map((item, idx) => (
                            <View key={item.id} style={styles.orderItemCard}>
                              <Text style={styles.orderItemNumber}>Item {idx + 1}</Text>
                              <View style={styles.orderItemRow}>
                                <Text style={styles.orderItemLabel}>Variety:</Text>
                                <Text style={styles.orderItemValue}>{item.variety}</Text>
                              </View>
                              {item.seed_treatment && (
                                <View style={styles.orderItemRow}>
                                  <Text style={styles.orderItemLabel}>Treatment:</Text>
                                  <Text style={styles.orderItemValue}>{item.seed_treatment}</Text>
                                </View>
                              )}
                            </View>
                          ))}
                        </>
                      ) : (
                        <>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Variety:</Text>
                            <Text style={styles.detailValue}>{order.variety}</Text>
                          </View>

                          {order.seed_treatment && (
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Treatment:</Text>
                              <Text style={styles.detailValue}>
                                {order.seed_treatment}
                              </Text>
                            </View>
                          )}
                        </>
                      )}

                      {order.notes ? (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Notes:</Text>
                          <Text style={styles.detailValue}>{order.notes}</Text>
                        </View>
                      ) : null}

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Created:</Text>
                        <Text style={styles.detailValue}>
                          {new Date(order.created_at).toLocaleString()}
                        </Text>
                      </View>

                      <View style={styles.statusButtons}>
                        <TouchableOpacity
                          style={[
                            styles.statusButton,
                            order.status === 'pending' &&
                              styles.statusButtonActive,
                          ]}
                          onPress={() => handleStatusChange(order.id, 'pending')}>
                          <Text
                            style={[
                              styles.statusButtonText,
                              order.status === 'pending' &&
                                styles.statusButtonTextActive,
                            ]}>
                            Pending
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.statusButton,
                            order.status === 'in_progress' &&
                              styles.statusButtonActive,
                          ]}
                          onPress={() =>
                            handleStatusChange(order.id, 'in_progress')
                          }>
                          <Text
                            style={[
                              styles.statusButtonText,
                              order.status === 'in_progress' &&
                                styles.statusButtonTextActive,
                            ]}>
                            In Progress
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.statusButton,
                            order.status === 'completed' &&
                              styles.statusButtonActive,
                          ]}
                          onPress={() =>
                            handleStatusChange(order.id, 'completed')
                          }>
                          <Text
                            style={[
                              styles.statusButtonText,
                              order.status === 'completed' &&
                                styles.statusButtonTextActive,
                            ]}>
                            Complete
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity
                          style={styles.printButton}
                          onPress={() => handlePrintOrder(order)}>
                          <Printer size={18} color="#2563eb" />
                          <Text style={styles.printButtonText}>Print Order</Text>
                        </TouchableOpacity>

                        {order.status === 'completed' && (
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDeleteOrder(order.id)}>
                            <Trash2 size={18} color="#fff" />
                            <Text style={styles.deleteButtonText}>Delete Order</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {selectionMode && selectedOrders.size > 0 && (
        <View style={styles.bulkActionBar}>
          <Text style={styles.bulkActionText}>
            {selectedOrders.size} selected
          </Text>
          <TouchableOpacity
            style={styles.bulkDeleteButton}
            onPress={handleBulkDelete}>
            <Trash2 size={20} color="#fff" />
            <Text style={styles.bulkDeleteButtonText}>Delete Selected</Text>
          </TouchableOpacity>
        </View>
      )}

      {showNotification && (
        <Animated.View
          style={[
            styles.notificationOverlay,
            {
              opacity: notificationOpacity,
            },
          ]}
          pointerEvents="none"
        />
      )}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  statsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statsContainerDesktop: {
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContentDesktop: {
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  ordersContainer: {
    padding: 12,
  },
  orderItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  orderHeaderInfo: {
    flex: 1,
  },
  orderOperation: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  orderAccount: {
    fontSize: 14,
    color: '#666',
  },
  statusBadgeSmall: {
    padding: 8,
    borderRadius: 8,
  },
  orderDetails: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    minWidth: 90,
  },
  detailValue: {
    fontSize: 14,
    color: '#1a1a1a',
    flex: 1,
  },
  orderItemCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  orderItemNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 6,
  },
  orderItemRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  orderItemLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    minWidth: 80,
  },
  orderItemValue: {
    fontSize: 13,
    color: '#1a1a1a',
    flex: 1,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  statusButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statusButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  statusButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  statusButtonTextActive: {
    color: '#2563eb',
  },
  actionButtonsContainer: {
    marginTop: 16,
    gap: 12,
  },
  printButton: {
    backgroundColor: '#eff6ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
    gap: 8,
  },
  printButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bulkActionBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  bulkActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  bulkDeleteButton: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  bulkDeleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  testButton: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  notificationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#7f1d1d',
  },
});
