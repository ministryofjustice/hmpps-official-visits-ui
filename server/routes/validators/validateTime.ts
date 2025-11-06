import { z } from 'zod'

const parseNumber = (value: string, min: number, max: number, length: number) =>
  z
    .string()
    .regex(new RegExp(`^[0-9]{1,${length}}$`))
    .refine(val => {
      const numValue = Number(val)
      return numValue >= min && numValue <= max
    })
    .transform(val => val.padStart(length, '0'))
    .safeParse(value)

export const parseHour = (value: string) => parseNumber(value, 0, 23, 2)

export const parseMinute = (value: string) => parseNumber(value, 0, 59, 2)
