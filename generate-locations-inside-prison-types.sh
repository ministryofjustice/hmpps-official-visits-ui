npx -y openapi-typescript https://locations-inside-prison-api-dev.hmpps.service.justice.gov.uk/v3/api-docs | sed "s/\"/'/g" | sed "s/;//g" > server/@types/locationsInPrisonApi/index.d.ts
eslint --fix "server/@types/locationsInPrisonApi/index.d.ts"
