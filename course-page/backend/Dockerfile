# ---- Etapa 1: build (imagen con el compilador) ----
FROM golang:1.26-alpine AS build
WORKDIR /src

# Primero los archivos de dependencias: esta capa se rehace
COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o /app/binario-backend .

# ---- Etapa 2: tests (parte del build: ya tiene el compilador y el código) ----
FROM build AS test
ENTRYPOINT ["sh", "scripts/coverage.sh"]

# ---- Etapa 3: runtime (imagen mínima, sin compilador) ----
FROM alpine:3.21 AS final
WORKDIR /app

COPY --from=build /app/binario-backend .

RUN mkdir -p images files

EXPOSE 8080
ENTRYPOINT ["./binario-backend"]
