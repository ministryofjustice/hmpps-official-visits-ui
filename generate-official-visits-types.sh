npx -y openapi-typescript https://official-visits-api-dev.hmpps.service.justice.gov.uk/v3/api-docs | sed "s/\"/'/g" | sed "s/;//g" > server/@types/officialVisitsApi/index.d.ts
npx eslint --fix "server/@types/officialVisitsApi/index.d.ts"
