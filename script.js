/* =========================================================
   Lista de Tarefas — lógica principal
   Guarda as tarefas no localStorage e reage à interface.
   ========================================================= */

const STORAGE_KEY = "tarefas.lista.v1";

// Referências dos elementos usados várias vezes
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskList = document.getElementById("task-list");
const taskTemplate = document.getElementById("task-template");
const emptyState = document.getElementById("empty-state");
const pendingCountEl = document.getElementById("pending-count");
const clearDoneBtn = document.getElementById("clear-done");
const filterButtons = document.querySelectorAll(".filter-btn");

// Estado da aplicação em memória
let tasks = [];
let currentFilter = "all"; // "all" | "pending" | "done"

/* =========================================================
   Persistência (localStorage)
   ========================================================= */

function loadTasks() {
  const saved = localStorage.getItem(STORAGE_KEY);
  tasks = saved ? JSON.parse(saved) : [];
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

/* =========================================================
   Operações sobre as tarefas
   ========================================================= */

function addTask(text) {
  const trimmed = text.trim();
  if (trimmed === "") return;

  tasks.push({
    id: crypto.randomUUID(),
    text: trimmed,
    completed: false,
  });

  saveTasks();
  render();
}

function toggleTaskDone(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  task.completed = !task.completed;
  saveTasks();
  render();
}

function deleteTask(id) {
  const item = taskList.querySelector(`[data-id="${id}"]`);

  // Espera a animação de saída terminar antes de remover do estado
  if (item) {
    item.classList.add("is-leaving");
    item.addEventListener(
      "animationend",
      () => {
        tasks = tasks.filter((t) => t.id !== id);
        saveTasks();
        render();
      },
      { once: true }
    );
  } else {
    tasks = tasks.filter((t) => t.id !== id);
    saveTasks();
    render();
  }
}

function editTaskText(id, newText) {
  const trimmed = newText.trim();
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  // Se o campo ficar vazio, mantém o texto original em vez de apagar a tarefa
  if (trimmed !== "") {
    task.text = trimmed;
  }

  saveTasks();
  render();
}

function clearCompletedTasks() {
  tasks = tasks.filter((t) => !t.completed);
  saveTasks();
  render();
}

/* =========================================================
   Renderização
   ========================================================= */

function getVisibleTasks() {
  if (currentFilter === "pending") return tasks.filter((t) => !t.completed);
  if (currentFilter === "done") return tasks.filter((t) => t.completed);
  return tasks;
}

function render() {
  const visibleTasks = getVisibleTasks();

  taskList.innerHTML = "";

  visibleTasks.forEach((task) => {
    taskList.appendChild(buildTaskElement(task));
  });

  updateEmptyState(visibleTasks.length);
  updatePendingCount();
  updateClearButton();
}

function buildTaskElement(task) {
  const fragment = taskTemplate.content.cloneNode(true);
  const item = fragment.querySelector(".task-item");
  const textEl = fragment.querySelector(".task-text");
  const editInput = fragment.querySelector(".task-edit-input");

  item.dataset.id = task.id;
  item.classList.toggle("is-done", task.completed);
  textEl.textContent = task.text;
  editInput.value = task.text;

  return fragment;
}

function updateEmptyState(visibleCount) {
  if (visibleCount > 0) {
    emptyState.hidden = true;
    return;
  }

  emptyState.hidden = false;

  if (tasks.length === 0) {
    emptyState.textContent = "Nada por aqui ainda. Adicione sua primeira tarefa acima.";
  } else if (currentFilter === "pending") {
    emptyState.textContent = "Nenhuma tarefa pendente. Bom trabalho!";
  } else if (currentFilter === "done") {
    emptyState.textContent = "Nenhuma tarefa concluída ainda.";
  }
}

function updatePendingCount() {
  const pending = tasks.filter((t) => !t.completed).length;
  const label = pending === 1 ? "1 pendente" : `${pending} pendentes`;
  pendingCountEl.textContent = label;
}

function updateClearButton() {
  const hasCompleted = tasks.some((t) => t.completed);
  clearDoneBtn.disabled = !hasCompleted;
}

/* =========================================================
   Edição de uma tarefa (troca o texto por um campo editável)
   ========================================================= */

function startEditing(item) {
  const textEl = item.querySelector(".task-text");
  const editInput = item.querySelector(".task-edit-input");

  textEl.hidden = true;
  editInput.hidden = false;
  editInput.focus();
  editInput.setSelectionRange(editInput.value.length, editInput.value.length);

  const finishEditing = () => {
    editInput.removeEventListener("blur", finishEditing);
    editInput.removeEventListener("keydown", onKeyDown);
    editTaskText(item.dataset.id, editInput.value);
  };

  const cancelEditing = () => {
    editInput.removeEventListener("blur", finishEditing);
    editInput.removeEventListener("keydown", onKeyDown);
    textEl.hidden = false;
    editInput.hidden = true;
  };

  function onKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      finishEditing();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
    }
  }

  editInput.addEventListener("blur", finishEditing);
  editInput.addEventListener("keydown", onKeyDown);
}

/* =========================================================
   Eventos
   ========================================================= */

// Adicionar tarefa (clique no botão ou tecla Enter, pois input está num <form>)
taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addTask(taskInput.value);
  taskInput.value = "";
  taskInput.focus();
});

// Ações dentro da lista: concluir, editar, excluir
taskList.addEventListener("click", (event) => {
  const item = event.target.closest(".task-item");
  if (!item) return;

  const id = item.dataset.id;

  if (event.target.closest(".task-check")) {
    toggleTaskDone(id);
  } else if (event.target.closest(".btn-edit")) {
    startEditing(item);
  } else if (event.target.closest(".btn-delete")) {
    deleteTask(id);
  }
});

// Filtros
filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;

    filterButtons.forEach((btn) => {
      btn.classList.toggle("is-active", btn === button);
      btn.setAttribute("aria-selected", btn === button ? "true" : "false");
    });

    render();
  });
});

// Limpar tarefas concluídas
clearDoneBtn.addEventListener("click", clearCompletedTasks);

/* =========================================================
   Inicialização
   ========================================================= */

loadTasks();
render();
