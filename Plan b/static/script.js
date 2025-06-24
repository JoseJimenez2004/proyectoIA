
        // Configuración del canvas y contexto
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const playBtn = document.getElementById('playBtn');
        const vorazBtn = document.getElementById('vorazBtn');
        const aStarBtn = document.getElementById('aStarBtn');
        const heuristicaBtn = document.getElementById('heuristicaBtn');
        const resetBtn = document.getElementById('resetBtn');
        const pathInfo = document.getElementById('pathInfo');
        const modeRadios = document.querySelectorAll('input[name="mode"]');
        const pathOptionsContainer = document.getElementById('pathOptionsContainer');

        // Variables de estado del juego
        let obstacles = [];
        let currentPolygon = [];
        let startPoint = null;
        let endPoint = null;
        let graph = {};
        let allPaths = [];
        let currentPathIndex = -1;
        let searchInProgress = false;
        let visitedNodes = [];
        let animationFrameId = null;
        let currentPosition = null;
        let dragItem = null;
        let isDragging = false;
        let playMode = false;

        // Colores
        const colors = {
            background: '#ffffff',
            obstacle: '#ffff00',
            start: '#2196F3',
            end: '#f44336',
            path: '#4CAF50',
            visited: '#FFC107',
            current: '#9C27B0',
            polygon: '#FFFF00',
            alternativePaths: [
                '#FF5722', '#9C27B0', '#3F51B5', '#009688', '#795548',
                '#E91E63', '#CDDC39', '#00BCD4', '#607D8B', '#8BC34A'
            ]
        };

        // Inicialización
        function init() {
            canvas.addEventListener('mousedown', handleMouseDown);
            canvas.addEventListener('mousemove', handleMouseMove);
            canvas.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('keydown', handleKeyPress);
            playBtn.addEventListener('click', togglePlayMode);
            vorazBtn.addEventListener('click', () => findPath('voraz'));
            aStarBtn.addEventListener('click', () => findPath('aStar'));
            heuristicaBtn.addEventListener('click', () => findPath('heuristica'));
            resetBtn.addEventListener('click', resetCanvas);
            
            draw();
        }

        // Manejo de eventos del ratón
        function handleMouseDown(e) {
            if (searchInProgress || playMode) return;
            
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Verificar si se está arrastrando el punto inicial o final
            if (startPoint && isPointInCircle(x, y, startPoint.x, startPoint.y, 15)) {
                dragItem = 'start';
                isDragging = true;
                return;
            }
            
            if (endPoint && isPointInCircle(x, y, endPoint.x, endPoint.y, 15)) {
                dragItem = 'end';
                isDragging = true;
                return;
            }
            
            // Si no se está arrastrando, verificar el modo seleccionado
            const selectedMode = document.querySelector('input[name="mode"]:checked').value;
            
            switch (selectedMode) {
                case 'start':
                    if (!isPointInObstacle(x, y)) {
                        startPoint = { x, y };
                        currentPosition = { ...startPoint };
                    }
                    break;
                case 'end':
                    if (!isPointInObstacle(x, y)) {
                        endPoint = { x, y };
                    }
                    break;
                case 'obstacle':
                default:
                    currentPolygon.push({ x, y });
                    
                    // Si el clic está cerca del primer punto, cerramos el polígono
                    if (currentPolygon.length > 2) {
                        const firstPoint = currentPolygon[0];
                        const distance = Math.sqrt(Math.pow(x - firstPoint.x, 2) + Math.pow(y - firstPoint.y, 2));
                        
                        if (distance < 20) {
                            obstacles.push([...currentPolygon]);
                            currentPolygon = [];
                        }
                    }
                    break;
            }
            
            draw();
        }

        function handleMouseMove(e) {
            if (!isDragging || searchInProgress || playMode) return;
            
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            if (dragItem === 'start' && !isPointInObstacle(x, y)) {
                startPoint.x = x;
                startPoint.y = y;
                currentPosition = { ...startPoint };
                draw();
            } else if (dragItem === 'end' && !isPointInObstacle(x, y)) {
                endPoint.x = x;
                endPoint.y = y;
                draw();
            }
        }

        function handleMouseUp() {
            isDragging = false;
            dragItem = null;
        }

        // Alternar modo de juego
        function togglePlayMode() {
            playMode = !playMode;
            
            if (playMode) {
                if (!startPoint || !endPoint) {
                    alert("Coloca ambos puntos (policía y ladrón) antes de jugar");
                    playMode = false;
                    return;
                }
                playBtn.textContent = "Salir del Modo Juego";
                currentPosition = { ...startPoint };
                pathOptionsContainer.style.display = 'none';
            } else {
                playBtn.textContent = "Jugar";
                currentPosition = null;
            }
            
            // Actualizar estado de los botones
            vorazBtn.disabled = playMode;
            aStarBtn.disabled = playMode;
            heuristicaBtn.disabled = playMode;
            
            draw();
        }

        // Verificar si un punto está dentro de un círculo
        function isPointInCircle(x, y, circleX, circleY, radius) {
            return Math.sqrt(Math.pow(x - circleX, 2) + Math.pow(y - circleY, 2)) <= radius;
        }

        // Verificar si un punto está dentro de un obstáculo
        function isPointInObstacle(x, y) {
            for (const polygon of obstacles) {
                if (pointInPolygon({ x, y }, polygon)) {
                    return true;
                }
            }
            return false;
        }

        // Verificar si una línea pasa por dentro de un obstáculo
        function doesLineCrossObstacle(p1, p2) {
            for (const polygon of obstacles) {
                // Verificar si la línea intersecta algún lado del polígono
                for (let i = 0; i < polygon.length; i++) {
                    const p3 = polygon[i];
                    const p4 = polygon[(i + 1) % polygon.length];
                    
                    if (doLinesIntersect(p1, p2, p3, p4)) {
                        // Verificar si la intersección no es en los extremos
                        if (!(pointsEqual(p1, p3) || pointsEqual(p1, p4) || 
                             pointsEqual(p2, p3) || pointsEqual(p2, p4))) {
                            return true;
                        }
                    }
                }
                
                // Verificar si el punto medio está dentro del polígono (para casos de líneas completamente dentro)
                const midPoint = {
                    x: (p1.x + p2.x) / 2,
                    y: (p1.y + p2.y) / 2
                };
                
                if (pointInPolygon(midPoint, polygon)) {
                    return true;
                }
            }
            return false;
        }

        // Algoritmo de punto en polígono
        function pointInPolygon(point, polygon) {
            let inside = false;
            for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
                const xi = polygon[i].x, yi = polygon[i].y;
                const xj = polygon[j].x, yj = polygon[j].y;
                
                const intersect = ((yi > point.y) !== (yj > point.y))
                    && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            return inside;
        }

        // Manejo de teclas (modo juego)
        function handleKeyPress(e) {
            if (!playMode || !currentPosition) return;
            
            const step = 10;
            let newX = currentPosition.x;
            let newY = currentPosition.y;
            
            switch (e.key) {
                case 'ArrowUp':
                    newY -= step;
                    break;
                case 'ArrowDown':
                    newY += step;
                    break;
                case 'ArrowLeft':
                    newX -= step;
                    break;
                case 'ArrowRight':
                    newX += step;
                    break;
                default:
                    return;
            }
            
            // Verificar colisión con obstáculos
            if (!isPointInObstacle(newX, newY)) {
                // Verificar si el movimiento cruza un obstáculo
                if (!doesLineCrossObstacle(currentPosition, {x: newX, y: newY})) {
                    currentPosition = { x: newX, y: newY };
                    
                    // Verificar si llegó al objetivo
                    if (endPoint && isPointInCircle(currentPosition.x, currentPosition.y, endPoint.x, endPoint.y, 15)) {
                        alert("¡Has atrapado al ladrón!");
                        playMode = false;
                        playBtn.textContent = "Jugar";
                        currentPosition = null;
                    }
                }
            }
            
            draw();
        }

        // Dibujar el estado actual del canvas
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Dibujar obstáculos
            ctx.fillStyle = colors.obstacle;
            for (const polygon of obstacles) {
                ctx.beginPath();
                ctx.moveTo(polygon[0].x, polygon[0].y);
                for (let i = 1; i < polygon.length; i++) {
                    ctx.lineTo(polygon[i].x, polygon[i].y);
                }
                ctx.closePath();
                ctx.fill();
                
                // Dibujar bordes de los polígonos
                ctx.strokeStyle = colors.polygon;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            
            // Dibujar polígono en construcción
            if (currentPolygon.length > 0) {
                ctx.beginPath();
                ctx.moveTo(currentPolygon[0].x, currentPolygon[0].y);
                for (let i = 1; i < currentPolygon.length; i++) {
                    ctx.lineTo(currentPolygon[i].x, currentPolygon[i].y);
                }
                ctx.strokeStyle = colors.polygon;
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
                
                // Dibujar puntos del polígono en construcción
                ctx.fillStyle = colors.polygon;
                for (const point of currentPolygon) {
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            // Dibujar puntos visitados en la búsqueda
            ctx.fillStyle = colors.visited;
            for (const node of visitedNodes) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Dibujar todos los caminos encontrados (transparentes)
            if (allPaths.length > 0) {
                for (let i = 0; i < allPaths.length; i++) {
                    if (i === currentPathIndex) continue; // El camino seleccionado se dibuja después
                    
                    const path = allPaths[i];
                    ctx.strokeStyle = colors.alternativePaths[i % colors.alternativePaths.length];
                    ctx.lineWidth = 2;
                    ctx.globalAlpha = 0.3;
                    ctx.beginPath();
                    ctx.moveTo(path[0].x, path[0].y);
                    for (let j = 1; j < path.length; j++) {
                        ctx.lineTo(path[j].x, path[j].y);
                    }
                    ctx.stroke();
                    ctx.globalAlpha = 1.0;
                }
            }
            
            // Dibujar camino seleccionado
            if (currentPathIndex >= 0 && allPaths[currentPathIndex]) {
                const selectedPath = allPaths[currentPathIndex];
                ctx.strokeStyle = colors.path;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(selectedPath[0].x, selectedPath[0].y);
                for (let i = 1; i < selectedPath.length; i++) {
                    ctx.lineTo(selectedPath[i].x, selectedPath[i].y);
                }
                ctx.stroke();
            }
            
            // Dibujar punto inicial (policía)
            if (startPoint) {
                ctx.fillStyle = colors.start;
                ctx.beginPath();
                ctx.arc(startPoint.x, startPoint.y, 10, 0, Math.PI * 2);
                ctx.fill();
                
                // Dibujar icono de policía
                ctx.fillStyle = 'white';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('I', startPoint.x, startPoint.y);
            }
            
            // Dibujar posición actual (en modo juego)
            if (playMode && currentPosition) {
                ctx.fillStyle = colors.current;
                ctx.beginPath();
                ctx.arc(currentPosition.x, currentPosition.y, 8, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Dibujar punto final (ladrón)
            if (endPoint) {
                ctx.fillStyle = colors.end;
                ctx.beginPath();
                ctx.arc(endPoint.x, endPoint.y, 10, 0, Math.PI * 2);
                ctx.fill();
                
                // Dibujar icono de ladrón
                ctx.fillStyle = 'white';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('O', endPoint.x, endPoint.y);
            }
        }

        // Construir el grafo de vértices
        function buildGraph() {
            const vertices = [];
            graph = {};
            
            // Agregar todos los vértices de los obstáculos
            for (const polygon of obstacles) {
                for (const vertex of polygon) {
                    vertices.push(vertex);
                }
            }
            
            // Agregar puntos inicial y final si existen
            if (startPoint) vertices.push(startPoint);
            if (endPoint) vertices.push(endPoint);
            
            // Para cada vértice, encontrar todos los vértices visibles (sin obstáculos en medio)
            for (let i = 0; i < vertices.length; i++) {
                const v1 = vertices[i];
                graph[`${v1.x},${v1.y}`] = [];
                
                for (let j = 0; j < vertices.length; j++) {
                    if (i === j) continue;
                    
                    const v2 = vertices[j];
                    if (!doesLineCrossObstacle(v1, v2)) {
                        const distance = Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2));
                        graph[`${v1.x},${v1.y}`].push({
                            x: v2.x,
                            y: v2.y,
                            cost: distance
                        });
                    }
                }
            }
            
            return graph;
        }

        // Verificar si dos segmentos de línea se intersectan
        function doLinesIntersect(p1, p2, p3, p4) {
            const ccw = (a, b, c) => (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
            return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
        }

        // Verificar si dos puntos son iguales
        function pointsEqual(p1, p2) {
            return p1.x === p2.x && p1.y === p2.y;
        }

        // Función heurística (distancia euclidiana)
        function heuristic(node, goal) {
            return Math.sqrt(Math.pow(node.x - goal.x, 2) + Math.pow(node.y - goal.y, 2));
        }

        // Encontrar múltiples caminos usando diferentes algoritmos
        function findPath(algorithm) {
            if (!startPoint || !endPoint || obstacles.length === 0) {
                alert("Por favor, coloca al menos un obstáculo, un punto inicial (I) y un punto final (O)");
                return;
            }
            
            // Construir el grafo
            buildGraph();
            
            // Preparar variables para la búsqueda
            const startKey = `${startPoint.x},${startPoint.y}`;
            const endKey = `${endPoint.x},${endPoint.y}`;
            
            allPaths = [];
            currentPathIndex = -1;
            visitedNodes = [];
            searchInProgress = true;
            
            // Deshabilitar botones durante la búsqueda
            playBtn.disabled = true;
            vorazBtn.disabled = true;
            aStarBtn.disabled = true;
            heuristicaBtn.disabled = true;
            resetBtn.disabled = true;
            
            // Ejecutar el algoritmo seleccionado para encontrar múltiples caminos
            switch (algorithm) {
                case 'voraz':
                    allPaths = findMultiplePathsGreedy(startKey, endKey, 10);
                    break;
                case 'aStar':
                    allPaths = findMultiplePathsAStar(startKey, endKey, 10);
                    break;
                case 'heuristica':
                    allPaths = findMultiplePathsHeuristic(startKey, endKey, 10);
                    break;
                default:
                    allPaths = [];
            }
            
            // Procesar los resultados
            if (allPaths.length > 0) {
                currentPathIndex = 0;
                showPathOptions();
                
                // Calcular estadísticas del primer camino
                updatePathInfo(0);
            } else {
                pathInfo.textContent = "No se encontraron caminos válidos.";
            }
            
            searchInProgress = false;
            
            // Habilitar botones después de la búsqueda
            playBtn.disabled = false;
            vorazBtn.disabled = false;
            aStarBtn.disabled = false;
            heuristicaBtn.disabled = false;
            resetBtn.disabled = false;
            
            draw();
        }

        // Mostrar opciones de caminos encontrados
        function showPathOptions() {
            pathOptionsContainer.innerHTML = '<p>Selecciona un camino para visualizarlo:</p>';
            pathOptionsContainer.style.display = 'flex';
            
            for (let i = 0; i < allPaths.length; i++) {
                const option = document.createElement('div');
                option.className = 'path-option';
                if (i === currentPathIndex) option.classList.add('selected');
                option.textContent = `Camino ${i+1}`;
                option.addEventListener('click', () => {
                    currentPathIndex = i;
                    updatePathInfo(i);
                    draw();
                    
                    // Actualizar selección visual
                    document.querySelectorAll('.path-option').forEach((el, idx) => {
                        if (idx === i) el.classList.add('selected');
                        else el.classList.remove('selected');
                    });
                });
                pathOptionsContainer.appendChild(option);
            }
        }

        // Actualizar la información del camino seleccionado
        function updatePathInfo(index) {
            if (index < 0 || index >= allPaths.length) return;
            
            const path = allPaths[index];
            const pathLength = path.reduce((total, node, idx) => {
                if (idx > 0) {
                    const prevNode = path[idx - 1];
                    return total + Math.sqrt(Math.pow(node.x - prevNode.x, 2) + Math.pow(node.y - prevNode.y, 2));
                }
                return total;
            }, 0);
            
            pathInfo.textContent = `Camino ${index+1}: ${path.length-1} segmentos, Longitud: ${pathLength.toFixed(2)} px`;
        }

        // Encontrar múltiples caminos con búsqueda voraz
        function findMultiplePathsGreedy(startKey, endKey, count) {
            const [goalX, goalY] = endKey.split(',').map(Number);
            const goal = { x: goalX, y: goalY };
            const paths = [];
            
            for (let i = 0; i < count; i++) {
                const path = findOnePathGreedy(startKey, endKey, goal, paths);
                if (path) paths.push(path);
                else break;
            }
            
            return paths.map(path => path.map(node => {
                const [x, y] = node.split(',').map(Number);
                return { x, y };
            }));
        }

        function findOnePathGreedy(startKey, endKey, goal, existingPaths) {
            const frontier = new PriorityQueue();
            frontier.enqueue(startKey, 0);
            const cameFrom = {};
            cameFrom[startKey] = null;
            
            const visitedNodes = [];
            
            while (!frontier.isEmpty()) {
                const current = frontier.dequeue().element;
                const [currentX, currentY] = current.split(',').map(Number);
                visitedNodes.push({ x: currentX, y: currentY });
                
                if (current === endKey) {
                    const path = reconstructPath(cameFrom, endKey);
                    
                    // Verificar si este camino es diferente a los existentes
                    if (!isPathSimilar(path, existingPaths)) {
                        return path;
                    }
                }
                
                for (const next of graph[current]) {
                    const nextKey = `${next.x},${next.y}`;
                    if (!cameFrom.hasOwnProperty(nextKey)) {
                        const priority = heuristic({ x: next.x, y: next.y }, goal);
                        frontier.enqueue(nextKey, priority);
                        cameFrom[nextKey] = current;
                    }
                }
            }
            
            return null;
        }

        // Encontrar múltiples caminos con A*
        function findMultiplePathsAStar(startKey, endKey, count) {
            const [goalX, goalY] = endKey.split(',').map(Number);
            const goal = { x: goalX, y: goalY };
            const paths = [];
            
            for (let i = 0; i < count; i++) {
                const path = findOnePathAStar(startKey, endKey, goal, paths);
                if (path) paths.push(path);
                else break;
            }
            
            return paths.map(path => path.map(node => {
                const [x, y] = node.split(',').map(Number);
                return { x, y };
            }));
        }

        function findOnePathAStar(startKey, endKey, goal, existingPaths) {
            const frontier = new PriorityQueue();
            frontier.enqueue(startKey, 0);
            const cameFrom = {};
            const costSoFar = {};
            cameFrom[startKey] = null;
            costSoFar[startKey] = 0;
            
            const visitedNodes = [];
            
            while (!frontier.isEmpty()) {
                const current = frontier.dequeue().element;
                const [currentX, currentY] = current.split(',').map(Number);
                visitedNodes.push({ x: currentX, y: currentY });
                
                if (current === endKey) {
                    const path = reconstructPath(cameFrom, endKey);
                    
                    // Verificar si este camino es diferente a los existentes
                    if (!isPathSimilar(path, existingPaths)) {
                        return path;
                    }
                }
                
                for (const next of graph[current]) {
                    const nextKey = `${next.x},${next.y}`;
                    const newCost = costSoFar[current] + next.cost;
                    
                    if (!costSoFar.hasOwnProperty(nextKey) || newCost < costSoFar[nextKey]) {
                        costSoFar[nextKey] = newCost;
                        const priority = newCost + heuristic({ x: next.x, y: next.y }, goal);
                        frontier.enqueue(nextKey, priority);
                        cameFrom[nextKey] = current;
                    }
                }
            }
            
            return null;
        }

        // Encontrar múltiples caminos con búsqueda heurística
        function findMultiplePathsHeuristic(startKey, endKey, count) {
            const [goalX, goalY] = endKey.split(',').map(Number);
            const goal = { x: goalX, y: goalY };
            const paths = [];
            
            for (let i = 0; i < count; i++) {
                const path = findOnePathHeuristic(startKey, endKey, goal, paths);
                if (path) paths.push(path);
                else break;
            }
            
            return paths.map(path => path.map(node => {
                const [x, y] = node.split(',').map(Number);
                return { x, y };
            }));
        }

        function findOnePathHeuristic(startKey, endKey, goal, existingPaths) {
            const frontier = new PriorityQueue();
            frontier.enqueue(startKey, 0);
            const cameFrom = {};
            cameFrom[startKey] = null;
            const memory = new Set([startKey]);
            
            const visitedNodes = [];
            
            while (!frontier.isEmpty()) {
                const current = frontier.dequeue().element;
                const [currentX, currentY] = current.split(',').map(Number);
                visitedNodes.push({ x: currentX, y: currentY });
                
                if (current === endKey) {
                    const path = reconstructPath(cameFrom, endKey);
                    
                    // Verificar si este camino es diferente a los existentes
                    if (!isPathSimilar(path, existingPaths)) {
                        return path;
                    }
                }
                
                for (const next of graph[current]) {
                    const nextKey = `${next.x},${next.y}`;
                    if (!memory.has(nextKey)) {
                        const priority = heuristic({ x: next.x, y: next.y }, goal);
                        frontier.enqueue(nextKey, priority);
                        cameFrom[nextKey] = current;
                        memory.add(nextKey);
                        
                        // Mantener la memoria acotada
                        if (memory.size > 100) {
                            const oldest = memory.values().next().value;
                            memory.delete(oldest);
                        }
                    }
                }
            }
            
            return null;
        }

        // Verificar si un camino es similar a los ya encontrados
        function isPathSimilar(newPath, existingPaths) {
            if (existingPaths.length === 0) return false;
            
            // Comparar los primeros 3 nodos (excepto inicio y fin)
            const newNodes = newPath.slice(1, Math.min(4, newPath.length - 1));
            
            for (const path of existingPaths) {
                const existingNodes = path.slice(1, Math.min(4, path.length - 1));
                
                let similar = true;
                for (let i = 0; i < Math.min(newNodes.length, existingNodes.length); i++) {
                    if (newNodes[i] !== existingNodes[i]) {
                        similar = false;
                        break;
                    }
                }
                
                if (similar) return true;
            }
            
            return false;
        }

        // Reconstruir el camino desde el diccionario cameFrom
        function reconstructPath(cameFrom, endKey) {
            const path = [endKey];
            let current = endKey;
            
            while (current !== null && cameFrom[current] !== null) {
                current = cameFrom[current];
                path.unshift(current);
            }
            
            return path;
        }

        // Cola de prioridad simple para los algoritmos de búsqueda
        class PriorityQueue {
            constructor() {
                this.items = [];
            }
            
            enqueue(element, priority) {
                const queueElement = { element, priority };
                let added = false;
                
                for (let i = 0; i < this.items.length; i++) {
                    if (queueElement.priority < this.items[i].priority) {
                        this.items.splice(i, 0, queueElement);
                        added = true;
                        break;
                    }
                }
                
                if (!added) {
                    this.items.push(queueElement);
                }
            }
            
            dequeue() {
                return this.items.shift();
            }
            
            isEmpty() {
                return this.items.length === 0;
            }
        }

        // Reiniciar el canvas
        function resetCanvas() {
            obstacles = [];
            currentPolygon = [];
            startPoint = null;
            endPoint = null;
            currentPosition = null;
            allPaths = [];
            currentPathIndex = -1;
            visitedNodes = [];
            pathInfo.textContent = '';
            pathOptionsContainer.style.display = 'none';
            playMode = false;
            playBtn.textContent = "Jugar";
            
            // Restablecer el modo a dibujar obstáculos
            document.querySelector('input[value="obstacle"]').checked = true;
            
            draw();
        }

        // Inicializar la aplicación
        init();
    