# PLAN DE DESARROLLO PROGRESIVO: "Giros Ball" (Expo / React Native)

## INSTRUCCIONES GENERALES PARA LA IA:
Actúa como un desarrollador experto en React Native, Expo y desarrollo de videojuegos móviles de rendimiento optimizado. 
Vamos a construir un juego llamado "Giros Ball" paso a paso. Se jugará inclinando el teléfono (pantalla hacia arriba), usando el acelerómetro.
Por favor, limítate STRICTAMENTE a la etapa que te solicito en cada prompt. No te adelantes ni escribas código de etapas futuras. Asegúrate de que el código sea limpio, modular y fácil de depurar en Expo Go de forma inalámbrica.

---

### ETAPA 1: Estructura Base, Navegación y Menú Principal
**Objetivo:** Crear el esqueleto del proyecto, configurar las vistas principales y la navegación básica.

**Instrucciones para la IA:**
1. Genera la estructura de archivos recomendada para un proyecto de Expo gestionado (Managed Workflow) ideal para este juego.
2. Configura la navegación básica (puede ser con estados de React o con React Navigation / Expo Router) para manejar tres pantallas:
   - Menú Principal (Título "Giros Ball", botón "Jugar", botón "High Scores").
   - Pantalla de Juego (Por ahora, solo un contenedor vacío que diga "Zona de Juego").
   - Pantalla de Tabla de Puntuaciones (High Scores).
3. Asegúrate de que la orientación de la app esté bloqueada en Vertical (Portrait) y añade estilos limpios con StyleSheet.

---

### ETAPA 2: Implementación de Sensores y Físicas de la Bola (MVP)
**Objetivo:** Lograr que una bola en la pantalla se mueva de manera fluida usando el acelerómetro del teléfono.

**Instrucciones para la IA:**
1. Utiliza el paquete `expo-sensors` (específicamente el `Accelerometer`).
2. En la Pantalla de Juego, dibuja una bola (un círculo simple con estilos).
3. Configura el acelerómetro para que capte los ejes X e Y cuando el teléfono está con la pantalla hacia arriba.
4. Mapea la inclinación para actualizar las coordenadas (X, Y) de la bola. 
5. Implementa límites de pantalla (colisiones con los bordes del dispositivo) para que la bola no se salga del área visible visible de juego.
6. El movimiento debe sentirse fluido, ajustando la velocidad y aplicando una pequeña fricción si es necesario para que sea controlable.

---

### ETAPA 3: Sistema de Vidas, Score y Estado del Juego
**Objetivo:** Establecer la lógica de juego: vidas, reinicios y flujo de fin de partida.

**Instrucciones para la IA:**
1. Agrega las variables de estado globales del juego: `vidas` (inicia en 5), `score` (inicia en 0) y `nivelActual` (inicia en 1).
2. Crea una interfaz de usuario superpuesta (HUD) en la parte superior de la pantalla de juego que muestre estos datos en tiempo real.
3. Desarrolla la lógica de "Muerte del jugador": una función que reste 1 vida y devuelva la bola a la posición inicial del mapa.
4. Si las vidas llegan a 0, activa la pantalla de "Game Over" de manera superpuesta o redirige a una nueva vista que muestre:
   - El score total recolectado.
   - Botón "Reintentar" (resetea vidas a 5, score a 0 y nivel a 1).
   - Botón "Volver al Menú Principal".

---

### ETAPA 4: Generación de Niveles, Obstáculos y Recompensas (Nivel 1 al 20)
**Objetivo:** Crear el diseño modular de niveles, colisiones, coleccionables y la progresión del juego.

**Instrucciones para la IA:**
1. Diseña una estructura de datos (un array de objetos o un archivo JSON externo) para gestionar los 20 niveles. Cada nivel debe definir:
   - Posición de ítems recolectables (monedas/esferas de score).
   - Obstáculos Estáticos (paredes, bloques).
   - Obstáculos Móviles (bloques que se mueven de un lado a otro con un useEffect/reanimated).
2. Implementa un sistema básico de detección de colisiones por cajas (AABB) o por distancia radial entre la bola, los obstáculos y las recompensas.
3. Lógica de progresión:
   - Al recolectar todos los objetos, el jugador pasa al siguiente nivel.
   - Cada 3 niveles superados, se le otorga +1 vida automáticamente al jugador.
   - Tocar un obstáculo activa la lógica de muerte desarrollada en la Etapa 3.

---

### ETAPA 5: Tabla de High Scores Ficticia y Sistema de Registro
**Objetivo:** Crear el sistema de persistencia local para las puntuaciones más altas.

**Instrucciones para la IA:**
1. Configura una lista inicial "ficticia" hardcodeada de 10 puestos en la pantalla de High Scores (ej. Juan: 5000, Pedro: 4500... hasta el puesto 10).
2. Al terminar los 20 niveles o al dar "Game Over", el juego debe verificar si el `score` actual supera al décimo puesto de la lista.
3. Si lo supera, despliega un cuadro de diálogo (Modal o Input) para que el usuario escriba su nombre (máximo 10 caracteres).
4. Inserta el nuevo récord en la posición correspondiente, desplaza los demás puestos hacia abajo y elimina el que quedó en el puesto 11.
5. Utiliza `@react-native-async-storage/async-storage` para guardar esta lista de forma persistente en el dispositivo, asegurando que los puntajes no se borren al cerrar la aplicación.d