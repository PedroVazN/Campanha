"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRL } from "@/lib/money";

const COLORS = ["#059669", "#2563EB", "#1E3A5F", "#0EA5E9", "#0B1220"];

type Props = {
  monthly: { label: string; value: number }[];
  byCategory: { name: string; value: number }[];
  topConsumers: { name: string; value: number }[];
  projected: number;
  realized: number;
};

export function DashboardCharts({
  monthly,
  byCategory,
  topConsumers,
  projected,
  realized,
}: Props) {
  const compare = [
    { name: "Projetado", value: projected },
    { name: "Realizado", value: realized },
  ];

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="panel p-4">
        <h3 className="font-display font-semibold mb-3">Utilização mensal</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D5DCE5" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => formatBRL(Number(v))} />
              <Bar dataKey="value" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel p-4">
        <h3 className="font-display font-semibold mb-3">Por categoria</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={80} label>
                {byCategory.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatBRL(Number(v))} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel p-4">
        <h3 className="font-display font-semibold mb-3">Maiores consumidores</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topConsumers} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D5DCE5" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatBRL(Number(v))} />
              <Bar dataKey="value" fill="#2563EB" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel p-4">
        <h3 className="font-display font-semibold mb-3">Projetado × realizado</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={compare}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D5DCE5" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(v) => formatBRL(Number(v))} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                <Cell fill="#2563EB" />
                <Cell fill="#64748B" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
