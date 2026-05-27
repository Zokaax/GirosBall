# TODO - Posibles mejoras para Giros Ball

## Estado actual del proyecto

### Tecnologías
- **Framework**: Expo SDK 54 + React Native 0.81.5
- **Navegación**: React Navigation Native Stack
- **Sensores**: expo-sensors (acelerómetro)
- **Persistencia**: @react-native-async-storage/async-storage
- **Orientación**: Portrait bloqueado

### Lo que tiene el juego

| Característica | Estado |
|---|---|
| Menú principal con 3 botones | ✅ |
| Juego con control por acelerómetro | ✅ |
| Física con fricción y rebotes | ✅ |
| 20 niveles generados proceduralmente | ✅ |
| Verificación BFS de alcanzabilidad | ✅ |
| 3 materiales de bola (metal, plastic, feather) | ✅ |
| Power-ups: escudo, agrandar, encoger, cambio de material | ✅ |
| Zonas interactivas (viento, magnético, hielo, lodo) | ✅ |
| Obstáculos estáticos y móviles | ✅ |
| HUD con vidas, score, nivel, indicadores | ✅ |
| Game Over y pantalla de victoria | ✅ |
| High Scores persistente (top 10) | ✅ |
| Selector de niveles con desbloqueo progresivo | ✅ |
| +1 vida cada 3 niveles superados | ✅ |

---

## Posibles mejoras

### Jugabilidad
- [ ] **Pausa**: Botón de pausa durante la partida
- [ ] **Power-up timer visual**: Barra de progreso mostrando tiempo restante de power-ups activos
- [ ] **Tutorial interactivo**: Nivel guiado inicial explicando controles
- [ ] **Dificultad dinámica**: Ajustar obstáculos según rendimiento del jugador
- [ ] **Combo/racha**: Multiplicador de score por recolectar seguido
- [ ] **Bonificación por tiempo**: Puntos extra por completar nivel rápido
- [ ] **Vibración háptica**: Feedback táctil al chocar con obstáculos

### Contenido
- [ ] **Más power-ups**: Inmunidad temporal, ralentización, magneto de monedas, multiplicador x2
- [ ] **Más materiales**: Vidrio (frágil, rápido), goma (rebota más), roca (lento, destruye obstáculos)
- [ ] **Niveles especiales**: Mecánicas únicas (oscuridad, gravedad invertida, teletransportadores)
- [ ] **Jefes de nivel**: Obstáculo grande con mecánica especial cada 5 niveles
- [ ] **Logros**: Completar sin perder vidas, speedrun, recolectar todo en X nivel
- [ ] **Personajes/skins**: Desbloquear aspectos para la bola

### Visual
- [ ] **Efectos de partículas**: Al recolectar monedas, al morir, al pasar de nivel
- [ ] **Animaciones de transición**: Entre niveles y pantallas más vistosas
- [ ] **Temas visuales**: Variación de color/fondo por rango de niveles
- [ ] **Screen shake**: Animación de vibración de pantalla al chocar
- [ ] **Parallax background**: Fondo con movimiento sutil
- [ ] **Bola con iluminación/brillo**: Degradado radial, sombra

### Audio
- [ ] **Efectos de sonido**: Recoger moneda, golpe, muerte, power-up, cambio de nivel
- [ ] **Música de fondo**: Bucle musical que acelere en niveles altos
- [ ] **Control de audio**: Menú de ajustes con volumen

### UI/UX
- [ ] **Pantalla de carga**: Mientras se genera el nivel proceduralmente
- [ ] **Ajustes**: Sensibilidad del acelerómetro, vibrar on/off
- [ ] **Confirmación de salida**: "¿Seguro que quieres salir?" si hay partida en curso
- [ ] **Estadísticas**: Pantalla con stats totales (partidas jugadas, monedas totales, tiempo jugado)
- [ ] **Notificaciones de logro**: Toast/banner al desbloquear un logro

### Técnico
- [ ] **Refactorizar GameScreen**: Separar en componentes (HUD, Bola, Obstáculos, PowerUps, Overlays)
- [ ] **Tests unitarios**: Tests para colisiones, generación de niveles, high scores
- [ ] **Optimización de memoria**: Evitar recrear objetos en cada frame
- [ ] **Manejo de errores**: Mejorar try/catch en persistencia
- [ ] **Dark mode / tema claro**: Opción configurable
