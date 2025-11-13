'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '../../../lib/auth';
import { BACKEND_URL } from '../../../lib/constants';
import type { OrganizationDto } from '../types';

type Options = {
  name: string;
  companyId: string;
  organizationAlias: string;
  excludeId?: number | null;
  enabled?: boolean;
};

export function useDuplicateSuggestions({
  name,
  companyId,
  organizationAlias,
  excludeId,
  enabled = true,
}: Options) {
  const [suggestions, setSuggestions] = useState<OrganizationDto[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const normalizedName = name.trim();
    const normalizedAlias = organizationAlias.trim();

    if (
      !enabled ||
      (!normalizedName && !companyId && !normalizedAlias) ||
      (normalizedName && normalizedName.length < 2) ||
      (normalizedAlias && normalizedAlias.length < 2)
    ) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (normalizedName) params.set('name', normalizedName);
        if (companyId) params.set('companyId', companyId);
        if (normalizedAlias) params.set('organizationAlias', normalizedAlias);
        if (excludeId) params.set('excludeId', String(excludeId));

        const res = await authFetch(
          `${BACKEND_URL}/organizations/duplicates?${params.toString()}`,
        );
        const data: OrganizationDto[] = await res.json();
        const filtered = data.filter(
          (org) => org.isActive && (!excludeId || Number(org.id) !== excludeId),
        );
        setSuggestions(filtered);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [name, companyId, organizationAlias, excludeId, enabled]);

  return { suggestions, loading };
}
