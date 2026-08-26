npx -y openapi-typescript https://prisoner-search-dev.prison.service.justice.gov.uk/v3/api-docs > server/@types/prisonerSearchApi/index.d.ts
npx eslint --fix "server/@types/prisonerSearchApi/index.d.ts"
