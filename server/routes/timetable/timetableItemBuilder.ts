import { AvailableTimeSlots } from '../../@types/officialVisitsApi/types'
// need to get type
import { prisonerTimePretty } from '../../utils/utils'

export type TimetableItem = {
  dayCode: string
  time: string
  dpsLocationId: string
  maxAdults: string
  maxGroups: string
}
// Builds timetable rows, using all session schedules for the selected date
export default ({
  schedules,
  selectedDate,
}: {
  schedules: AvailableTimeSlots[]
  selectedDate: string
}): TimetableItem[] => {
  const timetableItems: TimetableItem[] = []
  schedules.forEach(schedule => {
    const prettyTime = `${prisonerTimePretty(`${selectedDate}T${schedule.startTime}`)} to ${prisonerTimePretty(`${selectedDate}T${schedule.endTime}`)}`

    timetableItems.push({
      dayCode: schedule.dayCode,
      time: prettyTime,
      dpsLocationId: schedule.dpsLocationId,
      maxAdults: schedule.maxAdults,
      maxGroups: schedule.maxAdults,
    })
  })

  return timetableItems
}
