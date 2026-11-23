const database = window.BienestarDB;

let currentUser = null;
let studentStatusFilter = 'ALL';
let profStatusFilter = 'ALL';
let toastTimer = null;

// Referencias DOM
const loginScreen = document.getElementById('login-screen');
const loginForm = document.getElementById('login-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const togglePasswordBtn = document.getElementById('toggle-password');
const loginError = document.getElementById('login-error');
const loginErrorText = document.getElementById('login-error-text');

const mainHeader = document.getElementById('main-header');
const greetingText = document.getElementById('greeting-text');
const userAvatar = document.getElementById('user-avatar');
const userRoleBadge = document.getElementById('user-role-badge');
const btnLogout = document.getElementById('btn-logout');

const studentDashboard = document.getElementById('student-dashboard');
const professionalDashboard = document.getElementById('professional-dashboard');
const studentActiveCount = document.getElementById('student-active-count');
const profActiveCount = document.getElementById('prof-active-count');

const serviceSelect = document.getElementById('service-select');
const dateSelect = document.getElementById('date-select');
const profFilter = document.getElementById('prof-filter');
const studentIdInput = document.getElementById('student-id');
const slotsContainer = document.getElementById('slots-container');
const slotsSummary = document.getElementById('slots-summary');
const studentHistoryBody = document.getElementById('student-history-body');
const profAppointmentsBody = document.getElementById('prof-appointments-body');
const scheduleSummaryPill = document.getElementById('schedule-summary-pill');

const toast = document.getElementById('toast');
const reminderAlert = document.getElementById('reminder-alert');
const reminderAlertText = document.getElementById('reminder-alert-text');
const reminderDismiss = document.getElementById('reminder-dismiss');

const appointmentModal = document.getElementById('appointment-modal');
const modalIcon = document.getElementById('modal-icon');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalConfirmButton = document.getElementById('modal-confirm');
const modalCancelButton = document.getElementById('modal-cancel');

const WEEKDAY_KEYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const DEFAULT_FRANJAS = ['08:00-10:00', '10:00-12:00', '14:00-16:00'];

// =========================================
// UTILIDADES DE FECHA, FORMATO Y UI
// =========================================
function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(isoDate) {
  if (!isoDate || !isoDate.includes('-')) return isoDate || '';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

function getWeekdayKey(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return WEEKDAY_KEYS[new Date(year, month - 1, day).getDay()];
}

function getInitials(fullName = '') {
  const cleaned = fullName.replace(/^(Dra?\.|Lic\.)\s+/i, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'BU';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getSpecialtyBadgeClass(specialty) {
  if (specialty === 'Odontología') return 'badge-odontologia';
  if (specialty === 'Psicología') return 'badge-psicologia';
  return 'badge-medicina';
}

function getStatusBadgeMeta(status) {
  switch (status) {
    case 'CONFIRMADA':
      return { cls: 'badge-confirmada', icon: 'fa-solid fa-circle-check' };
    case 'CANCELADA':
      return { cls: 'badge-cancelada', icon: 'fa-solid fa-circle-xmark' };
    case 'FINALIZADA':
      return { cls: 'badge-finalizada', icon: 'fa-solid fa-flag-checkered' };
    default:
      return { cls: 'badge-proxima', icon: 'fa-regular fa-clock' };
  }
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

function showToast(message, variant = 'info') {
  toast.replaceChildren();
  toast.className = `toast toast--${variant}`;

  const icon = document.createElement('i');
  if (variant === 'success') icon.className = 'fa-solid fa-circle-check';
  else if (variant === 'danger') icon.className = 'fa-solid fa-circle-exclamation';
  else icon.className = 'fa-solid fa-bell';
  icon.style.marginTop = '2px';

  const textSpan = document.createElement('span');
  textSpan.textContent = message;

  toast.append(icon, textSpan);
  toast.classList.add('show');

  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 3600);
}

function showAppointmentModal({
  title,
  message,
  confirmLabel,
  cancelLabel = '',
  variant = 'primary'
}) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modalConfirmButton.textContent = confirmLabel;
  modalConfirmButton.className = `btn btn-${variant}`;
  modalCancelButton.hidden = !cancelLabel;
  modalCancelButton.textContent = cancelLabel;

  modalIcon.className = `modal-icon modal-icon--${variant}`;
  if (variant === 'danger') {
    modalIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
  } else if (variant === 'success') {
    modalIcon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
  } else {
    modalIcon.innerHTML = '<i class="fa-solid fa-calendar-check"></i>';
  }

  return new Promise(resolve => {
    const handleClose = () => {
      resolve(appointmentModal.returnValue === 'confirm');
    };
    appointmentModal.addEventListener('close', handleClose, { once: true });
    modalConfirmButton.onclick = () => appointmentModal.close('confirm');
    modalCancelButton.onclick = () => appointmentModal.close('cancel');
    appointmentModal.showModal();
  });
}

function getAppointmentDoctorId(appointment) {
  return appointment.id_doctor ?? appointment.doctorId;
}

function getAppointmentStudentId(appointment) {
  return appointment.id_estudiante ?? appointment.estudianteId;
}

function isAppointmentInPast(date, time) {
  return new Date(`${date}T${time}:00`) <= new Date();
}

function getAppointmentStatus(appointment) {
  if (appointment.estado === 'CANCELADA') return 'CANCELADA';
  if (appointment.estado === 'FINALIZADA') return 'FINALIZADA';
  return isAppointmentInPast(appointment.fecha, appointment.hora) ? 'FINALIZADA' : appointment.estado;
}

// =========================================
// RECORDATORIO SIMULADO (M4)
// =========================================
function simularCronRecordatorios() {
  if (!currentUser || currentUser.rol !== 'Estudiante') {
    reminderAlert.classList.add('hidden');
    reminderAlertText.textContent = '';
    return;
  }

  const now = new Date();
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const data = readData();

  const nextItem = data.citas
    .filter(appointment =>
      String(getAppointmentStudentId(appointment)) === String(currentUser.id) &&
      ['PRÓXIMA', 'CONFIRMADA'].includes(appointment.estado)
    )
    .map(appointment => ({
      appointment,
      dateTime: new Date(`${appointment.fecha}T${appointment.hora}:00`)
    }))
    .filter(item => item.dateTime >= now && item.dateTime <= twoDaysFromNow)
    .sort((a, b) => a.dateTime - b.dateTime)[0];

  if (!nextItem) {
    reminderAlert.classList.add('hidden');
    reminderAlertText.textContent = '';
    return;
  }

  const { fecha, hora, especialidad, doctorId } = nextItem.appointment;
  const doctor = data.doctores.find(doc => doc.id === doctorId);
  const doctorLabel = doctor ? ` con ${doctor.nombre}` : '';
  reminderAlertText.textContent = `Recordatorio: Tienes una cita de ${especialidad}${doctorLabel} el ${formatDisplayDate(fecha)} a las ${hora}.`;
  reminderAlert.classList.remove('hidden');
}

reminderDismiss.addEventListener('click', () => {
  reminderAlert.classList.add('hidden');
});

// =========================================
// AUTENTICACIÓN Y NAVEGACIÓN (M1)
// =========================================
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
  loginError.classList.add('hidden');
  loginScreen.classList.add('hidden');
  mainHeader.classList.remove('hidden');

  greetingText.textContent = user.nombre;
  userAvatar.textContent = getInitials(user.nombre);
  userRoleBadge.textContent = user.rol === 'Profesional' && user.especialidad
    ? user.especialidad
    : user.rol;

  if (user.rol === 'Estudiante') {
    studentIdInput.value = user.id;
    studentDashboard.classList.remove('hidden');
    professionalDashboard.classList.add('hidden');
    studentDashboard.querySelector('.tab-btn').click();
    renderStudentHistory();
    renderAvailableSlots();
    simularCronRecordatorios();
    return;
  }

  studentDashboard.classList.add('hidden');
  professionalDashboard.classList.remove('hidden');
  professionalDashboard.querySelector('.tab-btn').click();
  loadProfessionalAvailability();
  renderProfessionalAppointments();
}

function clearSession() {
  currentUser = null;
  sessionStorage.removeItem('bienestar_session');
  studentIdInput.value = '';
  reminderAlert.classList.add('hidden');
  reminderAlertText.textContent = '';
  mainHeader.classList.add('hidden');
  studentDashboard.classList.add('hidden');
  professionalDashboard.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  loginForm.reset();
  loginError.classList.add('hidden');
}

togglePasswordBtn.addEventListener('click', () => {
  const isPassword = loginPassword.type === 'password';
  loginPassword.type = isPassword ? 'text' : 'password';
  togglePasswordBtn.innerHTML = isPassword
    ? '<i class="fa-regular fa-eye-slash"></i>'
    : '<i class="fa-regular fa-eye"></i>';
});

document.querySelectorAll('.demo-user-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    loginEmail.value = btn.dataset.email;
    loginPassword.value = btn.dataset.pass;
    loginError.classList.add('hidden');
    const details = btn.closest('details');
    if (details) details.open = false;
    loginEmail.focus();
  });
});

