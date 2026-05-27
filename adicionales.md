# Adicionales y Cambios respecto al Plan Original

Este documento registra todas las funcionalidades, decisiones técnicas y cambios implementados que no estaban contemplados en el plan original (`contexto.md`).

---

## 1. Infraestructura

### Gestión de estado del juego
- **Refs + useState en lugar de Context**: El estado del juego (vidas, score, nivel) se maneja con `useRef` para mutaciones en el game loop (evita re-renders) y `useState` para reflejar cambios en la UI. No se usa React Context como sugería el plan.

### Navegación
- **React Navigation Native Stack** en lugar de Expo Router: Se eligió `@react-navigation/native-stack` por su simplicidad y rendimiento frente a la alternativa de Expo Router.

### Arquitectura de archivos
- **Colisión en utilidad separada**: `src/utils/collision.ts` con funciones `circleRectCollision` y `circleCircleCollision`.
- **Progreso persistente**: `src/data/progress.ts` para manejar niveles desbloqueados.
- **Navegación tipada**: `src/types/navigation.ts` con `RootStackParamList`.

---

## 2. Física de la Bola (Etapa 2 — ampliado)

### Constantes separadas por eje
- `SPEED_X` y `SPEED_Y` independientes (1400 y 1200) para compensar diferencias de sensibilidad del acelerómetro entre ejes.

### Ajustes de inercia
- `FRICTION = 0.97`: fricción alta para que la bola conserve velocidad y se deslice con inercia real, en lugar del comportamiento más "pegajoso" de una fricción baja.

### Corrección de ejes por hardware
- El mapeo de acelerómetro se ajustó para el dispositivo del usuario: eje X invertido (`-= ax`) para que la bola vaya hacia donde se inclina el teléfono.
- Eje Y con suma directa (`+= ay`).
- Se invirtió el orden de las pruebas debido a diferencias en la orientación natural del acelerómetro entre dispositivos.

---

## 3. HUD y Límites (Etapa 3 — ampliado)

### HUD como límite superior del mapa
- Se agregó `HUD_HEIGHT = 90`. La bola no puede atravesar el área del HUD, actuando como borde superior del área de juego (no estaba especificado en el plan).

### Pantalla de Victoria
- Se agregó pantalla "¡GANASTE!" al completar los 20 niveles (no contemplada originalmente).

---

## 4. Generación de Niveles (Etapa 4 — significativamente ampliado)

### Generación procedural vs manual
- El plan original pedía "un array de objetos o un archivo JSON externo" para los 20 niveles. Se implementó **generación procedural** con semilla determinista (`seededRandom`), que genera cada nivel según:
  - Número de nivel (dificultad progresiva)
  - Dimensiones de la pantalla del dispositivo
  - Cacheo por clave `nivel-ancho-alto` para evitar regeneraciones.

### Sprites extraídos del sprite sheet
- Se extrajeron 24 sprites individuales de `assets/sprites.png` (1200x896px) usando una grilla **8×6** (150px columnas, ~128-149px filas).
- Mapeo en `src/graphics/sprites.ts` con tipos `SpriteKey` y dimensiones exactas.
- Sprites para: bola (3 materiales), monedas, obstáculos (left/right/moving), power-ups, trampas, zonas interactivas.
- Componente `GameSprite` en `src/graphics/Sprite.tsx` con carga vía `require()`, soporte de `resizeMode` (contain/stretch/cover).

### Corrección de sprites vs colliders
- **Obstáculos estáticos**: Se dividen en 2 mitades (`obstacle_left` + `obstacle_right`) lado a lado con `resizeMode="stretch"`, cubriendo el ancho completo del hitbox.
- **Obstáculos móviles**: Mismo sprite repetido 2 veces, mismo esquema de tiling.
- **Trampas**: Se renderizan con `resizeMode="stretch"` al tamaño exacto del hitbox, forzando el sprite a llenar el área de colisión.

### Modo debug de hitboxes
- Botón "Ver Hitboxes" en el menú de pausa que dibuja bordes de colisión semitransparentes sobre todos los elementos.
- Código de colores por tipo: amarillo (obstáculo), naranja (móvil), rojo (trampa), dorado (moneda), cian (power-up), verde (zona), blanco (bola).

### Efectos de partículas
- Sistema de partículas basado en refs (sin estado, sin re-renders extra).
- Partículas al recolectar monedas (ráfaga dorada de 8 partículas).
- Partículas al perder una vida (ráfaga roja de 12 partículas en posición de la bola).
- Partículas al completar nivel (20 doradas + 12 blancas en el centro de la pantalla).
- Cada partícula tiene velocidad radial aleatoria, gravedad/dirección constante, vida útil de ~25 frames, y opacidad decreciente.

### Animación de muerte
- Al morir, la bola se oculta inmediatamente (`hideBallRef`) y se muestran 16 partículas rojas en la posición de la muerte.
- La cámara permanece fija en la escena de la muerte durante ~800ms (50 frames).
- Pasado el delay, se descuenta la vida, la bola se reposiciona en el spawn (oculta), y la cámara interpola suavemente (smoothstep, 25 frames ~400ms) desde la muerte hasta el spawn.
- Al completar la interpolación, la bola aparece con un parpadeo de 24 frames (~400ms) alternando opacidad entre 1.0 y 0.25 cada 4 frames.
- Si el escudo absorbe el golpe, la animación dura solo ~130ms (8 frames) y no se oculta la bola ni hay interpolación.

