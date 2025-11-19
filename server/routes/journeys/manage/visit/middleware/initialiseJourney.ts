import { RequestHandler } from 'express'
import { parse } from 'date-fns'
import { Services } from '../../../../../services'
import { Prisoner } from '../../../../../@types/prisonerSearchApi/types'
import { PrisonerDetails } from '../journey'

/**
 * This middleware will populate the official visit journey data for the requested officialVisitId
 * if it exists, and otherwise will return next()
 *
 * @param officialVisitsService
 * @param prisonerService
 */
export default ({ officialVisitsService, prisonerService }: Services): RequestHandler => {
  return async (req, res, next) => {
    const { officialVisitId } = req.params
    const { user } = res.locals

    if (officialVisitId === req.session.journey.officialVisit?.officialVisitId?.toString()) return next()

    // Get the visit details for this ID
    const visit = await officialVisitsService.getOfficialVisitById(Number(officialVisitId), user)

    // Local functions - move to utils
    const parseTimeToISOString = (time: string) => (time ? parse(time, 'HH:mm', new Date(0)).toISOString() : undefined)
    const parseDateToISOString = (date: string) =>
      date ? parse(date, 'yyyy-MM-dd', new Date()).toISOString() : undefined

    // Get the prisoner details from the visit separately
    const prisoner = await prisonerService.getPrisonerByPrisonerNumber(visit.prisonerNumber, user)

    // Populate the journey object with the visit and prisoner details
    req.session.journey.officialVisit = {
      officialVisitId: Number(officialVisitId),
      prisonCode: visit.prisonCode,
      prisonName: visit.prisonName,
      visitStatusCode: visit.visitStatusCode,
      visitStatusDescription: visit.visitStatusDescription,
      visitTypeCode: visit.visitTypeCode,
      visitTypeDescription: visit.visitTypeDescription,
      visitDate: parseDateToISOString(visit.visitDate),
      startTime: parseTimeToISOString(visit.startTime),
      endTime: parseTimeToISOString(visit.endTime),
      visitSlotId: Number(visit.visitSlotId),
      timeSlotId: Number(visit.timeSlotId),
      dpsLocationId: visit.dpsLocationId,
      prisoner: {
        firstName: prisoner.firstName,
        lastName: prisoner.lastName,
        prisonerNumber: prisoner.prisonerNumber,
        dateOfBirth: prisoner.dateOfBirth,
        cellLocation: prisoner.cellLocation,
      },
      staffNotes: visit.staffNotes,
      prisonerNotes: visit.prisonerNotes,
    }
    res.locals.prisonerDetails = toPrisonerDetails(prisoner)
    return next()
  }
  function toPrisonerDetails(prisoner: Prisoner): PrisonerDetails {
    const hasPrimaryAddress = !!(
      prisoner.addresses &&
      prisoner.addresses.length > 0 &&
      prisoner.addresses.find(address => address.primaryAddress)
    )

    return {
      prisonerNumber: prisoner.prisonerNumber,
      lastName: prisoner.lastName,
      firstName: prisoner.firstName,
      dateOfBirth: prisoner.dateOfBirth,
      prisonName: prisoner.prisonName,
      cellLocation: prisoner.cellLocation,
      hasPrimaryAddress,
    }
  }
}
