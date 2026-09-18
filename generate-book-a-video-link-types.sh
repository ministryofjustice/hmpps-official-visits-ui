npx -y openapi-typescript https://book-a-video-link-api-dev.prison.service.justice.gov.uk/v3/api-docs > server/@types/bookAVideoLinkApi/index.d.ts
npx eslint --fix "server/@types/bookAVideoLinkApi/index.d.ts"