### Animación de nivel completado
- Al recoger la última moneda, el juego se congela ~1 segundo (60 frames).
- Cada 8 frames (cada ~130ms) estalla un "fuego artificial" con 18 partículas en una posición aleatoria visible dentro del área de la cámara (`camY + random * screenHeight * 0.5`).
- Colores: rojo, verde, azul, amarillo, magenta, naranja.
- Tras el segundo, se ejecuta `nextLevel()` que dispara el fade overlay negro y carga el siguiente nivel.

### Transición suave entre niveles
- Overlay negro full-screen controlado por `Animated.Value` con `useNativeDriver`.
- Al cargar un nuevo nivel, el overlay hace fade de opacidad 1 → 0 en 400ms.
- La cámara se posiciona correctamente antes del fade para que la bola sea visible desde el primer frame.

### Temas visuales por rango de niveles
- El color de fondo del juego varía según el nivel para dar sensación de progresión:
  - Niveles 1-5: azul marino oscuro (`#1a1a2e`)
  - Niveles 6-10: púrpura oscuro (`#2d1b4e`)
  - Niveles 11-15: rojo oscuro (`#4a1a2e`)
  - Niveles 16-20: teal oscuro (`#1a2e2e`)
- El HUD hereda el mismo color de fondo con transparencia (`+ 'cc'`).

---

### Verificación de alcanzabilidad (BFS)
- **No especificado en el plan**: Se implementó un algoritmo de **flood fill (BFS)** sobre una grilla de 15px que verifica que todos los coleccionables sean alcanzables desde el punto de spawn.
- Si algún coleccionable queda inaccesible (rodeado por obstáculos), el nivel se regenera con una semilla distinta (hasta 10 intentos).

### Zona segura de spawn
- Se definió `SPAWN_SAFE_RADIUS = 60px` alrededor del centro de la pantalla donde no se colocan obstáculos, evitando muertes instantáneas al cargar un nivel.

### Evitar superposición de coleccionables
- Los coleccionables se colocan verificando que no se superpongan con:
  - Obstáculos estáticos
  - Obstáculos móviles (posición base)
  - Otros coleccionables (con padding de 8px entre sí)

### Velocidad de obstáculos móviles
- El multiplicador de velocidad se ajustó de 0.5 a 1.0 (duplicado) para mayor dificultad, a solicitud del usuario.

---

## 5. Selector de Niveles (post-Etapa 5, no contemplado)

### Pantalla `LevelSelectScreen`
- Nueva pantalla con grilla de 4 columnas mostrando niveles 1-20.
- Los niveles bloqueados se muestran con 🔒 y no son seleccionables.
- Los niveles desbloqueados se muestran con su número y permiten navegar directamente al juego con ese nivel inicial.

### Persistencia de progreso (`src/data/progress.ts`)
- Se guarda el nivel máximo desbloqueado usando `@react-native-async-storage/async-storage`.
- Al completar un nivel, se desbloquea automáticamente el siguiente.
- Se usa `useFocusEffect` en `LevelSelectScreen` para refrescar el estado al volver del juego.

### Botón en menú principal
- Se agregó "Seleccionar Nivel" entre "Jugar" y "High Scores".

### Parámetro `startLevel` en navegación
- La pantalla `Game` acepta `route.params.startLevel` opcional para iniciar desde cualquier nivel desbloqueado.

---

## 6. Control de Versiones

### Git
- Repositorio subido a `https://github.com/Zokaax/GirosBall.git`.

---

## 7. Decisiones Técnicas

| Decisión | Opción | Motivo |
|----------|--------|--------|
| Navegación | React Navigation Native Stack | Más simple y estable que Expo Router para este caso |
| Estado juego | useRef + useState | Evita re-renders en game loop de 60fps |
| Generación niveles | Procedural con seed | 20 niveles sin archivos JSON externos, adaptativo a pantalla |
| Persistencia | AsyncStorage | Única opción viable en Expo managed para almacenamiento local |
| SDK | Expo 54 | Compatibilidad con Expo Go del dispositivo del usuario |

---

## 8. Power-ups

### Tipos implementados

| Tipo | Color | Efecto | Duración |
|------|-------|--------|----------|
| 🛡 Escudo | Azul #4fc3f7 | Absorbe 1 golpe (rompe el escudo en vez de perder vida) | 6s o hasta recibir golpe |
| ⬆ Agrandar | Verde #81c784 | Bola 1.5× más grande | 6s |
| ⬇ Encoger | Naranja #ffb74d | Bola 0.5× más pequeña | 6s |

### Comportamiento del escudo
- Al recibir un golpe con escudo activo: la bola **rebota hacia atrás** (velocidad invertida con pérdida de energía * -0.5) para evitar quedar dentro del obstáculo y recibir daño múltiple.
- El escudo se desactiva inmediatamente al absorber el golpe. Si expira el temporizador de 6s sin recibir daño, también se desactiva.

### Comportamiento de tamaño
- `big` (1.5×): la bola ocupa más espacio, dificulta pasar entre obstáculos.
- `small` (0.5×): la bola es más ágil, pasa por espacios estrechos.
- Las colisiones con bordes y obstáculos usan el radio dinámico en cada frame.
- Al expirar o cambiar de nivel, el tamaño vuelve a 1.0×.

### Generación
- Nivel 1-2: 0 power-ups
- Nivel 3-7: 1 power-up
- Nivel 8-13: 2 power-ups
- Nivel 14+: 3 power-ups
- Tipo elegido aleatoriamente entre los 3 disponibles.
- Se colocan evitando superposición con obstáculos, móviles y coleccionables a través del sistema `allPlaced`.
