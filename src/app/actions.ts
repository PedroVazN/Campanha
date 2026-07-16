"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { DiscountCategory, Role } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageFinance, canManageProducts, canManageUsers, canSeeAllDistributors } from "@/lib/rbac";
import { creditVerba, debitDiscount, discountAffectsVerba } from "@/lib/ledger";
import { computeCampaignStatus } from "@/lib/campaign-status";
import {
  NAV_FLAG_KEYS,
  defaultNavFlagsForRole,
  emptyNavFlags,
  serializeNavFlags,
} from "@/lib/nav-flags";

async function actor() {
  const session = await getSession();
  if (!session?.user?.email) throw new Error("Sessão expirada. Entre novamente.");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase().trim() },
    select: { id: true, name: true, email: true, role: true, navFlags: true },
  });
  if (!dbUser) throw new Error("Usuário não encontrado. Saia e entre novamente.");

  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role as Role,
    navFlags: dbUser.navFlags,
  };
}

export async function createDistributor(formData: FormData) {
  const user = await actor();
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Informe o nome do distribuidor.");

  let sellerId: string;
  if (canSeeAllDistributors(user.role)) {
    sellerId = String(formData.get("sellerId") || "").trim();
    if (!sellerId) throw new Error("Selecione o vendedor responsável.");
  } else if (user.role === "VENDEDOR") {
    sellerId = user.id;
  } else {
    throw new Error("Sem permissão para cadastrar distribuidores.");
  }

  const seller = await prisma.user.findFirst({
    where: { id: sellerId, role: "VENDEDOR" },
    select: { id: true },
  });
  if (!seller) {
    throw new Error(
      "Vendedor inválido. Atualize a página e selecione um vendedor da lista."
    );
  }

  await prisma.distributor.create({ data: { name, sellerId: seller.id } });
  revalidatePath("/distribuidores");
  revalidatePath("/vendedor");
}

export async function createProduct(formData: FormData) {
  const user = await actor();
  if (!canManageProducts(user.role)) throw new Error("Sem permissão para cadastrar produtos.");
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Informe o nome do produto.");

  const exists = await prisma.product.findFirst({
    where: { name: { equals: name } },
  });
  if (exists) throw new Error("Já existe um produto com este nome.");

  await prisma.product.create({ data: { name } });
  revalidatePath("/produtos");
}

export async function createProductsBatch(items: { name: string }[]) {
  const user = await actor();
  if (!canManageProducts(user.role)) throw new Error("Sem permissão para cadastrar produtos.");
  if (!items.length) throw new Error("Nenhum produto para processar.");
  if (items.length > 500) throw new Error("Limite de 500 linhas por planilha.");

  const names = items.map((i) => i.name.trim()).filter(Boolean);
  if (names.length !== items.length) {
    throw new Error("Há produtos com nome vazio.");
  }

  const normalize = (v: string) =>
    v
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const seen = new Set<string>();
  for (const name of names) {
    const key = normalize(name);
    if (seen.has(key)) throw new Error(`Produto duplicado na planilha: ${name}`);
    seen.add(key);
  }

  const existing = await prisma.product.findMany({ select: { name: true } });
  const existingSet = new Set(existing.map((p) => normalize(p.name)));
  for (const name of names) {
    if (existingSet.has(normalize(name))) {
      throw new Error(`Produto já cadastrado: ${name}`);
    }
  }

  await prisma.product.createMany({
    data: names.map((name) => ({ name })),
  });

  revalidatePath("/produtos");
  revalidatePath("/campanhas");
  return { count: names.length };
}

export async function createUser(formData: FormData) {
  const user = await actor();
  if (!canManageUsers(user.role)) throw new Error("Sem permissão para cadastrar usuários.");

  const allowedRoles =
    user.role === "DEVELOPER"
      ? (["VENDEDOR", "ADM", "GESTOR", "DEVELOPER"] as const)
      : (["VENDEDOR", "ADM", "GESTOR"] as const);

  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(allowedRoles),
  });

  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) throw new Error("Preencha nome, e-mail válido, senha (mín. 6) e perfil.");

  const role = parsed.data.role as Role;
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      role,
      navFlags: serializeNavFlags(defaultNavFlagsForRole(role)),
    },
  });
  revalidatePath("/usuarios");
  revalidatePath("/developer");
}

