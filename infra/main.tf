terraform {
  required_version = ">= 1.5"

  required_providers {
    neon = {
      source  = "kislerdm/neon"
      version = "0.18.0" # fijada: el repo está archivado y el oficial todavía no salió
    }
    render = {
      source  = "render-oss/render"
      version = "1.9.1"
    }
  }
}

provider "neon" {}   # lee NEON_API_KEY
provider "render" {} # lee RENDER_API_KEY y RENDER_OWNER_ID

# --- El proyecto de Neon de PREPROD: no existe hasta que esto se aplica ---

resource "neon_project" "preprod" {
  name = "course-page-preprod"

  # el provider pide 86400 por defecto y el tope del plan gratuito es 21600
  history_retention_seconds = 21600
}

resource "neon_role" "preprod" {
  project_id = neon_project.preprod.id
  branch_id  = neon_project.preprod.default_branch_id # default_branch_id, NO branch_id
  name       = "app_preprod_owner"
}

resource "neon_database" "preprod" {
  project_id = neon_project.preprod.id
  branch_id  = neon_project.preprod.default_branch_id
  name       = "app_preprod"
  owner_name = neon_role.preprod.name
}

# --- Los dos servicios de PREPROD en Render ---

locals {
  # La URL del front se arma con su nombre: la api la necesita para CORS y el front
  # necesita la de la api, así que una de las dos no puede salir de un atributo (sería un ciclo).
  front_name = "course-page-front-preprod"
  front_url  = "https://${local.front_name}.onrender.com"
}

resource "render_web_service" "api" {
  name   = "course-page-api-preprod"
  plan   = "free"
  region = var.region

  runtime_source = {
    image = {
      image_url = var.image_repo_api # SIN la etiqueta pegada
      tag       = var.image_tag      # la etiqueta va en su propio campo
    }
  }

  # La conexión se ARMA con lo que devolvió Neon: nadie la copia y pega.
  # Son las variables que lee db.go. NO va APP_COMMIT: ésa la pone sólo el pipeline (TP7).
  env_vars = {
    DB_HOST         = { value = neon_project.preprod.database_host }
    DB_PORT         = { value = "5432" }
    DB_NAME         = { value = neon_database.preprod.name }
    DB_USER         = { value = neon_role.preprod.name }
    DB_PASS         = { value = neon_role.preprod.password }
    DB_SSLMODE      = { value = "require" }
    ALLOWED_ORIGINS = { value = local.front_url }
  }
}

resource "render_web_service" "front" {
  name   = local.front_name
  plan   = "free"
  region = var.region

  runtime_source = {
    image = {
      image_url = var.image_repo_front
      tag       = var.image_tag
    }
  }

  env_vars = {
    # la URL sale del atributo de SU api, no de un copy-paste; sin barra final
    # (con barra, nginx manda todo a / y cada llamada da 404 — TP6 §3.2)
    BACKEND_URL  = { value = trimsuffix(render_web_service.api.url, "/") }
    DNS_RESOLVER = { value = "8.8.8.8" }
  }
}
