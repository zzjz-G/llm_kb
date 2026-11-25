import {
  Injectable,
  Inject,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/common/database/drizzle.constants';
import type { PostgresJsDatabase } from '@server/common/database/database.module';
import { sql, desc, count, and } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { hazardousChemicals } from '@server/database/tables';
import { LogService } from '@server/common/log/log.service';
import type {
  HazardousChemical,
  HazchemCheckResult,
  HazchemListParams,
  HazchemListResult,
} from '@shared/api.interface';

type HazchemRow = typeof hazardousChemicals.$inferSelect;

function mapHazchem(row: HazchemRow): HazardousChemical {
  return {
    id: row.id,
    seq: row.seq,
    names: row.names ?? [],
    alias: row.alias ?? undefined,
    cas: row.cas ?? undefined,
    note: row.note ?? undefined,
  };
}

const SYNONYM_MAP: Record<string, string[]> = {
  乙醇: ['无水乙醇', '酒精', '无水酒精', '纯酒精'],
  甲醇: ['木精', '木醇', '无水甲醇'],
  丙酮: ['二甲酮', '醋酮', '阿西通'],
  乙酸乙酯: ['醋酸乙酯', '乙酯'],
  二氯甲烷: ['甲叉二氯', '亚甲基氯', 'DCM'],
  三氯甲烷: ['氯仿', '哥罗芳', '三氯甲'],
  四氢呋喃: ['THF', '氧杂环戊烷', '一氧五环'],
  乙腈: ['甲基氰', '氰甲烷', '无水乙腈'],
  二甲苯: ['二甲苯异构体混合物', '混合二甲苯'],
  甲苯: ['甲基苯', '苯基甲烷', '无水甲苯'],
  苯: ['安息油', '纯苯', '苯乙烯'],
  异丙醇: ['2-丙醇', '异丙基醇', 'IPA'],
  正己烷: ['己烷', '正己烷异构体混合物'],
  乙醚: ['二乙醚', '乙氧基乙烷'],
  石油醚: ['石油精', '石油英'],
  盐酸: ['氢氯酸', '氯化氢溶液', '浓盐酸'],
  硫酸: ['浓硫酸', '发烟硫酸'],
  硝酸: ['浓硝酸', '发烟硝酸'],
  氨水: ['氢氧化铵', '阿摩尼亚水', '氨溶液'],
  氢氧化钠: ['烧碱', '火碱', '苛性钠', '片碱'],
  过氧化氢: ['双氧水', '二氧化氢'],
  高锰酸钾: ['灰锰氧', '过锰酸钾', 'PP粉'],
  硫酸铜: ['蓝矾', '胆矾', '硫酸铜(II)'],
  硫酸亚铁: ['绿矾', '铁矾', '硫酸亚铁(II)'],
  氯化钴: ['氯化亚钴', '二氯化钴', '氯化钴(II)'],
  氯化钠: ['食盐', '石盐', '普通盐'],
  硝酸银: ['银丹', '硝酸银(I)'],
  碘化钾: ['灰碘'],
  硫代硫酸钠: ['大苏打', '海波', '次亚硫酸钠'],
  甲醛: ['福尔马林', '蚁醛', '福美林'],
  苯酚: ['石炭酸', '羟基苯'],
  苯胺: ['氨基苯', '阿尼林油', '阿尼林'],
  冰醋酸: ['冰乙酸', '乙酸', '醋酸'],
};

const HYDRATE_PREFIXES = ['无水', '一水', '二水', '三水', '四水', '五水', '六水', '七水', '八水', '九水', '十水', '水合'];

const CONCENTRATION_SUFFIXES = [
  '溶液', '水溶液', '饱和溶液', '标准溶液',
  '浓', '稀', '高纯', '优级纯', '分析纯', '化学纯', '色谱纯',
  'GR', 'AR', 'CP', 'HPLC',
];

function normalizeName(raw: string): string {
  let result: string = raw.trim();
  result = result.replace(/[\uff01-\uff5e]/g, (ch: string): string =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
  );
  result = result.replace(/\u3000/g, ' ');
  result = result.replace(/\s+/g, '');
  result = result.toLowerCase();
  return result;
}

function removeBrackets(text: string): string {
  let result: string = text;
  result = result.replace(/[\[\]\(\)（）【】「」『』《》〈〉]/g, ' ');
  result = result.replace(/\s+/g, '');
  return result;
}

function stripHydratePrefix(name: string): string {
  let result: string = name;
  for (const prefix of HYDRATE_PREFIXES) {
    if (result.startsWith(prefix)) {
      result = result.slice(prefix.length);
      break;
    }
  }
  return result;
}

function stripConcentrationSuffix(name: string): string {
  let result: string = name;
  for (const suffix of CONCENTRATION_SUFFIXES) {
    if (result.endsWith(suffix)) {
      result = result.slice(0, -suffix.length);
      break;
    }
  }
  return result;
}

function deepNormalize(raw: string): string[] {
  const normalized: string = normalizeName(raw);
  const variants: Set<string> = new Set();

  variants.add(normalized);

  const noBrackets: string = removeBrackets(normalized);
  if (noBrackets !== normalized) {
    variants.add(noBrackets);
  }

  const noHydrate: string = stripHydratePrefix(normalized);
  if (noHydrate !== normalized && noHydrate.length > 0) {
    variants.add(noHydrate);
  }

  const noHydrateNoBrackets: string = stripHydratePrefix(noBrackets);
  if (noHydrateNoBrackets !== noBrackets && noHydrateNoBrackets.length > 0) {
    variants.add(noHydrateNoBrackets);
  }

  const noSuffix: string = stripConcentrationSuffix(normalized);
  if (noSuffix !== normalized && noSuffix.length > 0) {
    variants.add(noSuffix);
  }

  const noSuffixNoBrackets: string = stripConcentrationSuffix(noBrackets);
  if (noSuffixNoBrackets !== noBrackets && noSuffixNoBrackets.length > 0) {
    variants.add(noSuffixNoBrackets);
  }

  const allClean: string = stripConcentrationSuffix(noHydrateNoBrackets);
  if (allClean !== noHydrateNoBrackets && allClean.length > 0) {
    variants.add(allClean);
  }

  return Array.from(variants).filter((v: string): boolean => v.length >= 1);
}

function buildSynonymKeys(baseName: string): string[] {
  const keys: string[] = [];
  const normalizedBase: string = normalizeName(baseName);

  for (const [canonical, synonyms] of Object.entries(SYNONYM_MAP)) {
    const canonNorm: string = normalizeName(canonical);
    const synonymNorms: string[] = synonyms.map((s: string): string => normalizeName(s));
    const allNorms: string[] = [canonNorm, ...synonymNorms];

    const baseVariants: string[] = deepNormalize(normalizedBase);
    for (const variant of baseVariants) {
      if (allNorms.some((n: string): boolean => deepNormalize(n).includes(variant))) {
        keys.push(canonNorm, ...synonymNorms);
        break;
      }
    }
  }

  return keys;
}

function isLikelyMatch(queryNorm: string, targetNorm: string): boolean {
  const queryVariants: string[] = deepNormalize(queryNorm);
  const targetVariants: string[] = deepNormalize(targetNorm);

  for (const qv of queryVariants) {
    for (const tv of targetVariants) {
      if (qv === tv) return true;
    }
  }

  const synKeys: string[] = buildSynonymKeys(queryNorm);
  for (const sk of synKeys) {
    for (const tv of targetVariants) {
      if (sk === tv) return true;
    }
  }

  return false;
}

@Injectable()
export class HazardousChemicalsService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly logService: LogService,
  ) {}

  async checkChemical(
    name?: string,
    cas?: string,
  ): Promise<HazchemCheckResult> {
    const trimmedCas: string | undefined = cas && cas.trim() ? cas.trim() : undefined;
    const trimmedName: string | undefined = name && name.trim() ? name.trim() : undefined;

    let casMatch: HazchemRow | null = null;
    if (trimmedCas) {
      try {
        const casRows: HazchemRow[] = await this.db
          .select()
          .from(hazardousChemicals)
          .where(sql`${hazardousChemicals.cas} = ${trimmedCas}`)
          .limit(1);
        if (casRows.length > 0) {
          casMatch = casRows[0];
        }
      } catch (err: unknown) {
        throw new InternalServerErrorException('CAS 匹配查询失败');
      }
    }

    let nameMatch: HazchemRow | null = null;
    let nameMatchType: 'name' | 'alias' = 'name';
    const candidates: HazardousChemical[] = [];

    if (trimmedName) {
      const normalizedName: string = normalizeName(trimmedName);
      const nameVariants: string[] = deepNormalize(trimmedName);
      const synKeys: string[] = buildSynonymKeys(trimmedName);
      const allKeys: string[] = [...new Set([...nameVariants, ...synKeys])];

      try {
        const searchArray: SQL = sql`ARRAY[${sql.join(allKeys.map((k: string): SQL => sql`${k}`), sql`, `)}]::text[]`;

        const nameRows: HazchemRow[] = await this.db
          .select()
          .from(hazardousChemicals)
          .where(
            sql`${hazardousChemicals.searchKeys} && ${searchArray}`,
          )
          .limit(20);

        for (const row of nameRows) {
          const rowNames: string[] = row.names ?? [];
          const rowAlias: string = row.alias ?? '';

          let exactNameHit: boolean = false;
          for (const n of rowNames) {
            if (isLikelyMatch(normalizedName, n)) {
              exactNameHit = true;
              break;
            }
          }

          let aliasHit: boolean = false;
          if (rowAlias && isLikelyMatch(normalizedName, rowAlias)) {
            aliasHit = true;
          }

          if (exactNameHit || aliasHit) {
            if (!nameMatch) {
              nameMatch = row;
              nameMatchType = aliasHit && !exactNameHit ? 'alias' : 'name';
            } else {
              candidates.push(mapHazchem(row));
            }
          }
        }
      } catch (err: unknown) {
        throw new InternalServerErrorException('名称匹配查询失败');
      }
    }

    if (casMatch) {
      const result: HazchemCheckResult = {
        isHazardous: true,
        match: mapHazchem(casMatch),
        matchType: 'cas',
      };

      if (nameMatch && nameMatch.id !== casMatch.id) {
        result.conflictWarning =
          `CAS号 ${trimmedCas} 匹配到「${casMatch.names[0] ?? ''}」，` +
          `但名称「${trimmedName}」匹配到「${nameMatch.names[0] ?? ''}」，` +
          '两者不一致，请核对CAS号是否填写正确。';
        result.candidates = [mapHazchem(nameMatch), ...candidates];
      } else if (!nameMatch && trimmedName) {
        result.conflictWarning =
          `CAS号 ${trimmedCas} 匹配到「${casMatch.names[0] ?? ''}」，` +
          `但名称「${trimmedName}」未在目录中匹配到对应条目，` +
          '请核对CAS号与名称是否一致。';
      }

      return result;
    }

    if (nameMatch) {
      const result: HazchemCheckResult = {
        isHazardous: true,
        match: mapHazchem(nameMatch),
        matchType: nameMatchType,
      };
      if (candidates.length > 0) {
        result.candidates = candidates;
      }
      return result;
    }

    if (trimmedName && candidates.length > 0) {
      return {
        isHazardous: false,
        candidates,
      };
    }

    return { isHazardous: false };
  }

  async list(params: HazchemListParams): Promise<HazchemListResult> {
    const page: number = Math.max(1, params.page ?? 1);
    const pageSize: number = Math.min(100, Math.max(1, params.pageSize ?? 10));
    const offset: number = (page - 1) * pageSize;

    const conditions: SQL[] = [];

    if (params.keyword) {
      const keyword: string = `%${params.keyword}%`;
      conditions.push(
        sql`(${hazardousChemicals.cas} ILIKE ${keyword}
          OR ${hazardousChemicals.alias} ILIKE ${keyword}
          OR ${hazardousChemicals.names}::text ILIKE ${keyword})`,
      );
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    try {
      const [countResult, rows]: [
        { count: number }[],
        HazchemRow[],
      ] = await Promise.all([
        this.db
          .select({ count: count() })
          .from(hazardousChemicals)
          .where(whereClause),
        this.db
          .select()
          .from(hazardousChemicals)
          .where(whereClause)
          .orderBy(desc(hazardousChemicals.seq))
          .limit(pageSize)
          .offset(offset),
      ]);

      return {
        items: rows.map((row: HazchemRow): HazardousChemical =>
          mapHazchem(row),
        ),
        total: countResult[0]?.count ?? 0,
        page,
        pageSize,
      };
    } catch (err: unknown) {
      throw new InternalServerErrorException('危化品目录查询失败');
    }
  }

  async getById(id: string): Promise<HazardousChemical> {
    try {
      const rows: HazchemRow[] = await this.db
        .select()
        .from(hazardousChemicals)
        .where(sql`${hazardousChemicals.id} = ${id}::uuid`)
        .limit(1);
      if (rows.length === 0) {
        throw new NotFoundException('危化品记录不存在');
      }
      return mapHazchem(rows[0]);
    } catch (err: unknown) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('危化品详情查询失败');
    }
  }

  async detectHazardous(
    materialName: string,
    cas?: string,
  ): Promise<'yes' | 'no'> {
    const result: HazchemCheckResult = await this.checkChemical(
      materialName,
      cas,
    );
    return result.isHazardous ? 'yes' : 'no';
  }
}
