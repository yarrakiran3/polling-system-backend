const Student = require('../models/Student');
const Poll = require('../models/Poll');

class StudentController {
  static async registerStudent(name, socketId) {
    const existing = await Student.findBySocketId(socketId);
    
    if (existing) {
      return existing;
    }
    
    return await Student.create(name, socketId);
  }

  static async submitAnswer(studentId, pollId, answer) {
    const hasAnswered = await Student.hasAnswered(studentId, pollId);
    
    if (hasAnswered) {
      throw new Error('You have already answered this poll');
    }

    const poll = await Poll.getById(pollId);
    if (!poll) {
      throw new Error('Poll not found');
    }

    if (poll.status !== 'active') {
      throw new Error('Poll is not active');
    }

    const options = JSON.parse(poll.options);
    if (!options.includes(answer)) {
      throw new Error('Invalid answer option');
    }

    return await Student.submitAnswer(studentId, pollId, answer);
  }

  static async getConnectedStudents() {
    return await Student.getAllConnected();
  }

  static async removeStudent(studentId) {
    await Student.deleteStudent(studentId);
  }

  static async disconnectStudent(socketId) {
    await Student.removeSocketId(socketId);
  }
}

module.exports = StudentController;