export async function updateUserNavFlags(formData: FormData) {
  const user = await actor();
  if (user.role !== "DEVELOPER") {
    throw new Error("Somente Developer pode configurar abas.");
  }

  const userId = String(formData.get("userId") || "");
  if (!userId) throw new Error("Usuário não informado.");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("Usuário não encontrado.");

  const flags = emptyNavFlags(false);
  for (const key of NAV_FLAG_KEYS) {
    flags[key] = formData.get(`flag_${key}`) === "on" || formData.get(`flag_${key}`) === "true";
  }

  if (target.role === "DEVELOPER") {
    flags.developer = true;
    flags.home = true;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { navFlags: serializeNavFlags(flags) },
  });

  revalidatePath("/developer");
  revalidatePath("/");
}

export async function launchVerba(formData: FormData) {
  const user = await actor();
  if (!canManageFinance(user.role)) throw new Error("Sem permissão para lançar verba.");

  const distributorId = String(formData.get("distributorId") || "");
  const amount = Number(String(formData.get("amount") || "").replace(",", "."));
  const date = new Date(String(formData.get("date") || new Date().toISOString()));
  const observation = String(formData.get("observation") || "").trim() || undefined;

  if (!distributorId) throw new Error("Selecione o distribuidor.");
  await creditVerba({
    distributorId,
    amount,
    date,
    observation,
    createdById: user.id,
  });
  revalidatePath("/verba");
  revalidatePath("/extrato");
  revalidatePath(`/distribuidores/${distributorId}`);
  revalidatePath("/");
}

export async function launchVerbaBatch(
  items: { distributorId: string; amount: number; description: string }[]
) {
  const user = await actor();
  if (!canManageFinance(user.role)) throw new Error("Sem permissão para lançar verba.");
  if (!items.length) throw new Error("Nenhum lançamento para processar.");
  if (items.length > 500) throw new Error("Limite de 500 linhas por planilha.");

  const distributors = await prisma.distributor.findMany({
    select: { id: true, name: true },
  });
  const ids = new Set(distributors.map((d) => d.id));

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.distributorId || !ids.has(item.distributorId)) {
      throw new Error(`Linha ${i + 1}: distribuidor inválido.`);
    }
    if (!Number.isFinite(item.amount) || item.amount <= 0) {
      throw new Error(`Linha ${i + 1}: valor deve ser maior que zero.`);
    }
    if (!item.description?.trim()) {
      throw new Error(`Linha ${i + 1}: descrição obrigatória.`);
    }
  }

  const date = new Date();
  let total = 0;
  for (const item of items) {
    await creditVerba({
      distributorId: item.distributorId,
      amount: item.amount,
      date,
      observation: item.description.trim(),
      createdById: user.id,
    });
    total += item.amount;
  }

  revalidatePath("/verba");
  revalidatePath("/extrato");
  revalidatePath("/distribuidores");
  revalidatePath("/");

  return { count: items.length, total };
}

export async function launchDiscount(formData: FormData) {
  const user = await actor();
  if (!canManageFinance(user.role)) throw new Error("Sem permissão para lançar desconto.");

  const distributorId = String(formData.get("distributorId") || "");
  const amount = Number(String(formData.get("amount") || "").replace(",", "."));
  const date = new Date(String(formData.get("date") || new Date().toISOString()));
  const category = String(formData.get("category") || "") as DiscountCategory;
  const referenceMonth = Number(formData.get("referenceMonth"));
  const referenceYear = Number(formData.get("referenceYear"));
  const observation = String(formData.get("observation") || "").trim() || undefined;

  if (!distributorId) throw new Error("Selecione o distribuidor.");
  if (!Object.values(DiscountCategory).includes(category)) {
    throw new Error("Selecione a categoria do desconto.");
  }

  await debitDiscount({
    distributorId,
    amount,
    date,
    category,
    referenceMonth,
    referenceYear,
    observation,
    createdById: user.id,
  });
  revalidatePath("/descontos");
  revalidatePath("/extrato");
  revalidatePath(`/distribuidores/${distributorId}`);
  revalidatePath("/");
}

