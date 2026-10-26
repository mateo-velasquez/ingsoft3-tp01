# Nada de esto es secreto (imagen pública, etiqueta, región): por eso va con default y SÍ se commitea.

variable "image_repo_api" { default = "ghcr.io/mateo-velasquez/ingsoft3-tp01-backend" }    # SIN la etiqueta
variable "image_repo_front" { default = "ghcr.io/mateo-velasquez/ingsoft3-tp01-frontend" } # SIN la etiqueta
variable "image_tag" { default = "sha-1ce5523ef29693d53b1cd2a8a1f83aeb88b5d666" }          # merge del PR #40 (TP7)
variable "region" { default = "virginia" }                                                 # frankfurt | ohio | oregon | singapore | virginia
