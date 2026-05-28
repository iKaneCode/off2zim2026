import { prisma } from "@/lib/prisma";
import {
  buildServiceProviderId,
  getServiceProviderIdPrefix,
  normalizeServiceProviderId,
  serviceProviderRouteSegmentToId,
} from "@/lib/service-provider-id";

type ProviderCompanyIdRecord = {
  id: string;
  createdAt: Date;
  serviceProviderId?: string | null;
};

function getSequenceFromServiceProviderId(value?: string | null) {
  const normalized = normalizeServiceProviderId(value);
  const [, sequence] = normalized.match(/^\d{6}\/(\d{5})$/) ?? [];
  return sequence ? Number(sequence) : null;
}

export async function ensureServiceProviderIds<
  T extends ProviderCompanyIdRecord,
>(companies: T[]) {
  const assignments = new Map<string, string>();
  const usedSequencesByPrefix = new Map<string, Set<number>>();

  for (const company of companies) {
    const normalizedId = normalizeServiceProviderId(company.serviceProviderId);
    const sequence = getSequenceFromServiceProviderId(normalizedId);
    if (!normalizedId || !sequence) continue;

    const prefix = normalizedId.slice(0, 6);
    const usedSequences = usedSequencesByPrefix.get(prefix) ?? new Set();
    usedSequences.add(sequence);
    usedSequencesByPrefix.set(prefix, usedSequences);
  }

  const missingCompanies = companies
    .filter((company) => !normalizeServiceProviderId(company.serviceProviderId))
    .sort(
      (first, second) =>
        first.createdAt.getTime() - second.createdAt.getTime() ||
        first.id.localeCompare(second.id),
    );

  for (const company of missingCompanies) {
    const prefix = getServiceProviderIdPrefix(company.createdAt);
    const usedSequences = usedSequencesByPrefix.get(prefix) ?? new Set();
    let sequence = 1;
    while (usedSequences.has(sequence)) sequence += 1;

    const serviceProviderId = buildServiceProviderId(
      company.createdAt,
      sequence,
    );
    usedSequences.add(sequence);
    usedSequencesByPrefix.set(prefix, usedSequences);
    assignments.set(company.id, serviceProviderId);

    await prisma.providerCompany.update({
      where: { id: company.id },
      data: { serviceProviderId },
    });
  }

  return companies.map((company) => {
    const serviceProviderId = assignments.get(company.id);
    return serviceProviderId ? { ...company, serviceProviderId } : company;
  });
}

export async function generateNextServiceProviderId(value: Date = new Date()) {
  const prefix = getServiceProviderIdPrefix(value);
  const companies = await prisma.providerCompany.findMany({
    where: {
      serviceProviderId: {
        startsWith: `${prefix}/`,
      },
    },
    select: {
      serviceProviderId: true,
    },
  });
  const usedSequences = new Set(
    companies
      .map((company) =>
        getSequenceFromServiceProviderId(company.serviceProviderId),
      )
      .filter((sequence): sequence is number => Boolean(sequence)),
  );
  let sequence = 1;
  while (usedSequences.has(sequence)) sequence += 1;
  return buildServiceProviderId(value, sequence);
}

export function getProviderCompanyIdentifierWhere(identifier: string) {
  const serviceProviderId = serviceProviderRouteSegmentToId(identifier);
  return {
    OR: [{ id: identifier }, { serviceProviderId }],
  };
}
