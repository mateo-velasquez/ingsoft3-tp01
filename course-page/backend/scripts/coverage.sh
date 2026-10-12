#!/bin/sh
# Runs the backend tests with coverage and fails when the coverage of the
# business logic is below the threshold.
#
# COVERAGE_DIR        where the reports are written (default: coverage)
# COVERAGE_THRESHOLD  minimum percentage of statements (default: 80)
set -eu

export CGO_ENABLED=0

OUT="${COVERAGE_DIR:-coverage}"
THRESHOLD="${COVERAGE_THRESHOLD:-80}"

# What stays OUT of the measurement. It is an exclusion list (not an inclusion
# list) on purpose: any new package or file enters the count by itself, so
# untested code lowers the number instead of disappearing from it.
#   main.go, app/, db/   application startup, routes and DB connection (no business rules)
#   model/, dto/         data structs without behaviour
#   client/              GORM queries: they need a real database (integration)
#   controller/          HTTP plumbing: parse, call the service, answer
#   utils/               error helpers
#   service/repository.go  adapters that only delegate to client
EXCLUDE='^project/(main\.go|app/|db/|model/|dto/|client/|controller/|utils/|service/repository\.go)'

mkdir -p "$OUT"

# -coverpkg=./... instruments every package, even the ones with no tests.
go test ./... -coverpkg=./... -coverprofile="$OUT/coverage.raw.out"

grep -Ev "$EXCLUDE" "$OUT/coverage.raw.out" > "$OUT/coverage.out"

go tool cover -func="$OUT/coverage.out" > "$OUT/coverage-func.txt"
go tool cover -html="$OUT/coverage.out" -o "$OUT/coverage.html"

TOTAL=$(awk '/^total:/ { gsub("%", "", $3); print $3 }' "$OUT/coverage-func.txt")

# Nothing measured would pass any threshold in silence: that is a failure.
if [ -z "$TOTAL" ]; then
  echo "ERROR: no statements were measured, check the exclusion list" >&2
  exit 1
fi

{
  echo "### Backend coverage (Go)"
  echo
  echo "| metric | result | threshold |"
  echo "|---|---|---|"
  echo "| statements | ${TOTAL}% | ${THRESHOLD}% |"
  echo
  echo "Go only reports statement coverage; it has no native branch coverage."
} > "$OUT/summary.md"

echo "Statement coverage of the business logic: ${TOTAL}% (threshold ${THRESHOLD}%)"

if awk -v total="$TOTAL" -v min="$THRESHOLD" 'BEGIN { exit !(total + 0 >= min + 0) }'; then
  exit 0
fi

echo "ERROR: coverage ${TOTAL}% does not meet the threshold of ${THRESHOLD}%" >&2
exit 1
