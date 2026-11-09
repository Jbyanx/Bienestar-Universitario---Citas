const database = window.BienestarDB;

let currentUser = null;

const loginScreen = document.getElementById('login-screen');
const loginForm = document.getElementById('login-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const studentDashboard = document.getElementById('student-dashboard');
const professionalDashboard = document.getElementById('professional-dashboard');
const mainHeader = document.getElementById('main-header');
const greetingText = document.getElementById('greeting-text');
const btnLogout = document.getElementById('btn-logout');
const serviceSelect = document.getElementById('service-select');
const dateSelect = document.getElementById('date-select');
const profFilter = document.getElementById('prof-filter');
const studentIdInput = document.getElementById('student-id');
const slotsContainer = document.getElementById('slots-container');
const studentHistoryBody = document.getElementById('student-history-body');
const profAppointmentsBody = document.getElementById('prof-appointments-body');
const toast = document.getElementById('toast');
const appointmentModal = document.getElementById('appointment-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalConfirmButton = document.getElementById('modal-confirm');
const modalCancelButton = document.getElementById('modal-cancel');

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function setMinDate() {
  const today = getLocalDateString();
  dateSelect.min = today;
  dateSelect.value = today;
}

function readData() {
  return database.read();
}

function writeData(data) {
  database.write(data);
}

function showToast(message) {
  toast.textContent = '';
  const icon = document.createElement('i');
  icon.className = 'fa-solid fa-bell';
  toast.append(icon, document.createTextNode(` ${message}`));
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 3000);
}

function showAppointmentModal({ title, message, confirmLabel, cancelLabel = '' }) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modalConfirmButton.textContent = confirmLabel;
  modalCancelButton.hidden = !cancelLabel;
  modalCancelButton.textContent = cancelLabel;

  return new Promise(resolve => {
    appointmentModal.addEventListener('close', () => {
      resolve(appointmentModal.returnValue === 'confirm');
    }, { once: true });
    modalConfirmButton.onclick = () => appointmentModal.close('confirm');
    modalCancelButton.onclick = () => appointmentModal.close('cancel');
    appointmentModal.showModal();
  });
}

function getCurrentAccount(session) {
  const data = readData();
  const accounts = session.rol === 'Estudiante' ? data.estudiantes : data.doctores;
  const account = accounts.find(item => item.id === session.id);
  if (!account) return null;

  return {
    id: account.id,
    nombre: account.nombre,
    correo: account.correo,
    rol: session.rol,
    especialidad: account.especialidad || ''
  };
}

function showDashboard(user) {
  currentUser = user;
  loginScreen.classList.add('hidden');
  mainHeader.classList.remove('hidden');
  greetingText.textContent = `Hola, ${user.nombre}`;

  if (user.rol === 'Estudiante') {
    studentIdInput.value = user.id;
    studentDashboard.classList.remove('hidden');
    professionalDashboard.classList.add('hidden');
    studentDashboard.querySelector('.tab-btn').click();
    renderStudentHistory();
    renderAvailableSlots();
    return;
  }

  studentDashboard.classList.add('hidden');
  professionalDashboard.classList.remove('hidden');
  professionalDashboard.querySelector('.tab-btn').click();
  renderProfessionalAppointments();
}

function clearSession() {
  currentUser = null;
  sessionStorage.removeItem('bienestar_session');
  studentIdInput.value = '';
  mainHeader.classList.add('hidden');
  studentDashboard.classList.add('hidden');
  professionalDashboard.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  loginForm.reset();
}

setMinDate();

loginForm.addEventListener('submit', event => {
  event.preventDefault();
  const email = loginEmail.value.trim().toLowerCase();
  const password = loginPassword.value;
  const data = readData();
  const student = data.estudiantes.find(account =>
    account.correo.toLowerCase() === email && account.password === password
  );
  const doctor = data.doctores.find(account =>
    account.correo.toLowerCase() === email && account.password === password
  );
  const account = student || doctor;

  if (!account) {
    alert('Correo o contraseña incorrectos. Verifica las credenciales de prueba.');
    return;
  }

  const user = {
    id: account.id,
    nombre: account.nombre,
    correo: account.correo,
    rol: student ? 'Estudiante' : 'Profesional',
    especialidad: account.especialidad || ''
  };
  sessionStorage.setItem('bienestar_session', JSON.stringify(user));
  showDashboard(user);
});

btnLogout.addEventListener('click', clearSession);

document.querySelectorAll('.tab-btn').forEach(button => {
  button.addEventListener('click', () => {
    const section = button.closest('section');
    section.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active'));
    section.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
    button.classList.add('active');
    document.getElementById(button.dataset.tab).classList.remove('hidden');
  });
});

