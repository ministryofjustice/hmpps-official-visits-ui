import { Request, Response } from 'express'
import path from 'path'
import PrisonerImageService from '../../services/prisonerImageService'

const placeHolderImage = path.join(process.cwd(), '/dist/assets/images/prisoner-profile-image.png')

export default class PrisonerImageRoutes {
  constructor(private readonly prisonerImageService: PrisonerImageService) {}

  GET = async (req: Request, res: Response) => {
    const { prisonerNumber } = req.params
    const { user } = res.locals

    return this.prisonerImageService
      .getImage(prisonerNumber as string, user)
      .then(data => {
        res.set('Cache-control', 'private, max-age=86400')
        res.removeHeader('pragma')
        res.type('image/jpeg')
        data.pipe(res)
      })
      .catch(_error => {
        res.sendFile(placeHolderImage)
      })
  }
}
