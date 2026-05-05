interface StatsCardProps {
  label: string
  value: number
  color: 'blue' | 'yellow' | 'green' | 'gray' | 'red'
  icon: React.ReactNode
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-700',
  yellow: 'bg-yellow-50 text-yellow-700',
  green: 'bg-green-50 text-green-700',
  gray: 'bg-gray-50 text-gray-600',
  red: 'bg-red-50 text-red-700',
}

export default function StatsCard({ label, value, color, icon }: StatsCardProps) {
  return (
    <div className="card p-6 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}