export async function launchDiscountBatch(
  items: {
    distributorId: string;
    amount: number;
    category: DiscountCategory;
    description: string;
    referenceMonth: number;
    referenceYear: number;
  }[]
) {
  const user = await actor();
  if (!canManageFinance(user.role)) throw new Error("Sem permissão para lançar desconto.");
  if (!items.length) throw new Error("Nenhum lançamento para processar.");
  if (items.length > 500) throw new Error("Limite de 500 linhas por planilha.");

  const distributors = await prisma.distributor.findMany({
    select: { id: true, name: true, balance: true },
  });
  const byId = new Map(distributors.map((d) => [d.id, d]));
  const remaining = new Map(distributors.map((d) => [d.id, d.balance]));

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const dist = byId.get(item.distributorId);
    if (!dist) throw new Error(`Linha ${i + 1}: distribuidor inválido.`);
    if (!Number.isFinite(item.amount) || item.amount <= 0) {
      throw new Error(`Linha ${i + 1}: valor deve ser maior que zero.`);
    }
    if (!Object.values(DiscountCategory).includes(item.category)) {
      throw new Error(`Linha ${i + 1}: categoria inválida.`);
    }
    if (!item.description?.trim()) {
      throw new Error(`Linha ${i + 1}: descrição obrigatória.`);
    }
    if (
      !Number.isInteger(item.referenceMonth) ||
      item.referenceMonth < 1 ||
      item.referenceMonth > 12
    ) {
      throw new Error(`Linha ${i + 1}: mês de referência inválido.`);
    }
    if (!Number.isInteger(item.referenceYear) || item.referenceYear < 2000) {
      throw new Error(`Linha ${i + 1}: ano de referência inválido.`);
    }
    // Só Campanha consome verba; demais categorias só contabilizam
    if (discountAffectsVerba(item.category)) {
      const avail = remaining.get(item.distributorId) ?? 0;
      if (item.amount > avail) {
        throw new Error(
          `Linha ${i + 1}: saldo insuficiente em ${dist.name} (disponível ${avail.toFixed(2)}).`
        );
      }
      remaining.set(item.distributorId, Math.round((avail - item.amount) * 100) / 100);
    }
  }

  const date = new Date();
  let total = 0;
  for (const item of items) {
    await debitDiscount({
      distributorId: item.distributorId,
      amount: item.amount,
      date,
      category: item.category,
      referenceMonth: item.referenceMonth,
      referenceYear: item.referenceYear,
      observation: item.description.trim(),
      createdById: user.id,
    });
    total += item.amount;
  }

  revalidatePath("/descontos");
  revalidatePath("/extrato");
  revalidatePath("/distribuidores");
  revalidatePath("/");

  return { count: items.length, total };
}

