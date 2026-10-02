import fs from 'fs'

describe('app insights compatibility', () => {
  it('uses bunyan v1', () => {
    // See https://github.com/Microsoft/node-diagnostic-channel/blob/master/src/diagnostic-channel-publishers/README.md
    const packageData = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))
    // eslint-disable-next-line no-useless-escape
    expect(packageData.dependencies.bunyan).toMatch(/[^\.]1\..*/)
  })
})

describe('type generation compatibility', () => {
  it('keeps js-yaml v4 for openapi-typescript', () => {
    // @redocly/openapi-core calls js-yaml's types.merge, which v5 removed
    const packageData = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))
    expect(packageData.overrides['openapi-typescript']['js-yaml']).toMatch(/^4\./)
  })
})
