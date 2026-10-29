import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProgramSessionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  programId: number;

  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title: string;

  @Transform(({ value }) => parseDate(value))
  @IsDate()
  startsAt: Date;

  @Transform(({ value }) => parseDate(value))
  @IsDate()
  endsAt: Date;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  location?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  meetingUrl?: string;
}

function parseDate(value: unknown): Date | unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);

  if (!match) {
    return value;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return new Date(Number.NaN);
  }

  return date;
}
