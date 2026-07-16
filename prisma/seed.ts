import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  CampaignStatus,
  DiscountCategory,
  Role,
} from "../src/lib/types";
import {
  defaultNavFlagsForRole,
  serializeNavFlags,
} from "../src/lib/nav-flags";

const prisma = new PrismaClient();

async function main() {
  await prisma.campaignProduct.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.billingProjection.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.distributor.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("demo123", 10);

  const flags = (role: (typeof Role)[keyof typeof Role]) =>
    serializeNavFlags(defaultNavFlagsForRole(role));

  const developer = await prisma.user.create({
    data: {
      name: "Dev Master",
      email: "developer@vpc.local",
      passwordHash,
      role: Role.DEVELOPER,
      navFlags: flags(Role.DEVELOPER),
    },
  });

  const gestor = await prisma.user.create({
    data: {
      name: "Marina Gestora",
      email: "gestor@vpc.local",
      passwordHash,
      role: Role.GESTOR,
      navFlags: flags(Role.GESTOR),
    },
  });

  const adm = await prisma.user.create({
    data: {
      name: "Carlos Admin",
      email: "adm@vpc.local",
      passwordHash,
      role: Role.ADM,
      navFlags: flags(Role.ADM),
    },
  });

  const vendedor1 = await prisma.user.create({
    data: {
      name: "Ana Vendedora",
      email: "vendedor@vpc.local",
      passwordHash,
      role: Role.VENDEDOR,
      navFlags: flags(Role.VENDEDOR),
    },
  });

  const vendedor2 = await prisma.user.create({
    data: {
      name: "Bruno Vendedor",
      email: "vendedor2@vpc.local",
      passwordHash,
      role: Role.VENDEDOR,
      navFlags: flags(Role.VENDEDOR),
    },
  });

  void developer;

  const products = await Promise.all(
    ["Produto Alpha", "Produto Beta", "Produto Gamma", "Produto Delta"].map(
      (name) => prisma.product.create({ data: { name } })
    )
  );

  const dists = await Promise.all([
    prisma.distributor.create({
      data: { name: "Distribuidora Norte Sul", sellerId: vendedor1.id, balance: 0 },
    }),
    prisma.distributor.create({
      data: { name: "Comercial Atlântico", sellerId: vendedor1.id, balance: 0 },
    }),
    prisma.distributor.create({
      data: { name: "Rede Horizonte", sellerId: vendedor1.id, balance: 0 },
    }),
    prisma.distributor.create({
      data: { name: "Atacado Central", sellerId: vendedor2.id, balance: 0 },
    }),
    prisma.distributor.create({
      data: { name: "Distribuidora Litoral", sellerId: vendedor2.id, balance: 0 },
    }),
  ]);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  async function credit(distId: string, amount: number, daysAgo: number, obs: string) {
    const d = dists.find((x) => x.id === distId)!;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const balanceAfter = d.balance + amount;
    await prisma.ledgerEntry.create({
      data: {
        distributorId: distId,
        date,
        type: "CREDITO",
        description: "Crédito de verba",
        credit: amount,
        debit: 0,
        balanceAfter,
        observation: obs,
        createdById: adm.id,
      },
    });
    d.balance = balanceAfter;
    await prisma.distributor.update({ where: { id: distId }, data: { balance: balanceAfter } });
  }

  async function debit(
    distId: string,
    amount: number,
    daysAgo: number,
    cat: string,
    obs: string
  ) {
    const d = dists.find((x) => x.id === distId)!;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const balanceAfter = d.balance - amount;
    await prisma.ledgerEntry.create({
      data: {
        distributorId: distId,
        date,
        type: "DEBITO",
        discountCategory: cat,
        description: `Desconto — ${cat}`,
        credit: 0,
        debit: amount,
        balanceAfter,
        referenceMonth: month,
        referenceYear: year,
        observation: obs,
        createdById: adm.id,
      },
    });
    d.balance = balanceAfter;
    await prisma.distributor.update({ where: { id: distId }, data: { balance: balanceAfter } });
  }

  await credit(dists[0].id, 50000, 60, "Verba inicial Q1");
  await credit(dists[0].id, 15000, 20, "Reforço promocional");
  await debit(dists[0].id, 12000, 15, DiscountCategory.SELL_OUT, "SPIFF março");
  await debit(dists[0].id, 8000, 8, DiscountCategory.VENDEU_GANHOU, "Incentivo equipe");
  await debit(dists[0].id, 3500, 3, DiscountCategory.CAMPANHA, "Ação personalizada");

  await credit(dists[1].id, 35000, 45, "Verba inicial");
  await debit(dists[1].id, 18000, 10, DiscountCategory.SELL_IN, "Acordo sell in");
  await debit(dists[1].id, 5000, 5, DiscountCategory.OUTROS, "Ajuste operacional");

  await credit(dists[2].id, 8000, 30, "Verba reduzida");
  await debit(dists[2].id, 6500, 12, DiscountCategory.SELL_OUT, "Campanha produto");

  await credit(dists[3].id, 42000, 40, "Verba anual");
  await debit(dists[3].id, 10000, 18, DiscountCategory.VENDEU_GANHOU, "Meta batida");
  await debit(dists[3].id, 7000, 6, DiscountCategory.SELL_OUT, "SPIFF");

  await credit(dists[4].id, 25000, 25, "Abertura conta");

  const startActive = new Date(year, month - 1, 1);
  const endActive = new Date(year, month - 1, 28);
  const startFuture = new Date(year, month, 1);
  const endFuture = new Date(year, month, 20);
  const startPast = new Date(year, month - 2, 1);
  const endPast = new Date(year, month - 2, 25);

  const c1 = await prisma.campaign.create({
    data: {
      name: "SPIFF Alpha Março",
      category: "SELL_OUT",
      status: CampaignStatus.ATIVA,
      distributorId: dists[0].id,
      startDate: startActive,
      endDate: endActive,
      referenceMonth: month,
      referenceYear: year,
      projectedQty: 200,
      projectedValue: null,
      unitValue: null,
      observations: "Foco em ponta de gôndola",
      settledValue: 9800,
      settledAt: new Date(),
      settledById: adm.id,
      settledNote: "Apuração demo",
    },
  });
  await prisma.campaignProduct.create({
    data: { campaignId: c1.id, productId: products[0].id, unitValue: null },
  });
  await prisma.campaignProduct.create({
    data: { campaignId: c1.id, productId: products[1].id, unitValue: null },
  });

  const c2 = await prisma.campaign.create({
    data: {
      name: "Vendeu Ganhou Equipe",
      category: "VENDEU_GANHOU",
      status: CampaignStatus.ATIVA,
      distributorId: dists[0].id,
      startDate: startActive,
      endDate: new Date(year, month - 1, Math.min(now.getDate() + 5, 28)),
      referenceMonth: month,
      referenceYear: year,
      projectedQty: 150,
      projectedValue: null,
      unitValue: null,
    },
  });
  await prisma.campaignProduct.create({
    data: { campaignId: c2.id, productId: products[2].id, unitValue: null },
  });

  await prisma.campaign.create({
    data: {
      name: "Ação Regional Personalizada",
      category: "PERSONALIZADA",
      status: CampaignStatus.AGENDADA,
      distributorId: dists[1].id,
      startDate: startFuture,
      endDate: endFuture,
      referenceMonth: month === 12 ? 1 : month + 1,
      referenceYear: month === 12 ? year + 1 : year,
      projectedValue: null,
      description: "Evento de lançamento com material POP e treinamento.",
    },
  });

  await prisma.campaign.create({
    data: {
      name: "Encerrada Beta",
      category: "SELL_OUT",
      status: CampaignStatus.ENCERRADA,
      distributorId: dists[3].id,
      startDate: startPast,
      endDate: endPast,
      referenceMonth: month === 1 ? 12 : month - 1,
      referenceYear: month === 1 ? year - 1 : year,
      projectedValue: null,
      unitValue: null,
      settledValue: 8700,
      settledAt: new Date(),
      settledById: adm.id,
    },
  });

  await prisma.campaign.create({
    data: {
      name: "Meta Litoral",
      category: "VENDEU_GANHOU",
      status: CampaignStatus.ATIVA,
      distributorId: dists[3].id,
      startDate: startActive,
      endDate: endActive,
      referenceMonth: month,
      referenceYear: year,
      projectedValue: null,
      unitValue: null,
    },
  });

  await prisma.billingProjection.createMany({
    data: [
      {
        distributorId: dists[0].id,
        sellerId: vendedor1.id,
        amount: 85000,
        description: "Pedido #4102 — mix Alpha/Beta",
        referenceMonth: month,
        referenceYear: year,
        status: "ABERTA",
      },
      {
        distributorId: dists[1].id,
        sellerId: vendedor1.id,
        amount: 42000,
        description: "Pedido #4108 — reposição Gamma",
        referenceMonth: month,
        referenceYear: year,
        status: "ABERTA",
      },
      {
        distributorId: dists[3].id,
        sellerId: vendedor2.id,
        amount: 61000,
        description: "Pedido #4115 — campanha Litoral",
        referenceMonth: month,
        referenceYear: year,
        status: "GANHO",
        resolvedById: gestor.id,
        resolvedAt: new Date(),
        resolveNote: "Faturado parcialmente confirmado",
      },
      {
        distributorId: dists[0].id,
        sellerId: vendedor1.id,
        amount: 15000,
        description: "Pedido #4090 — cancelado pelo cliente",
        referenceMonth: month,
        referenceYear: year,
        status: "PERDIDO",
        resolvedById: vendedor1.id,
        resolvedAt: new Date(),
      },
    ],
  });

  console.log("Seed OK");
  console.log(
    "Logins: developer@vpc.local | gestor@vpc.local | adm@vpc.local | vendedor@vpc.local — senha demo123"
  );
  console.log({
    developer: developer.email,
    gestor: gestor.email,
    adm: adm.email,
    vendedor1: vendedor1.email,
    vendedor2: vendedor2.email,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
