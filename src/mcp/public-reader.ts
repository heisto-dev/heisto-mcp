import type { Db } from '../db.js';
import { currentFee, lamportsToSol } from '../lib/sdk.js';

export const SITE = 'https://heisto.xyz';
export interface PublicPracticeTemplate {
  id: string; name: string; model: string; goal: string; pub: string;
}
export interface PublicMcpReader {
  config(): Promise<Record<string, unknown>>;
  list(network: 'mainnet' | 'practice'): Promise<Record<string, unknown>[]>;
  sentinel(id: string): Promise<Record<string, unknown> | null>;
  attempts(id: string, limit: number): Promise<Record<string, unknown>[] | null>;
}
const columns = 'id, name, model, status, pool, base_fee, attack_count, goal, persona';
const validId = (id: string) => /^\d{1,20}$/.test(id) && BigInt(id) <= 18_446_744_073_709_551_615n;

export function createPublicMcpReader(options: {
  db: Db;
  config: () => Promise<Record<string, unknown>>;
  practiceCatalog: readonly PublicPracticeTemplate[];
}): PublicMcpReader {
  const { db, practiceCatalog } = options;
  const mainnet = (row: Record<string, any>) => ({
    id: String(row.id), name: row.name, modelFamily: row.model, network: 'mainnet',
    status: row.status, poolSol: lamportsToSol(BigInt(row.pool)),
    poolLamports: String(row.pool),
    currentFeeSol: lamportsToSol(currentFee(BigInt(row.base_fee), BigInt(row.attack_count))),
    attackCount: Number(row.attack_count), breached: row.status === 'breached',
    publicObjective: row.goal,
    // persona is the already-public b.publicInstructions field, not private_enc.
    publicInstructions: row.persona, link: `${SITE}/#sentinel-${row.id}`,
  });
  const practice = () => practiceCatalog.map(row => ({
    id: `practice:${row.id}`, name: row.name, modelFamily: row.model, network: 'practice',
    status: 'practice', hasPrizePool: false, poolSol: null, poolLamports: null,
    currentFeeSol: null, attackCount: null, breached: null,
    publicObjective: row.goal, publicInstructions: row.pub, link: `${SITE}/#practice`,
  }));
  const sentinel: PublicMcpReader['sentinel'] = async id => {
    if (id.startsWith('practice:')) return practice().find(row => row.id === id) ?? null;
    if (!validId(id)) return null;
    const { rows } = await db.query(
      `SELECT ${columns} FROM sentinels WHERE id=$1 AND status <> 'draft'`, [id],
    );
    return rows[0] ? mainnet(rows[0]) : null;
  };
  return {
    config: async () => {
      const config = await options.config();
      return {
        network: config.cluster === 'mainnet-beta' ? 'mainnet' : config.cluster,
        programId: config.programId, mode: config.mode, paused: config.paused,
        minPoolSol: config.minPoolSol ?? null, maxPoolSol: config.maxPoolSol ?? null,
        feeSplitPercent: config.split ? {
          pool: (config.split as Record<string, unknown>).pool,
          defender: (config.split as Record<string, unknown>).defender,
          treasury: (config.split as Record<string, unknown>).treasury,
          reserve: (config.split as Record<string, unknown>).burn,
        } : null,
        feeReserve: { handling: 'owner-held', automaticTokenBurn: false },
        breachRule: { judges: 3, minimumBreachVotes: 2, minimumAverageScore: 0.8 },
        refundDelaySeconds: 900,
        note: 'Null policy values are unavailable, not zero. Refund eligibility requires an unsettled attack.',
        link: `${SITE}/#arena`,
      };
    },
    list: async network => {
      if (network === 'practice') return practice();
      const { rows } = await db.query(
        `SELECT ${columns} FROM sentinels WHERE status <> 'draft'
         ORDER BY (status='live') DESC, pool DESC LIMIT 200`,
      );
      return rows.map(mainnet);
    },
    sentinel,
    attempts: async (id, limit) => {
      if (!await sentinel(id)) return null;
      if (id.startsWith('practice:')) return [];
      const { rows } = await db.query(
        `SELECT a.technique, a.score, a.success, a.created_at, a.attacker
         FROM attacks a JOIN sentinels s ON s.id=a.sentinel_id
         WHERE a.sentinel_id=$1 AND s.status <> 'draft'
           AND a.status='settled' AND a.score IS NOT NULL AND a.success IS NOT NULL
         ORDER BY a.created_at DESC, a.seq DESC LIMIT $2`, [id, limit],
      );
      return rows.map(row => ({
        technique: row.technique ?? 'unclassified', score: Number(row.score) / 1000,
        verdict: row.success ? 'breached' : 'held',
        time: new Date(row.created_at).toISOString(),
        wallet: `${String(row.attacker).slice(0, 4)}…${String(row.attacker).slice(-4)}`,
        link: `${SITE}/#sentinel-${id}`,
      }));
    },
  };
}