loginForm.addEventListener('submit', event => {
  event.preventDefault();
  const email = loginEmail.value.trim().toLowerCase();
  const password = loginPassword.value;
  const data = readData();

  const student = data.estudiantes.find(
    account => account.correo.toLowerCase() === email && account.password === password
  );
  const doctor = data.doctores.find(
    account => account.correo.toLowerCase() === email && account.password === password
  );
  const account = student || doctor;

  if (!account) {
    loginErrorText.textContent = 'Correo o contraseña incorrectos. Puedes elegir un usuario de prueba abajo.';
    loginError.classList.remove('hidden');
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

btnLogout.addEventListener('click', async () => {
  const confirmed = await showAppointmentModal({
    title: 'Cerrar sesión',
    message: '¿Seguro que deseas salir del Portal de Bienestar Universitario?',
    confirmLabel: 'Sí, salir',
    cancelLabel: 'Seguir aquí',
    variant: 'danger'
  });
  if (confirmed) clearSession();
});

document.querySelectorAll('.tab-btn').forEach(button => {
  button.addEventListener('click', () => {
    const section = button.closest('section');
    section.querySelectorAll('.tab-btn').forEach(tab => {
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
    });
    section.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
    button.classList.add('active');
    button.setAttribute('aria-selected', 'true');
    document.getElementById(button.dataset.tab).classList.remove('hidden');
  });
});

// =========================================
// CONSULTA Y RESERVA DE CITAS (M2)
// =========================================
function expandFranjasToSlots(franjas) {
  const slots = [];
  franjas.forEach(franja => {
    const [startStr, endStr] = franja.split('-');
    if (!startStr || !endStr) return;
    const [sh, sm] = startStr.split(':').map(Number);
    const [eh, em] = endStr.split(':').map(Number);
    for (let minutes = sh * 60 + sm; minutes < eh * 60 + em; minutes += 30) {
      const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
      const minute = String(minutes % 60).padStart(2, '0');
      slots.push(`${hour}:${minute}`);
    }
  });
  return [...new Set(slots)].sort();
}

function getDoctorSlotsForDate(doctorId, isoDate, data) {
  const saved = (data.disponibilidad || []).find(
    item => String(item.id_doctor ?? item.doctorId) === String(doctorId)
  );
  if (!saved || !Array.isArray(saved.dias)) {
    return expandFranjasToSlots(DEFAULT_FRANJAS);
  }
  const dayKey = getWeekdayKey(isoDate);
  const dayConfig = saved.dias.find(day => day.dia === dayKey);
  if (!dayConfig || !Array.isArray(dayConfig.franjas) || dayConfig.franjas.length === 0) {
    return [];
  }
  return expandFranjasToSlots(dayConfig.franjas);
}

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

function renderAvailableSlots() {
  const specialty = serviceSelect.value;
  const date = dateSelect.value;
  slotsContainer.replaceChildren();
  slotsSummary.textContent = '';

  if (!specialty) {
    slotsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-hand-pointer"></i>
        Selecciona primero una <strong>Especialidad</strong> para consultar los horarios disponibles.
      </div>`;
    return;
  }

  if (!date || date < getLocalDateString()) {
    slotsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-regular fa-calendar-xmark"></i>
        Selecciona una fecha válida a partir de hoy.
      </div>`;
    return;
  }

  const data = readData();
  let doctors = data.doctores.filter(doctor => doctor.especialidad === specialty);
  if (profFilter.value) {
    doctors = doctors.filter(doctor => doctor.id === profFilter.value);
  }

  const slotItems = [];
  doctors.forEach(doctor => {
    const doctorSlots = getDoctorSlotsForDate(doctor.id, date, data);
    doctorSlots.forEach(time => {
      if (date === getLocalDateString() && isAppointmentInPast(date, time)) return;

      const alreadyBooked = data.citas.some(appointment =>
        appointment.fecha === date &&
        appointment.hora === time &&
        String(getAppointmentDoctorId(appointment)) === String(doctor.id) &&
        appointment.estado !== 'CANCELADA'
      );
      if (!alreadyBooked) {
        slotItems.push({ doctor, time });
      }
    });
  });

  slotItems.sort((a, b) => a.time.localeCompare(b.time) || a.doctor.nombre.localeCompare(b.doctor.nombre));

  if (slotItems.length === 0) {
    slotsSummary.textContent = '0 cupos disponibles';
    slotsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-regular fa-calendar-minus"></i>
        No hay horarios disponibles para <strong>${specialty}</strong> el ${formatDisplayDate(date)}. Prueba con otra fecha.
      </div>`;
    return;
  }

  slotsSummary.textContent = `${slotItems.length} ${slotItems.length === 1 ? 'horario disponible' : 'horarios disponibles'} · ${formatDisplayDate(date)}`;

  slotItems.forEach(({ doctor, time }) => {
    const card = document.createElement('article');
    card.className = 'slot-card';
    card.dataset.specialty = specialty;

    const topContent = document.createElement('div');
    topContent.innerHTML = `
      <div class="slot-header">
        <span class="slot-time"><i class="fa-regular fa-clock"></i> ${time}</span>
        <span class="badge ${getSpecialtyBadgeClass(specialty)}">${specialty}</span>
      </div>
      <div class="slot-doctor-row">
        <span class="doctor-initials" aria-hidden="true">${getInitials(doctor.nombre)}</span>
        <div>
          <div class="slot-prof"></div>
          <div class="slot-service"><i class="fa-solid fa-location-dot"></i> Sede Bienestar</div>
        </div>
      </div>
    `;
    topContent.querySelector('.slot-prof').textContent = doctor.nombre;

    const bookButton = document.createElement('button');
    bookButton.type = 'button';
    bookButton.className = 'btn btn-primary btn-block';
    bookButton.innerHTML = '<i class="fa-solid fa-calendar-check"></i> Apartar Cita';
    bookButton.addEventListener('click', () => bookAppointment(doctor, date, time));

    card.append(topContent, bookButton);
    slotsContainer.appendChild(card);
  });
}

async function bookAppointment(doctor, date, time) {
  const confirmed = await showAppointmentModal({
    title: 'Confirmar reserva de cita',
    message: `Especialidad: ${doctor.especialidad}\nProfesional: ${doctor.nombre}\nFecha: ${formatDisplayDate(date)} · Hora: ${time}\n\n¿Deseas confirmar esta reserva?`,
    confirmLabel: 'Sí, apartar cita',
    cancelLabel: 'Cancelar',
    variant: 'success'
  });
  if (!confirmed) return;

  const data = readData();
  const appointmentExists = data.citas.some(appointment =>
    appointment.fecha === date &&
    appointment.hora === time &&
    String(getAppointmentDoctorId(appointment)) === String(doctor.id) &&
    appointment.estado !== 'CANCELADA'
  );

  if (appointmentExists) {
    renderAvailableSlots();
    await showAppointmentModal({
      title: 'Horario no disponible',
      message: 'Ese turno acaba de ser reservado por otro estudiante. Selecciona otro horario.',
      confirmLabel: 'Entendido',
      variant: 'primary'
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
  simularCronRecordatorios();
  showToast(
    `Cita confirmada (${doctor.especialidad}) para el ${formatDisplayDate(date)} a las ${time}. Confirmación enviada a ${currentUser.correo}.`,
    'success'
  );
}

// =========================================
// HISTORIAL DEL ESTUDIANTE (M3)
// =========================================
document.querySelectorAll('#student-status-filters .pill-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#student-status-filters .pill-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    studentStatusFilter = btn.dataset.filter;
    renderStudentHistory();
  });
});

function renderStudentHistory() {
  const data = readData();
  const allAppointments = data.citas
    .filter(appointment => String(getAppointmentStudentId(appointment)) === String(currentUser.id))
    .sort((a, b) => new Date(`${b.fecha}T${b.hora}`) - new Date(`${a.fecha}T${a.hora}`));

  const activeTotal = allAppointments.filter(app => ['PRÓXIMA', 'CONFIRMADA'].includes(getAppointmentStatus(app))).length;
  studentActiveCount.textContent = activeTotal;
  studentActiveCount.classList.toggle('hidden', activeTotal === 0);

  const filtered = allAppointments.filter(app => {
    const status = getAppointmentStatus(app);
    if (studentStatusFilter === 'ACTIVE') return ['PRÓXIMA', 'CONFIRMADA'].includes(status);
    if (studentStatusFilter === 'PAST') return ['FINALIZADA', 'CANCELADA'].includes(status);
    return true;
  });

  studentHistoryBody.replaceChildren();
  if (filtered.length === 0) {
    studentHistoryBody.innerHTML = '<tr class="empty-row"><td colspan="6" class="text-muted" style="text-align:center;">No hay citas para mostrar en esta categoría.</td></tr>';
    return;
  }

  filtered.forEach(appointment => {
    const doctor = data.doctores.find(item => String(item.id) === String(getAppointmentDoctorId(appointment)));
    const specialty = appointment.especialidad || doctor?.especialidad || 'No disponible';
    const status = getAppointmentStatus(appointment);
    const badgeMeta = getStatusBadgeMeta(status);

    const row = document.createElement('tr');
    row.innerHTML = `
      <td data-label="Especialidad"><span class="badge ${getSpecialtyBadgeClass(specialty)}">${specialty}</span></td>
      <td data-label="Profesional"><strong></strong></td>
      <td data-label="Fecha"><i class="fa-regular fa-calendar"></i> ${formatDisplayDate(appointment.fecha)}</td>
      <td data-label="Hora"><i class="fa-regular fa-clock"></i> ${appointment.hora}</td>
      <td data-label="Estado"><span class="badge ${badgeMeta.cls}"><i class="${badgeMeta.icon}"></i> ${status}</span></td>
      <td data-label="Acción"><div class="action-group"></div></td>
    `;
    row.querySelector('strong').textContent = doctor?.nombre || 'Profesional no disponible';

    const actionGroup = row.querySelector('.action-group');
    if (['PRÓXIMA', 'CONFIRMADA'].includes(status)) {
      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'btn btn-danger-soft btn-sm';
      cancelButton.innerHTML = '<i class="fa-solid fa-trash-can"></i> Cancelar';
      cancelButton.addEventListener('click', () => cancelAppointment(appointment.id));
      actionGroup.appendChild(cancelButton);
    } else {
      actionGroup.innerHTML = '<span class="text-muted">—</span>';
    }
    studentHistoryBody.appendChild(row);
  });
}

async function cancelAppointment(appointmentId) {
  const currentAppointment = readData().citas.find(
    appointment => appointment.id === appointmentId && String(getAppointmentStudentId(appointment)) === String(currentUser.id)
  );
  if (!currentAppointment || !['PRÓXIMA', 'CONFIRMADA'].includes(currentAppointment.estado)) return;

  const confirmed = await showAppointmentModal({
    title: 'Cancelar cita',
    message: `¿Seguro que deseas cancelar tu cita del ${formatDisplayDate(currentAppointment.fecha)} a las ${currentAppointment.hora}? El horario quedará libre para otro estudiante.`,
    confirmLabel: 'Sí, cancelar cita',
    cancelLabel: 'Volver',
    variant: 'danger'
  });
  if (!confirmed) return;

  const data = readData();
  const appointment = data.citas.find(
    item => item.id === appointmentId && String(getAppointmentStudentId(item)) === String(currentUser.id)
  );
  if (!appointment) return;

  appointment.estado = 'CANCELADA';
  writeData(data);
  showToast('La cita ha sido cancelada y el cupo fue liberado. Se notificó al profesional.', 'danger');
  renderStudentHistory();
  renderAvailableSlots();
  simularCronRecordatorios();
}

// =========================================
// DISPONIBILIDAD Y AGENDA PROFESIONAL (M3)
// =========================================
function updateScheduleSummary() {
  const activeDays = [...document.querySelectorAll('.availability-day')].filter(d => d.checked).length;
  scheduleSummaryPill.textContent = `${activeDays} ${activeDays === 1 ? 'día activo' : 'días activos'}`;
}

function syncAvailabilityDay(dayInput) {
  const dayBox = dayInput.closest('.day-box');
  dayBox.classList.toggle('is-inactive', !dayInput.checked);
  dayBox.querySelectorAll('.availability-slot').forEach(slot => {
    slot.disabled = !dayInput.checked;
  });
  updateScheduleSummary();
}

function loadProfessionalAvailability() {
  const data = readData();
  const saved = (data.disponibilidad || []).find(
    item => String(item.id_doctor ?? item.doctorId) === String(currentUser.id)
  );

  if (saved && Array.isArray(saved.dias)) {
    document.querySelectorAll('.availability-day').forEach(dayInput => {
      const savedDay = saved.dias.find(day => day.dia === dayInput.dataset.day);
      dayInput.checked = Boolean(savedDay);
      const selectedSlots = new Set(savedDay?.franjas || []);
      dayInput.closest('.day-box').querySelectorAll('.availability-slot').forEach(slot => {
        slot.checked = selectedSlots.has(slot.value);
      });
    });
  }

  document.querySelectorAll('.availability-day').forEach(syncAvailabilityDay);
}

async function saveProfessionalAvailability() {
  if (!currentUser || currentUser.rol !== 'Profesional') return;

  const days = [...document.querySelectorAll('.availability-day')]
    .filter(dayInput => dayInput.checked)
    .map(dayInput => ({
      dia: dayInput.dataset.day,
      franjas: [...dayInput.closest('.day-box').querySelectorAll('.availability-slot:checked')]
        .map(slot => slot.value)
    }))
    .filter(day => day.franjas.length > 0);

  const data = readData();
  if (!Array.isArray(data.disponibilidad)) data.disponibilidad = [];
  data.disponibilidad = data.disponibilidad.filter(
    item => String(item.id_doctor ?? item.doctorId) !== String(currentUser.id)
  );
  data.disponibilidad.push({
    id_doctor: currentUser.id,
    doctorId: currentUser.id,
    dias: days,
    actualizadaEn: new Date().toISOString()
  });
  writeData(data);

  showToast(`Disponibilidad actualizada (${days.length} días configurados).`, 'success');
  await showAppointmentModal({
    title: 'Disponibilidad actualizada',
    message: 'Tus franjas semanales se guardaron con éxito y ya están visibles para los estudiantes.',
    confirmLabel: 'Aceptar',
    variant: 'success'
  });
}

document.querySelectorAll('.availability-day').forEach(dayInput => {
  dayInput.addEventListener('change', () => syncAvailabilityDay(dayInput));
  syncAvailabilityDay(dayInput);
});

document.getElementById('btn-save-schedule').addEventListener('click', saveProfessionalAvailability);

document.querySelectorAll('#prof-status-filters .pill-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#prof-status-filters .pill-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    profStatusFilter = btn.dataset.filter;
    renderProfessionalAppointments();
  });
});

async function confirmProfessionalAppointment(appointmentId) {
  const canBeConfirmed = appointment =>
    String(getAppointmentDoctorId(appointment)) === String(currentUser.id) &&
    ['PRÓXIMA', 'PENDIENTE'].includes(appointment.estado);

  const currentAppointment = readData().citas.find(
    appointment => String(appointment.id) === String(appointmentId) && canBeConfirmed(appointment)
  );
  if (!currentAppointment) return;

  const confirmed = await showAppointmentModal({
    title: 'Confirmar cita',
    message: `¿Deseas confirmar la atención programada para el ${formatDisplayDate(currentAppointment.fecha)} a las ${currentAppointment.hora}?`,
    confirmLabel: 'Sí, confirmar',
    cancelLabel: 'Volver',
    variant: 'success'
  });
  if (!confirmed) return;

  const data = readData();
  const appointment = data.citas.find(
    item => String(item.id) === String(appointmentId) && canBeConfirmed(item)
  );
  if (!appointment) return;

  appointment.estado = 'CONFIRMADA';
  writeData(data);
  renderProfessionalAppointments();
  showToast('Cita confirmada correctamente en tu agenda.', 'success');
}

async function cancelProfessionalAppointment(appointmentId) {
  const canBeCancelled = appointment =>
    String(getAppointmentDoctorId(appointment)) === String(currentUser.id) &&
    ['PRÓXIMA', 'PENDIENTE', 'CONFIRMADA'].includes(appointment.estado);

  const currentAppointment = readData().citas.find(
    appointment => String(appointment.id) === String(appointmentId) && canBeCancelled(appointment)
  );
  if (!currentAppointment) return;

  const confirmed = await showAppointmentModal({
    title: 'Cancelar cita',
    message: '¿Deseas cancelar esta cita? El cupo se liberará y se enviará una notificación al estudiante.',
    confirmLabel: 'Sí, cancelar',
    cancelLabel: 'Volver',
    variant: 'danger'
  });
  if (!confirmed) return;

  const data = readData();
  const appointment = data.citas.find(
    item => String(item.id) === String(appointmentId) && canBeCancelled(item)
  );
  if (!appointment) return;

  appointment.estado = 'CANCELADA';
  writeData(data);
  renderProfessionalAppointments();
  showToast('La cita ha sido cancelada. Se notificó al estudiante.', 'danger');
}

function renderProfessionalAppointments() {
  const data = readData();
  const allAppointments = data.citas
    .filter(appointment => String(getAppointmentDoctorId(appointment)) === String(currentUser.id))
    .sort((a, b) => new Date(`${a.fecha}T${a.hora}`) - new Date(`${b.fecha}T${b.hora}`));

  const activeTotal = allAppointments.filter(app => ['PRÓXIMA', 'PENDIENTE', 'CONFIRMADA'].includes(getAppointmentStatus(app))).length;
  profActiveCount.textContent = activeTotal;
  profActiveCount.classList.toggle('hidden', activeTotal === 0);

  const filtered = allAppointments.filter(app => {
    const status = getAppointmentStatus(app);
    if (profStatusFilter === 'PENDING') return ['PRÓXIMA', 'PENDIENTE'].includes(status);
    if (profStatusFilter === 'CONFIRMED') return status === 'CONFIRMADA';
    return true;
  });

  profAppointmentsBody.replaceChildren();
  if (filtered.length === 0) {
    profAppointmentsBody.innerHTML = '<tr class="empty-row"><td colspan="6" class="text-muted" style="text-align:center;">No hay citas registradas en esta vista.</td></tr>';
    return;
  }

  filtered.forEach(appointment => {
    const studentId = getAppointmentStudentId(appointment);
    const student = data.estudiantes.find(item => String(item.id) === String(studentId));
    const specialty = appointment.especialidad || currentUser.especialidad;
    const status = getAppointmentStatus(appointment);
    const badgeMeta = getStatusBadgeMeta(status);

    const row = document.createElement('tr');
    row.innerHTML = `
      <td data-label="Estudiante">
        <div>
          <span class="student-cell-name"></span>
          <span class="student-cell-email"></span>
        </div>
      </td>
      <td data-label="Especialidad"><span class="badge ${getSpecialtyBadgeClass(specialty)}">${specialty}</span></td>
      <td data-label="Fecha"><i class="fa-regular fa-calendar"></i> ${formatDisplayDate(appointment.fecha)}</td>
      <td data-label="Hora"><i class="fa-regular fa-clock"></i> ${appointment.hora}</td>
      <td data-label="Estado"><span class="badge ${badgeMeta.cls}"><i class="${badgeMeta.icon}"></i> ${status}</span></td>
      <td data-label="Acciones"><div class="action-group"></div></td>
    `;
    row.querySelector('.student-cell-name').textContent = student?.nombre || 'Estudiante no encontrado';
    row.querySelector('.student-cell-email').textContent = student?.correo || '';

    const actionGroup = row.querySelector('.action-group');
    if (['PRÓXIMA', 'PENDIENTE'].includes(appointment.estado) && status === appointment.estado) {
      const confirmButton = document.createElement('button');
      confirmButton.type = 'button';
      confirmButton.className = 'btn btn-success btn-sm';
      confirmButton.innerHTML = '<i class="fa-solid fa-check"></i> Confirmar';
      confirmButton.addEventListener('click', () => confirmProfessionalAppointment(appointment.id));
      actionGroup.appendChild(confirmButton);
    }
    if (['PRÓXIMA', 'PENDIENTE', 'CONFIRMADA'].includes(appointment.estado) && status === appointment.estado) {
      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'btn btn-danger-soft btn-sm';
      cancelButton.innerHTML = '<i class="fa-solid fa-xmark"></i> Cancelar';
      cancelButton.addEventListener('click', () => cancelProfessionalAppointment(appointment.id));
      actionGroup.appendChild(cancelButton);
    }
    if (!actionGroup.hasChildNodes()) {
      actionGroup.innerHTML = '<span class="text-muted">—</span>';
    }
    profAppointmentsBody.appendChild(row);
  });
}

// =========================================
// INICIALIZACIÓN
// =========================================
setMinDate();

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
