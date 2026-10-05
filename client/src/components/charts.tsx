import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const copper = "#B85C38";
const espresso = "#1A1612";

export function SimpleLine({
  data,
  x,
  y,
  yLabel,
}: {
  data: Record<string, unknown>[];
  x: string;
  y: string;
  yLabel?: string;
}) {
  if (!data.length) return <p className="text-sm text-muted-foreground">Sin datos para graficar.</p>;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="#E8DFD4" vertical={false} />
          <XAxis dataKey={x} tick={{ fontSize: 11, fill: "#6B6258" }} />
          <YAxis tick={{ fontSize: 11, fill: "#6B6258" }} />
          <Tooltip />
          <Line type="monotone" dataKey={y} name={yLabel} stroke={copper} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SimpleBar({
  data,
  x,
  y,
  yLabel,
}: {
  data: Record<string, unknown>[];
  x: string;
  y: string;
  yLabel?: string;
}) {
  if (!data.length) return <p className="text-sm text-muted-foreground">Sin datos para graficar.</p>;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="#E8DFD4" vertical={false} />
          <XAxis dataKey={x} tick={{ fontSize: 11, fill: "#6B6258" }} />
          <YAxis tick={{ fontSize: 11, fill: "#6B6258" }} />
          <Tooltip />
          <Bar dataKey={y} name={yLabel} fill={copper} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SimpleDonut({ data, nameKey, valueKey }: { data: Record<string, unknown>[]; nameKey: string; valueKey: string }) {
  if (!data.length) return <p className="text-sm text-muted-foreground">Sin datos para graficar.</p>;
  const colors = ["#B85C38", "#3F6B4A", "#C4892A", "#1A1612", "#9B2F2F", "#6B6258", "#8C3F24", "#DA3743"];
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius={55} outerRadius={90} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} stroke={espresso} strokeWidth={0} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
