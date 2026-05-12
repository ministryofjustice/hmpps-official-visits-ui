import type { CheerioAPI } from 'cheerio'

export const getPageHeader = ($: CheerioAPI) => $('h1').first().text().trim()
export const getByDataQa = ($: CheerioAPI, dataQa: string) => $(`[data-qa=${dataQa}]`)
export const existsByDataQa = ($: CheerioAPI, dataQa: string) => getByDataQa($, dataQa).length > 0
export const getByName = ($: CheerioAPI, name: string) => $(`[name=${name}]`)
export const getTextById = ($: CheerioAPI, id: string) => $(`[id=${id}]`).text().trim()
export const existsByName = ($: CheerioAPI, name: string) => getByName($, name).length > 0
export const getPageAlert = ($: CheerioAPI) => $('div.moj-alert__content').text().trim()

export const getByLabel = ($: CheerioAPI, label: string) => {
  const lbl = $(`label:contains("${label}")`)
  return lbl.attr('for') ? $(`#${lbl.attr('for')}`) : lbl.find('input, select, textarea')
}
export const existsByLabel = ($: CheerioAPI, label: string) => getByLabel($, label).length > 0

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

export const existsByKey = ($: CheerioAPI, key: string) => {
  return (
    $('.govuk-summary-list .govuk-summary-list__row').filter(
      (_: number, e) => $(e).find('.govuk-summary-list__key').text().trim() === key,
    ).length > 0
  )
}

export const dropdownOptions = ($: CheerioAPI, name: string) => {
  return getByName($, name)
    .find('option')
    .map((_: number, option) => $(option).attr('value'))
    .get()
    .filter(s => s.length > 1)
}

export const radioOptions = ($: CheerioAPI, name: string) => {
  return getByName($, name)
    .map((_: number, option) => $(option).attr('value'))
    .get()
    .filter(s => s.length > 1)
}

export const getMiniProfile = ($: CheerioAPI) => {
  return getByDataQa($, 'mini-profile')
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
