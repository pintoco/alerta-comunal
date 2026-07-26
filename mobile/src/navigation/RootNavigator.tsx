import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '../context/AuthContext'
import LoginScreen from '../screens/LoginScreen'
import EmergencyListScreen from '../screens/EmergencyListScreen'
import EmergencyDetailScreen from '../screens/EmergencyDetailScreen'
import ProfileScreen from '../screens/ProfileScreen'

export type EmergenciasStackParamList = {
  EmergencyList: undefined
  EmergencyDetail: { id: string }
}

const EmergenciasStack = createNativeStackNavigator<EmergenciasStackParamList>()

function EmergenciasStackNavigator() {
  return (
    <EmergenciasStack.Navigator>
      <EmergenciasStack.Screen
        name="EmergencyList"
        component={EmergencyListScreen}
        options={{ title: 'Mis emergencias' }}
      />
      <EmergenciasStack.Screen
        name="EmergencyDetail"
        component={EmergencyDetailScreen}
        options={{ title: 'Emergencia' }}
      />
    </EmergenciasStack.Navigator>
  )
}

const Tab = createBottomTabNavigator()

function AppTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="Emergencias"
        component={EmergenciasStackNavigator}
        options={{ title: 'Mis emergencias' }}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{ headerShown: true, title: 'Perfil' }}
      />
    </Tab.Navigator>
  )
}

export default function RootNavigator() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return <NavigationContainer>{session ? <AppTabs /> : <LoginScreen />}</NavigationContainer>
}
