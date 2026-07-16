"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { formatBRL } from "@/lib/money";

const COLORS = ["#059669", "#2563EB", "#1E3A5F", "#0EA5E9", "#0B1220"];

type Props = {
  balanceSeries: { label: string; value: number }[];
  monthlySpend: { label: string; value: number }[];
  byCategory: { name: string; value: number }[];
  projected: number;
  realized: number;
};

export function DistributorCharts({
  balanceSeries,
  monthlySpend,
  byCategory,
  projected,
  realized,
}: Props) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="panel p-4">
        <h3 className="font-display font-semibold mb-3">Evolução do saldo</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={balanceSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D5DCE5" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatBRL(Number(v))} />
              <Area type="monotone" dataKey="value" stroke="#059669" fill="#ECFDF5" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="panel p-4">
        <h3 className="font-display font-semibold mb-3">Gastos por mês</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlySpend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D5DCE5" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip formatter={(v) => formatBRL(Number(v))} />
              <Bar dataKey="value" fill="#5A6570" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="panel p-4">
        <h3 className="font-display font-semibold mb-3">Por categoria</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={70}>
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
        <h3 className="font-display font-semibold mb-3">Projetado × realizado</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { name: "Projetado", value: projected },
                { name: "Realizado", value: realized },
              ]}
            >
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
