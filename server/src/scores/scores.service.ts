import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { CreateScoreDto } from './dto/create-score.dto';

export interface ScoreResponse {
  id: number;
  name: string;
  maxDepth: number;
  createdAt: string;
}

@Injectable()
export class ScoresService {
  constructor(private readonly dbService: DatabaseService) {}

  async create(createScoreDto: CreateScoreDto): Promise<ScoreResponse> {
    const { name, maxDepth } = createScoreDto;
    const sanitizedName = name.trim();
    const roundedDepth = Math.round(maxDepth * 10) / 10;

    const result = await this.dbService.run(
      'INSERT INTO scores (name, max_depth) VALUES (?, ?)',
      [sanitizedName, roundedDepth]
    );

    const saved = await this.dbService.get<{
      id: number;
      name: string;
      max_depth: number;
      created_at: string;
    }>('SELECT * FROM scores WHERE id = ?', [result.id]);

    return {
      id: saved.id,
      name: saved.name,
      maxDepth: saved.max_depth,
      createdAt: saved.created_at,
    };
  }

  async getTopScores(limit = 10): Promise<ScoreResponse[]> {
    const rows = await this.dbService.all<{
      id: number;
      name: string;
      max_depth: number;
      created_at: string;
    }>(
      `SELECT id, name, max_depth, created_at 
       FROM scores 
       ORDER BY max_depth DESC, created_at ASC 
       LIMIT ?`,
      [limit]
    );

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      maxDepth: r.max_depth,
      createdAt: r.created_at,
    }));
  }
}
