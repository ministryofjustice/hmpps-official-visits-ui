import { Request, Response } from 'express'
import { addDays, addYears } from 'date-fns'
import { Page } from '../../../../services/auditService'
import { PageHandler } from '../../../interfaces/pageHandler'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { schema } from './viewOfficialVisitListSchema'
import { ReferenceDataItem, VisitStatusType, VisitType } from '../../../../@types/officialVisitsApi/types'
import { toDateString } from '../../../../utils/utils'

export default class MovementSlipsHandler implements PageHandler {
  public PAGE_NAME = Page.MOVEMENT_SLIPS

  constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  QUERY = schema

  GET = async (req: Request, res: Response) => {
    const { user } = res.locals
    const prisonCode = req.session.activeCaseLoadId

    const statusOpts = await this.officialVisitsService.getReferenceData(res, 'VIS_STATUS')
    const typeOpts = await this.officialVisitsService.getReferenceData(res, 'VIS_TYPE')

    const slots = await this.officialVisitsService.getAvailableSlots(
      res,
      prisonCode,
      toDateString(new Date()),
      toDateString(addYears(new Date(), 1)),
      false,
    )

    const locations = slots.reduce(
      (acc, slot) => {
        if (!acc.find(o => o.code === slot.dpsLocationId)) {
          acc.push({ code: slot.dpsLocationId, text: slot.locationDescription })
        }
        return acc
      },
      [] as { code: string; text: string }[],
    )

    const filterParams: {
      prisoner?: string
      startDate: string
      endDate: string
      status?: VisitStatusType[]
      type?: VisitType[]
      location?: string[]
    } = {
      ...(req.body.prisoner ? { prisoner: req.body.prisoner as string } : {}),
      startDate: (req.body.startDate as string) || new Date().toISOString().substring(0, 10),
      endDate: (req.body.endDate as string) || new Date(addDays(new Date(), 7)).toISOString().substring(0, 10),
      ...validateRefDataItems<VisitStatusType>('status', req.body.status as string, statusOpts),
      ...validateRefDataItems<VisitType>('type', req.body.type as string, typeOpts),
      ...validateRefDataItems('location', req.body.location as string, locations),
    }

    const findByCriteria = {
      startDate: filterParams.startDate,
      endDate: filterParams.endDate,
      ...(filterParams.prisoner ? { searchTerm: filterParams.prisoner } : {}),
      ...(filterParams.status ? { visitStatuses: filterParams.status } : {}),
      ...(filterParams.type ? { visitTypes: filterParams.type } : {}),
      ...(filterParams.location ? { locationIds: filterParams.location } : {}),
    }

    if (res.locals['validationErrors']) {
      return res.render('pages/view/movement-slips', { visits: [], now: new Date(), hideBetaBanner: true })
    }

    const results = await this.officialVisitsService.getVisits(prisonCode, findByCriteria, 0, 1000, user)

    return res.render('pages/view/movement-slips', {
      visits: results.content || [],
      now: new Date(),
      hideBetaBanner: true,
    })
  }
}

function validateRefDataItems<T>(key: string, code: string, items: ReferenceDataItem[]) {
  const codes = code?.split(',') || []
  const found = codes.map(c => items.find(o => o.code === c)?.code as T).filter(o => o)
  return found.length ? { [key]: found } : {}
}
