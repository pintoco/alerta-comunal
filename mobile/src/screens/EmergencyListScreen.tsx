import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { EmergenciasStackParamList } from '../navigation/RootNavigator'
import { useAuth } from '../context/AuthContext'
import { fetchMyEmergencies } from '../api/emergencies'
import type { EmergencyListItem } from '../types'

const PRIORITY_COLORS: Record<string, string> = {
  BAJA: '#64748b',
  MEDIA: '#2563eb',
  ALTA: '#d97706',
  CRITICA: '#dc2626',
}

const STATUS_LABELS: Record<string, string> = {
  NUEVA: 'Nueva',
  EN_ATENCION: 'En atención',
  RESUELTA: 'Resuelta',
  CERRADA: 'Cerrada',
  DESCARTADA: 'Descartada',
}

type Props = NativeStackScreenProps<EmergenciasStackParamList, 'EmergencyList'>

export default function EmergencyListScreen({ navigation }: Props) {
  const { session } = useAuth()
  const [items, setItems] = useState<EmergencyListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (!session) return
      try {
        setError(null)
        const data = await fetchMyEmergencies(session.id)
        setItems(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el listado')
      } finally {
        if (isRefresh) setRefreshing(false)
        else setLoading(false)
      }
    },
    [session],
  )

  useFocusEffect(
    useCallback(() => {
      load(false)
    }, [load]),
  )

  const onRefresh = () => {
    setRefreshing(true)
    load(true)
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <Text style={styles.emptyText}>
          {error ?? 'No tienes emergencias asignadas por ahora.'}
        </Text>
      }
      renderItem={({ item }) => (
        <Pressable
          style={styles.card}
          onPress={() => navigation.navigate('EmergencyDetail', { id: item.id })}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.code}>{item.code}</Text>
            <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[item.priority] }]} />
          </View>
          <Text style={styles.category}>{item.category?.label ?? 'Sin categoría'}</Text>
          <Text style={styles.address} numberOfLines={1}>
            {item.address}
          </Text>
          <Text style={styles.status}>{STATUS_LABELS[item.status] ?? item.status}</Text>
        </Pressable>
      )}
    />
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16 },
  emptyContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: '#64748b', textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontFamily: 'monospace', fontWeight: 'bold', color: '#1e293b' },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
  category: { marginTop: 6, fontSize: 15, fontWeight: '600', color: '#1e293b' },
  address: { marginTop: 2, color: '#64748b', fontSize: 13 },
  status: { marginTop: 8, fontSize: 12, fontWeight: 'bold', color: '#2563eb', textTransform: 'uppercase' },
})
