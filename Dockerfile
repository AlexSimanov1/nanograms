# Backend runtime image: Go API only (the frontend is served by nginx in a
# separate compose service, so the Go server does not host static assets).

# --- Build stage ---
FROM golang:1.26-alpine AS build
WORKDIR /src

# Cache dependencies first; the project uses only the standard library.
COPY go.mod ./
COPY cmd/ ./cmd/
COPY internal/ ./internal/

RUN CGO_ENABLED=0 go build -trimpath -o /out/nanograms ./cmd/server

# --- Runtime stage ---
FROM alpine:3.20
WORKDIR /app

COPY --from=build /out/nanograms .
COPY data/ ./data/

ENV HTTP_ADDR=:8080
ENV PUZZLE_DIR=./data/puzzles

EXPOSE 8080

CMD ["/app/nanograms"]
