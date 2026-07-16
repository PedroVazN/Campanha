import type { Prisma } from "@prisma/client";
import type { DiscountCategory } from "./types";
import { prisma } from "./prisma";
import { roundMoney } from "./money";

type Tx = Prisma.TransactionClient;

/** Só a categoria Campanha reduz a verba do cliente. */
export function discountAffectsVerba(category: DiscountCategory | string): boolean {
  return category === "CAMPANHA";
}

async function getBalance(tx: Tx, distributorId: string): Promise<number> {
  const dist = await tx.distributor.findUniqueOrThrow({
    where: { id: distributorId },
    select: { balance: true },
  });
  return dist.balance;
}

export async function creditVerba(input: {
  distributorId: string;
  amount: number;
  date: Date;
  observation?: string;
  createdById?: string;
}) {
  const amount = roundMoney(input.amount);
  if (amount <= 0) throw new Error("Informe um valor de verba maior que zero.");

  return prisma.$transaction(async (tx) => {
    const current = await getBalance(tx, input.distributorId);
    const balanceAfter = roundMoney(current + amount);

    const entry = await tx.ledgerEntry.create({
      data: {
        distributorId: input.distributorId,
        date: input.date,
        type: "CREDITO",
        description: "Crédito de verba",
        credit: amount,
        debit: 0,
        balanceAfter,
        observation: input.observation || null,
        createdById: input.createdById || null,
      },
    });

    await tx.distributor.update({
      where: { id: input.distributorId },
      data: { balance: balanceAfter },
    });

    return entry;
  });
}

export async function debitDiscount(input: {
  distributorId: string;
  amount: number;
  date: Date;
  category: DiscountCategory;
  referenceMonth: number;
  referenceYear: number;
  observation?: string;
  createdById?: string;
  description?: string;
}) {
  const amount = roundMoney(input.amount);
  if (amount <= 0) throw new Error("Informe um valor de desconto maior que zero.");

  const affectsVerba = discountAffectsVerba(input.category);

  return prisma.$transaction(async (tx) => {
    const current = await getBalance(tx, input.distributorId);

    if (affectsVerba && amount > current) {
      throw new Error(
        `Saldo insuficiente. Disponível: R$ ${current.toFixed(2).replace(".", ",")}. Ajuste o valor ou lance verba antes.`
      );
    }

    const balanceAfter = affectsVerba ? roundMoney(current - amount) : current;
    const entry = await tx.ledgerEntry.create({
      data: {
        distributorId: input.distributorId,
        date: input.date,
        type: "DEBITO",
        discountCategory: input.category,
        description:
          input.description ||
          (affectsVerba
            ? `Desconto na verba — Campanha`
            : `Lançamento contábil — ${input.category.replace(/_/g, " ")} (não desconta verba)`),
        credit: 0,
        debit: amount,
        balanceAfter,
        referenceMonth: input.referenceMonth,
        referenceYear: input.referenceYear,
        observation: input.observation || null,
        createdById: input.createdById || null,
      },
    });

    if (affectsVerba) {
      await tx.distributor.update({
        where: { id: input.distributorId },
        data: { balance: balanceAfter },
      });
    }

    return entry;
  });
}
