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
  const hasData = data.length > 0;

  return (
    <div className="bg-card p-6 rounded-xl shadow">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>

      {hasData ? (
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
      ) : (
        <div className="flex h-[250px] items-center justify-center">
          <p className="text-3xl font-semibold text-muted-foreground/60 text-center">
            Start Learning Now
          </p>
        </div>
      )}
    </div>
  );
};

export default ProgressChart;
