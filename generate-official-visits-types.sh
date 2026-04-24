npx -y openapi-typescript http://localhost:8080/v3/api-docs | sed "s/\"/'/g" | sed "s/;//g" > server/@types/officialVisitsApi/index.d.ts
npx eslint --fix "server/@types/officialVisitsApi/index.d.ts"
