FROM node:22-alpine AS deps

WORKDIR /app

COPY server/package*.json ./

RUN npm ci

FROM deps AS builder

WORKDIR /app

COPY server/tsconfig.json ./tsconfig.json
COPY server/src ./src

RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY server/package*.json ./

RUN npm ci

COPY --from=builder /app/dist ./dist

RUN mkdir -p uploads

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || '8080') + '/health').then((r)=>r.text().then((body)=>process.exit(r.ok&&body==='ok'?0:1))).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