serviceSelect.addEventListener('change', () => {
  const selectedSpecialty = serviceSelect.value;
  profFilter.replaceChildren();
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'Todos los profesionales';
  profFilter.appendChild(allOption);
  profFilter.disabled = !selectedSpecialty;

  if (selectedSpecialty) {
    readData().doctores
      .filter(doctor => doctor.especialidad === selectedSpecialty)
      .forEach(doctor => {
        const option = document.createElement('option');
        option.value = doctor.id;
        option.textContent = doctor.nombre;
        profFilter.appendChild(option);
      });
  }
  renderAvailableSlots();
});

dateSelect.addEventListener('change', () => {
  const today = getLocalDateString();
  if (dateSelect.value && dateSelect.value < today) dateSelect.value = today;
  renderAvailableSlots();
});

profFilter.addEventListener('change', renderAvailableSlots);

function createTimeSlots() {
  const slots = [];
  for (let minutes = 8 * 60; minutes < 16 * 60; minutes += 30) {
    const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
    const minute = String(minutes % 60).padStart(2, '0');
    slots.push(`${hour}:${minute}`);
  }
  return slots;
}

function isAppointmentInPast(date, time) {
  return new Date(`${date}T${time}:00`) <= new Date();
}

function renderAvailableSlots() {
  const specialty = serviceSelect.value;
  const date = dateSelect.value;
  slotsContainer.replaceChildren();

  if (!specialty) {
    slotsContainer.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">Selecciona primero la <strong>Especialidad</strong> para ver los horarios.</div>';
    return;
  }
  if (!date || date < getLocalDateString()) {
    slotsContainer.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">Selecciona una fecha válida a partir de hoy.</div>';
    return;
  }

  const data = readData();
  let doctors = data.doctores.filter(doctor => doctor.especialidad === specialty);
  if (profFilter.value) {
    doctors = doctors.filter(doctor => doctor.id === profFilter.value);
  }

  let availableCount = 0;
  createTimeSlots().forEach(time => {
    if (date === getLocalDateString() && isAppointmentInPast(date, time)) return;

    doctors.forEach(doctor => {
      const alreadyBooked = data.citas.some(appointment =>
        appointment.fecha === date &&
        appointment.hora === time &&
        appointment.doctorId === doctor.id &&
        appointment.estado !== 'CANCELADA'
      );
      if (alreadyBooked) return;

      availableCount += 1;
      const card = document.createElement('div');
      card.className = 'slot-card';
      const details = document.createElement('div');
      details.innerHTML = `
        <div class="slot-header">
          <span class="slot-time"><i class="fa-regular fa-clock"></i> ${time}</span>
          <span class="badge badge-proxima">${specialty}</span>
        </div>
        <div class="slot-prof"></div>
        <div class="slot-service"><i class="fa-solid fa-location-dot"></i> Sede Bienestar</div>
      `;
      details.querySelector('.slot-prof').textContent = doctor.nombre;

      const bookButton = document.createElement('button');
      bookButton.type = 'button';
      bookButton.className = 'btn-primary';
      bookButton.innerHTML = '<i class="fa-solid fa-calendar-check"></i> Apartar Cita';
      bookButton.addEventListener('click', () => bookAppointment(doctor, date, time));
      card.append(details, bookButton);
      slotsContainer.appendChild(card);
    });
  });

  if (availableCount === 0) {
    slotsContainer.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">No hay horarios disponibles para la fecha u opciones seleccionadas.</div>';
  }
}

