// ================================================
// MUVV ROTAS — Navegação por abas (Tab Bar)
// ================================================

import { Tabs } from 'expo-router'
import { Text } from 'react-native'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown:        false,
        tabBarStyle: {
          backgroundColor:  '#0f1923',
          borderTopColor:   '#1a2535',
          borderTopWidth:   1,
          height:           60,
          paddingBottom:    8
        },
        tabBarActiveTintColor:   '#00e0a0',
        tabBarInactiveTintColor: '#4a5a6a',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' }
      }}
    >
      <Tabs.Screen
        name="mapa"
        options={{
          title:    'Mapa',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🗺️</Text>
        }}
      />
      <Tabs.Screen
        name="financeiro"
        options={{
          title:    'Financeiro',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>💰</Text>
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title:    'Perfil',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>👤</Text>
        }}
      />
    </Tabs>
  )
}
