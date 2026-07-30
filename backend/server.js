// 1. Importamos los módulos necesarios
const http = require('http');
// Importamos la versión nativa de promesas del driver para poder usar async/await de forma limpia
const mysql = require('mysql2/promise');

// 2. CONFIGURACIÓN DE LA CONEXIÓN A MYSQL
// Creamos un "Pool" de conexiones directas a la base de datos real
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'todo_db',
    waitforConnections: true,
    connectionLimit: 10
});

// 3. Creamos el servidor HTTP nativo
const server = http.createServer(async (req,res) => {

    // Cabeceras de CORS manuales obligatorias para que el navegador no bloquee el live server
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers','Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

// ENRUTADOR NATIVO CON LAS CONSULTAS SQL

// Ruta 1 obtener tareas (GET /tasks)
    if (req.url === '/tasks' && req.method === 'GET') {
        try {
            // Ejecutamos la consulta SQL directa utilizando interpolación controlada del driver
            const [rows] = await pool.query('SELECT * FROM tasks');

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                data: rows
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'Error en MySQL: ' + error.message }));
        }
        return;
    }

// Ruta 2 crear tarea (POST /tasks)
if (req.url === '/tasks' && req.method === 'POST') {
    let body = '';

    // Reconstruimos el flujo de datos del cuerpo (Stream data chunks)
    req.on('data', chunk => { body += chunk.toString(); });

    // Cuando el paquete se termina de armar, disparamos la inserción asíncrona
    req.on('end', async () => {
        try {
            const { title, description, author } = JSON.parse(body);
            
            if (!title || !description || !author) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: 'Titulo y autor obligatorios' }));
                return;
            }
    
            // Consulta SQL con marcadores de posición (?) para pasar los datos de forma limpia
            const sql = 'INSERT INTO tasks (title, description, author) VALUES (?, ?, ?)';
            const [result] = await pool.execute(sql, [title, description || null, author]);

            // Construimos el objeto de respuesta usando el ID auto-incremental  que generó MySQL
            const newTask = {
                id: result.insertId,
                title,
                description: description || null,
                author,
                iscompleted: 0
            };

            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', data: { newTask } }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'Fallo al insertar: ' + error.message }));
        }
    });
    return;
}

// Ruta 3: actualizar tarea existente (PUT /tasks/:id)
if (req.url.startsWith('/tasks/') && req.method === 'PUT') {
    const urlParts = req.url.split('/');
    const taskId = parseInt(urlParts[2]); 
    
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });

    req.on('end', async () => {
        try {
            const { title, description, author, is_completed } = JSON.parse(body);

            // 1. Validar si la tarea existe en la base de datos todo_db
            const [rows] = await pool.query('SELECT author FROM tasks WHERE id = ?', [taskId]);

            if (rows.length === 0) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: 'La tarea no existe' }));
                return;
            }

            // 2. Regla del negocio: validar la propiedad del autor
            if (rows[0].author !== author) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: `No autorizado, la tarea es de ${rows[0].author}` }));
                return;
            }

            // 3. Ejecutar la actualización directa con MYSQL usando marcadores
            const sql = 'UPDATE tasks SET title = ?, description = ?, iscompleted = ? WHERE id = ?';
            await pool.execute(sql, [title, description || null, is_completed, taskId]);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', data: null }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'Error en MySQL: ' + error.message }));
        }
    });
    return;
}


// Ruta 4: eliminar tarea existente (DELETE /tasks/:id)
if (req.url.startsWith('/tasks/') && req.method === 'DELETE') {
    const urlParts = req.url.split('/');
    const taskId = parseInt(urlParts[2]);

    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });

    req.on('end', async () => {
        try {
            const { author } = JSON.parse(body);

            // Paso A: Consultar a Mysql si la tarea existe y quién es el dueño
            const [rows] = await pool.query('SELECT author FROM tasks WHERE id = ?', [taskId]);

            if (rows.length === 0) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: 'La tarea no existe en la BD' }));
                return;
            }

            const task = rows[0];

            // Lógica de protección: Comparamos el autor del JSON con el autor de la fila en MYSQL
            if (task.author !== author) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: `No autorizado, la tarea pertenece a ${task.author}` }));
                return;
            }

            // Paso B: Si pasa el filtro, ejecutamos el borrado fisico en la tabla 
            await pool.execute('DELETE FROM tasks WHERE id = ?', [taskId]);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', data: null }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'Fallo al eliminar de la BD: ' + error.message }));
        }
    });
    return;
}

// 404 - ruta no encontrada
res.writeHead(404, { 'Content-Type': 'application/json' });
res.end(JSON.stringify({ status: 'error', message: 'Endpoint no encontrado' }));
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor Vanilla con MySQL real corriendo en http://localhost:${PORT}`);
});