export async function createCampaign(formData: FormData) {
  const user = await actor();
  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "") as
    | "SELL_OUT"
    | "VENDEU_GANHOU"
    | "PERSONALIZADA";
  const distributorId = String(formData.get("distributorId") || "");
  const startRaw = String(formData.get("startDate") || "");
  const endRaw = String(formData.get("endDate") || "");
  const referenceMonth = Number(formData.get("referenceMonth") || 0) || null;
  const referenceYear = Number(formData.get("referenceYear") || 0) || null;
  const projectedQty = formData.get("projectedQty")
    ? Number(String(formData.get("projectedQty")).replace(",", "."))
    : null;
  const description = String(formData.get("description") || "").trim() || null;
  const observations = String(formData.get("observations") || "").trim() || null;
  const productIds = [...new Set(formData.getAll("productIds").map(String).filter(Boolean))];

  if (!name) throw new Error("Informe o nome da campanha.");
  if (!distributorId) throw new Error("Selecione o distribuidor.");
  if (!["SELL_OUT", "VENDEU_GANHOU", "PERSONALIZADA"].includes(category)) {
    throw new Error("Categoria inválida.");
  }

  const dist = await prisma.distributor.findUnique({ where: { id: distributorId } });
  if (!dist) throw new Error("Distribuidor não encontrado.");
  if (user.role === "VENDEDOR" && dist.sellerId !== user.id) {
    throw new Error("Você só pode cadastrar campanhas dos seus distribuidores.");
  }

  const startDate = startRaw ? new Date(startRaw) : null;
  const endDate = endRaw ? new Date(endRaw) : null;
  const status = computeCampaignStatus(startDate, endDate);

  const campaign = await prisma.campaign.create({
    data: {
      name,
      category,
      status,
      distributorId,
      startDate,
      endDate,
      referenceMonth,
      referenceYear,
      projectedQty,
      projectedValue: null,
      unitValue: null,
      description,
      observations,
    },
  });

  if (productIds.length && category !== "PERSONALIZADA") {
    await prisma.campaignProduct.createMany({
      data: productIds.map((productId) => ({
        campaignId: campaign.id,
        productId,
        unitValue: null,
      })),
    });
  }

  revalidatePath("/campanhas");
  revalidatePath("/vendedor");
  revalidatePath(`/distribuidores/${distributorId}`);
}

export async function settleCampaign(formData: FormData) {
  const user = await actor();
  if (user.role !== "ADM" && user.role !== "GESTOR" && user.role !== "DEVELOPER") {
    throw new Error("Somente ADM, Gestor ou Developer podem apurar campanhas.");
  }

  const id = String(formData.get("id") || "");
  const settledOutcome = String(formData.get("settledOutcome") || "").trim();
  const settledNote = String(formData.get("settledNote") || "").trim() || null;
  const rawValue = String(formData.get("settledValue") || "").replace(",", ".");

  if (!id) throw new Error("Campanha não informada.");
  if (settledOutcome !== "ATINGIDA" && settledOutcome !== "NAO_ATINGIDA") {
    throw new Error("Informe se a campanha foi atingida ou não atingida.");
  }

  let settledValue: number;
  if (settledOutcome === "NAO_ATINGIDA") {
    settledValue = 0;
  } else {
    settledValue = Number(rawValue);
    if (!Number.isFinite(settledValue) || settledValue <= 0) {
      throw new Error("Informe um valor apurado maior que zero.");
    }
  }

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) throw new Error("Campanha não encontrada.");

  const firstSettlement = campaign.settledAt == null;

  await prisma.campaign.update({
    where: { id },
    data: {
      settledValue,
      settledOutcome,
      settledAt: new Date(),
      settledById: user.id,
      settledNote:
        settledNote ||
        (settledOutcome === "NAO_ATINGIDA" ? "Campanha não atingida" : null),
    },
  });

  // Primeira apuração atingida: desconta da verba do distribuidor
  if (firstSettlement && settledOutcome === "ATINGIDA" && settledValue > 0) {
    const refMonth = campaign.referenceMonth || new Date().getMonth() + 1;
    const refYear = campaign.referenceYear || new Date().getFullYear();
    await debitDiscount({
      distributorId: campaign.distributorId,
      amount: settledValue,
      date: new Date(),
      category: "CAMPANHA",
      referenceMonth: refMonth,
      referenceYear: refYear,
      observation: settledNote || `Apuração campanha: ${campaign.name}`,
      description: `Apuração campanha — ${campaign.name}`,
      createdById: user.id,
    });
  }

  revalidatePath("/campanhas");
  revalidatePath("/vendedor");
  revalidatePath(`/distribuidores/${campaign.distributorId}`);
  revalidatePath("/extrato");
  revalidatePath("/");
}

