import React, { useEffect } from 'react'
import {
  NavigationContainer,
  createNavigationContainerRef,
  type NavigatorScreenParams,
} from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { ActivityIndicator, View } from 'react-native'
import * as Notifications from 'expo-notifications'
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

type RootTabParamList = {
  Emergencias: NavigatorScreenParams<EmergenciasStackParamList>
  Perfil: undefined
}

export const navigationRef = createNavigationContainerRef<RootTabParamList>()

// Al tocar una notificación push (asignación/reasignación, ver src/lib/push.ts
// en el backend), navega directo al detalle de la emergencia usando el
// emergencyId que viaja en el payload `data` — ver EMERGENCY_ASSIGNED en
// sendPushNotification(). Vive fuera del árbol de NavigationContainer, por
// eso necesita el ref en vez de un hook de navegación normal.
function useNotificationDeepLink() {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const emergencyId = response.notification.request.content.data?.emergencyId
      if (typeof emergencyId === 'string' && navigationRef.isReady()) {
        navigationRef.navigate('Emergencias', {
          screen: 'EmergencyDetail',
          params: { id: emergencyId },
        })
      }
    })
    return () => subscription.remove()
  }, [])
}

const Tab = createBottomTabNavigator<RootTabParamList>()

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
  useNotificationDeepLink()

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {session ? <AppTabs /> : <LoginScreen />}
    </NavigationContainer>
  )
}
