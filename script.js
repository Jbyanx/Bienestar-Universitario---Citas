/**
 * BASE DE DATOS MOCKEADA
 * Correos exactos para validación estricta de inicio de sesión.
 */
const DB = {
  students: [
    { id: 101, name: "Carlos Pérez", email: "carlos@estudiante.com" },
    { id: 102, name: "Andrea Ramos", email: "andrea@estudiante.com" }
  ],
  professionals: [
    { id: 1, name: "Dra. Marta Gómez", specialty: "Medicina General", email: "marta.gomez@profesional.com" },
    { id: 2, name: "Dr. Roberto Silva", specialty: "Medicina General", email: "roberto.silva@profesional.com" },
    { id: 3, name: "Dra. Laura Morales", specialty: "Psicología", email: "laura.morales@profesional.com" },
    { id: 4, name: "Dra. Viviana Cruz", specialty: "Odontología", email: "viviana.cruz@profesional.com" }
  ],
  // Horarios de la jornada
  defaultHours: ["08:00", "09:00", "10:30", "11:30", "14:00", "15:30", "16:30"],
  
  // Persistencia de citas
  getAppointments: () => {
    const data = localStorage.getItem('app_appointments');
    if (!data) {
      // Estado inicial si está vacío
      const initial = [];
      localStorage.setItem('app_appointments', JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(data);
  },
  saveAppointments: (list) => {
    localStorage.setItem('app_appointments', JSON.stringify(list));
  }
};

let currentUser = null;

// Referencias DOM
const loginScreen = document.getElementById('login-screen');
const studentDashboard = document.getElementById('student-dashboard');
const professionalDashboard = document.getElementById('professional-dashboard');
const mainHeader = document.getElementById('main-header');
const greetingText = document.getElementById('greeting-text');
const btnLogout = document.getElementById('btn-logout');

const serviceSelect = document.getElementById('service-select');
const dateSelect = document.getElementById('date-select');
const profFilter = document.getElementById('prof-filter');
const slotsContainer = document.getElementById('slots-container');
const studentHistoryBody = document.getElementById('student-history-body');
const profAppointmentsBody = document.getElementById('prof-appointments-body');
const toast = document.getElementById('toast');

// Configuración de fecha mínima (Hoy)
function setMinDate() {
  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1);
  const today = localISOTime.split('T')[0];
  dateSelect.min = today;
  dateSelect.value = today;
}
setMinDate();

// Función de Toast
function showToast(msg) {
  toast.innerHTML = `<i class="fa-solid fa-bell"></i> ${msg}`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ==========================================
// 1. SISTEMA DE LOGIN EXACTO (Mock Users)
// ==========================================
document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const inputEmail = document.getElementById('login-email').value.trim().toLowerCase();

  // Buscar si es profesional
  const profUser = DB.professionals.find(p => p.email === inputEmail);
  // Buscar si es estudiante
  const studentUser = DB.students.find(s => s.email === inputEmail);

  if (profUser) {
    currentUser = { ...profUser, role: 'professional' };
  } else if (studentUser) {
    currentUser = { ...studentUser, role: 'student' };
  } else {
    alert("Usuario no encontrado. Revisa la lista de 'usuarios de prueba disponibles'.");
    return;
  }

  // Activar interfaz
  loginScreen.classList.add('hidden');
  mainHeader.classList.remove('hidden');
  greetingText.innerHTML = `Hola, <strong>${currentUser.name}</strong>`;

  if (currentUser.role === 'student') {
    studentDashboard.classList.remove('hidden');
    professionalDashboard.classList.add('hidden');
    renderStudentHistory();
    renderAvailableSlots();
  } else {
    professionalDashboard.classList.remove('hidden');
    studentDashboard.classList.add('hidden');
    renderProfessionalAppointments();
  }
});

// Cerrar sesión
btnLogout.addEventListener('click', () => {
  currentUser = null;
  mainHeader.classList.add('hidden');
  studentDashboard.classList.add('hidden');
  professionalDashboard.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  document.getElementById('login-form').reset();
});

// ==========================================
// 2. NAVEGACIÓN TABS
// ==========================================
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const parent = btn.closest('section');
    parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    parent.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

    btn.classList.add('active');
    const target = btn.getAttribute('data-tab');
    document.getElementById(target).classList.remove('hidden');
  });
});

// ==========================================
// 3. FLUJO ESTUDIANTE (Apartar cita)
// ==========================================
serviceSelect.addEventListener('change', () => {
  const selected = serviceSelect.value;
  profFilter.innerHTML = '<option value="">Todos los profesionales</option>';

  if (!selected) {
    profFilter.disabled = true;
  } else {
    profFilter.disabled = false;
    const profs = DB.professionals.filter(p => p.specialty === selected);
    profs.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      profFilter.appendChild(opt);
    });
  }
  renderAvailableSlots();
});

dateSelect.addEventListener('change', renderAvailableSlots);
profFilter.addEventListener('change', renderAvailableSlots);

