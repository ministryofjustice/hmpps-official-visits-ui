import Root = cheerio.Root

export const getPageHeader = ($: Root) => $('h1').text().trim()
export const getByDataQa = ($: Root, dataQa: string) => $(`[data-qa=${dataQa}]`)
export const existsByDataQa = ($: Root, dataQa: string) => getByDataQa($, dataQa).length > 0
export const getByName = ($: Root, name: string) => $(`[name=${name}]`)
export const getTextById = ($: Root, id: string) => $(`[id=${id}]`).text().trim()
export const existsByName = ($: Root, name: string) => getByName($, name).length > 0
export const getPageAlert = ($: Root) => $('div.moj-alert__content').text().trim()

export const getByLabel = ($: Root, label: string) => {
  const lbl = $(`label:contains("${label}")`)
  return lbl.attr('for') ? $(`#${lbl.attr('for')}`) : lbl.find('input, select, textarea')
}
export const existsByLabel = ($: Root, label: string) => getByLabel($, label).length > 0

export const getValueByKey = ($: Root, key: string) => {
  return (
    $('.govuk-summary-list .govuk-summary-list__row')
      .filter((_, e) => $(e).find('.govuk-summary-list__key').text().trim() === key)
      .find('.govuk-summary-list__value')
      .text()
      .trim() || null
  )
}

export const existsByKey = ($: Root, key: string) => {
  return (
    $('.govuk-summary-list .govuk-summary-list__row').filter(
      (_, e) => $(e).find('.govuk-summary-list__key').text().trim() === key,
    ).length > 0
  )
}

export const dropdownOptions = ($: Root, name: string) => {
  return getByName($, name)
    .find('option')
    .map((_, option) => $(option).attr('value'))
    .get()
    .filter(s => s.length > 1)
}

export const radioOptions = ($: Root, name: string) => {
  return getByName($, name)
    .map((_, option) => $(option).attr('value'))
    .get()
    .filter(s => s.length > 1)
}
