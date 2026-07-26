import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useAuth } from '../context/AuthContext'

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrador',
  ADMIN: 'Administrador',
  OPERADOR: 'Operador',
  VISUALIZADOR: 'Visualizador',
}

export default function ProfileScreen() {
  const { session, logout } = useAuth()

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>{session?.name}</Text>
        <Text style={styles.detail}>{session?.email}</Text>
        <Text style={styles.detail}>{ROLE_LABELS[session?.role ?? ''] ?? session?.role}</Text>
        {session?.municipalityName ? (
          <Text style={styles.detail}>{session.municipalityName}</Text>
        ) : null}
      </View>

      <Pressable style={styles.button} onPress={() => logout()}>
        <Text style={styles.buttonText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8fafc' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  name: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  detail: { fontSize: 14, color: '#64748b', marginTop: 4 },
  button: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: { color: '#fff', fontWeight: 'bold' },
})