async function bookAppointment(doctor, date, time) {
  const data = readData();
  const appointmentExists = data.citas.some(appointment =>
    appointment.fecha === date &&
    appointment.hora === time &&
    appointment.doctorId === doctor.id &&
    appointment.estado !== 'CANCELADA'
  );
  if (appointmentExists) {
    renderAvailableSlots();
    await showAppointmentModal({
      title: 'Horario no disponible',
      message: 'Ese turno acaba de ser reservado. Selecciona otro horario.',
      confirmLabel: 'Entendido'
    });
    return;
  }

  data.citas.push({
    id: `CITA-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
    estudianteId: studentIdInput.value,
    doctorId: doctor.id,
    especialidad: doctor.especialidad,
    fecha: date,
    hora: time,
    estado: 'PRÓXIMA'
  });
  writeData(data);
  renderAvailableSlots();
  renderStudentHistory();
  await showAppointmentModal({
    title: 'Reserva confirmada',
    message: 'Cita reservada con éxito',
    confirmLabel: 'Aceptar'
  });
}

function getAppointmentStatus(appointment) {
  if (appointment.estado === 'CANCELADA') return 'CANCELADA';
  return isAppointmentInPast(appointment.fecha, appointment.hora) ? 'FINALIZADA' : appointment.estado;
}

function getBadgeClass(status) {
  return status === 'PRÓXIMA' ? 'badge-proxima' : 'badge-finalizada';
}

function renderStudentHistory() {
  const data = readData();
  const appointments = data.citas
    .filter(appointment => appointment.estudianteId === currentUser.id)
    .sort((first, second) =>
      new Date(`${second.fecha}T${second.hora}`) - new Date(`${first.fecha}T${first.hora}`)
    );

  studentHistoryBody.replaceChildren();
  if (appointments.length === 0) {
    studentHistoryBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No tienes citas registradas.</td></tr>';
    return;
  }

  appointments.forEach(appointment => {
    const doctor = data.doctores.find(item => item.id === appointment.doctorId);
    const status = getAppointmentStatus(appointment);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${appointment.especialidad || doctor?.especialidad || 'Especialidad no disponible'}</strong></td>
      <td></td>
      <td><i class="fa-regular fa-calendar"></i> ${appointment.fecha}</td>
      <td><i class="fa-regular fa-clock"></i> ${appointment.hora}</td>
      <td><span class="badge ${getBadgeClass(status)}">${status}</span></td>
      <td></td>
    `;
    row.children[1].textContent = doctor?.nombre || 'Profesional no disponible';

    if (appointment.estado === 'PRÓXIMA' && status === 'PRÓXIMA') {
      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'cancel-appointment';
      cancelButton.innerHTML = '<i class="fa-solid fa-trash-can"></i> Cancelar';
      cancelButton.style.cssText = 'background:none; border:none; color:#dc2626; cursor:pointer; font-weight:600;';
      cancelButton.addEventListener('click', () => cancelAppointment(appointment.id));
      row.children[5].appendChild(cancelButton);
    } else {
      row.children[5].textContent = '-';
    }
    studentHistoryBody.appendChild(row);
  });
}

async function cancelAppointment(appointmentId) {
  const currentAppointment = readData().citas.find(appointment =>
    appointment.id === appointmentId && appointment.estudianteId === currentUser.id
  );
  if (!currentAppointment || currentAppointment.estado !== 'PRÓXIMA') return;

  const confirmed = await showAppointmentModal({
    title: 'Cancelar cita',
    message: '¿Seguro que deseas cancelar esta cita?',
    confirmLabel: 'Sí, cancelar',
    cancelLabel: 'Volver'
  });
  if (!confirmed) return;

  const data = readData();
  const appointment = data.citas.find(item =>
    item.id === appointmentId && item.estudianteId === currentUser.id
  );
  if (!appointment || appointment.estado !== 'PRÓXIMA') return;
  appointment.estado = 'CANCELADA';
  writeData(data);
  showToast('Cita cancelada');
  renderStudentHistory();
  renderAvailableSlots();
}

function renderProfessionalAppointments() {
  const data = readData();
  const appointments = data.citas
    .filter(appointment => appointment.doctorId === currentUser.id)
    .sort((first, second) =>
      new Date(`${first.fecha}T${first.hora}`) - new Date(`${second.fecha}T${second.hora}`)
    );

  profAppointmentsBody.replaceChildren();
  if (appointments.length === 0) {
    profAppointmentsBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No hay estudiantes agendados.</td></tr>';
    return;
  }

  appointments.forEach(appointment => {
    const student = data.estudiantes.find(item => item.id === appointment.estudianteId);
    const status = getAppointmentStatus(appointment);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong></strong><br><small class="text-muted"></small></td>
      <td>${currentUser.especialidad}</td>
      <td><i class="fa-regular fa-calendar"></i> ${appointment.fecha}</td>
      <td><i class="fa-regular fa-clock"></i> ${appointment.hora}</td>
      <td><span class="badge ${getBadgeClass(status)}">${status}</span></td>
    `;
    row.querySelector('strong').textContent = student?.nombre || 'Estudiante no encontrado';
    row.querySelector('small').textContent = student?.correo || '';
    profAppointmentsBody.appendChild(row);
  });
}

document.getElementById('btn-save-schedule').addEventListener('click', () => {
  showToast('Horarios guardados en sistema');
});

const savedSession = sessionStorage.getItem('bienestar_session');
if (savedSession) {
  try {
    const user = getCurrentAccount(JSON.parse(savedSession));
    if (user) showDashboard(user);
    else sessionStorage.removeItem('bienestar_session');
  } catch {
    sessionStorage.removeItem('bienestar_session');
  }
} else {
  const currentPage = window.location.pathname.split('/').pop();
  if (currentPage && currentPage !== 'index.html') {
    window.location.replace('index.html');
  }
}
