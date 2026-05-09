FROM node:20-slim

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

ARG NEXT_PUBLIC_API_BASE=http://localhost:8102
ENV NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
RUN npm run build

CMD ["sh", "-c", "exec npm run start -- --hostname 0.0.0.0 --port ${PORT}"]
