import z from 'zod'
import { Request, Response } from 'express'
import { createSchema } from '../../../../middleware/validationMiddleware'

const VIDEO_LINK_EMPTY = 'Enter the video link in full'
const VIDEO_LINK_NOT_SECURE = 'Enter a valid video link that starts with https://'

export const schemaFactory = async (_req: Request, _res: Response) =>
  createSchema({
    videoLinkUrl: z
      .string({ message: VIDEO_LINK_EMPTY })
      .min(1, VIDEO_LINK_EMPTY)
      .url({ message: VIDEO_LINK_NOT_SECURE })
      .refine(value => value.startsWith('https://'), { message: VIDEO_LINK_NOT_SECURE }),
  })

export type SchemaType = z.infer<Awaited<ReturnType<typeof schemaFactory>>>