function renderAvailableSlots() {
  const service = serviceSelect.value;
  const date = dateSelect.value;
  const profFilterId = profFilter.value; // string de ID

  slotsContainer.innerHTML = '';

  if (!service) {
    slotsContainer.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <i class="fa-solid fa-arrow-pointer fa-2x" style="margin-bottom:10px; color:var(--primary)"></i><br>
        Selecciona primero la <strong>Especialidad</strong> para ver los horarios.
      </div>`;
    return;
  }
  if (!date) {
    slotsContainer.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">Selecciona una fecha válida.</div>`;
    return;
  }

  let availableProfs = DB.professionals.filter(p => p.specialty === service);
  if (profFilterId) {
    availableProfs = availableProfs.filter(p => p.id == profFilterId);
  }

  const bookedAppointments = DB.getAppointments();
  let totalSlots = 0;

  // Manejo correcto de hora actual local
  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  const localNow = new Date(Date.now() - tzOffset);
  const currentYMD = localNow.toISOString().split('T')[0];
  
  // Format HH:MM
  const currentHour = String(localNow.getUTCHours()).padStart(2, '0');
  const currentMinute = String(localNow.getUTCMinutes()).padStart(2, '0');
  const currentTimeStr = `${currentHour}:${currentMinute}`;

  DB.defaultHours.forEach(hour => {
    // FIX BUG: Si la fecha es hoy, ignorar horarios que ya pasaron
    if (date === currentYMD && hour <= currentTimeStr) {
      return; // Saltar a la siguiente hora
    }

    availableProfs.forEach(prof => {
      // Validar si el turno ya fue reservado
      const isTaken = bookedAppointments.some(a => 
        a.date === date && a.time === hour && a.profId === prof.id
      );

      if (!isTaken) {
        totalSlots++;
        const card = document.createElement('div');
        card.className = 'slot-card';
        card.innerHTML = `
          <div>
            <div class="slot-header">
              <span class="slot-time"><i class="fa-regular fa-clock"></i> ${hour}</span>
              <span class="badge badge-proxima">${service}</span>
            </div>
            <div class="slot-prof">${prof.name}</div>
            <div class="slot-service"><i class="fa-solid fa-location-dot"></i> Sede Bienestar</div>
          </div>
          <button class="btn-primary" onclick="bookSlot(${prof.id}, '${prof.name}', '${service}', '${date}', '${hour}')">
            <i class="fa-solid fa-calendar-check"></i> Apartar Cita
          </button>
        `;
        slotsContainer.appendChild(card);
      }
    });
  });

  if (totalSlots === 0) {
    slotsContainer.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <i class="fa-regular fa-folder-open fa-2x" style="margin-bottom:10px; color:#94a3b8"></i><br>
        No hay horarios disponibles para la fecha u opciones seleccionadas.
      </div>`;
  }
}

window.bookSlot = function(profId, profName, specialty, date, time) {
  const appointments = DB.getAppointments();
  appointments.push({
    id: Date.now(),
    studentName: currentUser.name,
    studentEmail: currentUser.email,
    profId: profId,
    profName: profName,
    specialty: specialty,
    date: date,
    time: time,
    status: "Próxima"
  });

  DB.saveAppointments(appointments);
  showToast(`Cita reservada con ${profName}`);
  renderAvailableSlots();
  renderStudentHistory();

  // Ir a "Mis Citas"
  document.querySelector('[data-tab="tab-history"]').click();
};

function renderStudentHistory() {
  const appointments = DB.getAppointments()
    .filter(a => a.studentEmail === currentUser.email)
    .sort((a, b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`));

  studentHistoryBody.innerHTML = '';

  if (appointments.length === 0) {
    studentHistoryBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No tienes citas registradas.</td></tr>`;
    return;
  }

  appointments.forEach(apt => {
    const aptDateTime = new Date(`${apt.date}T${apt.time}`);
    const now = new Date();
    const status = aptDateTime < now ? 'Finalizada' : apt.status;
    const badgeClass = status === 'Próxima' ? 'badge-proxima' : 'badge-finalizada';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${apt.specialty}</strong></td>
      <td>${apt.profName}</td>
      <td><i class="fa-regular fa-calendar"></i> ${apt.date} <br><i class="fa-regular fa-clock"></i> ${apt.time}</td>
      <td><span class="badge ${badgeClass}">${status}</span></td>
      <td>
        ${status === 'Próxima' 
          ? `<button style="background:none; border:none; color:#dc2626; cursor:pointer; font-weight:600;" onclick="cancelAppointment(${apt.id})"><i class="fa-solid fa-trash-can"></i> Cancelar</button>`
          : '-'
        }
      </td>
    `;
    studentHistoryBody.appendChild(tr);
  });
}

window.cancelAppointment = function(id) {
  if (!confirm("¿Seguro que deseas cancelar esta cita?")) return;
  let appointments = DB.getAppointments().filter(a => a.id !== id);
  DB.saveAppointments(appointments);
  showToast("Cita cancelada");
  renderStudentHistory();
  renderAvailableSlots();
};

// ==========================================
// 4. FLUJO PROFESIONAL
// ==========================================
function renderProfessionalAppointments() {
  const appointments = DB.getAppointments();
  // Filtrar estrictamente por el ID del profesional mockeado
  const myAppointments = appointments.filter(a => a.profId === currentUser.id);

  // Ordenar de la más próxima a las más lejanas
  myAppointments.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));

  profAppointmentsBody.innerHTML = '';

  if (myAppointments.length === 0) {
    profAppointmentsBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No hay estudiantes agendados.</td></tr>`;
    return;
  }

  myAppointments.forEach(apt => {
    const aptDateTime = new Date(`${apt.date}T${apt.time}`);
    const now = new Date();
    const status = aptDateTime < now ? 'Finalizada' : apt.status;
    const badgeClass = status === 'Próxima' ? 'badge-proxima' : 'badge-finalizada';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${apt.studentName}</strong><br><small class="text-muted">${apt.studentEmail}</small></td>
      <td>${apt.specialty}</td>
      <td><i class="fa-regular fa-calendar"></i> ${apt.date}</td>
      <td><i class="fa-regular fa-clock"></i> ${apt.time}</td>
      <td><span class="badge ${badgeClass}">${status}</span></td>
    `;
    profAppointmentsBody.appendChild(tr);
  });
}

document.getElementById('btn-save-schedule').addEventListener('click', () => {
  showToast("Horarios guardados en sistema");
});
