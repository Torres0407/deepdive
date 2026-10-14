import { IsNotEmpty, IsNumber, IsString, Length, Max, Min } from 'class-validator';

export class CreateScoreDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 20, { message: 'Name must be between 1 and 20 characters' })
  name: string;

  @IsNumber()
  @Min(0, { message: 'maxDepth must be greater than or equal to 0' })
  @Max(6000, { message: 'maxDepth must not exceed 6000' })
  maxDepth: number;
}
