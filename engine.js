const MS_PER_DAY = 24 * 60 * 60 * 1000;

class ImportancePerceptionAI {
  constructor() {
    this.feedbackHistory = [];
    this.weights = {
      urgency: 0.28,
      deadline: 0.25,
      ambiguity: 0.18,
      switching_cost: 0.17,
      misalignment: 0.12
    };
  }

  normalizeDomain(domain) {
    const normalized = String(domain || '').trim().toLowerCase();
    return normalized === 'work' ? 'work' : 'personal';
  }

  parseDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  }

  parseTasks(tasks) {
    return tasks.map((task, index) => {
      const due_date = this.parseDate(task.due_date);
      return {
        id: task.id || `task-${index + 1}`,
        title: task.title || 'Untitled task',
        domain: this.normalizeDomain(task.domain),
        due_date,
        urgency_rating: Math.min(Math.max(Number(task.urgency_rating) || 3, 1), 3),
        ambiguity_score: Math.min(Math.max(Number(task.ambiguity_score) || 0, 0), 1),
        perceived_importance: Number(task.perceived_importance) || 0
      };
    });
  }

  differenceInDays(later, earlier) {
    return Math.floor((later - earlier) / MS_PER_DAY);
  }

  deadlineCompression(task) {
    const now = new Date();
    const days = Math.max(this.differenceInDays(task.due_date, now), 0);
    if (days <= 0) return 1.0;
    if (days <= 2) return 0.95;
    if (days <= 5) return 0.78;
    if (days <= 10) return 0.55;
    return 0.25;
  }

  urgencyMix(tasks) {
    const total = Math.max(tasks.length, 1);
    const urgent = tasks.filter((task) => task.urgency_rating === 1).length;
    const medium = tasks.filter((task) => task.urgency_rating === 2).length;
    const least = tasks.filter((task) => task.urgency_rating === 3).length;
    return {
      urgent,
      medium,
      least,
      urgentRatio: urgent / total,
      mediumRatio: medium / total,
      leastRatio: least / total
    };
  }

  urgencyDensity(tasks) {
    if (!tasks.length) return 0.0;
    const total = tasks.reduce((sum, task) => {
      if (task.urgency_rating === 1) return sum + 1.0;
      if (task.urgency_rating === 2) return sum + 0.68;
      return sum + 0.35;
    }, 0);
    return Math.min(total / tasks.length, 1.0);
  }

  switchingCost(personalTasks, workTasks) {
    if (!personalTasks.length || !workTasks.length) return 0.0;
    const total = personalTasks.length + workTasks.length;
    const balance = Math.min(personalTasks.length, workTasks.length) / total;
    return Math.min(balance * 0.45, 0.45);
  }

  misalignment(personalTasks, workTasks) {
    const personalUrgency = this.urgencyDensity(personalTasks);
    const workUrgency = this.urgencyDensity(workTasks);
    return Math.min(Math.abs(personalUrgency - workUrgency) * 0.55, 0.32);
  }

  deadlinePressure(tasks) {
    if (!tasks.length) return 0;
    const total = tasks.reduce((sum, task) => sum + this.deadlineCompression(task), 0);
    return total / tasks.length;
  }

  taskVolumePressure(tasks) {
    if (!tasks.length) return 0;
    if (tasks.length <= 1) return 0.15;
    if (tasks.length <= 2) return 0.3;
    if (tasks.length <= 4) return 0.55;
    if (tasks.length <= 6) return 0.75;
    return 1;
  }

  scoreWithinBand(min, max, deadlinePressure, volumePressure) {
    const pressure = deadlinePressure * 0.7 + volumePressure * 0.3;
    return min + (max - min) * Math.min(Math.max(pressure, 0), 1);
  }

  perceivedVsStructural(tasks) {
    if (!tasks.length) return { perceived: 0.0, structural: 0.0 };
    const perceived = tasks.reduce((sum, task) => sum + ((4 - task.urgency_rating) + task.ambiguity_score * 0.3), 0) / tasks.length;
    const deadline = tasks.reduce((sum, task) => sum + this.deadlineCompression(task), 0) / tasks.length;
    const structural = ((this.urgencyDensity(tasks) * 1.0 + deadline) / 2.0) * 3.0;
    return { perceived, structural };
  }

  computeCognitiveLoad(tasks) {
    const personalTasks = tasks.filter((task) => task.domain === 'personal');
    const workTasks = tasks.filter((task) => task.domain === 'work');
    const mix = this.urgencyMix(tasks);
    const deadlinePressure = this.deadlinePressure(tasks);
    const volumePressure = this.taskVolumePressure(tasks);
    let total;
    let zone;

    if (mix.least === tasks.length) {
      total = this.scoreWithinBand(0, 20, deadlinePressure, volumePressure);
      zone = 'least urgent';
    } else if (mix.urgent === 0) {
      total = this.scoreWithinBand(21, 40, deadlinePressure, volumePressure);
      zone = 'low to medium';
    } else if (mix.mediumRatio >= mix.urgentRatio) {
      total = this.scoreWithinBand(41, 70, deadlinePressure, volumePressure);
      zone = 'mostly medium';
    } else if (mix.urgent < tasks.length || deadlinePressure < 0.9) {
      total = this.scoreWithinBand(71, 90, deadlinePressure, volumePressure);
      zone = 'mostly urgent';
    } else {
      total = this.scoreWithinBand(91, 100, deadlinePressure, volumePressure);
      zone = 'urgent deadlines';
    }

    total = Math.min(Math.max(total, 0), 100);
    return {
      total_load: Number(total.toFixed(1)),
      zone,
      breakdown: {
        least_urgent_tasks: mix.least,
        medium_tasks: mix.medium,
        most_urgent_tasks: mix.urgent,
        deadline_pressure: Number((deadlinePressure * 100).toFixed(1)),
        task_volume_pressure: Number((volumePressure * 100).toFixed(1)),
        switching_cost: Number((this.switchingCost(personalTasks, workTasks) * 100).toFixed(1)),
        importance_misalignment: Number((this.misalignment(personalTasks, workTasks) * 100).toFixed(1))
      }
    };
  }

  computeAlignment(tasks) {
    const values = this.perceivedVsStructural(tasks);
    const diff = Math.abs(values.perceived - values.structural);
    const score = Math.max(0, 100 - diff * 16);
    const explanation = score >= 80
      ? 'Perceived urgency and task structure are well aligned.'
      : score >= 60
        ? 'Some mismatch exists between perceived importance and structural demands.'
        : 'Low alignment — clarify expectations, deadlines, or task significance.';
    return {
      score: Number(score.toFixed(1)),
      explanation,
      perceived: Number(values.perceived.toFixed(2)),
      structural: Number(values.structural.toFixed(2))
    };
  }

  reframingSuggestions(tasks) {
    const suggestions = [];
    const unclear = tasks.filter((task) => task.ambiguity_score >= 0.5);
    if (unclear.length) {
      suggestions.push(`Clarify '${unclear[0].title}' by breaking it into smaller steps and expected outcomes.`);
    }
    if (tasks.filter((task) => task.domain === 'work').length >= 2) {
      suggestions.push('Group related work tasks into one focused session to reduce context switching.');
    }
    if (tasks.filter((task) => task.domain === 'personal').length >= 2) {
      suggestions.push('Batch similar personal tasks so they feel more manageable and meaningful.');
    }
    suggestions.push('Choose one task to frame around autonomy or purpose rather than urgency.');
    return suggestions;
  }

  ambiguityStrainMap(tasks) {
    const sorted = [...tasks].sort((a, b) => a.due_date - b.due_date);
    const windows = [];
    sorted.forEach((task, index) => {
      const nearby = sorted.filter((other) => {
        const delta = Math.max(this.differenceInDays(other.due_date, task.due_date), 0);
        return other.id !== task.id && delta <= 3;
      });
      if (nearby.length >= 2) {
        windows.push({
          date: task.due_date.toISOString().slice(0, 10),
          task_count: nearby.length + 1,
          tasks: [task.title, ...nearby.map((item) => item.title)]
        });
      }
    });
    return {
      overloaded_windows: windows,
      unclear_tasks: sorted.filter((task) => task.ambiguity_score >= 0.4).map((task) => ({
        id: task.id,
        title: task.title,
        ambiguity: Number(task.ambiguity_score.toFixed(2))
      })),
      high_switching_sequences: sorted.slice(0, -1).reduce((result, task, index) => {
        const next = sorted[index + 1];
        if (next && task.domain !== next.domain) {
          result.push({
            from: task.title,
            to: next.title,
            from_domain: task.domain,
            to_domain: next.domain
          });
        }
        return result;
      }, [])
    };
  }

  analyze(tasks) {
    const parsedTasks = this.parseTasks(tasks);
    return {
      cognitive_load: this.computeCognitiveLoad(parsedTasks),
      priority_alignment: this.computeAlignment(parsedTasks),
      reframing_suggestions: this.reframingSuggestions(parsedTasks),
      strain_map: this.ambiguityStrainMap(parsedTasks)
    };
  }

  submitFeedback(feedback) {
    this.feedbackHistory.push(feedback);
    if (this.feedbackHistory.length >= 3) {
      const averageGap = this.feedbackHistory.reduce((sum, item) => sum + Math.abs(item.perceived_importance - item.actual_importance), 0) / this.feedbackHistory.length;
      const delta = Math.max(Math.min((0.2 - averageGap * 0.05), 0.05), -0.05);
      this.weights.ambiguity = Math.min(Math.max(this.weights.ambiguity + delta, 0.05), 0.35);
    }
    return {
      feedback_count: this.feedbackHistory.length,
      weights: this.weights
    };
  }
}

module.exports = ImportancePerceptionAI;
