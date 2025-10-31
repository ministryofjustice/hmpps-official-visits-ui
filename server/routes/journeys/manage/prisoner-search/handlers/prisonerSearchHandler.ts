// eslint-disable-next-line max-classes-per-file
import { Request, Response } from 'express'
import { Expose, Transform } from 'class-transformer'
import { Matches, ValidateIf } from 'class-validator'
import { startOfToday } from 'date-fns'
import { simpleDateToDate, toDateString } from '../../../../../utils/utils'
import { Page } from '../../../../../services/auditService'
import { PageHandler } from '../../../../interfaces/pageHandler'
import Validator from '../../../../validators/validator'
import IsValidDate from '../../../../validators/isValidDate'
import PrisonerService from '../../../../../services/prisonerService'

class Body {
  @Expose()
  firstName: string

  @Expose()
  @Validator(
    (lastName, { firstName, prisonerNumber, pncNumber }) => firstName || lastName || prisonerNumber || pncNumber,
    {
      message: "You must search using either the prisoner's first name, last name, prison number or PNC Number",
    },
  )
  lastName: string

  @Expose()
  @Transform(({ value }) => simpleDateToDate(value))
  @ValidateIf((_, v) => v)
  @Validator(date => date < startOfToday(), { message: 'Enter a date in the past' })
  @IsValidDate({ message: 'Enter a valid date' })
  dateOfBirth: Date

  @Expose()
  prison: string

  @Expose()
  @ValidateIf(({ prisonerNumber }) => prisonerNumber)
  @Matches(/^[a-zA-Z](\d){4}[a-zA-Z]{2}$/, { message: 'Enter a prison number in the format A1234AA' })
  prisonerNumber: string

  @Expose()
  @ValidateIf(({ pncNumber }) => pncNumber)
  @Matches(/^([0-9]{2}|[0-9]{4})\/[0-9]+[a-zA-Z]/, {
    message: 'Enter a PNC number in the format 01/23456A or 2001/23456A',
  })
  pncNumber: string
}

export default class PrisonerSearchHandler implements PageHandler {
  public PAGE_NAME = Page.PRISONER_SEARCH_PAGE

  public BODY = Body

  constructor(private readonly prisonerService: PrisonerService) {}

  public GET = async (req: Request, res: Response) => {
    const { user } = res.locals
    const prisons = await this.prisonerService.getAllPrisons(user)
    res.render('pages/manage/prisoner-search/prisonerSearch', { prisons })
  }

  public POST = async (req: Request, res: Response) => {
    const { body } = req

    // Store the search criteria into the journey data
    req.session.journey.prisonerSearch = {
      firstName: body.firstName,
      lastName: body.lastName,
      dateOfBirth: body.dateOfBirth ? toDateString(body.dateOfBirth) : null,
      prisonCode: body.prison,
      prisonerNumber: body.prisonerNumber,
      pncNumber: body.pncNumber,
    }

    res.redirect('results')
  }
}
