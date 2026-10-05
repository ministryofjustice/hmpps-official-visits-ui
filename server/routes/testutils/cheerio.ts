import type { CheerioAPI } from 'cheerio'

export const getPageHeader = ($: CheerioAPI) => $('h1').first().text().trim()
export const getByDataQa = ($: CheerioAPI, dataQa: string) => $(`[data-qa=${dataQa}]`)
export const getTextById = ($: CheerioAPI, id: string) => $(`[id=${id}]`).text().trim()

export const getValueByKey = ($: CheerioAPI, key: string, index: number = 0) => {
  return (
    $('.govuk-summary-list .govuk-summary-list__row')
      .filter((_: number, e) => $(e).find('.govuk-summary-list__key').text().trim() === key)
      .find('.govuk-summary-list__value')
      .eq(index)
      .text()
      .trim() || null
  )
}

export const getActionsByKey = ($: CheerioAPI, key: string, index: number = 0, childIndex: number = 0) => {
  return (
    $('.govuk-summary-list .govuk-summary-list__row')
      .filter((_: number, e) => $(e).find('.govuk-summary-list__key').text().trim() === key)
      .find('.govuk-summary-list__actions')
      .eq(index)
      .children()
      .eq(childIndex) || null
  )
}

export const getMiniProfileAlertTags = ($: CheerioAPI) => {
  return getByDataQa($, 'mini-profile-alert-tags')
    .find('.alert-tag')
    .map((_: number, tag) => $(tag).text().trim())
    .get()
}

export const getProgressTrackerLabels = ($: CheerioAPI) => {
  return $('.moj-progress-bar > ol > li')
}

export const getProgressTrackerItems = ($: CheerioAPI) => {
  return $('.moj-progress-bar > .moj-progress-bar__list > .moj-progress-bar__item')
}

export const getProgressTrackerCompleted = ($: CheerioAPI) => {
  return $('.moj-progress-bar > .moj-progress-bar__list > .moj-progress-bar__item > .moj-progress-bar__icon--complete')
}

export const getArrayItemPropById = ($: CheerioAPI, id: string, index: number, property: string) => {
  return $(`#${id}\\[${index}\\]\\[${property}\\]`)
}

export const getGovukTableCell = ($: CheerioAPI, rowIndex: number, columnIndex: number) => {
  return $(
    `.govuk-table__body > .govuk-table__row:nth-child(${rowIndex}) > .govuk-table__cell:nth-child(${columnIndex})`,
  )
}

export const getByIdFor = ($: CheerioAPI, forId: string) => {
  return $(`[for=${forId}]`)
}
