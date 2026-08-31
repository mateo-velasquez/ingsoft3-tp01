package app

import (
	"os" //Proporciona una interfaz para las funciones del sistema operativo.

	log "github.com/sirupsen/logrus" //Importa la biblioteca logrus y la alias log.
)

func init() {
	log.SetOutput(os.Stdout)
	//Configura la salida del logger para que sea la salida estándar (la consola).
	//Todo el logging que se haga con logrus se enviará a la consola.
	log.SetLevel(log.DebugLevel)
	//Establece el nivel de logging a DebugLevel.
	//Esto significa que los mensajes de nivel debug y superiores (info, warning, error, fatal, panic) se registrarán.
	log.Info("Starting logger system")
	//Registra un mensaje de información indicando que el sistema de logging está comenzando.
	//Este mensaje se imprimirá en la consola debido a las configuraciones anteriores.
}
