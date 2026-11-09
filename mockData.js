const BIENESTAR_DB_KEY = 'bienestar_db';

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
  citas: []
};

if (localStorage.getItem(BIENESTAR_DB_KEY) === null) {
  localStorage.setItem(BIENESTAR_DB_KEY, JSON.stringify(initialBienestarData));
}

window.BienestarDB = {
  read() {
    return JSON.parse(localStorage.getItem(BIENESTAR_DB_KEY));
  },
  write(data) {
    localStorage.setItem(BIENESTAR_DB_KEY, JSON.stringify(data));
  }
};
