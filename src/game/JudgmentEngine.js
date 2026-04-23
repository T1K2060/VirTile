/**
 * Judgment Engine
 * Handles timing windows and hit judgment calculations
 * New system: Perfect+, Perfect, Great/Good, Ok, Bad, Miss
 */

export class JudgmentEngine {
  constructor() {
    // Timing windows in milliseconds (absolute value)
    this.windows = {
      perfectPlus: 2,   // ±2ms - Perfect+
      perfect: 5,       // ±5ms - Perfect
      greatGood: 10,    // ±10ms - Great/Good (50% chance)
      ok: 30,           // ±30ms - Ok
      bad: 50,          // ±50ms - Bad
      miss: 100         // ±100ms - Miss threshold
    };
    
    // Judgment data: points, color, PP bar impact
    this.judgmentData = {
      perfectPlus: {
        name: 'Perfect+',
        points: 400,
        color: '#FFFFFF', // White
        ppBarChange: 0.5, // Bar goes up by half
        ppNumberChange: 0.5,
        accuracy: 100.0
      },
      perfect: {
        name: 'Perfect',
        points: 350,
        color: '#FFD700', // Gold
        ppBarChange: 0.2, // Slightly goes up
        ppNumberChange: 0.25,
        accuracy: 100.0
      },
      great: {
        name: 'Great',
        points: 300,
        color: '#00FFFF', // Cyan
        ppBarChange: 0,   // Doesn't move
        ppNumberChange: 0,
        accuracy: 95.0
      },
      good: {
        name: 'Good',
        points: 300,
        color: '#00FFFF', // Cyan (same as Great)
        ppBarChange: 0,   // Doesn't move
        ppNumberChange: 0,
        accuracy: 90.0
      },
      ok: {
        name: 'Ok',
        points: 200,
        color: '#00FF00', // Green
        ppBarChange: -0.3, // Goes down
        ppNumberChange: -0.5,
        accuracy: 70.0
      },
      bad: {
        name: 'Bad',
        points: 50,
        color: '#808080', // Grey
        ppBarChange: -0.5, // Starts dropping
        ppNumberChange: -1,
        accuracy: 50.0
      },
      miss: {
        name: 'Miss',
        points: 0,
        color: '#FF0000', // Red
        ppBarChange: -0.8, // Major drop
        ppNumberChange: -5,
        accuracy: 0.0
      }
    };
    
    // Health impact
    this.healthImpact = {
      perfectPlus: 2,
      perfect: 2,
      great: 1,
      good: 0,
      ok: -2,
      bad: -5,
      miss: -10
    };
  }

  /**
   * Judge a hit based on timing difference
   * @param {number} timeDiff - Time difference in milliseconds
   * @returns {Object} Judgment result with type, points, color, PP changes
   */
  judge(timeDiff) {
    const absDiff = Math.abs(timeDiff);
    let judgmentType;
    
    if (absDiff <= this.windows.perfectPlus) {
      judgmentType = 'perfectPlus';
    } else if (absDiff <= this.windows.perfect) {
      judgmentType = 'perfect';
    } else if (absDiff <= this.windows.greatGood) {
      // 50% chance for Great or Good
      judgmentType = Math.random() < 0.5 ? 'great' : 'good';
    } else if (absDiff <= this.windows.ok) {
      judgmentType = 'ok';
    } else if (absDiff <= this.windows.bad) {
      judgmentType = 'bad';
    } else {
      judgmentType = 'miss';
    }
    
    const data = this.judgmentData[judgmentType];
    
    return {
      type: judgmentType,
      name: data.name,
      points: data.points,
      color: data.color,
      timing: timeDiff.toFixed(1),
      ppBarChange: data.ppBarChange,
      ppNumberChange: data.ppNumberChange,
      accuracy: data.accuracy,
      healthChange: this.healthImpact[judgmentType]
    };
  }

  /**
   * Get judgment data by type
   */
  getJudgmentData(type) {
    return this.judgmentData[type] || this.judgmentData.miss;
  }

  /**
   * Calculate rank based on accuracy, score, and PP
   */
  calculateRank(accuracy, score, pp, maxPossibleScore) {
    const scorePercent = maxPossibleScore > 0 ? (score / maxPossibleScore) * 100 : 0;
    const combined = (accuracy * 0.5) + (scorePercent * 0.3) + (Math.min(pp, 100) * 0.2);
    
    if (combined >= 99) return 'SS+';
    if (combined >= 97) return 'SS';
    if (combined >= 95) return 'S';
    if (combined >= 90) return 'A+';
    if (combined >= 85) return 'A';
    if (combined >= 80) return 'B+';
    if (combined >= 75) return 'B';
    if (combined >= 70) return 'C+';
    if (combined >= 65) return 'C';
    if (combined >= 60) return 'D+';
    if (combined >= 55) return 'D';
    if (combined >= 50) return 'F+';
    return 'F';
  }
}
