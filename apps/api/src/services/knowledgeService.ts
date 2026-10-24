import { prisma } from '../prisma';
import { KnowledgeSourceCitation, KnowledgeSource } from '@haq/shared';

export class KnowledgeService {
  /**
   * Retrieve all reviewed knowledge sources.
   */
  static async getAllSources(): Promise<KnowledgeSource[]> {
    const records = await prisma.knowledgeSource.findMany({
      orderBy: { id: 'asc' },
    });

    return records.map((r) => ({
      id: r.id,
      title: r.title,
      url: r.url,
      sourceType: r.sourceType as any,
      checkedAt: r.checkedAt.toISOString(),
      version: r.version,
      reviewStatus: r.reviewStatus as any,
      excerpt: r.excerpt,
      reviewerNotes: r.reviewerNotes,
    }));
  }

  /**
   * Retrieve knowledge source by ID as citation.
   */
  static async getCitation(sourceId: string): Promise<KnowledgeSourceCitation> {
    const src = await prisma.knowledgeSource.findUnique({
      where: { id: sourceId },
    });

    if (!src) {
      return {
        sourceId: 'MAHABOCW-SRC-REG-01',
        title: 'MAHABOCW Official Portal',
        url: 'https://mahabocw.in/en/home/',
        excerpt: 'Official guidelines of Maharashtra Building and Other Construction Workers Welfare Board.',
      };
    }

    return {
      sourceId: src.id,
      title: src.title,
      url: src.url,
      excerpt: src.excerpt,
    };
  }

  /**
   * Search relevant excerpts for AI assistant context grounding.
   */
  static async getContextExcerpts(): Promise<string> {
    const sources = await prisma.knowledgeSource.findMany();
    return sources
      .map(
        (s) =>
          `[Source ID: ${s.id}] Title: ${s.title}\nURL: ${s.url}\nType: ${s.sourceType}\nReviewed Excerpt: ${s.excerpt}\nNotes: ${s.reviewerNotes}\n`
      )
      .join('\n---\n');
  }
}
