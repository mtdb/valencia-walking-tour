# El clima dentro de la experiencia

## Ubicación y jerarquía

La previsión se sitúa después del punto de encuentro y la selección de interiores, antes del índice del paseo. En ese momento el visitante decide cuándo salir y cuánto tiempo dedicar. La portada conserva la promesa del recorrido; el clima ocupa un bloque propio. El enlace «El tiempo» del encabezado permite regresar a él durante el paseo.

## Día y horas

La selección inicial es «Hoy», calculado con `Europe/Madrid`. Se muestran también fecha y día de la semana, con seis días siguientes disponibles. Al pasar la medianoche se vuelve al nuevo día y se solicita una previsión actualizada.

La tira horaria recorre el día completo. Hoy comienza visualmente en la hora actual; las horas anteriores se atenúan y siguen accesibles. Los días futuros comienzan a las 08:00, una referencia útil para planificar la mañana, y permiten consultar todas las horas. Cada tarjeta muestra cielo, temperatura, sensación, probabilidad de lluvia y viento.

En móvil los días y las horas se desplazan horizontalmente dentro del bloque. Hay flechas para las horas y controles de día accesibles por teclado; la selección se expresa mediante texto, borde y estado accesible. Los cambios no desplazan el resto de la página.

## Confianza y fallos

Se identifica la hora de consulta, la zona horaria y el proveedor. La lluvia se etiqueta como probabilidad; los valores ausentes se muestran sin dato. La previsión es información de planificación, no una observación ni una alerta oficial.

Se reutiliza una consulta reciente durante 30 minutos. Los datos guardados de hasta 48 horas sólo se muestran si cubren hoy; una actualización fallida o falta de conexión los identifica como guardados. Sin datos válidos se ofrece reintento y AEMET mientras el recorrido sigue utilizable. Recuperar conexión provoca una nueva consulta.

## Validación

Se comprobaron en Chromium siete días, cambios de día, estados sin datos y con datos guardados, recuperación, persistencia y ausencia de desbordamiento a 320, 390 y 1440 px. Se usaron respuestas sintéticas únicamente en las pruebas. La petición real usa la [documentación de Open-Meteo](https://open-meteo.com/en/docs); la red local del entorno impidió validar una respuesta real del proveedor.
