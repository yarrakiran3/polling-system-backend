const Poll = require('../models/Poll');
const Student = require('../models/Student');

class PollController {
  static async canCreateNewPoll() {
    const activePoll = await Poll.getActive();
    
    if (!activePoll) return { allowed: true };
    
    const connectedStudents = await Student.getAllConnected();
    const responseCount = await Student.getResponseCount(activePoll.id);
    
    if (responseCount >= connectedStudents.length && connectedStudents.length > 0) {
      return { allowed: true };
    }
    
    return {
      allowed: false,
      message: `Waiting for ${connectedStudents.length - responseCount} students to answer`
    };
  }

  static async createPoll(question, options, timeLimit = 60) {
    const canCreate = await this.canCreateNewPoll();
    
    if (!canCreate.allowed) {
      throw new Error(canCreate.message);
    }

    // Complete previous poll if exists
    const previousPoll = await Poll.getActive();
    if (previousPoll) {
      await Poll.complete(previousPoll.id);
    }

    const poll = await Poll.create(question, options, timeLimit);
    return poll;
  }

  static async getActivePoll() {
    return await Poll.getActive();
  }

  static async completePoll(pollId) {
    return await Poll.complete(pollId);
  }

  static async getPollResults(pollId) {
    return await Poll.getResults(pollId);
  }

  static async getPollHistory() {
    const polls = await Poll.getHistory();
    
    const pollsWithResults = await Promise.all(
      polls.map(async (poll) => {
        const results = await Poll.getResults(poll.id);
        return results;
      })
    );
    
    return pollsWithResults;
  }
}

module.exports = PollController;