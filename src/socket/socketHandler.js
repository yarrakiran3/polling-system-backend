const PollController = require('../controllers/pollController');
const StudentController = require('../controllers/studentController');

let pollTimers = {};

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // Teacher creates a new poll
    socket.on('teacher:create-poll', async (data) => {
      try {
        const { question, options, timeLimit } = data;
        const poll = await PollController.createPoll(question, options, timeLimit || 60);
        
        // Clear any existing timer
        if (pollTimers[poll.id]) {
          clearInterval(pollTimers[poll.id]);
        }

        // Broadcast new poll to all clients
        io.emit('poll:new', {
          id: poll.id,
          question: poll.question,
          options: JSON.parse(poll.options),
          timeLimit: poll.time_limit,
          status: poll.status
        });

        // Start countdown timer
        let remainingTime = poll.time_limit;
        pollTimers[poll.id] = setInterval(async () => {
          remainingTime--;
          io.emit('poll:timer', { pollId: poll.id, remaining: remainingTime });

          if (remainingTime <= 0) {
            clearInterval(pollTimers[poll.id]);
            await PollController.completePoll(poll.id);
            
            const results = await PollController.getPollResults(poll.id);
            io.emit('poll:completed', results);
          }
        }, 1000);

        socket.emit('poll:created', { success: true, poll });
      } catch (error) {
        socket.emit('poll:error', { message: error.message });
      }
    });

    // Teacher requests to check if can create poll
    socket.on('teacher:can-create', async () => {
      try {
        const canCreate = await PollController.canCreateNewPoll();
        socket.emit('teacher:can-create-response', canCreate);
      } catch (error) {
        socket.emit('poll:error', { message: error.message });
      }
    });

    // Teacher gets live results
    socket.on('teacher:get-results', async (data) => {
      try {
        const { pollId } = data;
        const results = await PollController.getPollResults(pollId);
        socket.emit('poll:results', results);
      } catch (error) {
        socket.emit('poll:error', { message: error.message });
      }
    });

    // Teacher gets poll history
    socket.on('teacher:get-history', async () => {
      try {
        const history = await PollController.getPollHistory();
        socket.emit('poll:history', history);
      } catch (error) {
        socket.emit('poll:error', { message: error.message });
      }
    });

    // Teacher removes a student
    socket.on('teacher:remove-student', async (data) => {
      try {
        const { studentId } = data;
        await StudentController.removeStudent(studentId);
        
        const students = await StudentController.getConnectedStudents();
        io.emit('students:updated', students);
        
        socket.emit('student:removed', { success: true });
      } catch (error) {
        socket.emit('poll:error', { message: error.message });
      }
    });

    // Student registers with name
    socket.on('student:register', async (data) => {
      try {
        const { name } = data;
        const student = await StudentController.registerStudent(name, socket.id);
        
        socket.emit('student:registered', {
          id: student.id,
          name: student.name
        });

        // Notify all about updated student list
        const students = await StudentController.getConnectedStudents();
        io.emit('students:updated', students);

        // Send current active poll if exists
        const activePoll = await PollController.getActivePoll();
        if (activePoll) {
          socket.emit('poll:new', {
            id: activePoll.id,
            question: activePoll.question,
            options: JSON.parse(activePoll.options),
            timeLimit: activePoll.time_limit,
            status: activePoll.status
          });
        }
      } catch (error) {
        socket.emit('poll:error', { message: error.message });
      }
    });

    // Student submits answer
    socket.on('student:submit-answer', async (data) => {
      try {
        const { studentId, pollId, answer } = data;
        await StudentController.submitAnswer(studentId, pollId, answer);
        
        socket.emit('answer:submitted', { success: true });

        // Get updated results and broadcast
        const results = await PollController.getPollResults(pollId);
        io.emit('poll:update', results);

        // Check if all students have answered
        const students = await StudentController.getConnectedStudents();
        const responseCount = results.totalResponses;

        if (responseCount >= students.length && students.length > 0) {
          // All answered, complete the poll
          if (pollTimers[pollId]) {
            clearInterval(pollTimers[pollId]);
          }
          await PollController.completePoll(pollId);
          io.emit('poll:completed', results);
        }
      } catch (error) {
        socket.emit('poll:error', { message: error.message });
      }
    });

    // Get current students
    socket.on('get-students', async () => {
      try {
        const students = await StudentController.getConnectedStudents();
        socket.emit('students:updated', students);
      } catch (error) {
        socket.emit('poll:error', { message: error.message });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
      await StudentController.disconnectStudent(socket.id);
      
      const students = await StudentController.getConnectedStudents();
      io.emit('students:updated', students);
    });
  });
};

module.exports = socketHandler;