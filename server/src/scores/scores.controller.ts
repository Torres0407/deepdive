import { Body, Controller, Get, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ScoresService, ScoreResponse } from './scores.service';
import { CreateScoreDto } from './dto/create-score.dto';

@Controller('scores')
export class ScoresController {
  constructor(private readonly scoresService: ScoresService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async create(@Body() createScoreDto: CreateScoreDto): Promise<ScoreResponse> {
    return this.scoresService.create(createScoreDto);
  }

  @Get()
  async findAll(@Query('limit') limit?: string): Promise<ScoreResponse[]> {
    const parsedLimit = limit ? Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50) : 10;
    return this.scoresService.getTopScores(parsedLimit);
  }
}
