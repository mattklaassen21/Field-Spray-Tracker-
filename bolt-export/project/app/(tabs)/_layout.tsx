import { Tabs } from 'expo-router';
import { Plus, Package } from 'lucide-react-native';
import { View, StyleSheet, Platform } from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';

export default function TabLayout() {
  const { isDesktop } = useResponsive();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          ...(isDesktop && Platform.OS === 'web' && {
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 240,
            borderTopWidth: 0,
            borderRightWidth: 1,
            borderRightColor: '#e5e7eb',
            flexDirection: 'column',
            paddingTop: 24,
            paddingHorizontal: 16,
          }),
        },
        ...(isDesktop && Platform.OS === 'web' && {
          tabBarItemStyle: {
            flexDirection: 'row',
            justifyContent: 'flex-start',
            paddingHorizontal: 16,
            marginBottom: 8,
            borderRadius: 8,
          },
          tabBarLabelStyle: {
            fontSize: 16,
            marginLeft: 12,
          },
          tabBarIconStyle: {
            marginRight: 0,
          },
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Create Order',
          tabBarIcon: ({ size, color }) => <Plus size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="warehouse"
        options={{
          title: 'Warehouse',
          tabBarIcon: ({ size, color }) => <Package size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