export async function cancelCampaign(formData: FormData) {
  const user = await actor();
  const id = String(formData.get("id") || "");
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { distributor: true },
  });
  if (!campaign) throw new Error("Campanha não encontrada.");
  if (user.role === "VENDEDOR" && campaign.distributor.sellerId !== user.id) {
    throw new Error("Sem permissão para cancelar esta campanha.");
  }
  await prisma.campaign.update({
    where: { id },
    data: { status: "CANCELADA" },
  });
  revalidatePath("/campanhas");
}

export async function createBillingProjection(formData: FormData) {
  const user = await actor();
  if (user.role !== "VENDEDOR" && user.role !== "GESTOR" && user.role !== "DEVELOPER") {
    throw new Error("Somente vendedor, gestor ou developer podem lançar projeção de faturamento.");
  }

  const distributorId = String(formData.get("distributorId") || "");
  const amount = Number(String(formData.get("amount") || "").replace(",", "."));
  const description = String(formData.get("description") || "").trim();
  const referenceMonth = Number(formData.get("referenceMonth"));
  const referenceYear = Number(formData.get("referenceYear"));

  if (!distributorId) throw new Error("Selecione o distribuidor.");
  if (!description) throw new Error("Informe a descrição do pedido / projeção.");
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Informe um valor de projeção maior que zero.");
  }
  if (!Number.isInteger(referenceMonth) || referenceMonth < 1 || referenceMonth > 12) {
    throw new Error("Mês de referência inválido.");
  }
  if (!Number.isInteger(referenceYear) || referenceYear < 2000) {
    throw new Error("Ano de referência inválido.");
  }

  const dist = await prisma.distributor.findUnique({ where: { id: distributorId } });
  if (!dist) throw new Error("Distribuidor não encontrado.");

  if (user.role === "VENDEDOR" && dist.sellerId !== user.id) {
    throw new Error("Você só pode projetar faturamento dos seus distribuidores.");
  }

  await prisma.billingProjection.create({
    data: {
      distributorId,
      sellerId: user.role === "VENDEDOR" ? user.id : dist.sellerId,
      amount,
      description,
      referenceMonth,
      referenceYear,
      status: "ABERTA",
    },
  });

  revalidatePath("/projecoes");
  revalidatePath("/vendedor");
  revalidatePath("/");
}

export async function resolveBillingProjection(formData: FormData) {
  const user = await actor();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  const resolveNote = String(formData.get("resolveNote") || "").trim() || null;

  if (!id) throw new Error("Projeção não informada.");
  if (status !== "GANHO" && status !== "PERDIDO") {
    throw new Error("Status inválido. Use Ganho ou Perdido.");
  }

  // Vendedor só pode marcar como perdido
  if (user.role === "VENDEDOR" && status === "GANHO") {
    throw new Error("Vendedor só pode marcar a projeção como perdida.");
  }

  if (
    user.role !== "VENDEDOR" &&
    user.role !== "ADM" &&
    user.role !== "GESTOR" &&
    user.role !== "DEVELOPER"
  ) {
    throw new Error("Sem permissão para atualizar esta projeção.");
  }

  const projection = await prisma.billingProjection.findUnique({
    where: { id },
    include: { distributor: true },
  });
  if (!projection) throw new Error("Projeção não encontrada.");
  if (projection.status !== "ABERTA") {
    throw new Error("Esta projeção já foi resolvida.");
  }

  if (user.role === "VENDEDOR" && projection.sellerId !== user.id) {
    throw new Error("Você só pode atualizar suas próprias projeções.");
  }

  await prisma.billingProjection.update({
    where: { id },
    data: {
      status,
      resolvedById: user.id,
      resolvedAt: new Date(),
      resolveNote,
    },
  });

  revalidatePath("/projecoes");
  revalidatePath("/vendedor");
  revalidatePath("/");
}
