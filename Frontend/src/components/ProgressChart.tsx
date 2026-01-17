import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type ProgressPoint = {
  label: string;
  value: number;
};

type ProgressChartProps = {
  data: ProgressPoint[];
  title?: string;
  valueLabel?: string;
};

const ProgressChart = ({
  data,
  title = "Learning Progress",
  valueLabel = "Progress",
}: ProgressChartProps) => {
  return (
    <div className="bg-card p-6 rounded-xl shadow">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={3}
            name={valueLabel}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProgressChart;
