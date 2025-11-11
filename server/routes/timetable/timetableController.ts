import { type RequestHandler } from 'express'
import OfficialVisitsService from '../../services/officialVisitsService'
import { getParsedDateFromQueryString, getWeekOfDatesStartingMonday } from '../../utils/utils'
import timetableItemBuilder from './timetableItemBuilder'
import { AvailableTimeSlots } from '../../@types/officialVisitsApi/types'

export default class TimetableController {
  public constructor(private readonly officialVisitsService: OfficialVisitsService) {}

  public view(): RequestHandler {
    return async (req, res) => {
      const today = new Date()
      const { date = '' } = req.query
      const selectedDate = getParsedDateFromQueryString(date.toString(), today)
      const { weekOfDates, previousWeek, nextWeek } = getWeekOfDatesStartingMonday(selectedDate)

      const prisonId = '1'
      // fetch available  slots based on prison id and date
      const schedules: AvailableTimeSlots[] = await this.officialVisitsService.getAvailableTimeSlots(
        selectedDate,
        prisonId,
        selectedDate,
      )

      const timetableItems = timetableItemBuilder({ schedules, selectedDate })

      return res.render('pages/timeslots/timeslots', {
        timetableItems,
        selectedDate,
        weekOfDates,
        previousWeek,
        nextWeek,
      })
    }
  }
}
