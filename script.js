import axios from 'axios';

// Lista de IDs de estudiantes
const studentIds = [
  "6749c5e2354df55b2cf56197",
  "6749c5e2354df55b2cf56199",
  "6749c5e2354df55b2cf5619b",
  "6749c5e2354df55b2cf5619c",
  "6749c5e2354df55b2cf5619e",
  "6749c5e2354df55b2cf561a0",
  "6749c5e2354df55b2cf561a3",
  "6749c5e2354df55b2cf561a7",
  "6749c5e2354df55b2cf561a8",
  "6749c5e2354df55b2cf561aa"
]; // Reemplaza con tus IDs

// URL para el endpoint
const url = 'http://localhost:3000/api/classes/add-student';

// Clase a la que se agregarán los estudiantes
const code_class = 'zehVZw'; // Reemplaza con el ID de la clase

async function addStudentsToClass() {
  for (const student_id of studentIds) {
    try {
      const response = await axios.post(url, {
        class_code: code_class,
        student_id,
      });

      console.log(`✔️ Student ${student_id} added to class ${code_class}:`, response.data);
    } catch (error) {
      console.log('Error:', error.error)
      if (error.response) {
        console.error(
          `❌ Failed to add student ${student_id}:`,
          error.response.status,
          error.response.data
        );
      } else {
        console.error(`❌ Failed to add student ${student_id}:`, error.message);
      }
    }
  }
}

addStudentsToClass();