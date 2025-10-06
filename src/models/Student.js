const { pool } = require('../config/db');

class Student {
  static async create(name, socketId) {
    const result = await pool.query(
      'INSERT INTO students (name, socket_id) VALUES ($1, $2) RETURNING *',
      [name, socketId]
    );
    return result.rows[0];
  }

  static async findBySocketId(socketId) {
    const result = await pool.query(
      'SELECT * FROM students WHERE socket_id = $1',
      [socketId]
    );
    return result.rows[0] || null;
  }

  static async updateSocketId(id, socketId) {
    const result = await pool.query(
      'UPDATE students SET socket_id = $1 WHERE id = $2 RETURNING *',
      [socketId, id]
    );
    return result.rows[0];
  }

  static async getAllConnected() {
    const result = await pool.query(
      'SELECT id, name, socket_id FROM students WHERE socket_id IS NOT NULL'
    );
    return result.rows;
  }

  static async removeSocketId(socketId) {
    await pool.query(
      'UPDATE students SET socket_id = NULL WHERE socket_id = $1',
      [socketId]
    );
  }

  static async hasAnswered(studentId, pollId) {
    const result = await pool.query(
      'SELECT * FROM responses WHERE student_id = $1 AND poll_id = $2',
      [studentId, pollId]
    );
    return result.rows.length > 0;
  }

  static async submitAnswer(studentId, pollId, answer) {
    const result = await pool.query(
      'INSERT INTO responses (student_id, poll_id, answer) VALUES ($1, $2, $3) RETURNING *',
      [studentId, pollId, answer]
    );
    return result.rows[0];
  }

  static async getResponseCount(pollId) {
    const result = await pool.query(
      'SELECT COUNT(*) FROM responses WHERE poll_id = $1',
      [pollId]
    );
    return parseInt(result.rows[0].count);
  }

  static async deleteStudent(id) {
    await pool.query('DELETE FROM students WHERE id = $1', [id]);
  }
}

module.exports = Student;