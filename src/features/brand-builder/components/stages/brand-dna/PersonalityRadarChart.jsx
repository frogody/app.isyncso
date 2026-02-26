import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
} from 'recharts';

const AXES = [
  { key: 'temporal', label: 'Temporal' },
  { key: 'energy', label: 'Energy' },
  { key: 'tone', label: 'Tone' },
  { key: 'market', label: 'Market' },
  { key: 'density', label: 'Density' },
];

export default function PersonalityRadarChart({ personalityVector = [50, 50, 50, 50, 50] }) {
  const chartData = AXES.map((axis, i) => ({
    axis: axis.label,
    value: personalityVector[i] ?? 50,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid stroke="#3f3f46" strokeOpacity={0.5} />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 500 }}
        />
        <Radar
          name="Personality"
          dataKey="value"
          stroke="#facc15"
          fill="#facc15"
          fillOpacity={0.15}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
