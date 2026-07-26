import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Image,
  TextInput,
  Alert,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import MapView, { Marker } from 'react-native-maps'
import * as ImagePicker from 'expo-image-picker'
import type { EmergenciasStackParamList } from '../navigation/RootNavigator'
import { useAuth } from '../context/AuthContext'
import {
  fetchEmergency,
  updateEmergencyStatus,
  fetchClosingReasons,
  uploadEvidence,
} from '../api/emergencies'
import { resolveMediaUrl } from '../config'
import type { EmergencyDetail, ClosingReason, EmergencyStatus } from '../types'

const STATUS_OPTIONS: { value: EmergencyStatus; label: string }[] = [
  { value: 'NUEVA', label: 'Nueva' },
  { value: 'EN_ATENCION', label: 'En atención' },
  { value: 'RESUELTA', label: 'Resuelta' },
  { value: 'CERRADA', label: 'Cerrada' },
  { value: 'DESCARTADA', label: 'Descartada' },
]

const PRIORITY_LABELS: Record<string, string> = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  CRITICA: 'Crítica',
}

type Props = NativeStackScreenProps<EmergenciasStackParamList, 'EmergencyDetail'>

export default function EmergencyDetailScreen({ route }: Props) {
  const { id } = route.params
  const { session } = useAuth()

  const [emergency, setEmergency] = useState<EmergencyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [closingReasons, setClosingReasons] = useState<ClosingReason[]>([])
  const [newStatus, setNewStatus] = useState<EmergencyStatus | null>(null)
  const [closingReasonId, setClosingReasonId] = useState<string | null>(null)
  const [closingNotes, setClosingNotes] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchEmergency(id)
      setEmergency(data)
      setNewStatus(data.status)
      setClosingReasonId(data.closingReasonId ?? null)
      setClosingNotes(data.closingNotes ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la emergencia')
    } finally {
      setLoading(false)
    }
  }, [id])

  useFocusEffect(
    useCallback(() => {
      load()
      if (session?.municipalityId) {
        fetchClosingReasons(session.municipalityId).then(setClosingReasons).catch(() => {})
      }
    }, [load, session?.municipalityId]),
  )

  const handleSaveStatus = async () => {
    if (!newStatus) return
    setSavingStatus(true)
    setStatusError(null)
    try {
      const updated = await updateEmergencyStatus(id, {
        status: newStatus,
        closingNotes: closingNotes || undefined,
        closingReasonId: closingReasonId || undefined,
      })
      setEmergency(updated)
      Alert.alert('Listo', 'Estado actualizado.')
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'No se pudo actualizar el estado')
    } finally {
      setSavingStatus(false)
    }
  }

  const pickAndUpload = async (source: 'camera' | 'library') => {
    let result: ImagePicker.ImagePickerResult
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      if (!perm.granted) {
        Alert.alert('Permiso requerido', 'Se necesita acceso a la cámara.')
        return
      }
      result = await ImagePicker.launchCameraAsync({ quality: 0.7 })
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) {
        Alert.alert('Permiso requerido', 'Se necesita acceso a la galería.')
        return
      }
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 })
    }

    if (result.canceled) return
    const asset = result.assets[0]

    setUploading(true)
    try {
      await uploadEvidence(id, {
        uri: asset.uri,
        name: asset.fileName ?? `evidencia-${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      })
      await load()
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo subir la evidencia')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!emergency) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Emergencia no encontrada'}</Text>
      </View>
    )
  }

  const showClosingFields = newStatus === 'CERRADA' || newStatus === 'RESUELTA'
  const hasCoords = emergency.latitude != null && emergency.longitude != null

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.code}>{emergency.code}</Text>
          <Text style={styles.priority}>{PRIORITY_LABELS[emergency.priority] ?? emergency.priority}</Text>
        </View>
        <Text style={styles.category}>{emergency.category?.label ?? 'Sin categoría'}</Text>
        <Text style={styles.address}>{emergency.address}</Text>
        {emergency.sector ? <Text style={styles.detail}>Sector: {emergency.sector}</Text> : null}
        {(emergency.commune || emergency.region) ? (
          <Text style={styles.detail}>
            {[emergency.commune, emergency.region].filter(Boolean).join(', ')}
          </Text>
        ) : null}
        <Text style={styles.description}>{emergency.description}</Text>

        {(emergency.reporterName || emergency.reporterPhone) ? (
          <View style={styles.reporterBox}>
            <Text style={styles.reporterLabel}>Reportante</Text>
            {emergency.reporterName ? <Text style={styles.detail}>{emergency.reporterName}</Text> : null}
            {emergency.reporterPhone ? <Text style={styles.detail}>{emergency.reporterPhone}</Text> : null}
          </View>
        ) : null}
      </View>

      {hasCoords ? (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: emergency.latitude as number,
            longitude: emergency.longitude as number,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Marker
            coordinate={{ latitude: emergency.latitude as number, longitude: emergency.longitude as number }}
          />
        </MapView>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Evidencia</Text>
        {emergency.evidences && emergency.evidences.length > 0 ? (
          <View style={styles.evidenceGrid}>
            {emergency.evidences.map((ev) => (
              <Image
                key={ev.id}
                source={{ uri: resolveMediaUrl(ev.url) }}
                style={styles.evidenceThumb}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.detail}>Sin evidencia todavía.</Text>
        )}

        <View style={styles.evidenceButtons}>
          <Pressable
            style={[styles.smallButton, uploading && styles.buttonDisabled]}
            onPress={() => pickAndUpload('camera')}
            disabled={uploading}
          >
            <Text style={styles.smallButtonText}>Tomar foto</Text>
          </Pressable>
          <Pressable
            style={[styles.smallButton, uploading && styles.buttonDisabled]}
            onPress={() => pickAndUpload('library')}
            disabled={uploading}
          >
            <Text style={styles.smallButtonText}>Elegir de galería</Text>
          </Pressable>
        </View>
        {uploading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Cambiar estado</Text>
        <View style={styles.chipRow}>
          {STATUS_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[styles.chip, newStatus === opt.value && styles.chipSelected]}
              onPress={() => setNewStatus(opt.value)}
            >
              <Text style={[styles.chipText, newStatus === opt.value && styles.chipTextSelected]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {showClosingFields ? (
          <>
            <Text style={styles.fieldLabel}>
              Motivo de cierre{newStatus === 'CERRADA' ? ' *' : ''}
            </Text>
            <View style={styles.chipRow}>
              {closingReasons.map((reason) => (
                <Pressable
                  key={reason.id}
                  style={[styles.chip, closingReasonId === reason.id && styles.chipSelected]}
                  onPress={() => setClosingReasonId(reason.id)}
                >
                  <Text
                    style={[styles.chipText, closingReasonId === reason.id && styles.chipTextSelected]}
                  >
                    {reason.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Observaciones de cierre</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={3}
              placeholder="Descripción de cómo se resolvió la emergencia..."
              value={closingNotes}
              onChangeText={setClosingNotes}
            />
          </>
        ) : null}

        {statusError ? <Text style={styles.errorText}>{statusError}</Text> : null}

        <Pressable
          style={[styles.button, savingStatus && styles.buttonDisabled]}
          onPress={handleSaveStatus}
          disabled={savingStatus}
        >
          {savingStatus ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Guardar estado</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontFamily: 'monospace', fontWeight: 'bold', fontSize: 16, color: '#1e293b' },
  priority: { fontSize: 12, fontWeight: 'bold', color: '#d97706', textTransform: 'uppercase' },
  category: { marginTop: 8, fontSize: 17, fontWeight: '700', color: '#1e293b' },
  address: { marginTop: 4, color: '#334155', fontSize: 14 },
  detail: { marginTop: 2, color: '#64748b', fontSize: 13 },
  description: { marginTop: 12, color: '#1e293b', fontSize: 14, lineHeight: 20 },
  reporterBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  reporterLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  map: { height: 200, borderRadius: 10, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#1e293b', marginBottom: 10 },
  evidenceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  evidenceThumb: { width: 88, height: 88, borderRadius: 8, backgroundColor: '#f1f5f9' },
  evidenceButtons: { flexDirection: 'row', gap: 8, marginTop: 12 },
  smallButton: {
    flex: 1,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  smallButtonText: { color: '#1d4ed8', fontWeight: '600', fontSize: 13 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipSelected: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  chipText: { fontSize: 13, color: '#475569' },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 },
  textArea: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  errorText: { color: '#dc2626', marginBottom: 12, textAlign: 'center' },
})
