const BIENESTAR_DB_KEY = 'bienestar_db';

function getRelativeLocalDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const initialBienestarData = {
  estudiantes: [
    {
      id: 'EST-001',
      correo: 'juanperez@estudiante.com',
      password: '1234',
      nombre: 'Juan Pérez'
    },
    {
      id: 'EST-002',
      correo: 'carlos@estudiante.com',
      password: '1234',
      nombre: 'Carlos Pérez'
    },
    {
      id: 'EST-003',
      correo: 'andrea@estudiante.com',
      password: '1234',
      nombre: 'Andrea Ramos'
    }
  ],
  doctores: [
    {
      id: 'PRO-001',
      correo: 'marta.gomez@profesional.com',
      password: '1234',
      nombre: 'Dra. Marta Gómez',
      especialidad: 'Medicina General'
    },
    {
      id: 'PRO-002',
      correo: 'roberto.silva@profesional.com',
      password: '1234',
      nombre: 'Dr. Roberto Silva',
      especialidad: 'Medicina General'
    },
    {
      id: 'PRO-003',
      correo: 'laura.morales@profesional.com',
      password: '1234',
      nombre: 'Dra. Laura Morales',
      especialidad: 'Psicología'
    },
    {
      id: 'PRO-004',
      correo: 'viviana.cruz@profesional.com',
      password: '1234',
      nombre: 'Dra. Viviana Cruz',
      especialidad: 'Odontología'
    }
  ],
  // Citas iniciales de demostración (activan recordatorio y agenda desde el primer acceso)
  citas: [
    {
      id: 'CITA-DEMO-001',
      estudianteId: 'EST-001',
      doctorId: 'PRO-001',
      especialidad: 'Medicina General',
      fecha: getRelativeLocalDate(1),
      hora: '09:00',
      estado: 'PRÓXIMA'
    },
    {
      id: 'CITA-DEMO-002',
      estudianteId: 'EST-003',
      doctorId: 'PRO-001',
      especialidad: 'Medicina General',
      fecha: getRelativeLocalDate(1),
      hora: '10:30',
      estado: 'CONFIRMADA'
    },
    {
      id: 'CITA-DEMO-003',
      estudianteId: 'EST-001',
      doctorId: 'PRO-004',
      especialidad: 'Odontología',
      fecha: getRelativeLocalDate(-7),
      hora: '11:00',
      estado: 'FINALIZADA'
    }
  ],
  disponibilidad: []
};

if (localStorage.getItem(BIENESTAR_DB_KEY) === null) {
  localStorage.setItem(BIENESTAR_DB_KEY, JSON.stringify(initialBienestarData));
} else {
  const storedData = JSON.parse(localStorage.getItem(BIENESTAR_DB_KEY));
  const juan = storedData.estudiantes?.find(student => student.id === 'EST-001');
  let needsSave = false;

  if (juan?.correo === 'juanperez@unimagdalena.edu.co') {
    juan.correo = 'juanperez@estudiante.com';
    needsSave = true;
  }
  if (!Array.isArray(storedData.citas)) {
    storedData.citas = [];
    needsSave = true;
  }
  if (!Array.isArray(storedData.disponibilidad)) {
    storedData.disponibilidad = [];
    needsSave = true;
  }
  if (needsSave) {
    localStorage.setItem(BIENESTAR_DB_KEY, JSON.stringify(storedData));
  }
}

window.BienestarDB = {
  read() {
    return JSON.parse(localStorage.getItem(BIENESTAR_DB_KEY));
  },
  write(data) {
    localStorage.setItem(BIENESTAR_DB_KEY, JSON.stringify(data));
  }
};
