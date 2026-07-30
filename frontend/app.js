// 1. CONFIGURACIÓN GLOBAL (Apunta a tu servidor nativo) 
const API_URL = 'http://localhost:3000/tasks';

// Intentamos leer si ay existe un nombre guardado en el disco del navegador
let AUTHOR = localStorage.getItem('todo_author_session');

// 2. CAPTURA CENTRALIZADA DE ELEMENTOS DEL DOM 
const currentUserText = document.getElementById('currentUser');
const logoutBtn = document.getElementById('logoutBtn');
const taskForm = document.getElementById('taskForm');
const taskTitle = document.getElementById('taskTitle');
const taskDescription = document.getElementById('taskDescription');
const taskContainer = document.getElementById('taskContainer');

// 2.1 SELECTORES DE MODALES PERSONALIZADOS
const customModal = document.getElementById('customModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');

const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const loginOutput = document.getElementById('loginOutput');

//  2.2 CONTROLADOR ASÍNCRONO DEL MODAL DE NOTIFICACIONES
function openCustomModal(title, message, isConfirm = false, onConfirmCallback = null) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;

    modalCancelBtn.style.display = isConfirm ? 'block' : 'none';
    customModal.classList.add('active');

    const nuevoConfirmBtn = modalConfirmBtn.cloneNode(true);
    const nuevoCancelBtn = modalCancelBtn.cloneNode(true);
    modalConfirmBtn.parentNode.replaceChild(nuevoConfirmBtn, modalConfirmBtn);
    modalCancelBtn.parentNode.replaceChild(nuevoCancelBtn, modalCancelBtn);

    nuevoConfirmBtn.addEventListener('click', () => {
        customModal.classList.remove('active');
        if (onConfirmCallback) onConfirmCallback();
    });

    nuevoCancelBtn.addEventListener('click', () => {
        customModal.classList.remove('active');
    });
}

// 3. GUARDIA DE AUTENTICACIÓN  (Manipúlación de modales de flujo)
function checkAuth() {
    if (!AUTHOR) {
        loginModal.classList.add('active');
    } else {
        modalclassList.remove('active');
        currentUserText.textContent = AUTHOR;
        fetchTasks(); // Cargamos las tareas solo si ya está identificado
    }
}

//  3.1 ESCUCHADOR PARA EL FORMULARIO INTERNO DEL MODAL LOGIN 
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = loginInput.value.trim();

    if (name && name.length >=2) {
        AUTHOR = name;
        localStorage.setItem('todo_author_session', AUTHOR);
        loginModal.classList.remove('active');
        currentUserText.textContent = AUTHOR;
        fetchTasks();
    } else {
        openCustomModal('Validación', 'Por favor ingresa un nombre válido (mínimo 2 caracteres).', false);
    }
});

// 4. LEER TAREAS DESDE MYSQL (GET)
async function fetchTasks() {
    try {
        const response = await fetch(API_URL);
        const json = await response.json();

        if (json.status === 'success' && json.data.tasks) {
            renderTasks(json.data.tasks);
        }
    } catch (error) {
        console.error('Error en la red:', error);
        taskContainer.innerHTML = `<p class = "error">No se pudo conectar con el servidor nativo.</p>`;
    }
}

//  5.  PINTAR LAS TARJETAS DINÁMICAMENTE 
function renderTasks(tasks) {
    taskContainer.innerHTML = ''; 

    if (tasks.length === 0) {
        taskContainer.innerHTML = `<p class="empty">No hay tareas pendientes en la base de datos.</p>`;
        return;
    }

    tasks.forEach(task => {
        const taskCard = document.createElement('div');
        taskCard.className = `task-card ${task.is_completed ? 'completed' : ''}`;

        const setHtmlModoLectura = () =>  {
            
        }
